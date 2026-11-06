import type { ReactNode } from "react";
import GameSceneMount from "@/components/scene/GameSceneMount";
import WaterRipple from "@/components/effects/WaterRipple";

/**
 * Shared by every page under /games/...: the same water ripple as the home page, plus the swimming turtle.
 * The page content (app/games/[slug]/page.tsx) sits in a `relative z-10` <main>, above this background.
 */
export default function GamesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <WaterRipple scope="window" quality={0.65} intensity={0.7} />
      <GameSceneMount />
      {children}
    </>
  );
}
