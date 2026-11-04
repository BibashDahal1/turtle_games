import GameCarousel from "@/components/games/GameCarousel";
import { eyebrow, lead, sec, title } from "@/components/ui/classes";
import { GAMES } from "@/lib/games";

/**
 * Section 2 — "Our Games". Nav anchor: #games
 * The games themselves are listed in lib/games.ts; add one there and it shows up here.
 */
export default function TurtleGames() {
  return (
    <section id="games" className={`${sec} min-h-svh gap-4 py-20`}>
      <div data-reveal className="max-w-[560px]">
        <p className={eyebrow}>Our Games</p>
        <h2 className={title}>Pick Your Next Adventure</h2>
        <p className={lead}>
          Card and board games made by Turtle Games. Slide through the shelf,
          then tap a box to open its game.
        </p>
      </div>

      <div data-reveal className="w-full min-w-0">
        <GameCarousel games={GAMES} />
      </div>
    </section>
  );
}
