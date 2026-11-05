import { createAsyncThunk, createSlice } from "@reduxjs/toolkit";

import { apiGet, getErrorMessage } from "@/lib/api";
import type { Game } from "@/lib/games";

export type LoadStatus = "idle" | "loading" | "succeeded" | "failed";

export interface GamesState {
  items: Game[];
  status: LoadStatus;
  error: string | null;
}

const initialState: GamesState = {
  items: [],
  status: "idle",
  error: null,
};

/**
 * Loads every published game (with its cards) from GET /api/games/.
 * It does nothing if the games are already loading or already loaded,
 * so it is safe to call from several components.
 */
export const fetchGames = createAsyncThunk<
  Game[],
  void,
  { rejectValue: string }
>(
  "games/fetchGames",
  async (_, { rejectWithValue, signal }) => {
    try {
      return await apiGet<Game[]>("/games/", signal);
    } catch (error) {
      return rejectWithValue(getErrorMessage(error));
    }
  },
  {
    condition: (_, { getState }) => {
      const { status } = (getState() as { games: GamesState }).games;
      return status !== "loading" && status !== "succeeded";
    },
  },
);

const gamesSlice = createSlice({
  name: "games",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchGames.pending, (state) => {
        state.status = "loading";
        state.error = null;
      })
      .addCase(fetchGames.fulfilled, (state, action) => {
        state.items = action.payload;
        state.status = "succeeded";
      })
      .addCase(fetchGames.rejected, (state, action) => {
        state.status = "failed";
        state.error =
          action.payload ?? action.error.message ?? "Could not load games.";
      });
  },
});

export default gamesSlice.reducer;

// Selectors
type WithGames = { games: GamesState };

export const selectAllGames = (state: WithGames) => state.games.items;
export const selectGamesStatus = (state: WithGames) => state.games.status;
export const selectGamesError = (state: WithGames) => state.games.error;
