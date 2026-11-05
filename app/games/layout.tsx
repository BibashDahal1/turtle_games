import type { ReactNode } from "react";
import SceneMount from "@/components/SceneMount";
import WaterRipple from "@/components/effects/WaterRipple";

/**
 * Shared by every page under /games/...: the same animated background and water ripple as the home page,
 * with the same settings, so the game pages look like part of the same site.
 *
 * The page content (app/games/[slug]/page.tsx) sits in a `relative z-10` <main>, above this background,
 * exactly like the home page's sections.
 */
export default function GamesLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <WaterRipple scope="window" quality={0.65} intensity={0.7} />
      {/* <SceneMount /> */}
      {children}
    </>
  );
}
