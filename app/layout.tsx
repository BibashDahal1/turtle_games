import type { Metadata, Viewport } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import TurtleLoader from "@/components/TurtleLoader";
import "./globals.css";

const font = Plus_Jakarta_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Turtle Games | Play. Collect. Explore.",
  description:
    "A creative game studio crafting immersive card and board games for every kind of player.",
};

export const viewport: Viewport = {
  viewportFit: "cover",
  width: "device-width",
  initialScale: 1,
};

// Page scroll is locked while the loader is on screen (pure CSS, no hydration mismatch).
const lock = "has-[#turtle-loader:not(.done)]:overflow-hidden";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`scroll-smooth ${lock}`}>
      <body
        className={`${font.className} ${lock} bg-page bg-[radial-gradient(120%_80%_at_70%_0%,var(--page-from)_0%,var(--page-to)_70%)] bg-fixed text-ink antialiased`}
      >
        <noscript>
          <style>{`#turtle-loader{display:none}html,body{overflow:auto!important}`}</style>
        </noscript>
        <TurtleLoader />
        {children}
      </body>
    </html>
  );
}
