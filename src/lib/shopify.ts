interface ShopifyProduct {
  title: string;
  description: string;
  price: string | null;
  images: string[];
}

interface ShopifyProductJson {
  product: {
    id: number;
    title: string;
    body_html: string;
    vendor: string;
    product_type: string;
    variants: Array<{
      id: number;
      price: string;
      compare_at_price: string | null;
    }>;
    images: Array<{
      id: number;
      src: string;
      alt: string | null;
    }>;
  };
}

// Strip HTML tags and decode entities
function stripHtml(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

// Normalize Shopify URL to ensure it's a product URL
function normalizeProductUrl(url: string): string {
  try {
    const parsed = new URL(url);
    // Remove any trailing slashes
    let pathname = parsed.pathname.replace(/\/+$/, "");
    // Ensure it's a product URL
    if (!pathname.includes("/products/")) {
      throw new Error("Not a valid Shopify product URL");
    }
    // Remove .json if present
    pathname = pathname.replace(/\.json$/, "");
    return `${parsed.origin}${pathname}`;
  } catch {
    throw new Error("Invalid URL format");
  }
}

// Method 1: Try the .json endpoint (Shopify product JSON API)
async function fetchProductJson(productUrl: string): Promise<ShopifyProduct | null> {
  const jsonUrl = `${productUrl}.json`;

  try {
    const response = await fetch(jsonUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "FluxShield/1.0",
      },
    });

    if (!response.ok) {
      return null;
    }

    const data: ShopifyProductJson = await response.json();
    const product = data.product;

    return {
      title: product.title,
      description: stripHtml(product.body_html || ""),
      price: product.variants?.[0]?.price || null,
      images: product.images?.map((img) => img.src) || [],
    };
  } catch {
    return null;
  }
}

// Method 2: Fallback to HTML scraping using meta tags
async function fetchProductHtml(productUrl: string): Promise<ShopifyProduct | null> {
  try {
    const response = await fetch(productUrl, {
      headers: {
        Accept: "text/html",
        "User-Agent":
          "Mozilla/5.0 (compatible; FluxShield/1.0; +https://fluxshield.app)",
      },
    });

    if (!response.ok) {
      return null;
    }

    const html = await response.text();

    // Extract meta tags
    const titleMatch =
      html.match(/<meta property="og:title" content="([^"]*)"/) ||
      html.match(/<title>([^<]*)<\/title>/);
    const descriptionMatch =
      html.match(/<meta property="og:description" content="([^"]*)"/) ||
      html.match(/<meta name="description" content="([^"]*)"/);
    const priceMatch =
      html.match(/<meta property="product:price:amount" content="([^"]*)"/) ||
      html.match(/"price":\s*"?(\d+\.?\d*)"?/);
    const imageMatches = html.matchAll(
      /<meta property="og:image" content="([^"]*)"/g
    );

    const images: string[] = [];
    for (const match of imageMatches) {
      if (match[1] && !images.includes(match[1])) {
        images.push(match[1]);
      }
    }

    // Also try to find images in JSON-LD
    const jsonLdMatch = html.match(
      /<script type="application\/ld\+json">([\s\S]*?)<\/script>/
    );
    if (jsonLdMatch) {
      try {
        const jsonLd = JSON.parse(jsonLdMatch[1]);
        if (jsonLd.image) {
          const ldImages = Array.isArray(jsonLd.image)
            ? jsonLd.image
            : [jsonLd.image];
          for (const img of ldImages) {
            const imgUrl = typeof img === "string" ? img : img.url;
            if (imgUrl && !images.includes(imgUrl)) {
              images.push(imgUrl);
            }
          }
        }
      } catch {
        // Ignore JSON-LD parse errors
      }
    }

    const title = titleMatch?.[1] || "";
    const description = descriptionMatch?.[1] || "";
    const price = priceMatch?.[1] || null;

    if (!title) {
      return null;
    }

    return {
      title: stripHtml(title),
      description: stripHtml(description),
      price,
      images: images.slice(0, 10), // Limit to 10 images
    };
  } catch {
    return null;
  }
}

export async function ingestShopifyProduct(url: string): Promise<ShopifyProduct> {
  // Normalize the URL
  const normalizedUrl = normalizeProductUrl(url);

  // Try JSON endpoint first (faster and more reliable)
  const jsonResult = await fetchProductJson(normalizedUrl);
  if (jsonResult) {
    return jsonResult;
  }

  // Fallback to HTML scraping
  const htmlResult = await fetchProductHtml(normalizedUrl);
  if (htmlResult) {
    return htmlResult;
  }

  throw new Error(
    "Could not fetch product data. Please ensure the URL is a valid Shopify product page."
  );
}

export function isValidShopifyUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.pathname.includes("/products/");
  } catch {
    return false;
  }
}
