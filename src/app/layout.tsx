import type { Metadata } from "next"
import "./globals.css"
import AppShell from "./app-shell"

export const metadata: Metadata = {
  title: "LongevityAI",
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
      <head>
        <script dangerouslySetInnerHTML={{ __html: `try{var t=localStorage.getItem('biotrack.theme.v1');if(t)document.documentElement.setAttribute('data-theme',t);}catch(e){}` }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=DM+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased" style={{ background: 'var(--bg)', color: 'var(--text)' }}>
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
