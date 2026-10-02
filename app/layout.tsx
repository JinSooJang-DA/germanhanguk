import type { Metadata } from "next";
import Header from "@/components/Header";
import Footer from "@/components/Footer"; // 1. Footer 임포트 추가
import ThemeProvider from "@/components/ThemeProvider";
import Script from "next/script";
import "leaflet/dist/leaflet.css";
import "./globals.css";
import "./styles/responsive-information.css";
import "./styles/responsive-community.css";

const themeInitScript = `(()=>{try{const key='germanhanguk-theme';const saved=localStorage.getItem(key);const preference=saved==='light'||saved==='dark'||saved==='system'?saved:'system';const resolved=preference==='system'?(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'):preference;const root=document.documentElement;root.dataset.theme=resolved;root.dataset.themePreference=preference;root.style.colorScheme=resolved==='light'?'only light':'dark'}catch(_){}})()`;

export const metadata: Metadata = {
  title: "German Hanguk",
  description: "독일 거주 한인을 위한 보금자리",
  icons: { icon: "/icon.png", apple: "/icon.png" },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="ko"
      suppressHydrationWarning
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">
        <Script id="theme-init" strategy="beforeInteractive">{themeInitScript}</Script>
        <ThemeProvider>
          <Header />
          <div style={{ flex: 1 }}>{children}</div> {/* 본문 영역 */}
          <Footer /> {/* 2. body 맨 아래에 Footer 추가 */}
        </ThemeProvider>
      </body>
    </html>
  );
}
