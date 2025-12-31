import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { ingestShopifyProduct, isValidShopifyUrl } from "@/lib/shopify";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { url } = body;

    if (!url || typeof url !== "string") {
      return NextResponse.json(
        { error: "Product URL is required" },
        { status: 400 }
      );
    }

    if (!isValidShopifyUrl(url)) {
      return NextResponse.json(
        { error: "Invalid Shopify product URL" },
        { status: 400 }
      );
    }

    const product = await ingestShopifyProduct(url);

    return NextResponse.json(product);
  } catch (error) {
    console.error("Product ingestion error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch product data",
      },
      { status: 500 }
    );
  }
}
