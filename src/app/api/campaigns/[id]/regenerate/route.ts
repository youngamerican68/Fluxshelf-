import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: campaignId } = await params;
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get campaign and verify ownership
    const { data: campaign, error: campaignError } = await (supabase
      .from("campaigns") as any)
      .select("*, brands(owner_id)")
      .eq("id", campaignId)
      .single();

    if (campaignError || !campaign) {
      return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
    }

    if (campaign.owner_id !== user.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // Check regeneration quota using the RPC function
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: quotaResult, error: quotaError } = await (supabase.rpc as any)(
      "check_regeneration_quota",
      { p_user_id: user.id, p_campaign_id: campaignId }
    );

    if (quotaError) {
      console.error("Quota check error:", quotaError);
      return NextResponse.json(
        { error: "Failed to check quota" },
        { status: 500 }
      );
    }

    if (!quotaResult?.allowed) {
      return NextResponse.json(
        { error: quotaResult?.reason || "Regeneration limit reached" },
        { status: 403 }
      );
    }

    // Consume regeneration quota
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: consumeResult, error: consumeError } = await (supabase.rpc as any)(
      "consume_regeneration_quota",
      { p_user_id: user.id, p_campaign_id: campaignId }
    );

    if (consumeError || !consumeResult?.allowed) {
      console.error("Quota consume error:", consumeError);
      return NextResponse.json(
        { error: consumeResult?.reason || "Failed to consume quota" },
        { status: 500 }
      );
    }

    // Generate new run_id for this regeneration
    const runId = crypto.randomUUID();

    // Reset campaign status
    await (supabase.from("campaigns") as any)
      .update({ status: "queued", cutout_path: null })
      .eq("id", campaignId);

    // Queue new cutout job (will chain to backgrounds and composite)
    // Don't regenerate captions - those can stay the same
    const { error: jobError } = await (supabase
      .from("generation_jobs") as any)
      .insert({
        campaign_id: campaignId,
        step: "cutout",
        status: "queued",
        run_id: runId,
      });

    if (jobError) {
      console.error("Job creation error:", jobError);
      return NextResponse.json(
        { error: "Failed to queue regeneration" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      runId,
      remaining: consumeResult.remaining,
    });
  } catch (error) {
    console.error("Regeneration error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to regenerate" },
      { status: 500 }
    );
  }
}
