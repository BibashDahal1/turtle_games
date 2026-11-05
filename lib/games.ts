/**
 * All the games shown on the site. Add another object to GAMES and it appears in the carousel
 * and gets its own page at /games/<slug>.
 *
 * Box images live in  public/games/<slug>/  and are used from the web as  /games/<slug>/<file>.png
 * Every box has SIX faces: front, back, left, right, top (lid) and bottom.
 *
 * Card images live in  public/games/<slug>/cards/  (see `cards` and `cardBack` below).
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

/** One card of the game, shown as a flippable 3D card on the game page. */
export interface GameCardInfo {
  name: string;
  /** the name in its own script (optional) */
  nameNative?: string;
  /** artwork of the card FRONT: a PNG with transparent rounded corners */
  image: string;
  /** what the card does: shown on the BACK. Keep it short (about 150 characters) so it fits on small cards */
  description: string;
  /** the line the character says on the card, in its own script (optional) */
  quote?: string;
  /** English meaning of the quote (optional) */
  quoteEn?: string;
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
  /** the card back artwork (e.g. the thumb print). It is blurred and used behind the text on the back of every card */
  cardBack?: string;
  /** the cards shown in the "Meet the cards" section of the game page */
  cards?: GameCardInfo[];
}

const BHRASHTA = "/games/bhrashta-neta";
const TEST_A = "/games/bhrashta-neta-1";
const TEST_B = "/games/bhrashta-neta-2";

/*
 * Every game has its OWN cards: put the artwork in  public/games/<slug>/cards/  and list the cards
 * in the game's `cards` array below. `cardBack` is the artwork that is blurred behind the text on
 * the back of that game's cards.
 *
 * NOTE: the Bhrashta Neta descriptions and quote translations are placeholders written from the card art,
 * and the two test games use generated placeholder artwork. Replace them with the real thing.
 */

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
    cardBack: `${BHRASHTA}/cards/backCard.png`,
    cards: [
      {
        name: "Bhrashta Neta",
        nameNative: "भ्रष्ट नेता",
        image: `${BHRASHTA}/cards/02_bhrashta_neta.png`,
        description:
          "The corrupt politician. The face of every scandal in Prithvikhowk and the one everybody is watching. Keep your hands clean, or at least look like it.",
        quote: "म भ्रष्ट होइन, यो सबै AI हो!",
        quoteEn: "I'm not corrupt, it's all AI!",
      },
      {
        name: "Clean Chit",
        nameNative: "क्लिन चिट",
        image: `${BHRASHTA}/cards/03_clean_chit.png`,
        description:
          "Proven innocent. One stamp on a signed Clean Chit and the scandal becomes somebody else's problem.",
        quote: "मैले त केही गरेकै छैन, नभए हेर्नुस् न मेरो फाइल!",
        quoteEn: "I've done nothing, just look at my file!",
      },
      {
        name: "The Spy",
        nameNative: "सुराकी",
        image: `${BHRASHTA}/cards/04_the_spy.png`,
        description:
          "Rearrange the top 3 cards from the deck. The Spy sees what is coming and decides what comes next.",
        quote: "अब कसको दशा सुरु हुँदैछ, मलाई मात्र थाहा छ!",
        quoteEn: "Only I know whose bad days are about to begin!",
      },
      {
        name: "The Blockage",
        nameNative: "अवरोध",
        image: `${BHRASHTA}/cards/05_the_blockage.png`,
        description:
          "Stop any action played towards you, or skip your turn. One raised hand shuts the door on every scheme.",
      },
      {
        name: "The Thug",
        nameNative: "गुन्डा",
        image: `${BHRASHTA}/cards/06_the_thug.png`,
        description:
          "Collect a pair of the same card to steal from another player. Muscle for hire, and no questions asked.",
      },
    ],
  },
  {
    // slugs must not contain spaces (they become part of the URL), so these are "-1" / "-2"
    slug: "bhrashta-neta-1",
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
    color: "#14808f",
    color2: "#06222b",
    accent: "#2ec4b6",
    box: {
      front: `${BHRASHTA}/box_front.png`,
      back: `${BHRASHTA}/box_back.png`,
      left: `${BHRASHTA}/box_side_left.png`,
      right: `${BHRASHTA}/box_side_right.png`,
      top: `${BHRASHTA}/box_top_lid_banded_cash.png`,
      bottom: `${BHRASHTA}/box_bottom_disclaimer.png`,
    },
    // test deck A: 2 cards (checks a short row); one card has a quote, one does not
    cardBack: `${TEST_A}/cards/01_card_back.png`,
    cards: [
      {
        name: "Sand Castle",
        image: `${TEST_A}/cards/02_sand_castle.png`,
        description:
          "A sturdy defence built just in time. Block the next attack played against you.",
      },
      {
        name: "High Tide",
        nameNative: "ज्वार",
        image: `${TEST_A}/cards/03_high_tide.png`,
        description:
          "The water rises and everything is shuffled. Choose two players and swap their hands.",
        quote: "ज्वार आयो, सबै बग्यो!",
        quoteEn: "The tide came in and washed it all away!",
      },
    ],
  },
  {
    slug: "bhrashta-neta-2",
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
    color: "#6a3cc0",
    color2: "#170a33",
    accent: "#ffb703",
    box: {
      front: `${BHRASHTA}/box_front.png`,
      back: `${BHRASHTA}/box_back.png`,
      left: `${BHRASHTA}/box_side_left.png`,
      right: `${BHRASHTA}/box_side_right.png`,
      top: `${BHRASHTA}/box_top_lid_banded_cash.png`,
      bottom: `${BHRASHTA}/box_bottom_disclaimer.png`,
    },
    // test deck B: 5 cards (checks wrapping onto a second row)
    cardBack: `${TEST_B}/cards/01_card_back.png`,
    cards: [
      {
        name: "Starfish",
        nameNative: "तारा माछा",
        image: `${TEST_B}/cards/02_starfish.png`,
        description: "Five arms, many ideas. Draw two cards from the deck.",
      },
      {
        name: "Conch Shell",
        nameNative: "शंख",
        image: `${TEST_B}/cards/03_conch_shell.png`,
        description:
          "Hold it to your ear and the sea tells you secrets. Look at one hidden card.",
        quote: "समुद्रले सबै भन्छ!",
        quoteEn: "The sea tells everything!",
      },
      {
        name: "Sea Turtle",
        nameNative: "कछुवा",
        image: `${TEST_B}/cards/04_sea_turtle.png`,
        description:
          "Slow and steady. Skip your turn and stay safe until the next round.",
      },
      {
        name: "Coral Reef",
        image: `${TEST_B}/cards/05_coral_reef.png`,
        description:
          "A living wall that shelters its neighbours. Protect one player from the next attack.",
      },
      {
        name: "Pearl",
        nameNative: "मोती",
        image: `${TEST_B}/cards/06_pearl.png`,
        description: "Rare and shiny. Worth 3 points at the end of the game.",
        quote: "मोती सबैको सपना!",
        quoteEn: "Everyone's dream is a pearl!",
      },
    ],
  },
];
