import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Link from "next/link";
import { ClerkProvider } from "@clerk/nextjs";
import AuthButtons from "@/components/AuthButtons";
import { ClerkAuthSync } from "@/lib/clerk";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "MaintainIQ - AI-Powered Asset Maintenance",
  description: "QR-powered maintenance tracking with AI triage",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <ClerkProvider>
      <ClerkAuthSync />
      <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full`}>
        <body className="min-h-full flex flex-col bg-gray-50">
          <header className="bg-white border-b border-gray-200 shadow-sm">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
              <div className="flex items-center justify-between h-16">
                <Link href="/" className="flex items-center gap-2">
                  <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                    <span className="text-white font-bold text-sm">M</span>
                  </div>
                  <span className="text-xl font-bold text-gray-900">MaintainIQ</span>
                </Link>
                <nav className="flex items-center gap-6">
                  <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                    Dashboard
                  </Link>
                  <Link href="/dashboard/assets" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                    Assets
                  </Link>
                  <Link href="/dashboard/issues" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                    Issues
                  </Link>
                  <Link href="/track" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition">
                    Track
                  </Link>
                  <div className="flex items-center gap-3">
                    <AuthButtons />
                  </div>
                </nav>
              </div>
            </div>
          </header>
          <main className="flex-1">{children}</main>
        </body>
      </html>
    </ClerkProvider>
  );
}
