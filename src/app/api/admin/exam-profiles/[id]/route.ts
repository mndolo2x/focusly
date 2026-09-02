import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

// Initialize Supabase client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  throw new Error("Missing Supabase environment variables");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

// GET - Get a specific exam profile
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { data: profile, error } = await supabase
      .from("exam_profiles")
      .select("*")
      .eq("id", params.id)
      .single();

    if (error) {
      console.error("Database query error:", error);
      return NextResponse.json(
        { error: "Failed to fetch exam profile" },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Exam profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ profile });
  } catch (error) {
    console.error("Get profile error:", error);
    return NextResponse.json(
      { error: "Failed to fetch exam profile" },
      { status: 500 }
    );
  }
}

// PATCH - Update an exam profile
export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await request.json();
    
    // Validate status if provided
    if (body.status && !["draft", "reviewed", "published"].includes(body.status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be draft, reviewed, or published" },
        { status: 400 }
      );
    }

    const { data: profile, error } = await supabase
      .from("exam_profiles")
      .update({
        ...body,
        updated_at: new Date().toISOString(),
      })
      .eq("id", params.id)
      .select()
      .single();

    if (error) {
      console.error("Database update error:", error);
      return NextResponse.json(
        { error: "Failed to update exam profile" },
        { status: 500 }
      );
    }

    if (!profile) {
      return NextResponse.json(
        { error: "Exam profile not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ 
      success: true,
      profile,
      message: "Exam profile updated successfully"
    });
  } catch (error) {
    console.error("Update profile error:", error);
    return NextResponse.json(
      { error: "Failed to update exam profile" },
      { status: 500 }
    );
  }
}

// DELETE - Delete an exam profile
export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { error } = await supabase
      .from("exam_profiles")
      .delete()
      .eq("id", params.id);

    if (error) {
      console.error("Database delete error:", error);
      return NextResponse.json(
        { error: "Failed to delete exam profile" },
        { status: 500 }
      );
    }

    return NextResponse.json({ 
      success: true,
      message: "Exam profile deleted successfully"
    });
  } catch (error) {
    console.error("Delete profile error:", error);
    return NextResponse.json(
      { error: "Failed to delete exam profile" },
      { status: 500 }
    );
  }
}
