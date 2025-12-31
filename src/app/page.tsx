import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Zap,
  ImageIcon,
  FileText,
  Download,
  Sparkles,
  Camera,
  Palette,
  Mountain,
  Microscope,
  ArrowRight,
  Check,
} from "lucide-react";

// Wave divider SVG component
const WaveDivider = ({ flip = false, className = "" }: { flip?: boolean; className?: string }) => (
  <div className={`w-full overflow-hidden ${flip ? "rotate-180" : ""} ${className}`}>
    <svg
      viewBox="0 0 1200 120"
      preserveAspectRatio="none"
      className="w-full h-16 md:h-24"
      fill="hsl(195 60% 96%)"
    >
      <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" />
    </svg>
  </div>
);

const PRESETS = [
  {
    name: "Bright Minimal",
    description: "Clean, modern aesthetics with high-key lighting",
    icon: Sparkles,
  },
  {
    name: "Dark Moody",
    description: "Dramatic shadows and luxury vibes",
    icon: Camera,
  },
  {
    name: "Outdoor Lifestyle",
    description: "Natural settings with golden hour warmth",
    icon: Mountain,
  },
  {
    name: "Studio Macro",
    description: "Detailed close-ups with precise lighting",
    icon: Microscope,
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
      "2 regenerations per campaign",
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
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="bg-background sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Zap className="h-8 w-8 text-primary" />
            <span className="text-xl font-bold text-foreground">FluxShield</span>
          </div>
          <nav className="hidden md:flex items-center gap-8">
            <Link href="#how-it-works" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              HOW IT WORKS
            </Link>
            <Link href="#pricing" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              PRICING
            </Link>
            <Link href="/login" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              LOG IN
            </Link>
            <Link href="/signup">
              <Button className="rounded-full px-6">GET STARTED FREE</Button>
            </Link>
          </nav>
          <div className="md:hidden flex items-center gap-4">
            <Link href="/login">
              <Button variant="ghost" size="sm">Log in</Button>
            </Link>
            <Link href="/signup">
              <Button size="sm" className="rounded-full">Get Started</Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container mx-auto px-4 py-16 md:py-24">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div className="text-left">
            <h1 className="text-4xl md:text-5xl font-bold tracking-tight text-foreground mb-6 leading-tight">
              Create stunning
              <br />
              <span className="text-primary">campaign packs</span> in a snap.
            </h1>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed">
              Whip up product images for social media, ads, and more—even if you&apos;re not a graphic designer.
            </p>
            <Link href="/signup">
              <Button size="lg" className="rounded-full px-8 py-6 text-base font-semibold uppercase tracking-wide">
                Get Started Free
              </Button>
            </Link>
          </div>
          <div className="relative">
            {/* Product mockup placeholder - layered cards effect */}
            <div className="relative">
              <div className="absolute -top-4 -right-4 w-full h-full bg-primary/10 rounded-2xl"></div>
              <div className="absolute -top-2 -right-2 w-full h-full bg-primary/20 rounded-2xl"></div>
              <div className="relative bg-white rounded-2xl shadow-2xl p-6 border">
                <div className="flex items-center gap-2 mb-4 pb-4 border-b">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                  <span className="ml-4 text-sm text-muted-foreground">FluxShield Campaign</span>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  {[1, 2, 3, 4, 5, 6].map((i) => (
                    <div key={i} className="aspect-square bg-gradient-to-br from-primary/20 to-primary/40 rounded-lg flex items-center justify-center">
                      <ImageIcon className="h-8 w-8 text-primary/60" />
                    </div>
                  ))}
                </div>
                <div className="mt-4 space-y-2">
                  <div className="h-3 bg-muted rounded-full w-3/4"></div>
                  <div className="h-3 bg-muted rounded-full w-1/2"></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Social proof - Featured In */}
      <section className="bg-muted py-8">
        <div className="container mx-auto px-4">
          <p className="text-center text-primary font-medium text-sm mb-6 uppercase tracking-wider">Trusted by Shopify Stores</p>
          <div className="flex flex-wrap items-center justify-center gap-8 md:gap-16 opacity-60">
            <span className="text-xl font-bold text-muted-foreground">Shopify</span>
            <span className="text-xl font-bold text-muted-foreground">Etsy</span>
            <span className="text-xl font-bold text-muted-foreground">WooCommerce</span>
            <span className="text-xl font-bold text-muted-foreground">BigCommerce</span>
          </div>
        </div>
      </section>

      {/* How It Works - with wave divider */}
      <WaveDivider flip className="-mb-1" />
      <section id="how-it-works" className="bg-muted py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
            FluxShield saves you time every step of the way
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            From product URL to campaign pack in just 4 simple steps
          </p>

          {/* Step 1 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">Create Your Brand Profile</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Upload your logo, product images, and moodboard references. We&apos;ll use these to ensure every generated image matches your brand aesthetic.
              </p>
              <Link href="/signup" className="text-primary font-medium inline-flex items-center gap-2 hover:gap-3 transition-all">
                Get started <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full scale-75"></div>
              <div className="relative bg-white rounded-2xl shadow-xl p-6 border">
                <div className="grid grid-cols-2 gap-4">
                  <div className="aspect-square bg-gradient-to-br from-primary/20 to-primary/30 rounded-lg flex items-center justify-center">
                    <Palette className="h-12 w-12 text-primary/60" />
                  </div>
                  <div className="space-y-4">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-4 bg-muted rounded w-1/2"></div>
                    <div className="h-8 bg-primary/20 rounded w-full"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full scale-75"></div>
              <div className="relative bg-white rounded-2xl shadow-xl p-6 border">
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg mb-4">
                  <span className="text-sm text-muted-foreground">https://yourstore.com/products/...</span>
                </div>
                <div className="flex gap-4">
                  <div className="w-20 h-20 bg-gradient-to-br from-primary/20 to-primary/30 rounded-lg"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-muted rounded w-3/4"></div>
                    <div className="h-3 bg-muted rounded w-full"></div>
                    <div className="h-3 bg-muted rounded w-2/3"></div>
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-2xl font-bold mb-4 text-foreground">Paste Your Product URL</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Just paste a Shopify product URL. We automatically extract the title, description, price, and images—no manual data entry required.
              </p>
              <Link href="/signup" className="text-primary font-medium inline-flex items-center gap-2 hover:gap-3 transition-all">
                Try it now <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>

          {/* Step 3 */}
          <div className="grid md:grid-cols-2 gap-12 items-center mb-20">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-foreground">Choose Your Style Preset</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Select from 4 curated visual styles—Bright Minimal, Dark Moody, Outdoor Lifestyle, or Studio Macro. Each is optimized for different product types.
              </p>
              <Link href="/signup" className="text-primary font-medium inline-flex items-center gap-2 hover:gap-3 transition-all">
                See all styles <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full scale-75"></div>
              <div className="relative grid grid-cols-2 gap-4">
                {PRESETS.map((preset) => (
                  <div key={preset.name} className="bg-white rounded-xl shadow-lg p-4 border hover:shadow-xl transition-shadow">
                    <preset.icon className="h-8 w-8 text-primary mb-2" />
                    <p className="font-medium text-sm">{preset.name}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="order-2 md:order-1 relative">
              <div className="absolute inset-0 bg-primary/10 rounded-full scale-75"></div>
              <div className="relative bg-white rounded-2xl shadow-xl p-6 border">
                <div className="flex items-center justify-between mb-4">
                  <span className="font-medium">campaign-pack.zip</span>
                  <Download className="h-5 w-5 text-primary" />
                </div>
                <div className="space-y-2 text-sm text-muted-foreground">
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" /> 12 product images
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" /> 7 social captions
                  </div>
                  <div className="flex items-center gap-2">
                    <Check className="h-4 w-4 text-green-500" /> 3 aspect ratios
                  </div>
                </div>
              </div>
            </div>
            <div className="order-1 md:order-2">
              <h3 className="text-2xl font-bold mb-4 text-foreground">Download Your Campaign Pack</h3>
              <p className="text-muted-foreground mb-4 leading-relaxed">
                Get 12 stunning AI-generated images plus 7 ready-to-post captions with hooks, CTAs, and hashtags—all in a convenient zip file.
              </p>
              <Link href="/signup" className="text-primary font-medium inline-flex items-center gap-2 hover:gap-3 transition-all">
                Start creating <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        </div>
      </section>
      <WaveDivider className="-mt-1 bg-muted" />

      {/* What You Get */}
      <section className="py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
            Every Campaign Pack Includes
          </h2>
          <p className="text-muted-foreground text-center mb-12 max-w-2xl mx-auto">
            Everything you need to launch a week of professional social media content
          </p>
          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center border hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">12 Product Images</h3>
              <p className="text-muted-foreground">
                Varied compositions, angles, and scenes to keep your feed fresh
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center border hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">7 Captions</h3>
              <p className="text-muted-foreground">
                One week of engaging posts with hooks, CTAs, and hashtags
              </p>
            </div>
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center border hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                <Download className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">3 Aspect Ratios</h3>
              <p className="text-muted-foreground">
                Square (1:1), Portrait (4:5), and Story (9:16) crops included
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing */}
      <WaveDivider flip className="-mb-1" />
      <section id="pricing" className="bg-muted py-24">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
            Simple, Transparent Pricing
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            Start free, upgrade when you need more
          </p>
          <div className="grid md:grid-cols-4 gap-6 max-w-6xl mx-auto">
            {PRICING.map((plan) => (
              <div
                key={plan.name}
                className={`bg-white rounded-2xl p-6 border ${
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
                    <li
                      key={feature}
                      className="text-sm text-muted-foreground flex items-center gap-2"
                    >
                      <Check className="h-4 w-4 text-primary flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>
                <Link href="/signup" className="block">
                  <Button
                    className={`w-full rounded-full ${plan.popular ? "" : ""}`}
                    variant={plan.popular ? "default" : "outline"}
                  >
                    {plan.cta}
                  </Button>
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>
      <WaveDivider className="-mt-1 bg-muted" />

      {/* CTA Section */}
      <section className="py-24">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-foreground">
            Ready to create your first campaign?
          </h2>
          <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of Shopify sellers creating professional product imagery in minutes.
          </p>
          <Link href="/signup">
            <Button size="lg" className="rounded-full px-8 py-6 text-base font-semibold uppercase tracking-wide">
              Get Started Free
            </Button>
          </Link>
          <p className="text-sm text-muted-foreground mt-4">
            No credit card required • Free trial includes 1 campaign
          </p>
        </div>
      </section>

      {/* Disclaimer */}
      <section className="container mx-auto px-4 pb-12">
        <div className="bg-muted/50 border border-dashed rounded-xl py-4 px-6 text-center text-sm text-muted-foreground">
          <strong>Note:</strong> AI-generated lifestyle imagery may not
          perfectly reproduce label text or fine packaging details. We
          recommend reviewing generated images before publishing.
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8">
        <div className="container mx-auto px-4">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Zap className="h-6 w-6 text-primary" />
              <span className="font-bold text-foreground">FluxShield</span>
            </div>
            <nav className="flex items-center gap-6 text-sm text-muted-foreground">
              <Link href="#how-it-works" className="hover:text-foreground transition-colors">How It Works</Link>
              <Link href="#pricing" className="hover:text-foreground transition-colors">Pricing</Link>
              <Link href="/login" className="hover:text-foreground transition-colors">Login</Link>
            </nav>
            <p className="text-sm text-muted-foreground">
              &copy; {new Date().getFullYear()} FluxShield. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
