import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST() {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin
    const adminEmails = (process.env.ADMIN_EMAILS || "")
      .split(",")
      .map((e) => e.trim());

    if (!adminEmails.includes(user.email || "")) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // Call the worker endpoint
    const workerUrl = `${process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"}/api/worker/run`;

    const response = await fetch(workerUrl, {
      method: "POST",
      headers: {
        "X-WORKER-SECRET": process.env.WORKER_SECRET || "",
      },
    });

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Worker failed" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Admin trigger worker error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to trigger worker",
      },
      { status: 500 }
    );
  }
}
