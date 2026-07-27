"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import {
  BookingStatus,
  CohortStatus,
  MeetingProvider,
  SlotStatus,
} from "@prisma/client";
import { prisma } from "@/lib/db";
import {
  adminCookie,
  checkPassword,
  isAdmin,
  isAdminConfigured,
  makeSessionValue,
} from "@/lib/admin-auth";
import { DEFAULT_SLOT_TIMES, SLOT_DURATION_MIN, generateWeekendSlots } from "@/lib/slots";

/// Every mutating action re-checks the session. The layout guard stops people
/// seeing the screens; this stops anyone POSTing straight at the actions.
async function requireAdmin(): Promise<void> {
  if (!(await isAdmin())) redirect("/admin/login");
}

export type ActionResult = { error?: string; message?: string };

export async function login(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  if (!isAdminConfigured()) {
    return { error: "Set ADMIN_PASSWORD and ADMIN_SESSION_SECRET in the environment first." };
  }

  const password = String(formData.get("password") ?? "");
  if (!checkPassword(password)) {
    return { error: "Wrong password." };
  }

  const store = await cookies();
  store.set(adminCookie.name, makeSessionValue(), adminCookie.options);
  redirect("/admin");
}

export async function logout(): Promise<void> {
  const store = await cookies();
  store.delete(adminCookie.name);
  redirect("/admin/login");
}

// ---------------------------------------------------------------------------
// Consultation slots
// ---------------------------------------------------------------------------

export async function createSlots(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();

  const weeks = Math.min(Math.max(Number(formData.get("weeks") ?? 4), 1), 12);
  const rawTimes = String(formData.get("times") ?? "").trim();
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim() || null;
  const provider =
    String(formData.get("provider") ?? "") === "ZOOM"
      ? MeetingProvider.ZOOM
      : MeetingProvider.GOOGLE_MEET;

  const times = rawTimes
    ? rawTimes.split(",").map((value) => value.trim()).filter(Boolean)
    : [...DEFAULT_SLOT_TIMES];

  let instants: Date[];
  try {
    instants = generateWeekendSlots({ weeks, times });
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not read those times." };
  }

  // Slots are unique on startsAt, so re-running just fills the gaps.
  const result = await prisma.availabilitySlot.createMany({
    data: instants.map((startsAt) => ({
      startsAt,
      durationMin: SLOT_DURATION_MIN,
      meetingProvider: provider,
      meetingUrl,
    })),
    skipDuplicates: true,
  });

  revalidatePath("/admin/slots");
  revalidatePath("/consultation");
  return {
    message: `Added ${result.count} new slot${result.count === 1 ? "" : "s"} across ${weeks} week${
      weeks === 1 ? "" : "s"
    }.`,
  };
}

export async function setSlotStatus(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("slotId"));
  const next = String(formData.get("next"));

  // Only OPEN <-> BLOCKED is a safe toggle. A BOOKED slot is left alone —
  // freeing it here would silently strand a paid booking.
  if (next === "BLOCKED") {
    await prisma.availabilitySlot.updateMany({
      where: { id, status: SlotStatus.OPEN },
      data: { status: SlotStatus.BLOCKED },
    });
  } else if (next === "OPEN") {
    await prisma.availabilitySlot.updateMany({
      where: { id, status: SlotStatus.BLOCKED },
      data: { status: SlotStatus.OPEN },
    });
  }

  revalidatePath("/admin/slots");
  revalidatePath("/consultation");
}

export async function setSlotMeetingUrl(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("slotId"));
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim() || null;
  await prisma.availabilitySlot.update({ where: { id }, data: { meetingUrl } });
  revalidatePath("/admin/slots");
  revalidatePath("/admin/bookings");
}

/// Applies one room link to every upcoming slot that does not have its own.
export async function setDefaultSlotMeetingUrl(
  _prev: ActionResult,
  formData: FormData,
): Promise<ActionResult> {
  await requireAdmin();
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim();
  if (!meetingUrl) return { error: "Enter a link first." };

  const result = await prisma.availabilitySlot.updateMany({
    where: { startsAt: { gte: new Date() }, meetingUrl: null },
    data: { meetingUrl },
  });

  revalidatePath("/admin/slots");
  return { message: `Applied to ${result.count} upcoming slot${result.count === 1 ? "" : "s"}.` };
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function setBookingAttendance(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("bookingId"));
  const attended = formData.get("attended") === "true";
  await prisma.consultationBooking.update({
    where: { id },
    data: {
      attended,
      status: attended ? BookingStatus.COMPLETED : BookingStatus.CONFIRMED,
    },
  });
  revalidatePath("/admin/bookings");
}

export async function saveInstructorNotes(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("bookingId"));
  const notes = String(formData.get("instructorNotes") ?? "").trim() || null;
  await prisma.consultationBooking.update({
    where: { id },
    data: { instructorNotes: notes },
  });
  revalidatePath("/admin/bookings");
}

// ---------------------------------------------------------------------------
// Cohorts
// ---------------------------------------------------------------------------

export async function updateCohort(_prev: ActionResult, formData: FormData): Promise<ActionResult> {
  await requireAdmin();

  const id = String(formData.get("cohortId"));
  const meetingUrl = String(formData.get("meetingUrl") ?? "").trim() || null;
  const meetingNotes = String(formData.get("meetingNotes") ?? "").trim() || null;
  const provider =
    String(formData.get("provider") ?? "") === "ZOOM"
      ? MeetingProvider.ZOOM
      : MeetingProvider.GOOGLE_MEET;
  const statusValue = String(formData.get("status") ?? "");
  const status = Object.values(CohortStatus).includes(statusValue as CohortStatus)
    ? (statusValue as CohortStatus)
    : undefined;

  await prisma.cohort.update({
    where: { id },
    data: { meetingUrl, meetingNotes, meetingProvider: provider, status },
  });

  revalidatePath("/admin/cohorts");
  revalidatePath("/");
  return { message: "Saved." };
}

export async function setSessionLinks(formData: FormData): Promise<void> {
  await requireAdmin();
  const id = String(formData.get("sessionId"));
  await prisma.cohortSession.update({
    where: { id },
    data: {
      meetingUrl: String(formData.get("meetingUrl") ?? "").trim() || null,
      recordingUrl: String(formData.get("recordingUrl") ?? "").trim() || null,
    },
  });
  revalidatePath("/admin/cohorts");
}
