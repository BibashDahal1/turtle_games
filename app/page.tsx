import SceneMount from "@/components/SceneMount";
import ScrollDriver from "@/components/ScrollDriver";
import Hero from "@/components/sections/Hero";
import TurtleGames from "@/components/sections/TurtleGames";
import Turtle from "@/components/sections/Turtle";
import {
  btnGhost,
  btnLight,
  btnSolid,
  grad,
  sec,
} from "@/components/ui/classes";
import Logo from "@/components/Logo";
import WaterRipple from "@/components/effects/WaterRipple";
import VisitorGate from "@/components/visitor/VisitorGate";
import SignOutButton from "@/components/visitor/SignOutButton";
import CartButton from "@/components/shop/CartButton";
import ShopRoot from "@/components/shop/ShopRoot";

const NAV = ["Home", "Games", "About", "Support"];

export default function Home() {
  return (
    // The gate lives in the PAGE (not the layout) so the layout always renders {children}.
    <VisitorGate>
      <WaterRipple scope="window" quality={0.65} intensity={0.7} />
      <SceneMount />
      <ScrollDriver />
      <ShopRoot />

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
        <div className="flex items-center gap-2 sm:gap-3">
          <CartButton className={`${btnGhost} !px-4 !py-2 !text-xs`} />
          <SignOutButton
            className={`${btnGhost} hidden !px-4 !py-2 !text-xs sm:inline-flex`}
          />
          <a href="#games" className={`${btnSolid} !px-5 !py-2 !text-xs`}>
            Get the Game
          </a>
        </div>
      </header>

      <main className="relative">
        {/* 1. HERO (full-bleed, has its own padding) */}
        <Hero />

        {/* Remaining sections: built one at a time next */}
        <div className="relative z-10 px-4 sm:px-8 lg:px-16">
          {/* 2. OUR GAMES (own file: components/sections/TurtleGames.tsx) */}
          <TurtleGames />
          {/* ABOUT */}
          <section id="about" className={`${sec} min-h-svh`}>
            {" "}
            <Turtle />
          </section>

          {/* CTA / SUPPORT */}
          <section
            id="support"
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
        className="relative z-10 flex flex-wrap items-center justify-between gap-4 border-t border-ink/15 bg-transparent px-4 py-6 text-xs text-muted backdrop-blur-sm md:px-12"
      >
        <a
          href="#home"
          aria-label="Turtle Games home"
          className="flex items-center"
        >
          <Logo className="h-9 md:h-10" />
        </a>

        <small>© 2026 Turtle Games. All rights reserved.</small>
      </footer>
    </VisitorGate>
  );
}
