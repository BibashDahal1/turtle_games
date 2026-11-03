import SceneMount from "@/components/SceneMount";
import ScrollDriver from "@/components/ScrollDriver";
import Hero from "@/components/sections/Hero";
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
          {/* OCEAN LEGENDS */}
          <section
            id="games"
            className={`${sec} min-h-svh gap-8 md:flex-row md:items-center md:justify-between`}
          >
            <div data-reveal className="max-w-[440px]">
              <p className={eyebrow}>Our first game</p>
              <h2 className={title}>Ocean Legends</h2>
              <p className={lead}>
                A strategic card game set in the mystical depths of the ocean.
              </p>
              <ul className="mb-7 flex gap-6 text-sm text-muted">
                <li className="flex flex-col">
                  <b className="text-base text-ink">Strategic</b>
                  <span>Gameplay</span>
                </li>
                <li className="flex flex-col">
                  <b className="text-base text-ink">2–4</b>
                  <span>Players</span>
                </li>
                <li className="flex flex-col">
                  <b className="text-base text-ink">20–40</b>
                  <span>Min</span>
                </li>
              </ul>
              <a href="#about" className={btnGhost}>
                Learn More
              </a>
            </div>
            <aside
              data-reveal
              className={`${glass} w-full p-5 text-sm leading-normal md:w-[250px]`}
            >
              <h3 className="mb-1.5 font-bold">Ocean Guardian</h3>
              <span className="inline-block rounded-md bg-accent px-2.5 py-0.5 text-[0.7rem] font-semibold text-onaccent">
                Rare
              </span>
              <p className="mt-2">
                A wise protector of the deep. Brings balance to your hand.
              </p>
              <hr className="my-3 border-accent/30" />
              <p>
                <b>Cost:</b> 3
              </p>
              <p>
                <b>Effect:</b> Draw 1 card and gain 1 Energy.
              </p>
            </aside>
          </section>

          {/* ABOUT */}
          <section id="about" className={`${sec} min-h-svh`}>
            <div data-reveal className="max-w-[440px]">
              <p className={eyebrow}>About the game</p>
              <h2 className={title}>Dive into a World of Strategy</h2>
              <p className={lead}>
                Ocean Legends is a beautifully crafted card game where strategy
                meets the sea. Build powerful combos, outsmart your opponents,
                and harness the ocean&apos;s might!
              </p>
              <a href="#rules" className={btnGhost}>
                Discover More
              </a>
            </div>
          </section>

          {/* HOW TO PLAY */}
          <section
            id="rules"
            className={`${sec} min-h-svh gap-8 md:flex-row md:items-center md:justify-between`}
          >
            <div data-reveal className="max-w-[440px]">
              <p className={eyebrow}>How to play</p>
              <h2 className={title}>Simple Rules, Endless Possibilities</h2>
              <p className={lead}>
                Easy to learn, exciting to master. Here&apos;s how you can play:
              </p>
              <a href="#cta" className={btnGhost}>
                View Full Rules
              </a>
            </div>
            <ol className="flex list-none flex-col gap-6 md:flex-row md:gap-12 md:text-center">
              {STEPS.map((s) => (
                <li
                  key={s.n}
                  data-reveal
                  className="max-w-[190px] text-sm text-muted"
                >
                  <span
                    className={`${glass} inline-grid size-14 place-items-center !rounded-full text-xl font-extrabold text-accent`}
                  >
                    {s.n}
                  </span>
                  <h3 className="mt-3 mb-1 text-base font-bold text-ink">
                    {s.title}
                  </h3>
                  <p>{s.text}</p>
                </li>
              ))}
            </ol>
          </section>

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
