import JSZip from "jszip";

interface ImageFile {
  name: string;
  squareBuffer: Buffer;
  portraitBuffer: Buffer;
  storyBuffer: Buffer;
}

interface Caption {
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
  utm_link_instagram: string;
  utm_link_tiktok: string;
  utm_link_pinterest: string;
  product_url_raw: string;
}

interface ProductMeta {
  title: string;
  description: string | null;
  price: string | null;
  url: string;
  images: string[];
  generated_at: string;
  campaign_id: string;
}

export async function generateCampaignZip(
  images: ImageFile[],
  captions: Caption[],
  productMeta: ProductMeta
): Promise<Buffer> {
  const zip = new JSZip();

  // Create folders
  const imagesFolder = zip.folder("images");
  const squareFolder = imagesFolder?.folder("square_1080x1080");
  const portraitFolder = imagesFolder?.folder("portrait_1080x1350");
  const storyFolder = imagesFolder?.folder("story_1080x1920");
  const captionsFolder = zip.folder("captions");
  const metaFolder = zip.folder("meta");

  // Add images
  for (const image of images) {
    squareFolder?.file(`${image.name}_square.jpg`, image.squareBuffer);
    portraitFolder?.file(`${image.name}_portrait.jpg`, image.portraitBuffer);
    storyFolder?.file(`${image.name}_story.jpg`, image.storyBuffer);
  }

  // Generate captions CSV
  const csvContent = generateCaptionsCSV(captions);
  captionsFolder?.file("captions.csv", csvContent);

  // Add product meta JSON
  metaFolder?.file("product.json", JSON.stringify(productMeta, null, 2));

  // Add README
  const readmeContent = generateReadme(productMeta.title);
  zip.file("README.txt", readmeContent);

  // Generate zip buffer
  const zipBuffer = await zip.generateAsync({
    type: "nodebuffer",
    compression: "DEFLATE",
    compressionOptions: { level: 6 },
  });

  return zipBuffer;
}

function generateCaptionsCSV(captions: Caption[]): string {
  const headers = [
    "day",
    "day_name",
    "suggested_date",
    "suggested_time",
    "instagram_caption",
    "instagram_hashtags",
    "tiktok_caption",
    "pinterest_caption",
    "pinterest_hashtags",
    "cta",
    "product_url_raw",
    "utm_link_instagram",
    "utm_link_tiktok",
    "utm_link_pinterest",
  ];
  const rows = [headers.join(",")];

  for (const caption of captions) {
    const row = [
      caption.day.toString(),
      escapeCSV(caption.day_name),
      escapeCSV(caption.suggested_date),
      escapeCSV(caption.suggested_time),
      escapeCSV(caption.instagram_caption),
      escapeCSV(caption.instagram_hashtags),
      escapeCSV(caption.tiktok_caption),
      escapeCSV(caption.pinterest_caption),
      escapeCSV(caption.pinterest_hashtags),
      escapeCSV(caption.cta),
      escapeCSV(caption.product_url_raw),
      escapeCSV(caption.utm_link_instagram),
      escapeCSV(caption.utm_link_tiktok),
      escapeCSV(caption.utm_link_pinterest),
    ];
    rows.push(row.join(","));
  }

  return rows.join("\n");
}

function escapeCSV(value: string): string {
  if (value.includes(",") || value.includes('"') || value.includes("\n")) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function generateReadme(productTitle: string): string {
  return `FluxShield Campaign Pack
========================

Product: ${productTitle}
Generated: ${new Date().toISOString()}

Folder Structure:
-----------------
/images/
  /square_1080x1080/    - Square format for Instagram feed, Facebook
  /portrait_1080x1350/  - Portrait format for Instagram feed (4:5)
  /story_1080x1920/     - Story format for Instagram/Facebook Stories

/captions/
  captions.csv          - 7-day multi-platform caption schedule

/meta/
  product.json          - Original product data

Caption CSV Columns:
--------------------
- day, day_name, suggested_date, suggested_time
- instagram_caption, instagram_hashtags (20-30 hashtags)
- tiktok_caption (short, punchy, 300 chars max)
- pinterest_caption, pinterest_hashtags (SEO-focused)
- cta, utm_link_instagram, utm_link_tiktok, utm_link_pinterest

Platform-Specific Tips:
-----------------------
INSTAGRAM: Use the full caption + hashtags block. Post at suggested times.
TIKTOK: Keep it short and conversational. Hashtags are integrated.
PINTEREST: Focus on SEO keywords. Pin descriptions drive discovery.

Image Format Tips:
------------------
1. Square images work best for Instagram grid posts
2. Portrait images maximize screen real estate on mobile feeds
3. Story images are optimized for Instagram/Facebook Stories

UTM Tracking:
-------------
Each platform link includes UTM parameters for analytics:
- utm_source: instagram, tiktok, or pinterest
- utm_medium: social
- utm_campaign: fluxshield
- utm_content: day1, day2, etc.

IMPORTANT NOTICE:
-----------------
AI-generated lifestyle imagery may not perfectly reproduce label text
or fine packaging details. Review images before publishing and make
any necessary adjustments.

Generated with FluxShield
https://fluxshield.app
`;
}

export function generateProductMeta(
  campaign: {
    id: string;
    product_title: string | null;
    product_description: string | null;
    product_price: string | null;
    product_url: string;
    product_images: string[] | null;
  }
): ProductMeta {
  return {
    title: campaign.product_title || "Unknown Product",
    description: campaign.product_description,
    price: campaign.product_price,
    url: campaign.product_url,
    images: campaign.product_images || [],
    generated_at: new Date().toISOString(),
    campaign_id: campaign.id,
  };
}
