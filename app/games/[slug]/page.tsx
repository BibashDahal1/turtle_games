import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import BoxViewer from "@/components/games/BoxViewer";
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

export default async function GamePage({ params }: Props) {
  const { slug } = await params;
  const game = GAMES.find((g) => g.slug === slug);
  if (!game) notFound();

  return (
    <main className="relative z-10 px-4 sm:px-8 lg:px-16">
      <section
        className={`${sec} min-h-svh gap-10 py-28 md:flex-row md:items-center md:justify-between`}
      >
        <div className="max-w-[560px]">
          <Link
            href="/#games"
            className="mb-6 inline-block text-sm font-medium text-muted hover:text-ink"
          >
            ← Back to all games
          </Link>
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
            <Link href="/#cta" className={btnSolid}>
              Get the Game
            </Link>
            <Link href="/#games" className={btnGhost}>
              More games
            </Link>
          </div>
        </div>

        {/* the 3D box: hovers over a platform, drag to rotate */}
        <BoxViewer game={game} />
      </section>
    </main>
  );
}
