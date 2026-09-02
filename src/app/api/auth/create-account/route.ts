import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const email = String(body.email || "").trim();
    const password = String(body.password || "");

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 });
    }

    if (password.length < 8) {
      return NextResponse.json({ error: "Password must be at least 8 characters long." }, { status: 400 });
    }

    return NextResponse.json({
      userId: "demo-user-1",
      usageCount: 0,
      usageResetDate: "2026-09-01",
    });
  } catch (error) {
    console.error("Create account error", error);
    return NextResponse.json({ error: "Unable to create account right now." }, { status: 500 });
  }
}
