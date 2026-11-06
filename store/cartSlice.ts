import {
  createAsyncThunk,
  createSelector,
  createSlice,
} from "@reduxjs/toolkit";
import type { PayloadAction } from "@reduxjs/toolkit";

import { ApiError, apiPost, getErrorMessage } from "@/lib/api";
import type { Game } from "@/lib/games";

import { selectAllGames } from "./gamesSlice";
import type { GamesState } from "./gamesSlice";
import { logoutVisitor } from "./visitorSlice";

// Mirror the backend limits (SHOP_MAX_QUANTITY_PER_ITEM and MAX_LINES_PER_ORDER).
// The backend is the real authority: these only keep the buttons honest.
export const MAX_QUANTITY_PER_GAME = 10;
export const MAX_GAMES_PER_ORDER = 20;

const STORAGE_KEY = "turtle-games-cart";

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

export interface OrderInput {
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

export interface OrderConfirmation {
  reference: string;
  status: string;
  currency: string;
  total: number;
  createdAt: string;
  items: {
    name: string;
    quantity: number;
    unitPrice: number;
    lineTotal: number;
  }[];
}

export type OrderFieldErrors = Partial<Record<keyof OrderInput, string[]>>;

export interface OrderFailure {
  message: string;
  fieldErrors: OrderFieldErrors;
}

export interface CartState {
  items: CartItem[];
  /** true once the saved cart has been read from the browser */
  hydrated: boolean;
  open: boolean;
  placing: boolean;
  lastOrder: OrderConfirmation | null;
  /** the phone and email the buyer gave for the order that was just placed */
  lastContact: { email: string; phone: string } | null;
}

const initialState: CartState = {
  items: [],
  hydrated: false,
  open: false,
  placing: false,
  lastOrder: null,
  lastContact: null,
};

type WithCart = { cart: CartState };
type WithShop = WithCart & { games: GamesState };

// ---- saved cart (only game slugs and quantities: nothing personal, no prices) ----

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
    items.push({ slug, quantity: Math.min(quantity, MAX_QUANTITY_PER_GAME) });
    if (items.length >= MAX_GAMES_PER_ORDER) break;
  }
  return items;
}

export function loadCart(): CartItem[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? sanitize(JSON.parse(raw)) : [];
  } catch {
    return [];
  }
}

export function saveCart(items: CartItem[]) {
  try {
    if (items.length > 0) {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } else {
      window.localStorage.removeItem(STORAGE_KEY);
    }
  } catch {
    // Storage can be blocked or full: the cart still works for this visit.
  }
}

// ---- placing the order ----

function collectStrings(value: unknown): string[] {
  if (typeof value === "string") return [value];
  if (Array.isArray(value)) return value.flatMap(collectStrings);
  if (value && typeof value === "object") {
    return Object.values(value).flatMap(collectStrings);
  }
  return [];
}

function toOrderFailure(error: unknown): OrderFailure {
  if (error instanceof ApiError) {
    if (error.status === 429) {
      return {
        message: "Too many orders in a short time. Please try again later.",
        fieldErrors: {},
      };
    }

    if (error.status === 400 && error.data && typeof error.data === "object") {
      const fieldErrors: OrderFieldErrors = {};
      let itemMessages: string[] = [];

      for (const [key, value] of Object.entries(error.data)) {
        const messages = collectStrings(value);
        if (messages.length === 0) continue;
        if (key === "items") itemMessages = messages;
        else fieldErrors[key as keyof OrderInput] = messages;
      }

      return {
        // Problems with the games in the cart have no field to sit under, so they become the message.
        message:
          itemMessages.length > 0
            ? itemMessages.join(" ")
            : "Please check the highlighted fields.",
        fieldErrors,
      };
    }
  }

  return { message: getErrorMessage(error), fieldErrors: {} };
}

/** Sends the order. Prices are never sent: the server reads them from the database. */
export const placeOrder = createAsyncThunk<
  OrderConfirmation,
  OrderInput,
  { rejectValue: OrderFailure; state: WithShop }
>(
  "cart/placeOrder",
  async (details, { getState, rejectWithValue }) => {
    const lines = selectCartLines(getState());
    if (lines.length === 0) {
      return rejectWithValue({
        message: "Your cart is empty.",
        fieldErrors: {},
      });
    }

    try {
      return await apiPost<OrderConfirmation>("/orders/", {
        ...details,
        items: lines.map((line) => ({
          slug: line.game.slug,
          quantity: line.quantity,
        })),
      });
    } catch (error) {
      return rejectWithValue(toOrderFailure(error));
    }
  },
  {
    // Blocks a double click from placing the order twice.
    condition: (_, { getState }) => !getState().cart.placing,
  },
);

// ---- slice ----

const cartSlice = createSlice({
  name: "cart",
  initialState,
  reducers: {
    hydrateCart(state, action: PayloadAction<CartItem[]>) {
      // MERGE the saved cart into the current one. Overwriting would wipe anything added a moment
      // before the saved cart finished loading.
      for (const saved of sanitize(action.payload)) {
        const current = state.items.find((item) => item.slug === saved.slug);
        if (current) {
          current.quantity = Math.max(current.quantity, saved.quantity);
        } else if (state.items.length < MAX_GAMES_PER_ORDER) {
          state.items.push(saved);
        }
      }
      state.hydrated = true;
    },
    addToCart(
      state,
      action: PayloadAction<{ slug: string; quantity?: number }>,
    ) {
      const { slug } = action.payload;
      const quantity = Math.max(1, action.payload.quantity ?? 1);
      const existing = state.items.find((item) => item.slug === slug);

      if (existing) {
        existing.quantity = Math.min(
          existing.quantity + quantity,
          MAX_QUANTITY_PER_GAME,
        );
      } else if (state.items.length < MAX_GAMES_PER_ORDER) {
        state.items.push({
          slug,
          quantity: Math.min(quantity, MAX_QUANTITY_PER_GAME),
        });
      }
    },
    setQuantity(
      state,
      action: PayloadAction<{ slug: string; quantity: number }>,
    ) {
      const { slug, quantity } = action.payload;
      if (quantity < 1) {
        state.items = state.items.filter((item) => item.slug !== slug);
        return;
      }
      const item = state.items.find((entry) => entry.slug === slug);
      if (item) item.quantity = Math.min(quantity, MAX_QUANTITY_PER_GAME);
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.slug !== action.payload);
    },
    /** Drops games that can no longer be ordered (removed, unpublished or no price). */
    pruneCart(state, action: PayloadAction<string[]>) {
      const valid = new Set(action.payload);
      const kept = state.items.filter((item) => valid.has(item.slug));
      if (kept.length !== state.items.length) state.items = kept;
    },
    clearCart(state) {
      state.items = [];
    },
    openCart(state) {
      state.open = true;
    },
    closeCart(state) {
      state.open = false;
    },
    dismissOrder(state) {
      state.lastOrder = null;
      state.lastContact = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(placeOrder.pending, (state) => {
        state.placing = true;
      })
      .addCase(placeOrder.fulfilled, (state, action) => {
        state.placing = false;
        state.items = [];
        state.lastOrder = action.payload;
        state.lastContact = {
          email: action.meta.arg.email,
          phone: action.meta.arg.phone,
        };
      })
      .addCase(placeOrder.rejected, (state) => {
        state.placing = false;
      })
      // A different person may use this browser next: start clean.
      .addCase(logoutVisitor.fulfilled, (state) => {
        state.items = [];
        state.open = false;
        state.lastOrder = null;
        state.lastContact = null;
      });
  },
});

export const {
  hydrateCart,
  addToCart,
  setQuantity,
  removeFromCart,
  pruneCart,
  clearCart,
  openCart,
  closeCart,
  dismissOrder,
} = cartSlice.actions;
export default cartSlice.reducer;

// ---- selectors ----

export const selectCartItems = (state: WithCart) => state.cart.items;
export const selectCartHydrated = (state: WithCart) => state.cart.hydrated;
export const selectCartOpen = (state: WithCart) => state.cart.open;
export const selectCartPlacing = (state: WithCart) => state.cart.placing;
export const selectLastOrder = (state: WithCart) => state.cart.lastOrder;
export const selectLastContact = (state: WithCart) => state.cart.lastContact;

export const selectQuantityOf = (state: WithCart, slug: string) =>
  state.cart.items.find((item) => item.slug === slug)?.quantity ?? 0;

/** Cart items joined with the live games list (price always comes from the games, never from storage). */
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
