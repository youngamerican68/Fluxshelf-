import type { StylePreset } from "@/types/database";

interface GenerateCaptionsParams {
  productTitle: string;
  productDescription: string;
  productPrice: string | null;
  productUrl?: string; // Shopify product URL for UTM links
  preset: StylePreset;
  brandName?: string;
}

interface PlatformCaption {
  caption: string;
  hashtags: string;
  characterCount: number;
}

interface Caption {
  dayIndex: number;
  dayName: string;
  suggestedTime: string;
  suggestedDate: string;
  instagram: PlatformCaption;
  tiktok: PlatformCaption;
  pinterest: PlatformCaption;
  cta: string;
  utmLink: string;
}

// Map presets to brand tone
const PRESET_TONES: Record<StylePreset, string> = {
  bright_minimal: "clean, modern, and approachable",
  dark_moody: "sophisticated, premium, and luxurious",
  outdoor_lifestyle: "adventurous, energetic, and authentic",
  studio_macro: "precise, detailed, and professional",
};

// Posting schedule with day names and optimal times
const POSTING_SCHEDULE = [
  { dayName: "Monday", time: "9:00 AM", offset: 0 },
  { dayName: "Tuesday", time: "12:00 PM", offset: 1 },
  { dayName: "Wednesday", time: "6:00 PM", offset: 2 },
  { dayName: "Thursday", time: "3:00 PM", offset: 3 },
  { dayName: "Friday", time: "11:00 AM", offset: 4 },
  { dayName: "Saturday", time: "10:00 AM", offset: 5 },
  { dayName: "Sunday", time: "7:00 PM", offset: 6 },
];

/**
 * Generate UTM-tagged URL for tracking
 */
function generateUtmLink(
  productUrl: string,
  dayIndex: number,
  platform: string
): string {
  if (!productUrl) return "";

  try {
    const url = new URL(productUrl);
    url.searchParams.set("utm_source", platform);
    url.searchParams.set("utm_medium", "social");
    url.searchParams.set("utm_campaign", "fluxshield");
    url.searchParams.set("utm_content", `day${dayIndex}`);
    return url.toString();
  } catch {
    // If URL parsing fails, return with basic query string
    const separator = productUrl.includes("?") ? "&" : "?";
    return `${productUrl}${separator}utm_source=${platform}&utm_medium=social&utm_campaign=fluxshield&utm_content=day${dayIndex}`;
  }
}

/**
 * Get suggested posting dates starting from next Monday
 */
function getPostingDates(): string[] {
  const today = new Date();
  const dayOfWeek = today.getDay();
  const daysUntilMonday = dayOfWeek === 0 ? 1 : 8 - dayOfWeek;

  const dates: string[] = [];
  for (let i = 0; i < 7; i++) {
    const date = new Date(today);
    date.setDate(today.getDate() + daysUntilMonday + i);
    dates.push(date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric"
    }));
  }
  return dates;
}

export async function generateCaptions(
  params: GenerateCaptionsParams
): Promise<Caption[]> {
  const tone = PRESET_TONES[params.preset];
  const postingDates = getPostingDates();

  const prompt = `You are a social media marketing expert. Generate 7 engaging social media captions for a one-week posting schedule.

Product: ${params.productTitle}
${params.productDescription ? `Description: ${params.productDescription}` : ""}
${params.productPrice ? `Price: ${params.productPrice}` : ""}
${params.brandName ? `Brand: ${params.brandName}` : ""}
Tone: ${tone}

For each day (1-7), create THREE versions of the caption optimized for different platforms:

1. INSTAGRAM (max 2200 chars, optimal 125-150 chars for preview):
   - Hook in first line (shows in preview)
   - Emojis welcome
   - 20-30 hashtags in a separate block

2. TIKTOK (max 300 chars total including hashtags):
   - Very short, punchy, trend-aware
   - 3-5 hashtags max, integrated naturally
   - Casual, conversational tone

3. PINTEREST (max 500 chars):
   - SEO-focused, descriptive
   - Keywords naturally integrated
   - 2-5 hashtags
   - Focus on inspiration/aspiration

Content themes for each day:
- Day 1: Product introduction/hero post
- Day 2: Feature highlight
- Day 3: Behind-the-scenes or brand story
- Day 4: User benefit focus
- Day 5: Social proof or testimonial style
- Day 6: Limited time offer or urgency
- Day 7: Community engagement question

Respond in JSON format:
{
  "captions": [
    {
      "dayIndex": 1,
      "instagram": {
        "caption": "Hook line here\\n\\nEngaging content...",
        "hashtags": "#hashtag1 #hashtag2 ..."
      },
      "tiktok": {
        "caption": "Short punchy caption #hashtag1 #hashtag2",
        "hashtags": ""
      },
      "pinterest": {
        "caption": "SEO-rich descriptive caption...",
        "hashtags": "#keyword1 #keyword2"
      },
      "cta": "Shop now via link in bio!"
    }
  ]
}

Only respond with valid JSON, no other text.`;

  try {
    const response = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
        "HTTP-Referer": process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
        "X-Title": "FluxShield",
      },
      body: JSON.stringify({
        model: "anthropic/claude-3.5-sonnet",
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 6000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

    if (!content) {
      throw new Error("No content returned from OpenRouter");
    }

    // Parse the JSON response
    interface RawCaption {
      dayIndex: number;
      instagram: { caption: string; hashtags: string };
      tiktok: { caption: string; hashtags: string };
      pinterest: { caption: string; hashtags: string };
      cta: string;
    }

    let parsed: { captions: RawCaption[] };
    try {
      const jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonContent);
    } catch {
      console.error("Failed to parse caption response:", content);
      throw new Error("Failed to parse caption response as JSON");
    }

    if (!parsed.captions || !Array.isArray(parsed.captions)) {
      throw new Error("Invalid caption response format");
    }

    // Transform and normalize the captions
    const captions: Caption[] = parsed.captions.map((c, index) => {
      const dayIndex = c.dayIndex || index + 1;
      const schedule = POSTING_SCHEDULE[index] || POSTING_SCHEDULE[0];

      // Generate platform-specific UTM links
      const baseUrl = params.productUrl || "";

      return {
        dayIndex,
        dayName: schedule.dayName,
        suggestedTime: schedule.time,
        suggestedDate: postingDates[index] || "",
        instagram: {
          caption: c.instagram?.caption || "",
          hashtags: c.instagram?.hashtags || "",
          characterCount: (c.instagram?.caption?.length || 0) + (c.instagram?.hashtags?.length || 0),
        },
        tiktok: {
          caption: c.tiktok?.caption || "",
          hashtags: c.tiktok?.hashtags || "",
          characterCount: (c.tiktok?.caption?.length || 0) + (c.tiktok?.hashtags?.length || 0),
        },
        pinterest: {
          caption: c.pinterest?.caption || "",
          hashtags: c.pinterest?.hashtags || "",
          characterCount: (c.pinterest?.caption?.length || 0) + (c.pinterest?.hashtags?.length || 0),
        },
        cta: c.cta || "Shop now!",
        utmLink: generateUtmLink(baseUrl, dayIndex, "social"),
      };
    });

    // Ensure we have exactly 7 captions
    while (captions.length < 7) {
      const dayIndex = captions.length + 1;
      const schedule = POSTING_SCHEDULE[captions.length] || POSTING_SCHEDULE[0];
      const fallbackCaption = `Discover ${params.productTitle} - the perfect addition to your collection.`;

      captions.push({
        dayIndex,
        dayName: schedule.dayName,
        suggestedTime: schedule.time,
        suggestedDate: postingDates[captions.length] || "",
        instagram: {
          caption: `${fallbackCaption}\n\nExperience quality and style combined.`,
          hashtags: "#shopnow #newproduct #musthave #shopping #lifestyle",
          characterCount: 100,
        },
        tiktok: {
          caption: `${fallbackCaption} #newproduct #musthave`,
          hashtags: "",
          characterCount: 60,
        },
        pinterest: {
          caption: `${fallbackCaption} Perfect for anyone who values quality and style.`,
          hashtags: "#shopping #lifestyle",
          characterCount: 80,
        },
        cta: "Link in bio to shop!",
        utmLink: generateUtmLink(params.productUrl || "", dayIndex, "social"),
      });
    }

    return captions.slice(0, 7);
  } catch (error) {
    console.error("OpenRouter caption generation error:", error);
    throw new Error(
      `Caption generation failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

/**
 * Format captions for CSV export with all platforms
 */
export function formatCaptionsForCSV(
  captions: Caption[],
  productUrlRaw?: string
): Array<{
  day: number;
  day_name: string;
  suggested_date: string;
  suggested_time: string;
  instagram_caption: string;
  instagram_hashtags: string;
  tiktok_caption: string;
  pinterest_caption: string;
  pinterest_hashtags: string;
  cta: string;
  product_url_raw: string;
  utm_link_instagram: string;
  utm_link_tiktok: string;
  utm_link_pinterest: string;
}> {
  const rawUrl = productUrlRaw || "";
  return captions.map((c) => ({
    day: c.dayIndex,
    day_name: c.dayName,
    suggested_date: c.suggestedDate,
    suggested_time: c.suggestedTime,
    instagram_caption: c.instagram.caption,
    instagram_hashtags: c.instagram.hashtags,
    tiktok_caption: c.tiktok.caption,
    pinterest_caption: c.pinterest.caption,
    pinterest_hashtags: c.pinterest.hashtags,
    cta: c.cta,
    product_url_raw: rawUrl,
    utm_link_instagram: c.utmLink.replace("utm_source=social", "utm_source=instagram"),
    utm_link_tiktok: c.utmLink.replace("utm_source=social", "utm_source=tiktok"),
    utm_link_pinterest: c.utmLink.replace("utm_source=social", "utm_source=pinterest"),
  }));
}

/**
 * Legacy format for backward compatibility
 */
export function formatCaptionsLegacy(
  captions: Caption[]
): Array<{
  day: number;
  caption: string;
  hashtags: string;
  cta: string;
  suggested_time: string;
}> {
  return captions.map((c) => ({
    day: c.dayIndex,
    caption: c.instagram.caption,
    hashtags: c.instagram.hashtags,
    cta: c.cta,
    suggested_time: c.suggestedTime,
  }));
}
