/**
 * Types for the games shown on the site.
 *
 * The data itself now comes from the Django API (GET /api/games/) and lives in the
 * Redux store: see src/store/gamesSlice.ts and src/hooks/useGames.ts.
 * The static GAMES array has been removed: games and cards are now added in the Django admin.
 *
 * Images are full Cloudinary URLs. Every box has SIX faces:
 * front, back, left, right, top (lid) and bottom.
 */

export interface GameBoxFaces {
  front: string;
  back: string;
  /** the narrow side you see when the box is turned to the left */
  left: string;
  /** the narrow side you see when the box is turned to the right */
  right: string;
  /** the lid */
  top: string;
  /** the underside */
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
  /** the card back artwork. It is blurred and used behind the text on the back of every card */
  cardBack?: string;
  /** the cards shown in the "Meet the cards" section of the game page */
  cards?: GameCardInfo[];
  /** price of one box. Both price and currency are left out by the API when the game cannot be ordered */
  price?: number;
  /** ISO currency code of the price, e.g. "NPR" */
  currency?: string;
}
