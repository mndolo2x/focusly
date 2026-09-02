import { NextRequest, NextResponse } from "next/server";
import { ExamResearchAgent } from "@/lib/exam-research-agent";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { exam_name, exam_input, is_pdf_upload } = body;

    if (!exam_name || !exam_input) {
      return NextResponse.json(
        { error: "exam_name and exam_input are required" },
        { status: 400 }
      );
    }

    if (typeof is_pdf_upload !== "boolean") {
      return NextResponse.json(
        { error: "is_pdf_upload must be a boolean" },
        { status: 400 }
      );
    }

    // Initialize research agent
    const agent = new ExamResearchAgent();
    
    // Research the exam
    const profileData = await agent.researchExam(exam_input, is_pdf_upload);

    // Override exam_name with the provided name (user's input takes precedence)
    profileData.exam_name = exam_name;

    // Insert into database
    const { data: insertedProfile, error: insertError } = await supabase
      .from("exam_profiles")
      .insert({
        exam_name: profileData.exam_name,
        board: profileData.board,
        subject: profileData.subject,
        level: profileData.level,
        overall_duration_minutes: profileData.overall_duration_minutes,
        total_marks: profileData.total_marks,
        sections: profileData.sections,
        style_notes_general: profileData.style_notes_general,
        sources: profileData.sources,
        confidence_flags: profileData.confidence_flags,
        status: "draft",
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database insert error:", insertError);
      return NextResponse.json(
        { error: "Failed to save exam profile to database" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      profile: insertedProfile,
      message: "Exam profile created successfully in draft status",
    });
  } catch (error) {
    console.error("Research agent error:", error);
    const errorMessage = error instanceof Error ? error.message : "Failed to research exam";
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
