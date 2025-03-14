import "./globals.css";
import { Public_Sans } from "next/font/google";
import { ActiveLink } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { GithubIcon } from "lucide-react";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AuthButton } from "@/components/AuthButton";
import type { Metadata } from "next";

const publicSans = Public_Sans({ subsets: ["latin"] });

const Logo = () => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 100 40"
    className="h-8 flex-shrink-0 self-start"
  >
    {/* Trident base */}
    <path
      fill="currentColor"
      d="M45 25L50 35L55 25L50 15L45 25Z"
      className="text-navy-400"
    />
    {/* Trident prongs */}
    <path
      fill="currentColor"
      d="M50 5L45 15L50 25L55 15L50 5Z"
      className="text-navy-400"
    />
    <path
      fill="currentColor"
      d="M35 15L40 25L45 15L40 5L35 15Z"
      className="text-navy-400"
    />
    <path
      fill="currentColor"
      d="M65 15L60 25L65 35L70 25L65 15Z"
      className="text-navy-400"
    />
    {/* Circle background */}
    <circle
      cx="50"
      cy="20"
      r="18"
      className="text-navy-600"
      fill="currentColor"
    />
    {/* Text */}
    <text
      x="50"
      y="35"
      textAnchor="middle"
      className="text-navy-300 font-mono text-xs font-bold fill-current tracking-wider"
    >
      NAVY SEALS
    </text>
  </svg>
);

export const metadata: Metadata = {
  title: "David - SEAL Agent Chatbot",
  description: "Chat with David, a tough marine seal agent who can help you with tasks while maintaining his strict military demeanor.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <title>Chat App</title>
        <link rel="shortcut icon" href="/images/favicon.svg" />
        <meta
          name="description"
          content="A modern chat application built with Next.js and Supabase"
        />
        <meta property="og:title" content="Chat App" />
        <meta
          property="og:description"
          content="A modern chat application built with Next.js and Supabase"
        />
        <meta property="og:image" content="/images/og-image.png" />
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Chat App" />
        <meta
          name="twitter:description"
          content="A modern chat application built with Next.js and Supabase"
        />
        <meta name="twitter:image" content="/images/og-image.png" />
      </head>
      <body className={publicSans.className}>
        <NuqsAdapter>
          <div className="bg-secondary grid grid-rows-[auto,1fr] h-[100dvh]">
            <div className="grid grid-cols-[1fr,auto] gap-2 p-4">
              <div className="flex gap-4 flex-col md:flex-row md:items-center">
                <a
                  href="/"
                  rel="noopener noreferrer"
                  target="_blank"
                  className="flex items-center gap-2"
                >
                  <Logo />
                </a>
              </div>

              <div className="flex gap-2 justify-center">
                <AuthButton />
              </div>
            </div>
            <div className="flex items-center justify-center p-4">
              <div className="bg-background relative grid rounded-2xl border border-input w-full max-w-4xl h-[calc(100vh-12rem)] shadow-lg">
                <div className="absolute inset-0 overflow-hidden rounded-2xl">{children}</div>
              </div>
            </div>
          </div>
          <Toaster position="top-center" richColors />
        </NuqsAdapter>
      </body>
    </html>
  );
}
