import type { Metadata } from "next";
import { Suspense } from "react";
import GameView, { GameFallback } from "@/components/games/GameView";
import StoreProvider from "@/store/StoreProvider";

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
 */
export default function GamePage({ params }: Props) {
  return (
    <main className="relative z-10 px-4 sm:px-8 lg:px-16">
      <Suspense fallback={<GameFallback />}>
        <GameContent params={params} />
      </Suspense>
    </main>
  );
}

async function GameContent({ params }: Props) {
  const { slug } = await params;
  return (
    <StoreProvider>
      <GameView slug={slug} />
    </StoreProvider>
  );
}
