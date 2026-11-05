import { eyebrow, sec, title } from "@/components/ui/classes";

/**
 * Meet the founder: a Wikipedia-style profile of the turtle who creates the games.
 *
 * The infobox (photo + facts) FLOATS to the right, so the article text starts at the left,
 * runs down beside the infobox, and then continues underneath it at full width, exactly
 * like a Wikipedia page. On small screens the infobox sits on top, full width.
 *
 * Everything you may want to edit is in PROFILE below. The demo text is a placeholder.
 * No backgrounds: only theme text colours (ink / muted / accent) and thin borders.
 */
const PROFILE = {
  name: "Kachuwa",
  native: "कछुवा",
  tagline: "Founder and game designer",
  /** transparent PNG, put it in public/turtle/ */
  photo: "/turtle/turtle-mascot.png",
  photoAlt: "Kachuwa the turtle, founder of the games",
  caption: "Kachuwa, founder and creator of every game on this site.",
  facts: [
    ["Born", "Beside a slow river, a very long time ago"],
    ["Nationality", "Nepali"],
    ["Occupation", "Game designer, founder"],
    ["Years active", "2020 – present"],
    ["Known for", "Bhrashta Neta"],
    ["Home", "A sunny sandbank"],
    ["Motto", "Slow and steady wins the game"],
  ] as const,
  /** The first paragraph is introduced by the bold name. Add or remove paragraphs freely. */
  paragraphs: [
    "is a sea turtle, game designer and the founder of this studio. Famous for taking the long way round, Kachuwa believes that the best games are the ones that are never rushed, and that a good rule is one you can explain before the tea gets cold.",
    "Kachuwa grew up on a quiet sandbank, where the evenings were long and the only entertainment was whatever could be drawn in the sand. Cards, tokens and rules made from shells and pebbles became the first prototypes, and every passing crab was a willing, if unreliable, play-tester.",
    "After years of testing games on friends and visitors, Kachuwa founded the studio to share them with everyone. Every box is designed, written and play-tested by hand, from the first rule to the last card, and nothing leaves the sandbank until it has made a table laugh at least three times.",
    "The first game to wash ashore was Bhrashta Neta, a fast and mischievous card game set in the chaotic republic of Prithvikhowk, where the only rule that matters is not to get caught. It was followed by a growing shelf of games that all share the same spirit: short rounds, big laughs and no one left behind.",
    "Kachuwa's design philosophy is simple. A game should be easy to learn in minutes, impossible to predict and just a little bit unfair in the most entertaining way. Components are chosen to feel good in the hand, the artwork is drawn to be looked at for longer than the game lasts, and the rulebook is written to be read out loud.",
    "Away from the table, Kachuwa can usually be found basking on the same sunny sandbank, sketching the next idea in the sand and waiting for the tide to wash it away. The tide, in the end, is the harshest editor, and the ideas that survive a few high tides are the ones that become games.",
    "Today the studio is still a one-turtle operation with a lot of friends. New games arrive slowly, never rushed, and always worth the wait.",
  ],
};

export default function Turtle() {
  return (
    <section id="turtle" className={`${sec} min-h-svh gap-4 py-16`}>
      <div data-reveal className="max-w-[560px]">
        <p className={eyebrow}>Meet the Founder</p>
        <h2 className={title}>The Turtle Behind the Games</h2>
      </div>

      {/* flow-root makes the container grow to contain the floated infobox */}
      <article data-reveal className="flow-root">
        {/* infobox: first in the DOM so it floats up beside the heading and the first paragraph */}
        <aside
          aria-label={`${PROFILE.name} at a glance`}
          className="mx-auto mb-6 w-full max-w-[360px] rounded-xl border border-accent/30 p-4 md:mb-4 md:ml-8 md:float-right md:w-80 md:max-w-none"
        >
          <p className="mb-3 text-center text-lg font-bold text-accent">
            {PROFILE.name}
          </p>

          <figure className="mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={PROFILE.photo}
              alt={PROFILE.photoAlt}
              draggable={false}
              loading="lazy"
              className="mx-auto block max-h-72 w-auto max-w-full object-contain drop-shadow-xl select-none"
            />
            <figcaption className="mt-2 text-center text-xs leading-snug text-muted">
              {PROFILE.caption}
            </figcaption>
          </figure>

          <dl className="text-sm">
            {PROFILE.facts.map(([k, v]) => (
              <div
                key={k}
                className="grid grid-cols-[6.5rem_1fr] gap-3 border-t border-accent/20 py-2"
              >
                <dt className="font-semibold text-muted">{k}</dt>
                <dd className="text-ink">{v}</dd>
              </div>
            ))}
          </dl>
        </aside>

        {/* flow-root = own block formatting context, so the underline stops at the infobox instead of running under it */}
        <h3 className="flow-root border-b border-ink/20 pb-2 text-3xl font-bold tracking-tight">
          {PROFILE.name}
          <span lang="ne" className="ml-3 text-xl font-medium text-muted">
            {PROFILE.native}
          </span>
        </h3>
        <p className="mt-1 mb-5 text-sm text-muted italic">{PROFILE.tagline}</p>

        {/* no max-width on the paragraphs: they must be free to run up to the infobox and then under it */}
        {PROFILE.paragraphs.map((p, i) => (
          <p key={i} className="mb-4 leading-relaxed text-ink/85">
            {i === 0 && (
              <b className="font-semibold text-ink">{PROFILE.name} </b>
            )}
            {p}
          </p>
        ))}
      </article>
    </section>
  );
}
