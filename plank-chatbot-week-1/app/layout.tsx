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
    fill="none"
    viewBox="0 0 240 41"
    className="h-8 flex-shrink-0 self-start"
  >
    <path
      fill="currentColor"
      d="M61.514 11.157a3.943 3.943 0 0 0-2.806 1.158l-3.018 3.01a3.951 3.951 0 0 0-1.147 3.095l.019.191a3.894 3.894 0 0 0 1.128 2.314c.435.434.914.709 1.496.9.03.175.047.352.047.53 0 .797-.31 1.546-.874 2.107l-.186.186c-1.008-.344-1.848-.847-2.607-1.604a6.888 6.888 0 0 1-1.927-3.67l-.034-.193-.153.124a3.675 3.675 0 0 0-.294.265l-3.018 3.01a3.957 3.957 0 0 0 2.807 6.757 3.959 3.959 0 0 0 2.806-1.158l3.019-3.01a3.958 3.958 0 0 0 0-5.599 3.926 3.926 0 0 0-1.462-.92 3.252 3.252 0 0 1 .924-2.855 6.883 6.883 0 0 1 2.664 1.656 6.906 6.906 0 0 1 1.926 3.67l.035.193.153-.124c.104-.083.202-.173.296-.267l3.018-3.01a3.956 3.956 0 0 0-2.808-6.756h-.004Z"
    />
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
        <link rel="shortcut icon" href="/images/favicon.ico" />
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
