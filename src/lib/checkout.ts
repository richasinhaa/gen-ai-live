/// Browser-side Razorpay Checkout wiring.
///
/// Flow: our API creates the order and returns its id → Checkout opens → on
/// success we hand the signed response back to /api/payments/verify, which is
/// the only thing that can actually confirm a booking. The webhook confirms it
/// again server-to-server, so a closed tab mid-redirect still ends up correct.

export type OrderResponse = {
  reference: string;
  orderId: string;
  amount: number;
  currency: string;
  keyId: string;
  prefill: { name: string; email: string; contact: string };
};

type RazorpayHandlerResponse = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

type RazorpayInstance = {
  open: () => void;
  on: (event: string, handler: (payload: unknown) => void) => void;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => RazorpayInstance;
  }
}

const SCRIPT_SRC = "https://checkout.razorpay.com/v1/checkout.js";

let scriptPromise: Promise<void> | null = null;

export function loadRazorpayScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.Razorpay) return Promise.resolve();

  scriptPromise ??= new Promise<void>((resolve, reject) => {
    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    const script = existing ?? document.createElement("script");
    script.src = SCRIPT_SRC;
    script.async = true;
    script.addEventListener("load", () => resolve());
    script.addEventListener("error", () => {
      // Let a later attempt retry rather than caching the failure forever.
      scriptPromise = null;
      reject(new Error("Could not load the payment window. Check your connection."));
    });
    if (!existing) document.body.appendChild(script);
  });

  return scriptPromise;
}

export class CheckoutDismissed extends Error {
  constructor() {
    super("Payment window closed");
    this.name = "CheckoutDismissed";
  }
}

/// Opens Checkout and resolves with the confirmation URL once the payment is
/// verified server-side. Rejects with CheckoutDismissed if the learner simply
/// closed the window — that is not an error worth shouting about.
export async function openCheckout(
  order: OrderResponse,
  meta: { name: string; description: string },
): Promise<string> {
  await loadRazorpayScript();
  if (!window.Razorpay) throw new Error("Payment window unavailable. Please retry.");

  return new Promise<string>((resolve, reject) => {
    let settled = false;

    const instance = new window.Razorpay!({
      key: order.keyId,
      amount: order.amount,
      currency: order.currency,
      name: meta.name,
      description: meta.description,
      order_id: order.orderId,
      prefill: order.prefill,
      notes: { reference: order.reference },
      theme: { color: "#ffb020" },
      handler: async (response: RazorpayHandlerResponse) => {
        settled = true;
        try {
          const verifyResponse = await fetch("/api/payments/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(response),
          });
          const data = await verifyResponse.json();
          if (!verifyResponse.ok) {
            throw new Error(data.error ?? "We could not verify that payment.");
          }
          resolve(data.redirectTo as string);
        } catch (error) {
          reject(error);
        }
      },
      modal: {
        ondismiss: () => {
          // `handler` fires before `ondismiss` on success — only treat this as
          // an abort if nothing has settled the promise yet.
          if (!settled) reject(new CheckoutDismissed());
        },
      },
    });

    instance.on("payment.failed", (payload: unknown) => {
      settled = true;
      const description = (payload as { error?: { description?: string } })?.error?.description;
      reject(new Error(description ?? "The payment did not go through. Nothing was charged."));
    });

    instance.open();
  });
}
