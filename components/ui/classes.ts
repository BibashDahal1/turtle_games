/** Shared Tailwind class sets (colours come from the theme tokens in globals.css). */
export const sec = "mx-auto flex w-full max-w-[1200px] flex-col justify-center";
export const eyebrow =
  "mb-4 text-xs font-semibold uppercase tracking-[0.3em] text-accent";
export const title =
  "mb-4 text-[clamp(2rem,4.5vw,3rem)] leading-[1.1] font-bold tracking-tight";
export const lead = "mb-6 max-w-[34ch] leading-relaxed text-ink/85";
export const grad =
  "bg-linear-to-r from-accent2 to-accent bg-clip-text text-transparent font-extrabold leading-[1.1]";

const btn =
  "inline-flex w-fit items-center justify-center rounded-full border px-7 py-3.5 text-sm font-bold transition hover:-translate-y-0.5 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ink motion-reduce:transition-none";
export const btnSolid = `${btn} border-accent bg-accent text-onaccent shadow-lg shadow-accent/30 hover:shadow-xl hover:shadow-accent/50`;
export const btnGhost = `${btn} border-accent bg-transparent text-ink hover:bg-accent/10`;
export const btnLight = `${btn} border-transparent bg-accent2 text-onaccent shadow-lg shadow-accent2/30`;
export const glass =
  "rounded-2xl border border-accent/30 bg-panel/60 backdrop-blur-md";
