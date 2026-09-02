import Anthropic from "@anthropic-ai/sdk";
import pdfParse from "pdf-parse";
import { searchOfficialSpecification, fetchWebPageContent } from "./web-search";

export type QuestionType = "multiple_choice" | "short_answer" | "structured_response" | "essay";

export type ExamSection = {
  name: string;
  question_types: QuestionType[];
  number_of_questions: number | null;
  time_minutes: number | null;
  marks_available: number | null;
  style_notes: string;
};

export type ExamProfileInput = {
  exam_name: string;
  board: string;
  subject: string | null;
  level: string;
  overall_duration_minutes: number | null;
  total_marks: number | null;
  sections: ExamSection[];
  style_notes_general: string | null;
  sources: string[];
  confidence_flags: string[];
};

/**
 * Research agent that analyzes exam specifications and produces structured profiles
 */
export class ExamResearchAgent {
  private anthropic: Anthropic;

  constructor() {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      console.warn("ANTHROPIC_API_KEY not found - exam research agent will run in fallback mode");
      this.anthropic = null as any; // Will be handled in methods
    } else {
      this.anthropic = new Anthropic({ apiKey });
    }
  }

  /**
   * Main entry point - research an exam from either name or PDF
   */
  async researchExam(examInput: string, isPdfUpload: boolean): Promise<ExamProfileInput> {
    if (isPdfUpload) {
      return this.researchFromPdf(examInput);
    } else {
      return this.researchFromWeb(examInput);
    }
  }

  /**
   * Research from uploaded PDF specification document
   */
  private async researchFromPdf(base64Pdf: string): Promise<ExamProfileInput> {
    try {
      // Decode base64 to buffer
      const buffer = Buffer.from(base64Pdf, "base64");
      const pdfData = await pdfParse(buffer);
      const extractedText = (pdfData.text || "").trim();

      if (!extractedText) {
        throw new Error("No extractable text found in PDF");
      }

      // Use LLM to parse the specification
      return this.synthesizeProfileFromText(extractedText, ["Uploaded PDF specification"]);
    } catch (error) {
      console.error("PDF research error:", error);
      throw new Error("Failed to process PDF specification");
    }
  }

  /**
   * Research from web search for official exam specifications
   */
  private async researchFromWeb(examName: string): Promise<ExamProfileInput> {
    try {
      const youApiKey = process.env.YOU_API_KEY;
      
      if (!youApiKey) {
        throw new Error("YOU_API_KEY is required for web research. Please provide it or upload a PDF instead.");
      }

      // Search for official specification using You.com
      const searchResult = await searchOfficialSpecification(examName, youApiKey);
      
      if (!searchResult) {
        throw new Error(`No official specification found for "${examName}" via web search. Try uploading a PDF specification instead.`);
      }

      // Fetch the content from the official source
      const officialContent = await fetchWebPageContent(searchResult.url);
      
      if (!officialContent || officialContent.length < 100) {
        throw new Error("Failed to fetch sufficient content from specification page");
      }

      // Synthesize profile from the fetched content
      return this.synthesizeProfileFromText(officialContent, [searchResult.url]);
    } catch (error) {
      console.error("Web research error:", error);
      throw new Error(`Failed to research exam "${examName}" from web: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  /**
   * Use LLM to synthesize structured profile from specification text
   */
  private async synthesizeProfileFromText(
    specificationText: string,
    sources: string[]
  ): Promise<ExamProfileInput> {
    if (!this.anthropic) {
      throw new Error("ANTHROPIC_API_KEY is required for exam profile synthesis");
    }

    const prompt = `You are an expert exam specification analyzer. Extract structured information from this exam specification and return ONLY valid JSON.

Extract the following information:
- exam_name: The official name of the exam
- board: The exam board (e.g., "College Board", "Cambridge International", "Edexcel")
- subject: The specific subject (or null if it's a whole-exam test like SAT)
- level: The exam level (e.g., "SAT", "IGCSE", "GCSE", "A-Level")
- overall_duration_minutes: Total exam duration in minutes (or null if not specified)
- total_marks: Total marks available (or null if not specified)
- sections: Array of section objects with:
  - name: Section name (e.g., "Paper 1: Multiple Choice")
  - question_types: Array of question types from ["multiple_choice", "short_answer", "structured_response", "essay"]
  - number_of_questions: Number of questions (or null if not specified)
  - time_minutes: Time allocated in minutes (or null if not specified)
  - marks_available: Marks available (or null if not specified)
  - style_notes: Brief description of question style and difficulty
- style_notes_general: Overall notes on tone, difficulty, patterns
- confidence_flags: Array of fields you are NOT confident about (use exact field names like "overall_duration_minutes")

IMPORTANT RULES:
- If a number is not clearly stated in the text, use null - do NOT guess or fabricate
- If information is ambiguous or conflicting, add it to confidence_flags
- Return ONLY the JSON object, no markdown fences, no commentary
- Use the exact field names specified above

Specification text:
${specificationText.slice(0, 25000)}`;

    try {
      const response = await this.anthropic.messages.create({
        model: "claude-3-5-sonnet-20240620",
        max_tokens: 4000,
        messages: [{ role: "user", content: prompt }],
      });

      const rawText = response.content
        .map((item) => (item.type === "text" ? item.text : ""))
        .join("")
        .trim();

      // Parse JSON response
      const parsed = JSON.parse(rawText);
      
      // Validate and structure the response
      return {
        exam_name: parsed.exam_name || "Unknown Exam",
        board: parsed.board || "Unknown Board",
        subject: parsed.subject || null,
        level: parsed.level || "Unknown",
        overall_duration_minutes: parsed.overall_duration_minutes || null,
        total_marks: parsed.total_marks || null,
        sections: Array.isArray(parsed.sections) ? parsed.sections : [],
        style_notes_general: parsed.style_notes_general || null,
        sources,
        confidence_flags: Array.isArray(parsed.confidence_flags) ? parsed.confidence_flags : [],
      };
    } catch (error) {
      console.error("LLM synthesis error:", error);
      throw new Error("Failed to synthesize exam profile from specification");
    }
  }
}
