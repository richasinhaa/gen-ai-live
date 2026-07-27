/// Builds the PDFs served from /downloads.
///
/// The content lives here rather than in a binary checked into git, so the
/// syllabus is reviewable in a diff and regenerating is one command:
///   node scripts/generate-downloads.mjs

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PdfDocument } from "./lib/pdf.mjs";

const OUT_DIR = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "downloads");
const AUTHOR = "Gen AI Live";

function footerNote(doc) {
  doc
    .rule()
    .paragraph(
      "Gen AI Live - live, small-group generative AI training. Sessions run on Google Meet or " +
        "Zoom; booking, intake and material live at the website. Questions: hello@genailive.in",
      { size: 9 },
    );
}

// ---------------------------------------------------------------------------

function researchSyllabus() {
  const doc = new PdfDocument({ title: "Applied Gen AI Research: RAG & Agent Development", author: AUTHOR });

  doc.heading("Applied Gen AI Research", 1);
  doc.heading("RAG & Agent Development - full syllabus", 3);
  doc.spacer(6);
  doc.keyValue("Format", "Live, 5 sessions x 2 hours = 10 hours");
  doc.keyValue("Cadence", "A new cohort starts every 45 days");
  doc.keyValue("Seats", "16 maximum");
  doc.keyValue("Level", "Highly technical - you write code during the sessions");
  doc.keyValue("Price", "Rs. 24,999 (list Rs. 50,000)");
  doc.rule();

  doc.paragraph(
    "This cohort is for people who already write code and are tired of tutorials that stop at " +
      "the first working demo. We read four foundational papers properly - method, ablations, " +
      "and what actually replicates - and build from them. By the end you will have assembled a " +
      "retrieval pipeline yourself rather than imported one, and an agent loop you can reason " +
      "about when it misbehaves.",
  );

  doc.heading("Prerequisites", 2);
  doc.bullet("Comfortable writing Python day to day.");
  doc.bullet("You have called an LLM API at least once.");
  doc.bullet("Basic familiarity with vectors and embeddings helps but is not required.");
  doc.bullet(
    "A machine you can run Python on, and an API key for at least one model provider. We will " +
      "tell you which before session one.",
  );

  doc.heading("The four papers", 2);
  doc.bullet("Lewis et al. (2020) - Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. arXiv:2005.11401");
  doc.bullet("Asai et al. (2023) - Self-RAG: Learning to Retrieve, Generate and Critique through Self-Reflection. arXiv:2310.11511");
  doc.bullet("Yao et al. (2022) - ReAct: Synergizing Reasoning and Acting in Language Models. arXiv:2210.03629");
  doc.bullet("Schick et al. (2023) - Toolformer: Language Models Can Teach Themselves to Use Tools. arXiv:2302.04761");

  doc.heading("Session by session", 2);

  const sessions = [
    {
      title: "Session 1 - Retrieval, from first principles",
      paper: "Lewis et al. (2020)",
      points: [
        "Why parametric knowledge fails, and precisely which failures retrieval fixes.",
        "The architecture the original RAG paper proposed, and how far current practice has drifted from it.",
        "Set up the codebase; index a real corpus; get a naive pipeline answering questions.",
        "Between sessions: index a corpus of your own and bring three answers it gets wrong.",
      ],
    },
    {
      title: "Session 2 - Building the RAG framework",
      paper: "Asai et al. (2023)",
      points: [
        "Chunking strategies and what each one costs you at retrieval time.",
        "Embedding model choice: when it matters, when it is noise.",
        "Hybrid dense and sparse search; why BM25 refuses to die.",
        "Reranking, and where it earns its latency.",
        "Self-reflection as a retrieval control loop - what Self-RAG adds and what it costs.",
      ],
    },
    {
      title: "Session 3 - Evaluation and failure analysis",
      paper: "No new paper - we work on your pipelines",
      points: [
        "Retrieval metrics that predict downstream quality, and the ones that do not.",
        "Groundedness and citation checking without a human in the loop.",
        "Building a regression test set from your own failures.",
        "Separating retrieval failures from generation failures - the single most useful diagnostic skill in this field.",
      ],
    },
    {
      title: "Session 4 - Agents: the reasoning-acting loop",
      paper: "Yao et al. (2022)",
      points: [
        "The ReAct pattern, and what it actually claims.",
        "Tool calling: schema design, error surfaces, and what the model does with a failed call.",
        "Structuring an agent loop you can debug - state, budget, termination.",
        "Convert your RAG pipeline into a tool the agent calls.",
      ],
    },
    {
      title: "Session 5 - Tool use, memory and production hardening",
      paper: "Schick et al. (2023)",
      points: [
        "Self-supervised tool learning and what it implies for how you design tools.",
        "Memory: what to persist, what to recompute, and the cost of getting it wrong.",
        "Loop control, budget caps and graceful degradation.",
        "The failure modes that only appear under real traffic, and how to instrument for them.",
      ],
    },
  ];

  for (const session of sessions) {
    doc.heading(session.title, 3);
    doc.paragraph(`Paper: ${session.paper}`, { size: 9.5 });
    for (const point of session.points) doc.bullet(point);
  }

  doc.heading("What you leave with", 2);
  doc.bullet("A retrieval pipeline you built, not a template you cloned.");
  doc.bullet("An agent loop with tool calling, memory and failure recovery.");
  doc.bullet("An evaluation harness that catches regressions before your users do.");
  doc.bullet("The ability to read the next paper in this field without waiting for a summary.");

  footerNote(doc);
  return { name: "research-cohort-syllabus.pdf", doc };
}

// ---------------------------------------------------------------------------

function ecosystemSyllabus() {
  const doc = new PdfDocument({ title: "Step Up to the Gen AI Ecosystem", author: AUTHOR });

  doc.heading("Step Up to the Gen AI Ecosystem", 1);
  doc.heading("Full syllabus", 3);
  doc.spacer(6);
  doc.keyValue("Format", "Live, 10 sessions x 1.5 hours = 15 hours");
  doc.keyValue("Cadence", "A new batch starts every 30 days");
  doc.keyValue("Seats", "25 maximum");
  doc.keyValue("Level", "Low on jargon - no coding background required");
  doc.keyValue("Price", "Rs. 14,999 (list Rs. 30,000)");
  doc.rule();

  doc.paragraph(
    "This batch is for professionals who need real command of generative AI without a computer " +
      "science background: people who have to decide what to build, judge whether it works, and " +
      "answer for it afterwards. Light on maths, heavy on judgement and hands-on practice. You " +
      "bring a real problem from your work and build against it throughout.",
  );

  doc.heading("Who this is for", 2);
  doc.bullet("Managers and leads who have to scope AI work and review its output.");
  doc.bullet("Analysts, writers, operations and product people who want to build their own workflows.");
  doc.bullet("Anyone who can use ChatGPT or Claude but cannot yet tell when it is quietly wrong.");

  doc.heading("Session by session", 2);

  const sessions = [
    ["Session 1 - What a generative model actually does", "A working mental model of prediction, context and sampling, without the maths. Why the same prompt gives different answers, and why that is not a bug."],
    ["Session 2 - The landscape, honestly", "Which models exist, what they cost, where each is genuinely better. How to choose without chasing leaderboards."],
    ["Session 3 - Prompting that survives contact with reality", "Moving from a prompt that worked once to one that holds across a hundred inputs. Structure, examples, constraints, and how to test."],
    ["Session 4 - Getting structured output", "Making a model return data your spreadsheet or system can consume - and validating it before you trust it."],
    ["Session 5 - Your own documents: retrieval, conceptually", "What RAG is, what it fixes, what it does not. Enough to scope the work and judge whether a vendor's version is any good."],
    ["Session 6 - Agents and automation", "What 'agent' means once you strip the marketing. Where automation pays off and where it quietly costs you more than it saves."],
    ["Session 7 - A gentle first API call", "Enough hands-on to understand what your engineers are doing. Copy-paste friendly; no prior coding assumed."],
    ["Session 8 - Quality, hallucination and guardrails", "How to test AI output the way you would review a new hire's work, and how to make that review scale."],
    ["Session 9 - Cost, privacy, security and governance", "What leaves your building, what it costs at volume, and the policy questions to settle before you roll anything out."],
    ["Session 10 - Capstone: ship one workflow", "You present the AI-assisted workflow you built during the batch and get live critique from the room and the instructor."],
  ];

  for (const [title, body] of sessions) {
    doc.heading(title, 3);
    doc.paragraph(body);
  }

  doc.heading("The capstone", 2);
  doc.paragraph(
    "From session three onwards you work on one real workflow from your own job - a report you " +
      "produce, a queue you triage, a document set you search. Each session adds a piece. In " +
      "session ten you demonstrate it working and explain where you would not trust it. That " +
      "last part is the point.",
  );

  footerNote(doc);
  return { name: "ecosystem-batch-syllabus.pdf", doc };
}

// ---------------------------------------------------------------------------

function readingList() {
  const doc = new PdfDocument({ title: "Generative AI reading list", author: AUTHOR });

  doc.heading("Generative AI reading list", 1);
  doc.paragraph(
    "The four cohort papers plus the surrounding work, ordered so each one makes the next " +
      "easier. If you read only four, read the ones marked [core].",
  );

  const groups = [
    {
      title: "Foundations",
      items: [
        "Vaswani et al. (2017) - Attention Is All You Need. arXiv:1706.03762. The architecture everything else assumes.",
        "Brown et al. (2020) - Language Models are Few-Shot Learners. arXiv:2005.14165. Where in-context learning enters the picture.",
      ],
    },
    {
      title: "Retrieval",
      items: [
        "[core] Lewis et al. (2020) - Retrieval-Augmented Generation for Knowledge-Intensive NLP Tasks. arXiv:2005.11401.",
        "Karpukhin et al. (2020) - Dense Passage Retrieval for Open-Domain QA. arXiv:2004.04906. The retriever half, in detail.",
        "[core] Asai et al. (2023) - Self-RAG. arXiv:2310.11511. Retrieval as a control decision rather than a fixed step.",
        "Gao et al. (2023) - Retrieval-Augmented Generation for Large Language Models: A Survey. arXiv:2312.10997. Useful map once you know the terrain.",
      ],
    },
    {
      title: "Agents and tool use",
      items: [
        "[core] Yao et al. (2022) - ReAct. arXiv:2210.03629.",
        "[core] Schick et al. (2023) - Toolformer. arXiv:2302.04761.",
        "Shinn et al. (2023) - Reflexion: Language Agents with Verbal Reinforcement Learning. arXiv:2303.11366.",
        "Wei et al. (2022) - Chain-of-Thought Prompting. arXiv:2201.11903. Read it for what it does not claim.",
      ],
    },
    {
      title: "Evaluation and failure",
      items: [
        "Es et al. (2023) - RAGAS: Automated Evaluation of Retrieval Augmented Generation. arXiv:2309.15217.",
        "Ji et al. (2022) - Survey of Hallucination in Natural Language Generation. arXiv:2202.03629.",
        "Liu et al. (2023) - Lost in the Middle: How Language Models Use Long Contexts. arXiv:2307.03172.",
      ],
    },
  ];

  for (const group of groups) {
    doc.heading(group.title, 2);
    for (const item of group.items) doc.bullet(item);
  }

  doc.heading("How to read one of these", 2);
  doc.paragraph(
    "Abstract, then figures, then the experimental setup - in that order, before any of the " +
      "prose. Most of what you need is in the setup: what they compared against, on what data, " +
      "and what they held fixed. Then read the ablations, which is where the honest limitations " +
      "usually live. The related-work section is the last thing worth your time, not the first.",
  );

  footerNote(doc);
  return { name: "paper-reading-list.pdf", doc };
}

// ---------------------------------------------------------------------------

function ragChecklist() {
  const doc = new PdfDocument({ title: "RAG evaluation checklist", author: AUTHOR });

  doc.heading("RAG evaluation checklist", 1);
  doc.paragraph(
    "The checks worth running before a retrieval system goes in front of users. Not exhaustive " +
      "- ordered by how often skipping one has caused a visible failure.",
  );

  const sections = [
    {
      title: "1. Before you measure anything",
      items: [
        "Do you have a test set of real questions, written by someone who is not you?",
        "Does it include questions the corpus genuinely cannot answer? If not, you cannot measure refusal.",
        "Is there a known-correct passage for each question, so retrieval can be scored separately from generation?",
      ],
    },
    {
      title: "2. Retrieval",
      items: [
        "Recall@k on your test set, at the k you actually pass to the model.",
        "What fraction of queries retrieve zero relevant passages? That number is your ceiling.",
        "Does hybrid search beat dense alone on your data? Check rather than assume.",
        "Are chunk boundaries splitting tables, code blocks or numbered lists mid-structure?",
        "Does reranking change the top-k enough to justify the latency?",
      ],
    },
    {
      title: "3. Generation",
      items: [
        "Is every factual claim traceable to a retrieved passage?",
        "When retrieval returns nothing useful, does the system say so - or invent an answer?",
        "Does answer quality collapse when the relevant passage sits in the middle of a long context?",
        "Are citations pointing at the passage that actually supports the sentence, or just at something nearby?",
      ],
    },
    {
      title: "4. The seams",
      items: [
        "What happens on a question spanning two documents that contradict each other?",
        "What happens when the corpus is updated but the index is not?",
        "Is there a permission boundary in the corpus? If so, is it enforced at retrieval - not in the prompt?",
        "What does a malicious question retrieve? Try to get it to surface something it should not.",
      ],
    },
    {
      title: "5. Operations",
      items: [
        "Cost per query at expected volume, including reranking and any repeated calls.",
        "p95 latency, measured end to end rather than per component.",
        "Are queries and retrieved passages logged so a bad answer can be reconstructed later?",
        "Is there a regression suite that runs before each index or prompt change?",
      ],
    },
  ];

  for (const section of sections) {
    doc.heading(section.title, 2);
    for (const item of section.items) doc.bullet(item, { marker: "[ ]" });
  }

  doc.heading("The one that catches most people", 2);
  doc.paragraph(
    "Eyeballing twenty answers and concluding it works. Twenty is enough to see that it is not " +
      "broken; it is nowhere near enough to see the shape of what it gets wrong. Build the test " +
      "set first - it is a day of work and it is the difference between improving the system and " +
      "guessing at it.",
  );

  footerNote(doc);
  return { name: "rag-evaluation-checklist.pdf", doc };
}

// ---------------------------------------------------------------------------

function workbook() {
  const doc = new PdfDocument({ title: "Cohort workbook", author: AUTHOR });

  doc.heading("Cohort workbook", 1);
  doc.heading("Applied Gen AI Research: RAG & Agent Development", 3);
  doc.spacer(4);
  doc.paragraph(
    "This workbook accompanies the live sessions. Each block lists what to have ready before " +
      "the session and what to complete after it. The starter repository and sample corpus are " +
      "linked from your confirmation page.",
  );
  doc.rule();

  doc.heading("Before session 1", 2);
  doc.bullet("Python 3.11 or newer, with a virtual environment you can install into.");
  doc.bullet("An API key for at least one model provider.");
  doc.bullet("Clone the starter repository and run the smoke test - it should print a model response.");
  doc.bullet("Skim Lewis et al. (2020). Do not study it; we read it together.");

  const blocks = [
    {
      title: "After session 1 - Index something you care about",
      items: [
        "Point the indexer at a corpus of your own: your docs, a wiki export, a set of PDFs.",
        "Write ten questions a colleague might genuinely ask of it.",
        "Run them. Bring the three worst answers to session 2, with the retrieved passages.",
      ],
    },
    {
      title: "After session 2 - Rebuild the pipeline",
      items: [
        "Swap the chunking strategy and measure the difference rather than guessing at it.",
        "Add sparse retrieval alongside dense; compare on your own ten questions.",
        "Add a reranker. Record the latency cost as well as the quality change.",
      ],
    },
    {
      title: "After session 3 - Build the harness",
      items: [
        "Turn your ten questions into a scored test set with known-correct passages.",
        "Add at least three questions the corpus cannot answer.",
        "Get the harness running from one command. You will use it for the rest of the cohort.",
      ],
    },
    {
      title: "After session 4 - Wrap it in an agent",
      items: [
        "Expose your retrieval pipeline as a tool with a clear schema.",
        "Implement the loop with an explicit step budget and a termination condition.",
        "Log every tool call and its result. Bring a trace where the agent went wrong.",
      ],
    },
    {
      title: "After session 5 - Harden it",
      items: [
        "Add memory. Justify to yourself what you persist and what you recompute.",
        "Add graceful degradation for a failing tool.",
        "Run the harness once more and write down what improved and what regressed.",
      ],
    },
  ];

  for (const block of blocks) {
    doc.heading(block.title, 2);
    for (const item of block.items) doc.bullet(item);
  }

  doc.heading("Office hours", 2);
  doc.paragraph(
    "Bring code, a trace, or a specific question. 'It is not working' is hard to help with; a " +
      "failing query with its retrieved passages takes about four minutes to diagnose.",
  );

  footerNote(doc);
  return { name: "cohort-workbook.pdf", doc };
}

// ---------------------------------------------------------------------------

mkdirSync(OUT_DIR, { recursive: true });

const documents = [
  researchSyllabus(),
  ecosystemSyllabus(),
  readingList(),
  ragChecklist(),
  workbook(),
];

for (const { name, doc } of documents) {
  const buffer = doc.toBuffer();
  writeFileSync(join(OUT_DIR, name), buffer);
  console.log(`${name}  ${(buffer.length / 1024).toFixed(1)} KB`);
}
