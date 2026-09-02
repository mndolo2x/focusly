import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import pdfParse from "pdf-parse";

export const runtime = "nodejs";

const MAX_PAGES = 50;
const MAX_FILE_BYTES = 10 * 1024 * 1024;
const MAX_DOCUMENTS_PER_MONTH = 5;
const usageStore = new Map<string, number>();

const makeSection = (title: string, orderIndex: number, startPage: number, endPage: number, bulletTexts: string[]) => ({
  id: `section-${orderIndex}`,
  title,
  order_index: orderIndex,
  source_page_start: startPage,
  source_page_end: endPage,
  bullets: bulletTexts.map((text, bulletIndex) => ({
    id: `bullet-${orderIndex}-${bulletIndex}`,
    text,
    order_index: bulletIndex,
  })),
});

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No PDF file was uploaded." }, { status: 400 });
    }

    const filename = file.name || "document.pdf";
    const isPdf = file.type === "application/pdf" || filename.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json({ error: "Wrong file type. Please upload a PDF." }, { status: 400 });
    }

    if (file.size > MAX_FILE_BYTES) {
      return NextResponse.json({ error: "PDF must be 10MB or smaller." }, { status: 400 });
    }

    const userId = "demo-user-1";
    const currentUsage = usageStore.get(userId) ?? 0;
    if (currentUsage >= MAX_DOCUMENTS_PER_MONTH) {
      return NextResponse.json({ error: "Monthly usage cap reached. Please try again next month." }, { status: 429 });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const pdfData = await pdfParse(buffer);
    const extractedText = (pdfData.text || "").trim();

    if (!extractedText) {
      return NextResponse.json({ error: "No extractable text was found in this PDF. Please upload a text-based PDF or a scanned document with selectable text." }, { status: 422 });
    }

    const pages = Math.max(1, Number(pdfData.numpages || 1));
    if (pages > MAX_PAGES) {
      return NextResponse.json({ error: "PDF exceeds the 50-page limit for this phase." }, { status: 400 });
    }

    const sections = await generateStructuredSummary(extractedText, pages);
    usageStore.set(userId, currentUsage + 1);

    return NextResponse.json({
      documentId: "doc-demo-1",
      usageCount: usageStore.get(userId) ?? 0,
      usageResetDate: "2026-09-01",
      sections,
    });
  } catch (error) {
    console.error("PDF processing error", error);
    return NextResponse.json({ error: "Claude API failure while generating the summary. Please try again later." }, { status: 500 });
  }
}

async function generateStructuredSummary(extractedText: string, totalPages: number) {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  if (!apiKey) {
    return buildFallbackSummary(extractedText, totalPages);
  }

  try {
    const anthropic = new Anthropic({ apiKey });
    const prompt = `You are summarizing a study PDF. Return ONLY valid JSON in this exact format: {"sections":[{"title":"string","source_page_start":1,"source_page_end":5,"bullets":["string","string","string","string","string"]}]}. The text is from a PDF that has ${totalPages} pages. Split it into logical sections with 3-6 summary bullets each. Keep source page ranges realistic and within 1-${totalPages}. Do not include markdown fences or commentary. Text:\n${extractedText.slice(0, 22000)}`;

    const response = await anthropic.messages.create({
      model: "claude-3-5-sonnet-20240620",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const rawText = response.content
      .map((item) => (item.type === "text" ? item.text : ""))
      .join("")
      .trim();

    const parsed = JSON.parse(rawText);
    if (!parsed || !Array.isArray(parsed.sections)) {
      throw new Error("Claude did not return a valid sections array.");
    }

    return parsed.sections.map((section: any, index: number) => {
      const bullets = Array.isArray(section.bullets) ? section.bullets.filter(Boolean).slice(0, 6) : [];
      return makeSection(
        String(section.title || `Section ${index + 1}`),
        index + 1,
        Number(section.source_page_start || 1),
        Number(section.source_page_end || totalPages),
        bullets.length ? bullets : ["The document introduces the core subject matter and central ideas."],
      );
    });
  } catch (error) {
    console.warn("Falling back to local summary generation because Claude failed or key is missing.", error);
    return buildFallbackSummary(extractedText, totalPages);
  }
}

function buildFallbackSummary(extractedText: string, totalPages: number) {
  const lines = extractedText
    .replace(/\s+/g, " ")
    .split(/(?<=\.)\s+/)
    .map((item) => item.trim())
    .filter(Boolean);

  const sampleSentences = lines.slice(0, 18);
  const sectionCount = Math.min(4, Math.max(2, Math.ceil(totalPages / 12)));
  const perSection = Math.max(1, Math.ceil(sampleSentences.length / sectionCount));

  const chunks: Array<{ title: string; start: number; end: number; bullets: string[] }> = [];

  for (let index = 0; index < sectionCount; index++) {
    const startSentence = sampleSentences.slice(index * perSection, (index + 1) * perSection);
    const trimmed = startSentence.filter(Boolean);
    const bullets = trimmed.length ? trimmed.slice(0, 4) : ["The document introduces the core subject matter and central ideas."];
    const startPage = index === 0 ? 1 : Math.max(1, Math.round((index / sectionCount) * totalPages));
    const endPage = index === sectionCount - 1 ? totalPages : Math.max(startPage + 2, Math.round(((index + 1) / sectionCount) * totalPages));
    chunks.push({
      title: `Section ${index + 1}: Key Overview`,
      start: startPage,
      end: endPage,
      bullets,
    });
  }

  return chunks.map((chunk, order) => makeSection(chunk.title, order + 1, chunk.start, chunk.end, chunk.bullets));
}
