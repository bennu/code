import type { Metadata } from "next"
import { DM_Mono, DM_Sans, Syne, Michroma } from "next/font/google"
import { ReactNode } from "react"
import ThemeWrapper from "@/components/ThemeWrapper"

const michroma = Michroma({
  variable: "--font-michroma",
  subsets: ["latin"],
  weight: "400",
})

const syne = Syne({
  variable: "--font-syne",
  subsets: ["latin"],
  weight: ["400", "500", "700", "800"],
})

const dmMono = DM_Mono({
  variable: "--font-dm-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
})

const dmSans = DM_Sans({
  variable: "--font-dm-sans",
  subsets: ["latin"],
  weight: ["400", "500", "700"],
})

export const metadata: Metadata = {
  title: "Bennu Inicializador",
  description: "Genera proyectos fullstack listos para producción en segundos",
  icons: {
    icon: "/icon.svg",
  },
}

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode
}>) {
  return (
    <html lang="en">
      <body
        className={`${syne.variable} ${dmMono.variable} ${dmSans.variable} ${michroma.variable}`}
        style={{ margin: 0, padding: 0 }}
      >
        <ThemeWrapper>{children}</ThemeWrapper>
      </body>
    </html>
  )
}
