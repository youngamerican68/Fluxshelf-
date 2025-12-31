import type { StylePreset } from "@/types/database";

interface GenerateCaptionsParams {
  productTitle: string;
  productDescription: string;
  productPrice: string | null;
  preset: StylePreset;
  brandName?: string;
}

interface Caption {
  dayIndex: number;
  caption: string;
  hashtags: string;
  cta: string;
}

// Map presets to brand tone
const PRESET_TONES: Record<StylePreset, string> = {
  bright_minimal: "clean, modern, and approachable",
  dark_moody: "sophisticated, premium, and luxurious",
  outdoor_lifestyle: "adventurous, energetic, and authentic",
  studio_macro: "precise, detailed, and professional",
};

// Suggested posting times for each day
const POSTING_TIMES = [
  "9:00 AM",
  "12:00 PM",
  "3:00 PM",
  "6:00 PM",
  "10:00 AM",
  "2:00 PM",
  "5:00 PM",
];

export async function generateCaptions(
  params: GenerateCaptionsParams
): Promise<Caption[]> {
  const tone = PRESET_TONES[params.preset];

  const prompt = `You are a social media marketing expert. Generate 7 engaging social media captions for a one-week posting schedule.

Product: ${params.productTitle}
${params.productDescription ? `Description: ${params.productDescription}` : ""}
${params.productPrice ? `Price: ${params.productPrice}` : ""}
${params.brandName ? `Brand: ${params.brandName}` : ""}
Tone: ${tone}

For each day (1-7), create a caption with:
1. An attention-grabbing hook (first line)
2. 1-2 short paragraphs of engaging content
3. A clear call-to-action
4. 5-8 relevant hashtags

Vary the content focus:
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
      "caption": "Hook line here\\n\\nFirst paragraph...\\n\\nSecond paragraph...",
      "hashtags": "#hashtag1 #hashtag2 #hashtag3",
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
        model: "anthropic/claude-3.5-sonnet", // Reliable model for content generation
        messages: [
          {
            role: "user",
            content: prompt,
          },
        ],
        temperature: 0.7,
        max_tokens: 4000,
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
    let parsed: { captions: Caption[] };
    try {
      // Handle potential markdown code blocks
      const jsonContent = content.replace(/```json\n?/g, "").replace(/```\n?/g, "").trim();
      parsed = JSON.parse(jsonContent);
    } catch (parseError) {
      console.error("Failed to parse caption response:", content);
      throw new Error("Failed to parse caption response as JSON");
    }

    if (!parsed.captions || !Array.isArray(parsed.captions)) {
      throw new Error("Invalid caption response format");
    }

    // Validate and normalize the captions
    const captions: Caption[] = parsed.captions.map((c, index) => ({
      dayIndex: c.dayIndex || index + 1,
      caption: c.caption || "",
      hashtags: c.hashtags || "",
      cta: c.cta || "Shop now!",
    }));

    // Ensure we have exactly 7 captions
    while (captions.length < 7) {
      const dayIndex = captions.length + 1;
      captions.push({
        dayIndex,
        caption: `Discover ${params.productTitle} - the perfect addition to your collection.\n\nExperience quality and style combined.`,
        hashtags: "#shopnow #newproduct #musthave",
        cta: "Link in bio to shop!",
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

export function formatCaptionsForCSV(
  captions: Caption[]
): Array<{
  day: number;
  caption: string;
  hashtags: string;
  cta: string;
  suggested_time: string;
}> {
  return captions.map((c, index) => ({
    day: c.dayIndex,
    caption: c.caption,
    hashtags: c.hashtags,
    cta: c.cta,
    suggested_time: POSTING_TIMES[index] || "12:00 PM",
  }));
}
