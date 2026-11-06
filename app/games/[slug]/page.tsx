import type { Metadata } from "next";
import { Suspense } from "react";
import GameView, { GameFallback } from "@/components/games/GameView";
import GameBuyBar from "@/components/shop/GameBuyBar";
import ShopRoot from "@/components/shop/ShopRoot";
import VisitorGate from "@/components/visitor/VisitorGate";

/**
 * Games now come from the Django API, so there is nothing to pre-render from a static list:
 * generateStaticParams is gone, and the title is set per game in GameView once the data has loaded.
 */
export const metadata: Metadata = {
  title: "Game | Turtle Games",
  description: "Explore the box, the cards and how to play.",
};

type Props = { params: Promise<{ slug: string }> };

/**
 * The page itself does NOT read `params`. Reading the URL happens inside <Suspense> (GameContent),
 * so Next.js can send this static shell instantly and stream the game in.
 *
 * The visitor gate lives HERE (not in the layout) so the layout always renders {children}.
 * StoreProvider now comes from the layout, so it is no longer needed in this file.
 */
export default function GamePage({ params }: Props) {
  return (
    <VisitorGate>
      {/* cart drawer + order form + keeps prices loaded */}
      <ShopRoot />
      {/* pb-28 keeps the bottom bar from covering the end of the page */}
      <main className="relative z-10 px-4 pb-28 sm:px-8 lg:px-16">
        <Suspense fallback={<GameFallback />}>
          <GameContent params={params} />
        </Suspense>
      </main>
    </VisitorGate>
  );
}

async function GameContent({ params }: Props) {
  const { slug } = await params;
  return (
    <>
      <GameView slug={slug} />
      <GameBuyBar slug={slug} />
    </>
  );
}
