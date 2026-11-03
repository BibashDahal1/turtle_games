import WaterRipple from "@/components/effects/WaterRipple";
import { btnSolid, eyebrow, grad, lead } from "@/components/ui/classes";
import Logo from "@/components/Logo";

/**
 * Layering (no stacking context is created here on purpose):
 *   water canvas z-[1]  <  3D scene z-[2] (turtle floats above the water)  <  content z-10
 */
export default function Hero() {
  return (
    <section
      id="home"
      className="relative flex min-h-svh items-center overflow-hidden"
    >
      <div className="relative z-10 mx-auto w-full max-w-[1200px] px-4 pt-28 pb-16 sm:px-8 lg:px-16">
        <p data-hero className={eyebrow}>
          Card • Board • Beyond
        </p>
        <h1
          data-hero
          className="text-[clamp(3.2rem,9vw,6rem)] leading-none font-extrabold tracking-tighter"
        >
          <Logo className="" />
        </h1>
        <h2
          data-hero
          className={`${grad} mt-1 mb-4 text-[clamp(2rem,5vw,3.2rem)]`}
        >
          Play. Collect. Explore.
        </h2>
        <p data-hero className={lead}>
          A creative game studio crafting immersive card and board games for
          every kind of player.
        </p>
        <a data-hero href="#games" className={btnSolid}>
          Explore Our Game
        </a>
      </div>
    </section>
  );
}
