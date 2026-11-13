import SceneMount from "@/components/SceneMount";
import ScrollDriver from "@/components/ScrollDriver";
import Hero from "@/components/sections/Hero";
import TurtleGames from "@/components/sections/TurtleGames";
import Turtle from "@/components/sections/Turtle";
import { btnGhost, btnLight, grad, sec } from "@/components/ui/classes";
import Logo from "@/components/Logo";
import WaterRipple from "@/components/effects/WaterRipple";
import ShopRoot from "@/components/shop/ShopRoot";
import SiteHeader from "@/components/SiteHeader";
import SupportAccessLink from "@/components/visitor/SupportAccessLink";

export default function Home() {
  return (
    <>
      <WaterRipple scope="window" quality={0.65} intensity={0.7} />
      <SceneMount />
      <ScrollDriver />
      <ShopRoot />

      <SiteHeader />

      <main className="relative">
        {/* 1. HERO (full-bleed, has its own padding) */}
        <Hero />

        <div className="relative z-10 px-4 sm:px-8 lg:px-16">
          {/* 2. OUR GAMES (own file: components/sections/TurtleGames.tsx) */}
          <TurtleGames />

          {/* ABOUT */}
          <section id="about" className={`${sec} min-h-svh`}>
            <Turtle />
          </section>

          {/* CTA */}
          <section
            id="contact"
            className={`${sec} min-h-[70svh] items-center text-center`}
          >
            <h2
              data-reveal
              className={`${grad} mb-4 text-[clamp(2rem,5vw,3.2rem)]`}
            >
              Ready to Dive In?
            </h2>
            <p data-reveal className="mb-6 text-ink/85">
              Get your copy of our games today and start your journey!
            </p>
            <div
              data-reveal
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <a href="#games" className={btnLight}>
                Buy Now
              </a>
              <SupportAccessLink className={btnGhost}>
                Support us
              </SupportAccessLink>
            </div>
          </section>
        </div>
      </main>

      <footer
        id="blog"
        className="relative z-10 flex flex-col items-center justify-between gap-3 bg-page/30 px-4 py-6 text-xs text-muted sm:flex-row md:px-12"
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
    </>
  );
}
