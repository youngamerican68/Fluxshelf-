import Link from "next/link";
import Image from "next/image";
import { Button } from "@/components/ui/button";
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
  Play,
} from "lucide-react";

// Diagonal divider component
const DiagonalDivider = ({
  fromColor = "white",
  toColor = "primary",
  flip = false
}: {
  fromColor?: string;
  toColor?: string;
  flip?: boolean;
}) => (
  <div className={`relative h-24 md:h-32 ${flip ? "rotate-180" : ""}`}>
    <svg
      className="absolute inset-0 w-full h-full"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      <polygon
        points="0,100 100,0 100,100"
        className={toColor === "primary" ? "fill-primary" : toColor === "white" ? "fill-white" : "fill-muted"}
      />
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
      {/* Hero with photo background */}
      <section className="relative min-h-[90vh] flex items-center">
        {/* Background image with gradient overlay */}
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=1920&q=80"
            alt="Marketing workspace"
            fill
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 via-primary/80 to-accent/70"></div>
        </div>

        {/* Header - overlaid on hero */}
        <header className="absolute top-0 left-0 right-0 z-20">
          <div className="container mx-auto px-4 py-6 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Zap className="h-8 w-8 text-white" />
              <span className="text-xl font-bold text-white">FluxShield</span>
            </div>
            <nav className="hidden md:flex items-center gap-8">
              <Link href="#how-it-works" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                How It Works
              </Link>
              <Link href="#pricing" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                Pricing
              </Link>
              <Link href="/login" className="text-sm font-medium text-white/80 hover:text-white transition-colors">
                Log in
              </Link>
              <Link href="/signup">
                <Button className="bg-white text-primary hover:bg-white/90 font-semibold px-6">
                  Get Started Free
                </Button>
              </Link>
            </nav>
            <div className="md:hidden flex items-center gap-4">
              <Link href="/login">
                <Button variant="ghost" size="sm" className="text-white">Log in</Button>
              </Link>
              <Link href="/signup">
                <Button size="sm" className="bg-white text-primary">Get Started</Button>
              </Link>
            </div>
          </div>
        </header>

        {/* Hero content */}
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="text-left text-white">
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6 leading-tight">
                Show your products.
                <br />
                See results.
              </h1>
              <p className="text-xl text-white/90 mb-8 leading-relaxed max-w-lg">
                Create stunning marketing campaigns with AI. Perfect for{" "}
                <span className="underline decoration-2 underline-offset-4">e-commerce</span>,{" "}
                <span className="underline decoration-2 underline-offset-4">social media</span>, and more!
              </p>
              <div className="flex flex-wrap gap-4">
                <Link href="/signup">
                  <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold px-8 py-6 text-base uppercase tracking-wide">
                    Download Now
                    <span className="block text-xs font-normal normal-case">For Free</span>
                  </Button>
                </Link>
                <Link href="#how-it-works">
                  <Button size="lg" variant="outline" className="border-white/50 text-white hover:bg-white/10 px-8 py-6 text-base">
                    <Play className="h-5 w-5 mr-2" />
                    See How It Works
                  </Button>
                </Link>
              </div>
            </div>
            <div className="relative hidden md:block">
              {/* Product mockup */}
              <div className="relative bg-white rounded-xl shadow-2xl p-4 transform rotate-2 hover:rotate-0 transition-transform">
                <div className="flex items-center gap-2 mb-3 pb-3 border-b">
                  <div className="w-3 h-3 rounded-full bg-red-400"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                  <div className="w-3 h-3 rounded-full bg-green-400"></div>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    "https://images.unsplash.com/photo-1523275335684-37898b6baf30?w=200&q=80", // Watch
                    "https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=200&q=80", // Headphones
                    "https://images.unsplash.com/photo-1572635196237-14b3f281503f?w=200&q=80", // Sunglasses
                    "https://images.unsplash.com/photo-1526170375885-4d8ecf77b99f?w=200&q=80", // Camera
                    "https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=200&q=80", // Sneaker
                    "https://images.unsplash.com/photo-1585386959984-a4155224a1ad?w=200&q=80", // Perfume
                  ].map((src, i) => (
                    <div key={i} className="aspect-square relative rounded overflow-hidden">
                      <Image
                        src={src}
                        alt={`Product ${i + 1}`}
                        fill
                        className="object-cover"
                      />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Diagonal divider at bottom */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg className="w-full h-16 md:h-24" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,100 100,0 100,100 0,100" fill="white" />
          </svg>
        </div>
      </section>

      {/* How It Works section */}
      <section id="how-it-works" className="py-24">
        <div className="container mx-auto px-4">
          <p className="text-center text-primary font-medium text-sm mb-2 uppercase tracking-wider">Productivity</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
            Do more with your marketing
          </h2>
          <p className="text-muted-foreground text-center mb-16 max-w-2xl mx-auto">
            Focus on selling and not content creation. AI-powered tools mean fewer distractions and make it clear what should be posted next.
          </p>

          <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                <ImageIcon className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">12 Product Images</h3>
              <p className="text-muted-foreground">
                Varied compositions, angles, and scenes to keep your feed fresh
              </p>
            </div>
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-6 bg-primary/10 rounded-2xl flex items-center justify-center">
                <FileText className="h-8 w-8 text-primary" />
              </div>
              <h3 className="text-xl font-bold mb-3">7 Captions</h3>
              <p className="text-muted-foreground">
                One week of engaging posts with hooks, CTAs, and hashtags
              </p>
            </div>
            <div className="text-center">
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

      {/* Feature section with photo background */}
      <section className="relative py-24">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80"
            alt="E-commerce workspace"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/90 to-accent/80"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10">
          <div className="grid md:grid-cols-2 gap-12 items-center">
            <div className="relative">
              <Image
                src="https://images.unsplash.com/photo-1556742393-d75f468bfcb0?w=600&q=80"
                alt="Person working on laptop"
                width={500}
                height={400}
                className="rounded-xl shadow-2xl"
              />
            </div>
            <div className="text-white">
              <p className="font-medium text-sm mb-2 uppercase tracking-wider text-white/80">Collaboration</p>
              <h2 className="text-3xl md:text-4xl font-bold mb-6">Do more together</h2>
              <p className="text-lg text-white/90 mb-6 leading-relaxed">
                Create campaigns and share them with your team. Keep everyone up to date even if they are working remotely. Empower your team members, designers, and marketers to collaborate seamlessly.
              </p>
              <Link href="/signup">
                <Button className="bg-white text-primary hover:bg-white/90 font-semibold">
                  Get Started Free
                </Button>
              </Link>
            </div>
          </div>
        </div>
        {/* Diagonal divider */}
        <div className="absolute bottom-0 left-0 right-0 z-10">
          <svg className="w-full h-16 md:h-24" viewBox="0 0 100 100" preserveAspectRatio="none">
            <polygon points="0,0 100,100 0,100" fill="white" />
          </svg>
        </div>
      </section>

      {/* Style Presets */}
      <section className="py-24 bg-muted">
        <div className="container mx-auto px-4">
          <p className="text-center text-primary font-medium text-sm mb-2 uppercase tracking-wider">Style Presets</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 text-foreground">
            Choose your visual style
          </h2>
          <div className="grid md:grid-cols-4 gap-6 max-w-5xl mx-auto">
            {PRESETS.map((preset) => (
              <div key={preset.name} className="bg-white rounded-xl shadow-lg p-6 text-center hover:shadow-xl transition-shadow">
                <preset.icon className="h-10 w-10 mx-auto mb-4 text-primary" />
                <h3 className="font-bold mb-2">{preset.name}</h3>
                <p className="text-sm text-muted-foreground">{preset.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="py-24">
        <div className="container mx-auto px-4">
          <p className="text-center text-primary font-medium text-sm mb-2 uppercase tracking-wider">Pricing</p>
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-4 text-foreground">
            Simple, transparent pricing
          </h2>
          <p className="text-muted-foreground text-center mb-12">
            Start free, upgrade when you need more
          </p>
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
                    className="w-full"
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

      {/* Final CTA with photo background */}
      <section className="relative py-24">
        <div className="absolute inset-0 z-0">
          <Image
            src="https://images.unsplash.com/photo-1522071820081-009f0129c71c?w=1920&q=80"
            alt="Team collaboration"
            fill
            className="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-primary/95 to-accent/90"></div>
        </div>
        <div className="container mx-auto px-4 relative z-10 text-center text-white">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to transform your marketing?
          </h2>
          <p className="text-xl text-white/90 mb-8 max-w-2xl mx-auto">
            Join thousands of e-commerce sellers creating professional product imagery in minutes.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link href="/signup">
              <Button size="lg" className="bg-white text-primary hover:bg-white/90 font-bold px-8 py-6 text-base uppercase tracking-wide">
                Get Started Free
              </Button>
            </Link>
          </div>
          <p className="text-sm text-white/70 mt-6">
            No credit card required • Free trial includes 1 campaign
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
