import JSZip from "jszip";

interface ImageFile {
  name: string;
  squareBuffer: Buffer;
  portraitBuffer: Buffer;
  storyBuffer: Buffer;
}

interface Caption {
  day: number;
  caption: string;
  hashtags: string;
  cta: string;
  suggested_time: string;
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
  const headers = ["day", "caption", "hashtags", "cta", "suggested_time"];
  const rows = [headers.join(",")];

  for (const caption of captions) {
    const row = [
      caption.day.toString(),
      escapeCSV(caption.caption),
      escapeCSV(caption.hashtags),
      escapeCSV(caption.cta),
      escapeCSV(caption.suggested_time),
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
  captions.csv          - 7-day caption schedule with hashtags and CTAs

/meta/
  product.json          - Original product data

Usage Tips:
-----------
1. Square images work best for Instagram grid posts
2. Portrait images maximize screen real estate on mobile feeds
3. Story images are optimized for Instagram/Facebook Stories
4. Use the suggested posting times as a starting guide
5. Customize hashtags based on your specific niche

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
