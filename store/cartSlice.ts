import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";

import {
  ApiError,
  apiDelete,
  apiGet,
  apiPatch,
  apiPost,
  apiPut,
  getErrorMessage,
} from "@/lib/api";
import type { Game } from "@/lib/games";

import { selectAllGames, selectGamesStatus } from "./gamesSlice";
import { logoutVisitor, sessionExpired } from "./visitorSlice";

// Mirror the backend limits (SHOP_MAX_QUANTITY_PER_ITEM and MAX_GAMES_IN_CART).
// The backend is the real authority: these only keep the buttons honest.
export const MAX_QUANTITY_PER_GAME = 10;
export const MAX_GAMES_IN_CART = 20;

export interface CartItem {
  slug: string;
  quantity: number;
}

export interface CartLine {
  game: Game;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

/** What the visitor tells us so we can contact them and arrange payment and delivery. */
export interface CartDetails {
  firstName: string;
  middleName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  address: string;
  landmark: string;
  note: string;
}

const DETAIL_KEYS: (keyof CartDetails)[] = [
  "firstName",
  "middleName",
  "lastName",
  "email",
  "phone",
  "country",
  "city",
  "address",
  "landmark",
  "note",
];

export type DetailsFieldErrors = Partial<Record<keyof CartDetails, string[]>>;

export interface DetailsFailure {
  message: string;
  fieldErrors: DetailsFieldErrors;
}

/** idle: not asked yet. loading. loaded: the cart came from the server. failed: could not reach it. */
export type ServerCartStatus = "idle" | "loading" | "loaded" | "failed";

/**
 * HOW THE CART WORKS
 * There is no separate "order". The cart lives on the server (one per visitor) and the admin reads it
 * there, together with the delivery details the visitor saved, then contacts them by phone or email.
 * Every change (add, set quantity, remove) is one small request, sent one after another in order, and
 * every reply is the WHOLE cart as the server now has it. The screen shows a change immediately
 * (optimistic) and then shows what the server replied. If the server refuses a change, the screen
 * goes back to the last cart the server confirmed.
 */
export interface CartState {
  /** what the screen shows */
  items: CartItem[];
  /** the cart as the server last reported it (used to undo a change the server refused) */
  confirmed: CartItem[];
  /** the delivery details saved on the server, or null until the visitor has saved some */
  details: CartDetails | null;
  open: boolean;
  savingDetails: boolean;
  /** true right after the details were saved: the drawer shows the "please wait for our call" message */
  showSaved: boolean;

  server: ServerCartStatus;
  /** changes sent to the server that have not been answered yet */
  inFlight: number;
  /** counts changes started; lets a slow, older cart download be recognised and ignored */
  mutationSeq: number;
  fetchSeq: number;
  saveFailures: number;
  saveError: string | null;
}

const initialState: CartState = {
  items: [],
  confirmed: [],
  details: null,
  open: false,
  savingDetails: false,
  showSaved: false,
  server: "idle",
  inFlight: 0,
  mutationSeq: 0,
  fetchSeq: 0,
  saveFailures: 0,
  saveError: null,
};

type WithCart = { cart: CartState };

// ---- helpers ----

function sanitize(raw: unknown): CartItem[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const items: CartItem[] = [];

  for (const entry of raw) {
    if (!entry || typeof entry !== "object") continue;
    const { slug, quantity } = entry as Record<string, unknown>;
    if (typeof slug !== "string" || !slug || seen.has(slug)) continue;
    if (typeof quantity !== "number" || !Number.isInteger(quantity)) continue;
    if (quantity < 1) continue;
    seen.add(slug);
    items.push({ slug, quantity });
  }
  return items;
}

function parseDetails(raw: unknown): CartDetails | null {
  if (!raw || typeof raw !== "object") return null;
  const record = raw as Record<string, unknown>;
  const details = {} as CartDetails;
  for (const key of DETAIL_KEYS) {
    const value = record[key];
    details[key] = typeof value === "string" ? value : "";
  }
  return details;
}

interface ServerCart {
  items: unknown;
  details?: unknown;
}

interface CartData {
  items: CartItem[];
  details: CartDetails | null;
}

function parseCart(raw: ServerCart): CartData {
  return { items: sanitize(raw.items), details: parseDetails(raw.details) };
}

const copy = (items: CartItem[]) => items.map((item) => ({ ...item }));

/** Shows a change on screen straight away, before the server has answered. */
function setLocalQuantity(state: CartState, slug: string, quantity: number) {
  if (quantity < 1) {
    state.items = state.items.filter((item) => item.slug !== slug);
    return;
  }
  const capped = Math.min(quantity, MAX_QUANTITY_PER_GAME);
  const existing = state.items.find((item) => item.slug === slug);
  if (existing) existing.quantity = capped;
  else if (state.items.length < MAX_GAMES_IN_CART)
    state.items.push({ slug, quantity: capped });
}

function mutationStarted(state: CartState) {
  state.inFlight += 1;
  state.mutationSeq += 1;
}

/** The server accepted a change and replied with the whole cart. */
function mutationSucceeded(state: CartState, data: CartData) {
  state.inFlight = Math.max(0, state.inFlight - 1);
  state.confirmed = data.items;
  state.details = data.details;
  state.server = "loaded";
  state.saveFailures = 0;
  state.saveError = null;
  // While more changes are still on their way, keep showing the screen as it is.
  if (state.inFlight === 0) state.items = copy(data.items);
}

/** The server refused a change (or could not be reached): go back to what it last confirmed. */
function mutationFailed(state: CartState, message: string) {
  state.inFlight = Math.max(0, state.inFlight - 1);
  state.saveFailures += 1;
  state.saveError = message;
  if (state.inFlight === 0) state.items = copy(state.confirmed);
}

// ---- talking to the server ----

/** Changes are sent strictly one after another, so the last reply always includes all of them. */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

/**
 * Downloads the visitor's cart. Without `force` it only runs the first time (or after a failure);
 * with `force` it refreshes a cart that is already loaded.
 */
export const loadServerCart = createAsyncThunk<
  CartData,
  { force?: boolean } | undefined,
  { rejectValue: string; state: WithCart }
>(
  "cart/loadServer",
  async (_, { rejectWithValue, signal }) => {
    try {
      return parseCart(await apiGet<ServerCart>("/orders/cart/", signal));
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  {
    condition: (arg, { getState }) => {
      const { server } = getState().cart;
      if (arg?.force) return server !== "loading";
      return server === "idle" || server === "failed";
    },
  },
);

/** Adds a game to the cart. */
export const addToCart = createAsyncThunk<
  CartData,
  { slug: string; quantity?: number },
  { rejectValue: string }
>("cart/add", async ({ slug, quantity }, { rejectWithValue }) => {
  try {
    const response = await enqueue(() =>
      apiPost<ServerCart>("/orders/cart/items/", {
        slug,
        quantity: quantity ?? 1,
      }),
    );
    return parseCart(response);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

/** Sets how many of a game are in the cart (below 1 removes it). */
export const setQuantity = createAsyncThunk<
  CartData,
  { slug: string; quantity: number },
  { rejectValue: string }
>("cart/setQuantity", async ({ slug, quantity }, { rejectWithValue }) => {
  try {
    const response = await enqueue(() =>
      apiPatch<ServerCart>(`/orders/cart/items/${encodeURIComponent(slug)}/`, {
        quantity: Math.max(0, quantity),
      }),
    );
    return parseCart(response);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

/** Removes a game from the cart. */
export const removeFromCart = createAsyncThunk<
  CartData,
  string,
  { rejectValue: string }
>("cart/remove", async (slug, { rejectWithValue }) => {
  try {
    const response = await enqueue(() =>
      apiDelete<ServerCart>(`/orders/cart/items/${encodeURIComponent(slug)}/`),
    );
    return parseCart(response);
  } catch (error) {
    return rejectWithValue(getErrorMessage(error));
  }
});

// ---- the delivery details ----

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

function toDetailsFailure(error: unknown): DetailsFailure {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return {
        message: "Too many attempts in a short time. Please try again later.",
        fieldErrors: {},
      };
    }

    if (error.status === 400 && error.data && typeof error.data === "object") {
      const fieldErrors: DetailsFieldErrors = {};
      let cartMessages: string[] = [];

      for (const [key, value] of Object.entries(error.data)) {
        const messages = collectStrings(value);
        if (messages.length === 0) continue;
        if (key === "items") cartMessages = messages;
        else fieldErrors[key as keyof CartDetails] = messages;
      }

      return {
        // A problem with the cart itself has no field to sit under, so it becomes the message.
        message:
          cartMessages.length > 0
            ? cartMessages.join(" ")
            : "Please check the highlighted fields.",
        fieldErrors,
      };
    }
  }

  return { message: getErrorMessage(error), fieldErrors: {} };
}

/** Saves the delivery details on the cart so the admin can contact the visitor. */
export const saveCartDetails = createAsyncThunk<
  CartDetails | null,
  CartDetails,
  { rejectValue: DetailsFailure; state: WithCart }
>(
  "cart/saveDetails",
  async (details, { rejectWithValue }) => {
    try {
      const response = await apiPut<ServerCart>(
        "/orders/cart/details/",
        details,
      );
      return parseDetails(response.details);
    } catch (error) {
      return rejectWithValue(toDetailsFailure(error));
    }
  },
  {
    // Blocks a double click from sending twice.
    condition: (_, { getState }) => !getState().cart.savingDetails,
  },
);

// ---- slice ----

/** A different visitor (or nobody) is about to use this browser: forget the cart held here. */
function resetForNewSession(state: CartState) {
  state.items = [];
  state.confirmed = [];
  state.details = null;
  state.open = false;
  state.savingDetails = false;
  state.showSaved = false;
  state.server = "idle";
  state.inFlight = 0;
  state.mutationSeq = 0;
  state.fetchSeq = 0;
  state.saveFailures = 0;
  state.saveError = null;
}

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    openCart(state) {
      state.open = true;
    },
    closeCart(state) {
      state.open = false;
      state.showSaved = false;
    },
    /** Leaves the "details saved" message (to edit the details again, for example). */
    leaveSavedView(state) {
      state.showSaved = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // --- downloading the cart ---
      .addCase(loadServerCart.pending, (state) => {
        if (state.server !== "loaded") state.server = "loading";
        state.fetchSeq = state.mutationSeq;
      })
      .addCase(loadServerCart.fulfilled, (state, action) => {
        state.server = "loaded";
        state.confirmed = action.payload.items;
        state.details = action.payload.details;
        // Ignore a download that started before a change was made: it would undo that change.
        if (state.inFlight === 0 && state.fetchSeq === state.mutationSeq) {
          state.items = copy(action.payload.items);
        }
      })
      .addCase(loadServerCart.rejected, (state) => {
        if (state.server !== "loaded") state.server = "failed";
      })
      // --- adding ---
      .addCase(addToCart.pending, (state, action) => {
        mutationStarted(state);
        const { slug, quantity } = action.meta.arg;
        const current = state.items.find((item) => item.slug === slug);
        setLocalQuantity(
          state,
          slug,
          (current?.quantity ?? 0) + (quantity ?? 1),
        );
      })
      .addCase(addToCart.fulfilled, (state, action) => {
        mutationSucceeded(state, action.payload);
      })
      .addCase(addToCart.rejected, (state, action) => {
        mutationFailed(
          state,
          action.payload ?? action.error.message ?? "unknown error",
        );
      })
      // --- changing a quantity ---
      .addCase(setQuantity.pending, (state, action) => {
        mutationStarted(state);
        setLocalQuantity(state, action.meta.arg.slug, action.meta.arg.quantity);
      })
      .addCase(setQuantity.fulfilled, (state, action) => {
        mutationSucceeded(state, action.payload);
      })
      .addCase(setQuantity.rejected, (state, action) => {
        mutationFailed(
          state,
          action.payload ?? action.error.message ?? "unknown error",
        );
      })
      // --- removing ---
      .addCase(removeFromCart.pending, (state, action) => {
        mutationStarted(state);
        setLocalQuantity(state, action.meta.arg, 0);
      })
      .addCase(removeFromCart.fulfilled, (state, action) => {
        mutationSucceeded(state, action.payload);
      })
      .addCase(removeFromCart.rejected, (state, action) => {
        mutationFailed(
          state,
          action.payload ?? action.error.message ?? "unknown error",
        );
      })
      // --- saving the delivery details ---
      .addCase(saveCartDetails.pending, (state) => {
        state.savingDetails = true;
      })
      .addCase(saveCartDetails.fulfilled, (state, action) => {
        state.savingDetails = false;
        state.details = action.payload;
        state.showSaved = true;
      })
      .addCase(saveCartDetails.rejected, (state) => {
        state.savingDetails = false;
      })
      // The cart stays on the server for next time; only this browser's copy is dropped.
      .addCase(logoutVisitor.fulfilled, resetForNewSession)
      .addCase(sessionExpired, resetForNewSession);
  },
});

export const { openCart, closeCart, leaveSavedView } = cartSlice.actions;
export default cartSlice.reducer;

// ---- selectors ----

export const selectCartItems = (state: WithCart) => state.cart.items;
export const selectCartOpen = (state: WithCart) => state.cart.open;
export const selectCartDetails = (state: WithCart) => state.cart.details;
export const selectDetailsSaving = (state: WithCart) =>
  state.cart.savingDetails;
export const selectShowSaved = (state: WithCart) => state.cart.showSaved;
export const selectCartServerStatus = (state: WithCart) => state.cart.server;

/** The reason the last change could not be saved, or null when everything is fine. */
export const selectCartSaveError = (state: WithCart) =>
  state.cart.saveFailures > 0
    ? (state.cart.saveError ?? "unknown error")
    : null;

export const selectQuantityOf = (state: WithCart, slug: string) =>
  state.cart.items.find((item) => item.slug === slug)?.quantity ?? 0;

/** Cart items joined with the live games list (the price always comes from the games). */
export const selectCartLines = createSelector(
  [selectCartItems, selectAllGames],
  (items, games): CartLine[] => {
    const bySlug = new Map(games.map((game) => [game.slug, game]));
    const lines: CartLine[] = [];

    for (const item of items) {
      const game = bySlug.get(item.slug);
      if (!game || game.price == null) continue;
      // The API may send the price as a number or as a numeric string such as "1500.00".
      const unitPrice = Number(game.price);
      if (!Number.isFinite(unitPrice)) continue;
      lines.push({
        game,
        quantity: item.quantity,
        unitPrice,
        lineTotal: Math.round(unitPrice * item.quantity * 100) / 100,
      });
    }
    return lines;
  },
);

export const selectCartCount = createSelector([selectCartLines], (lines) =>
  lines.reduce((sum, line) => sum + line.quantity, 0),
);

export const selectCartTotal = createSelector([selectCartLines], (lines) => ({
  amount:
    Math.round(lines.reduce((sum, line) => sum + line.lineTotal, 0) * 100) /
    100,
  currency: lines[0]?.game.currency ?? "NPR",
}));

/**
 * Items in the cart that cannot be shown with a price right now (game removed, unpublished or
 * without a price). Only reported once the games have loaded, so a slow connection is never
 * mistaken for "unavailable".
 */
export const selectUnavailableItems = createSelector(
  [selectCartItems, selectCartLines, selectAllGames, selectGamesStatus],
  (items, lines, games, status) => {
    if (status !== "succeeded") return [];
    const priced = new Set(lines.map((line) => line.game.slug));
    return items
      .filter((item) => !priced.has(item.slug))
      .map((item) => ({
        slug: item.slug,
        name: games.find((game) => game.slug === item.slug)?.name ?? item.slug,
      }));
  },
);
