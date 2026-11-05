import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Suspense } from "react";
import BoxViewer from "@/components/games/BoxViewer";
import CardShowcase from "@/components/games/CardShowcase";
import HomeLink from "@/components/ui/HomeLink";
import {
  btnGhost,
  btnSolid,
  eyebrow,
  lead,
  sec,
  title,
} from "@/components/ui/classes";
import { GAMES } from "@/lib/games";

/** Pre-renders one page per game. Unknown slugs fall through to notFound() below. */
export function generateStaticParams() {
  return GAMES.map((g) => ({ slug: g.slug }));
}

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const game = GAMES.find((g) => g.slug === slug);
  if (!game) return {};
  return {
    title: `${game.name} | Turtle Games`,
    description: game.tagline,
  };
}

/**
 * The page itself does NOT read `params`. Reading the URL happens inside <Suspense> (GameContent),
 * so Next.js can send this static shell instantly and stream the game in: that is what the
 * "URL data outside of <Suspense>" error asks for.
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
  const game = GAMES.find((g) => g.slug === slug);
  if (!game) notFound();

  return (
    <>
      <section
        className={`${sec} min-h-svh gap-10 py-28 md:flex-row md:items-center md:justify-between`}
      >
        <div className="max-w-[560px]">
          <HomeLink
            hash="games"
            className="mb-6 inline-block text-sm font-medium text-muted hover:text-ink"
          >
            ← Back to all games
          </HomeLink>
          <p className={eyebrow}>Turtle Games</p>
          <h1 className={title}>{game.name}</h1>
          <p className={lead}>{game.tagline}</p>

          <ul className="mb-8 flex gap-8 text-xs text-muted">
            <li className="flex flex-col">
              <b className="text-lg text-ink">{game.players}</b>
              <span>Players</span>
            </li>
            <li className="flex flex-col">
              <b className="text-lg text-ink">{game.minutes}</b>
              <span>Min</span>
            </li>
            <li className="flex flex-col">
              <b className="text-lg text-ink">{game.age}</b>
              <span>Ages</span>
            </li>
          </ul>

          <div className="flex flex-wrap gap-3">
            <HomeLink hash="cta" className={btnSolid}>
              Get the Game
            </HomeLink>
            <HomeLink hash="games" className={btnGhost}>
              More games
            </HomeLink>
          </div>
        </div>

        {/* the 3D box: hovers over a platform, drag to rotate */}
        <BoxViewer game={game} />
      </section>

      {/* the cards inside the box: flip them to read what they do (renders nothing if the game has no cards) */}
      <CardShowcase game={game} />
    </>
  );
}

/** Same layout as the hero, with grey placeholders, shown for a moment while the game loads. */
function GameFallback() {
  return (
    <section
      aria-busy="true"
      className={`${sec} min-h-svh gap-10 py-28 md:flex-row md:items-center md:justify-between`}
    >
      <div className="w-full max-w-[560px] animate-pulse" aria-hidden>
        <div className="mb-6 h-4 w-40 rounded bg-ink/10" />
        <div className="mb-4 h-3 w-28 rounded bg-ink/10" />
        <div className="mb-4 h-12 w-3/4 rounded bg-ink/10" />
        <div className="mb-8 h-4 w-2/3 rounded bg-ink/10" />
        <div className="h-12 w-44 rounded-full bg-ink/10" />
      </div>
      <div
        className="h-80 w-full max-w-[340px] animate-pulse rounded-2xl bg-ink/5 md:flex-1"
        aria-hidden
      />
    </section>
  );
}
