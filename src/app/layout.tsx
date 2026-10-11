import type { Metadata } from "next"
import "./globals.css"
import AppShell from "./app-shell"

export const metadata: Metadata = {
  title: "BioTrack - Longevity AI",
  description: "AI destekli kişisel takviye asistanı",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon-192.png",
    apple: "/apple-touch-icon.png",
  },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="tr">
      <body className="bg-[#000000] text-[#e0d8c8] antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
