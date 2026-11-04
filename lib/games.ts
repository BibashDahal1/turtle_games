/**
 * All the games shown on the site. Add another object to GAMES and it appears in the carousel
 * and gets its own page at /games/<slug>.
 *
 * Box images live in  public/games/<slug>/  and are used from the web as  /games/<slug>/<file>.png
 * Every box has SIX faces: front, back, left, right, top (lid) and bottom.
 */

export interface GameBoxFaces {
  front: string;
  back: string;
  /** the narrow side you see when the box is turned to the left  (box_side_left.png) */
  left: string;
  /** the narrow side you see when the box is turned to the right (box_side_right.png) */
  right: string;
  /** the lid (box_top_lid_banded_cash.png) */
  top: string;
  /** the underside (box_bottom_disclaimer.png) */
  bottom: string;
}

export interface Game {
  slug: string;
  name: string;
  /** the name in its own script, shown on the game page (optional) */
  nameNative?: string;
  tagline: string;
  /** paragraphs of the description shown on the game page */
  blurb: string[];
  players: string;
  minutes: string;
  age: string;
  language: string;
  /** box colours: used as the fallback behind the faces and for accents */
  color: string;
  color2: string;
  accent: string;
  box: GameBoxFaces;
}

const BHRASHTA = "/games/bhrashta-neta";

export const GAMES: Game[] = [
  {
    slug: "bhrashta-neta",
    name: "Bhrashta Neta",
    nameNative: "भ्रष्ट नेता",
    tagline: "The Game Where Corrupt Always Get Caught",
    blurb: [
      "Welcome to Prithvikhowk, the heart of the nation. The Republic is in a state of “stable instability.” The old government has collapsed, and at this chaotic crossroads of tea-shop conspiracies, backroom deals and the smoke of burning tires, nobody is safe.",
      "The mission: survive the scandal. Outlast your “allies.” Be the last Neta standing, or go to jail and become a Darsak.",
      "Because in Prithvikhowk, the only rule that matters is: do not get caught.",
    ],
    players: "2–6",
    minutes: "15–20",
    age: "14+",
    language: "Nepali / English",
    color: "#6a1414",
    color2: "#2a0808",
    accent: "#f2b705",
    box: {
      front: `${BHRASHTA}/box_front.png`,
      back: `${BHRASHTA}/box_back.png`,
      left: `${BHRASHTA}/box_side_left.png`,
      right: `${BHRASHTA}/box_side_right.png`,
      top: `${BHRASHTA}/box_top_lid_banded_cash.png`,
      bottom: `${BHRASHTA}/box_bottom_disclaimer.png`,
    },
  },
  {
    slug: "bhrashta-neta 1",
    name: "Bhrashta Neta 1",
    nameNative: "भ्रष्ट नेता",
    tagline: "The Game Where Corrupt Always Get Caught",
    blurb: [
      "Welcome to Prithvikhowk, the heart of the nation. The Republic is in a state of “stable instability.” The old government has collapsed, and at this chaotic crossroads of tea-shop conspiracies, backroom deals and the smoke of burning tires, nobody is safe.",
      "The mission: survive the scandal. Outlast your “allies.” Be the last Neta standing, or go to jail and become a Darsak.",
      "Because in Prithvikhowk, the only rule that matters is: do not get caught.",
    ],
    players: "2–6",
    minutes: "15–20",
    age: "14+",
    language: "Nepali / English",
    color: "#6a1414",
    color2: "#2a0808",
    accent: "#f2b705",
    box: {
      front: `${BHRASHTA}/box_front.png`,
      back: `${BHRASHTA}/box_back.png`,
      left: `${BHRASHTA}/box_side_left.png`,
      right: `${BHRASHTA}/box_side_right.png`,
      top: `${BHRASHTA}/box_top_lid_banded_cash.png`,
      bottom: `${BHRASHTA}/box_bottom_disclaimer.png`,
    },
  },
  {
    slug: "bhrashta-neta 2",
    name: "Bhrashta Neta2",
    nameNative: "भ्रष्ट नेता",
    tagline: "The Game Where Corrupt Always Get Caught",
    blurb: [
      "Welcome to Prithvikhowk, the heart of the nation. The Republic is in a state of “stable instability.” The old government has collapsed, and at this chaotic crossroads of tea-shop conspiracies, backroom deals and the smoke of burning tires, nobody is safe.",
      "The mission: survive the scandal. Outlast your “allies.” Be the last Neta standing, or go to jail and become a Darsak.",
      "Because in Prithvikhowk, the only rule that matters is: do not get caught.",
    ],
    players: "2–6",
    minutes: "15–20",
    age: "14+",
    language: "Nepali / English",
    color: "#6a1414",
    color2: "#2a0808",
    accent: "#f2b705",
    box: {
      front: `${BHRASHTA}/box_front.png`,
      back: `${BHRASHTA}/box_back.png`,
      left: `${BHRASHTA}/box_side_left.png`,
      right: `${BHRASHTA}/box_side_right.png`,
      top: `${BHRASHTA}/box_top_lid_banded_cash.png`,
      bottom: `${BHRASHTA}/box_bottom_disclaimer.png`,
    },
  },
];
