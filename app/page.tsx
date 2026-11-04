import SceneMount from "@/components/SceneMount";
import ScrollDriver from "@/components/ScrollDriver";
import Hero from "@/components/sections/Hero";
import TurtleGames from "@/components/sections/TurtleGames";
import {
  btnGhost,
  btnLight,
  btnSolid,
  eyebrow,
  glass,
  grad,
  lead,
  sec,
  title,
} from "@/components/ui/classes";
import Logo from "@/components/Logo";
import WaterRipple from "@/components/effects/WaterRipple";

const NAV = ["Games", "About", "Rules", "Blog", "Contact"];

const STEPS = [
  {
    n: 1,
    title: "Build Your Deck",
    text: "Choose your cards and plan your strategy.",
  },
  {
    n: 2,
    title: "Play Your Turns",
    text: "Use cards, trigger effects and outplay your rivals.",
  },
  { n: 3, title: "Claim Victory", text: "Be the last one standing!" },
];

export default function Home() {
  return (
    <>
      <WaterRipple scope="window" quality={0.65} intensity={0.7} />
      <SceneMount />
      <ScrollDriver />

      <header className="fixed inset-x-0 top-0 z-50 flex items-center justify-between gap-4 bg-linear-to-b from-page/80 to-transparent px-4 py-5 md:px-12">
        <a
          href="#home"
          aria-label="Turtle Games home"
          className="flex items-center"
        >
          <Logo priority />
        </a>
        <nav className="hidden gap-10 text-sm font-medium md:flex">
          {NAV.map((n) => (
            <a key={n} href={`#${n.toLowerCase()}`}>
              {n}
            </a>
          ))}
        </nav>
        <a href="#cta" className={`${btnSolid} !px-5 !py-2 !text-xs`}>
          Get the Game
        </a>
      </header>

      <main className="relative">
        {/* 1. HERO (full-bleed, has its own padding) */}
        <Hero />

        {/* Remaining sections: built one at a time next */}
        <div className="relative z-10 px-4 sm:px-8 lg:px-16">
          {/* 2. OUR GAMES (own file: components/sections/TurtleGames.tsx) */}
          <TurtleGames />

          {/* ABOUT */}
          <section id="about" className={`${sec} min-h-svh`}></section>

          {/* HOW TO PLAY */}
          <section
            id="rules"
            className={`${sec} min-h-svh gap-8 md:flex-row md:items-center md:justify-between`}
          ></section>

          {/* CTA */}
          <section
            id="cta"
            className={`${sec} min-h-[70svh] items-center text-center`}
          >
            <h2
              data-reveal
              className={`${grad} mb-4 text-[clamp(2rem,5vw,3.2rem)]`}
            >
              Ready to Dive In?
            </h2>
            <p data-reveal className="mb-6 text-ink/85">
              Get your copy of Ocean Legends today and start your journey!
            </p>
            <a data-reveal href="#" className={btnLight}>
              Buy Now
            </a>
          </section>
        </div>
      </main>

      <footer
        id="blog"
        className="relative z-10 flex flex-wrap items-center justify-between gap-4 bg-page/90 px-4 py-6 text-xs text-muted md:px-12"
      >
        <a
          href="#home"
          aria-label="Turtle Games home"
          className="flex items-center"
        >
          <Logo className="h-9 md:h-10" />
        </a>
        <nav className="flex gap-8 text-sm font-medium">
          {NAV.map((n) => (
            <a key={n} href={`#${n.toLowerCase()}`}>
              {n}
            </a>
          ))}
        </nav>
        <small>© 2026 Turtle Games. All rights reserved.</small>
      </footer>
    </>
  );
}
