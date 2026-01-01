import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Zap,
  Link as LinkIcon,
  Palette,
  ImageIcon,
  FileText,
  Download,
  Check,
  ArrowRight,
  Sparkles,
  Clock,
  Package,
} from "lucide-react";

const STYLE_PRESETS = [
  {
    name: "Bright Minimal",
    description: "Clean white backgrounds, soft natural lighting",
    gradient: "from-gray-100 to-white",
    accent: "bg-cyan-500",
  },
  {
    name: "Dark Moody",
    description: "Dramatic shadows, luxury aesthetic",
    gradient: "from-gray-900 to-gray-800",
    accent: "bg-purple-500",
  },
  {
    name: "Outdoor Lifestyle",
    description: "Golden hour, natural settings",
    gradient: "from-amber-100 to-orange-50",
    accent: "bg-orange-500",
  },
  {
    name: "Studio Macro",
    description: "Detailed close-ups, gradient backdrops",
    gradient: "from-blue-100 to-indigo-50",
    accent: "bg-blue-500",
  },
];

const SAMPLE_CAPTIONS = [
  {
    day: "Monday",
    hook: "Time flies when you look this good.",
    caption: "Introducing the perfect everyday companion. Precision engineering meets timeless design.",
    hashtags: "#watches #minimalist #style #accessories #timepiece",
  },
  {
    day: "Wednesday",
    hook: "Behind every great outfit is a great watch.",
    caption: "Crafted for those who appreciate the details. Because every second counts.",
    hashtags: "#watchesofinstagram #luxury #fashion #mensstyle",
  },
  {
    day: "Friday",
    hook: "Weekend ready.",
    caption: "From boardroom to brunch - one watch that does it all. What's your weekend plan?",
    hashtags: "#weekendvibes #OOTD #watchlover #lifestyle",
  },
];

const PRICING = [
  {
    name: "Free Trial",
    price: "$0",
    period: "",
    campaigns: "1 campaign",
    features: ["12 AI-generated images", "7 social captions", "3 aspect ratios"],
    cta: "Start Free",
    popular: false,
  },
  {
    name: "Starter",
    price: "$29",
    period: "/month",
    campaigns: "10 campaigns/mo",
    features: [
      "Everything in Free",
      "All style presets",
      "Priority generation",
    ],
    cta: "Get Started",
    popular: false,
  },
  {
    name: "Pro",
    price: "$79",
    period: "/month",
    campaigns: "40 campaigns/mo",
    features: ["Everything in Starter", "Faster generation", "Email support"],
    cta: "Go Pro",
    popular: true,
  },
  {
    name: "Agency",
    price: "$199",
    period: "/month",
    campaigns: "150 campaigns/mo",
    features: [
      "Everything in Pro",
      "White-label exports",
      "Priority support",
    ],
    cta: "Contact Sales",
    popular: false,
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="border-b bg-white sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-7 w-7 text-primary" />
            <span className="text-xl font-bold">FluxShield</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Log in
            </Link>
            <Link href="/signup">
              <Button className="font-semibold">Get Started Free</Button>
            </Link>
          </nav>
          <div className="md:hidden flex items-center gap-3">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 md:py-28">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 text-gray-900">
              Turn any Shopify product into
              <span className="text-primary"> a week of content</span>
            </h1>
            <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Paste a product URL. Get 12 lifestyle photos and 7 ready-to-post captions with hashtags. Download everything in 5 minutes.
            </p>
            <div className="flex flex-wrap justify-center gap-4 mb-12">
              <Link href="/signup">
                <Button size="lg" className="font-semibold px-8 py-6 text-base">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              <Link href="#how-it-works">
                <Button size="lg" variant="outline" className="px-8 py-6 text-base">
                  See How It Works
                </Button>
              </Link>
            </div>
            <p className="text-sm text-muted-foreground">
              No credit card required • 1 free campaign included
            </p>
          </div>

          {/* App Screenshot */}
          <div className="mt-16 max-w-5xl mx-auto">
            <div className="bg-gray-100 rounded-xl p-2 shadow-2xl">
              <div className="bg-white rounded-lg overflow-hidden border">
                <div className="flex items-center gap-2 px-4 py-3 border-b bg-gray-50">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <div className="ml-4 flex-1 bg-white rounded px-3 py-1 text-sm text-gray-500">
                    fluxshield.com/app/campaigns/new
                  </div>
                </div>
                <div className="p-8 bg-gradient-to-br from-gray-50 to-white">
                  <div className="grid md:grid-cols-2 gap-8 items-center">
                    {/* Left: Input form mockup */}
                    <div className="space-y-4">
                      <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <label className="text-sm font-medium text-gray-700 mb-2 block">Shopify Product URL</label>
                        <div className="flex gap-2">
                          <div className="flex-1 bg-gray-50 border rounded-md px-3 py-2 text-sm text-gray-600">
                            https://mystore.myshopify.com/products/minimalist-watch
                          </div>
                          <Button size="sm" className="shrink-0">
                            <LinkIcon className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      <div className="bg-white rounded-lg border p-4 shadow-sm">
                        <label className="text-sm font-medium text-gray-700 mb-3 block">Style Preset</label>
                        <div className="grid grid-cols-2 gap-2">
                          {["Bright Minimal", "Dark Moody", "Outdoor", "Studio"].map((style, i) => (
                            <div key={style} className={`px-3 py-2 rounded-md text-xs font-medium text-center border ${i === 0 ? "bg-primary text-white border-primary" : "bg-gray-50 text-gray-600"}`}>
                              {style}
                            </div>
                          ))}
                        </div>
                      </div>
                      <Button className="w-full" size="lg">
                        <Sparkles className="mr-2 h-5 w-5" />
                        Generate Campaign
                      </Button>
                    </div>
                    {/* Right: Output preview */}
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80",
                        "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=200&q=80",
                        "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=200&q=80",
                        "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=200&q=80",
                        "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=200&q=80",
                        "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=200&q=80",
                      ].map((src, i) => (
                        <div key={i} className="aspect-square relative rounded-lg overflow-hidden shadow-md">
                          <Image src={src} alt={`Generated ${i + 1}`} fill className="object-cover" />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How It Works Header */}
      <section id="how-it-works" className="py-16 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <p className="text-primary font-semibold text-sm mb-2 uppercase tracking-wider">How It Works</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900">
            From product URL to campaign pack in 5 minutes
          </h2>
        </div>
      </section>

      {/* Feature 1: Paste Shopify URL */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
                <LinkIcon className="h-4 w-4" />
                Step 1
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">
                Paste your Shopify product URL
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                Just copy and paste any Shopify product URL. We automatically extract the product title, description, price, and images - no manual data entry needed.
              </p>
              <ul className="space-y-3">
                {["Works with any Shopify store", "Auto-extracts product details", "Supports product variants"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-600">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
            <div className="bg-gray-50 rounded-2xl p-8">
              <div className="bg-white rounded-xl shadow-lg p-6 border">
                <label className="text-sm font-medium text-gray-700 mb-3 block">Product URL</label>
                <div className="bg-gray-50 border rounded-lg px-4 py-3 mb-4 font-mono text-sm text-gray-600 break-all">
                  https://example.myshopify.com/products/minimalist-watch-silver
                </div>
                <div className="border-t pt-4 mt-4">
                  <p className="text-xs text-gray-500 uppercase tracking-wider mb-3">Extracted Data</p>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Title:</span>
                      <span className="text-sm font-medium">Minimalist Watch - Silver</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Price:</span>
                      <span className="text-sm font-medium">$149.00</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Images:</span>
                      <span className="text-sm font-medium">4 found</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 2: Choose Style Preset */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="order-2 md:order-1">
              <div className="grid grid-cols-2 gap-4">
                {STYLE_PRESETS.map((preset) => (
                  <div key={preset.name} className="bg-white rounded-xl p-4 shadow-md border hover:shadow-lg transition-shadow">
                    <div className={`h-24 rounded-lg bg-gradient-to-br ${preset.gradient} mb-3 flex items-center justify-center`}>
                      <div className={`w-8 h-8 rounded-full ${preset.accent}`}></div>
                    </div>
                    <h4 className="font-semibold text-sm mb-1">{preset.name}</h4>
                    <p className="text-xs text-muted-foreground">{preset.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Palette className="h-4 w-4" />
                Step 2
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">
                Choose your visual style
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                Select from 4 professionally designed style presets. Each preset generates images with consistent lighting, backgrounds, and mood that match your brand aesthetic.
              </p>
              <ul className="space-y-3">
                {["Consistent brand look across all images", "Optimized for social media engagement", "No design skills required"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-600">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 3: 12 Lifestyle Shots */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
                <ImageIcon className="h-4 w-4" />
                Step 3
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">
                Get 12 lifestyle product shots
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                Our AI generates 12 unique lifestyle images featuring your product in different scenes, angles, and compositions. Each image is crafted to stop the scroll.
              </p>
              <div className="grid grid-cols-3 gap-3 mb-6">
                {["Hero shot", "45° angle", "Flat lay", "Lifestyle", "Close-up", "In context"].map((type) => (
                  <div key={type} className="bg-gray-100 rounded-lg px-3 py-2 text-xs font-medium text-gray-600 text-center">
                    {type}
                  </div>
                ))}
              </div>
              <p className="text-sm text-muted-foreground">
                + 6 more scene variations in every campaign
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3">
              {[
                "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=300&q=80",
                "https://images.unsplash.com/photo-1524592094714-0f0654e20314?w=300&q=80",
                "https://images.unsplash.com/photo-1522312346375-d1a52e2b99b3?w=300&q=80",
                "https://images.unsplash.com/photo-1542496658-e33a6d0d50f6?w=300&q=80",
                "https://images.unsplash.com/photo-1508685096489-7aacd43bd3b1?w=300&q=80",
                "https://images.unsplash.com/photo-1509048191080-d2984bad6ae5?w=300&q=80",
                "https://images.unsplash.com/photo-1533139502658-0198f920d8e8?w=300&q=80",
                "https://images.unsplash.com/photo-1495704907664-81f74a7efd9b?w=300&q=80",
                "https://images.unsplash.com/photo-1539874754764-5a96559165b0?w=300&q=80",
              ].map((src, i) => (
                <div key={i} className="aspect-square relative rounded-xl overflow-hidden shadow-md hover:shadow-xl transition-shadow">
                  <Image src={src} alt={`Lifestyle shot ${i + 1}`} fill className="object-cover" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Feature 4: 7 Days of Captions */}
      <section className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div className="order-2 md:order-1 space-y-4">
              {SAMPLE_CAPTIONS.map((caption) => (
                <div key={caption.day} className="bg-white rounded-xl p-5 shadow-md border">
                  <div className="flex items-center gap-2 mb-3">
                    <div className="bg-primary/10 text-primary text-xs font-semibold px-2 py-1 rounded">
                      {caption.day}
                    </div>
                  </div>
                  <p className="font-semibold text-gray-900 mb-2">{caption.hook}</p>
                  <p className="text-sm text-gray-600 mb-3">{caption.caption}</p>
                  <p className="text-xs text-primary">{caption.hashtags}</p>
                </div>
              ))}
              <p className="text-sm text-muted-foreground text-center">+ 4 more captions included</p>
            </div>
            <div className="order-1 md:order-2">
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
                <FileText className="h-4 w-4" />
                Step 4
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">
                7 days of captions ready to post
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                Each campaign includes a full week of social media captions. Every caption comes with an attention-grabbing hook, engaging copy, a clear CTA, and relevant hashtags.
              </p>
              <ul className="space-y-3">
                {["Scroll-stopping hooks", "Platform-optimized hashtags", "Clear calls-to-action", "Varied content themes"].map((item) => (
                  <li key={item} className="flex items-center gap-3 text-gray-600">
                    <Check className="h-5 w-5 text-green-500 flex-shrink-0" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Feature 5: Download Everything */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
            <div>
              <div className="inline-flex items-center gap-2 bg-primary/10 text-primary px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Download className="h-4 w-4" />
                Step 5
              </div>
              <h3 className="text-3xl font-bold mb-4 text-gray-900">
                Download everything in one pack
              </h3>
              <p className="text-lg text-muted-foreground mb-6">
                Get a complete campaign pack as a single ZIP file. All images are pre-cropped to the right dimensions for every major platform. Captions come in a ready-to-use CSV.
              </p>
              <div className="flex flex-wrap gap-3">
                {[
                  { label: "1080×1080", desc: "Feed" },
                  { label: "1080×1350", desc: "Portrait" },
                  { label: "1080×1920", desc: "Stories" },
                ].map((format) => (
                  <div key={format.label} className="bg-gray-100 rounded-lg px-4 py-3 text-center">
                    <p className="font-mono text-sm font-semibold">{format.label}</p>
                    <p className="text-xs text-muted-foreground">{format.desc}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-gray-900 rounded-2xl p-6 text-white font-mono text-sm">
              <div className="flex items-center gap-2 mb-4 text-gray-400">
                <Package className="h-4 w-4" />
                campaign-pack.zip
              </div>
              <div className="space-y-1 text-gray-300">
                <p>📁 images/</p>
                <p className="pl-4">📁 square_1080x1080/ <span className="text-gray-500">(12 images)</span></p>
                <p className="pl-4">📁 portrait_1080x1350/ <span className="text-gray-500">(12 images)</span></p>
                <p className="pl-4">📁 story_1080x1920/ <span className="text-gray-500">(12 images)</span></p>
                <p>📁 captions/</p>
                <p className="pl-4">📄 captions.csv <span className="text-gray-500">(7 posts)</span></p>
                <p>📁 meta/</p>
                <p className="pl-4">📄 product.json</p>
                <p>📄 README.txt</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats/Social Proof */}
      <section className="py-16 bg-primary">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-3 gap-8 text-center text-white">
            <div>
              <p className="text-4xl font-bold mb-2">5 min</p>
              <p className="text-primary-foreground/80">Average generation time</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">12 images</p>
              <p className="text-primary-foreground/80">Per campaign</p>
            </div>
            <div>
              <p className="text-4xl font-bold mb-2">3 formats</p>
              <p className="text-primary-foreground/80">Ready to post</p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <p className="text-primary font-semibold text-sm mb-2 uppercase tracking-wider">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, transparent pricing
            </h2>
            <p className="text-muted-foreground">
              Start free, upgrade when you need more campaigns
            </p>
          </div>
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-xl p-6 border ${
                  plan.popular
                    ? "border-primary shadow-xl ring-2 ring-primary relative"
                    : "shadow-lg hover:shadow-xl transition-shadow"
                }`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-primary text-white text-xs font-semibold px-4 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <div className="text-center mb-6">
                  <h3 className="font-bold text-lg mb-2">{plan.name}</h3>
                  <div className="mb-2">
                    <span className="text-4xl font-bold">{plan.price}</span>
                    <span className="text-muted-foreground">{plan.period}</span>
                  </div>
                  <p className="text-sm text-muted-foreground">{plan.campaigns}</p>
                </div>
                <ul className="space-y-3 mb-6">
                  {plan.features.map((feature) => (
                    <li key={feature} className="text-sm text-muted-foreground flex items-center gap-2">
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block">
                  <Button className="w-full" variant={plan.popular ? "default" : "outline"}>
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-24 bg-gray-50">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
            Ready to generate your first campaign?
          </h2>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Stop spending hours on product photography and caption writing. Get a full week of content in 5 minutes.
          </p>
          <Link href="/signup">
            <Button size="lg" className="font-semibold px-8 py-6 text-base">
              Start Free Trial
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • 1 free campaign included
          </p>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="font-bold">FluxShield</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-gray-400">
              <Link href="#how-it-works" className="hover:text-white transition-colors">How It Works</Link>
              <Link href="#pricing" className="hover:text-white transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-white transition-colors">Login</Link>
            </nav>
            <p className="text-sm text-gray-400">
              &copy; {new Date().getFullYear()} FluxShield. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
