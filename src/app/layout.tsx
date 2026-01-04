import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "FluxShield - AI-Powered Marketing Campaign Generator",
  description:
    "Generate stunning product campaign packs with AI. Upload your Shopify product, choose a style, and get 18 images + 7 captions ready to post.",
  keywords: ["marketing", "AI", "Shopify", "product photography", "social media"],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
