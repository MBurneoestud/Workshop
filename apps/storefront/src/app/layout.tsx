import { getBaseURL } from "@lib/util/env"
import { Noto_Serif_JP, Source_Sans_3 } from "next/font/google"
import { Metadata } from "next"
import { STORE_DESCRIPTION, STORE_NAME } from "@lib/store"
import "../styles/globals.css"

const notoSerif = Noto_Serif_JP({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-noto-serif",
  display: "swap",
})

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-source-sans",
  display: "swap",
})

export const metadata: Metadata = {
  metadataBase: new URL(getBaseURL()),
  title: STORE_NAME,
  description: STORE_DESCRIPTION,
}

export default function RootLayout(props: { children: React.ReactNode }) {
  return (
    <html
      lang="es"
      data-mode="light"
      className={`${notoSerif.variable} ${sourceSans.variable}`}
    >
      <body className="font-sans bg-keiko-paper text-keiko-ink antialiased">
        <main className="relative">{props.children}</main>
      </body>
    </html>
  )
}
