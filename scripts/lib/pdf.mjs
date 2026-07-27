/// A very small text-only PDF writer.
///
/// The downloads on this site are typeset documents, not generated reports, so
/// the requirement is narrow: standard fonts, wrapped paragraphs, page breaks
/// and a correct xref table. That is a couple of hundred lines — well short of
/// justifying a PDF dependency in the runtime bundle.

const PAGE_WIDTH = 595.28; // A4 at 72dpi
const PAGE_HEIGHT = 841.89;
const MARGIN = 64;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;

// Widths for the Helvetica standard-14 fonts, in 1/1000 em, indexed by the
// printable ASCII range. Enough to wrap accurately without embedding metrics.
const HELVETICA_WIDTHS = [
  278, 278, 355, 556, 556, 889, 667, 191, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 278, 278, 584, 584, 584, 556,
  1015, 667, 667, 722, 722, 667, 611, 778, 722, 278, 500, 667, 556, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 278, 278, 278, 469, 556,
  333, 556, 556, 500, 556, 556, 278, 556, 556, 222, 222, 500, 222, 833, 556, 556,
  556, 556, 333, 500, 278, 556, 500, 722, 500, 500, 500, 334, 260, 334, 584,
];

const HELVETICA_BOLD_WIDTHS = [
  278, 333, 474, 556, 556, 889, 722, 238, 333, 333, 389, 584, 278, 333, 278, 278,
  556, 556, 556, 556, 556, 556, 556, 556, 556, 556, 333, 333, 584, 584, 584, 611,
  975, 722, 722, 722, 722, 667, 611, 778, 722, 278, 556, 722, 611, 833, 722, 778,
  667, 778, 722, 667, 611, 722, 667, 944, 667, 667, 611, 333, 278, 333, 584, 556,
  333, 556, 611, 556, 611, 556, 333, 611, 611, 278, 278, 556, 278, 889, 611, 611,
  611, 611, 389, 556, 333, 611, 556, 778, 556, 556, 500, 389, 280, 389, 584,
];

function charWidth(code, bold) {
  const table = bold ? HELVETICA_BOLD_WIDTHS : HELVETICA_WIDTHS;
  if (code < 32 || code > 126) return table[0];
  return table[code - 32];
}

function textWidth(text, size, bold) {
  let total = 0;
  for (const char of text) total += charWidth(char.codePointAt(0), bold);
  return (total / 1000) * size;
}

/// Greedy wrap. Words longer than the measure are broken rather than allowed to
/// overflow the margin.
function wrap(text, size, bold, maxWidth) {
  const lines = [];
  let current = "";

  for (const word of text.split(/\s+/).filter(Boolean)) {
    const candidate = current ? `${current} ${word}` : word;
    if (textWidth(candidate, size, bold) <= maxWidth) {
      current = candidate;
      continue;
    }
    if (current) lines.push(current);

    if (textWidth(word, size, bold) <= maxWidth) {
      current = word;
      continue;
    }
    let chunk = "";
    for (const char of word) {
      if (textWidth(chunk + char, size, bold) > maxWidth) {
        lines.push(chunk);
        chunk = char;
      } else {
        chunk += char;
      }
    }
    current = chunk;
  }

  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/// PDF string literals escape backslash and both parens.
function escapeText(text) {
  return text.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)");
}

/// WinAnsiEncoding covers Latin-1; anything outside it (smart quotes, dashes,
/// arrows) is folded to an ASCII equivalent rather than emitted as mojibake.
const TRANSLITERATE = new Map([
  ["‘", "'"], ["’", "'"], ["“", '"'], ["”", '"'],
  ["–", "-"], ["—", "-"], ["…", "..."], ["→", "->"],
  [" ", " "], ["•", "-"], ["₹", "Rs. "],
]);

function toWinAnsi(text) {
  let out = "";
  for (const char of text) {
    const replacement = TRANSLITERATE.get(char);
    if (replacement !== undefined) out += replacement;
    else if (char.codePointAt(0) <= 0xff) out += char;
    else out += "?";
  }
  return out;
}

export class PdfDocument {
  constructor({ title = "", author = "" } = {}) {
    this.title = title;
    this.author = author;
    this.pages = [];
    this.current = null;
    this.y = 0;
    this.#newPage();
  }

  #newPage() {
    this.current = [];
    this.pages.push(this.current);
    this.y = PAGE_HEIGHT - MARGIN;
  }

  #ensure(space) {
    if (this.y - space < MARGIN) this.#newPage();
  }

  #line(text, { size, bold, indent = 0, leading }) {
    this.#ensure(leading);
    this.y -= leading;
    this.current.push({ text: toWinAnsi(text), size, bold, x: MARGIN + indent, y: this.y });
  }

  heading(text, level = 1) {
    const size = level === 1 ? 22 : level === 2 ? 14 : 11.5;
    const spaceAbove = level === 1 ? 8 : 20;
    this.y -= spaceAbove;
    for (const line of wrap(text, size, true, CONTENT_WIDTH)) {
      this.#line(line, { size, bold: true, leading: size * 1.32 });
    }
    this.y -= 4;
    return this;
  }

  paragraph(text, { size = 10.5, indent = 0 } = {}) {
    for (const line of wrap(text, size, false, CONTENT_WIDTH - indent)) {
      this.#line(line, { size, bold: false, indent, leading: size * 1.5 });
    }
    this.y -= 6;
    return this;
  }

  bullet(text, { size = 10.5, marker = "-" } = {}) {
    const indent = 14;
    const lines = wrap(text, size, false, CONTENT_WIDTH - indent);
    lines.forEach((line, index) => {
      this.#line(index === 0 ? `${marker}  ${line}` : line, {
        size,
        bold: false,
        indent: index === 0 ? 0 : indent,
        leading: size * 1.45,
      });
    });
    this.y -= 3;
    return this;
  }

  keyValue(key, value, { size = 10.5 } = {}) {
    this.#line(`${key}: ${value}`, { size, bold: false, leading: size * 1.45 });
    return this;
  }

  spacer(height = 10) {
    this.y -= height;
    return this;
  }

  rule() {
    this.spacer(8);
    // Drawn as a run of underscores — keeps the content stream to text only.
    const dashes = Math.floor(CONTENT_WIDTH / textWidth("_", 9, false));
    this.#line("_".repeat(dashes), { size: 9, bold: false, leading: 12 });
    this.spacer(8);
    return this;
  }

  #contentStream(page) {
    const parts = ["BT"];
    let lastFont = null;
    for (const item of page) {
      const font = `${item.bold ? "/F2" : "/F1"} ${item.size}`;
      if (font !== lastFont) {
        parts.push(`${font} Tf`);
        lastFont = font;
      }
      parts.push(`1 0 0 1 ${item.x.toFixed(2)} ${item.y.toFixed(2)} Tm`);
      parts.push(`(${escapeText(item.text)}) Tj`);
    }
    parts.push("ET");
    return parts.join("\n");
  }

  toBuffer() {
    const objects = [];
    const add = (body) => {
      objects.push(body);
      return objects.length; // 1-based object numbers
    };

    // Fixed layout: 1=Catalog, 2=Pages, 3=F1, 4=F2, then page/content pairs.
    const catalogId = add(null);
    const pagesId = add(null);
    const fontRegularId = add(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>",
    );
    const fontBoldId = add(
      "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>",
    );

    const pageIds = [];
    for (const page of this.pages) {
      const stream = this.#contentStream(page);
      const contentId = add(
        `<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}\nendstream`,
      );
      const pageId = add(
        `<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${PAGE_WIDTH} ${PAGE_HEIGHT}] ` +
          `/Resources << /Font << /F1 ${fontRegularId} 0 R /F2 ${fontBoldId} 0 R >> >> ` +
          `/Contents ${contentId} 0 R >>`,
      );
      pageIds.push(pageId);
    }

    const infoId = add(
      `<< /Title (${escapeText(toWinAnsi(this.title))}) /Author (${escapeText(
        toWinAnsi(this.author),
      )}) /Producer (Gen AI Live) >>`,
    );

    objects[catalogId - 1] = `<< /Type /Catalog /Pages ${pagesId} 0 R >>`;
    objects[pagesId - 1] =
      `<< /Type /Pages /Count ${pageIds.length} /Kids [${pageIds
        .map((id) => `${id} 0 R`)
        .join(" ")}] >>`;

    let pdf = "%PDF-1.4\n";
    const offsets = [0];
    for (const [index, body] of objects.entries()) {
      offsets.push(Buffer.byteLength(pdf, "latin1"));
      pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
    }

    const xrefOffset = Buffer.byteLength(pdf, "latin1");
    pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
    for (let i = 1; i <= objects.length; i += 1) {
      pdf += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
    }
    pdf +=
      `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R /Info ${infoId} 0 R >>\n` +
      `startxref\n${xrefOffset}\n%%EOF\n`;

    return Buffer.from(pdf, "latin1");
  }
}
