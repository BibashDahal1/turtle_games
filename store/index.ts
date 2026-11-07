import { configureStore } from "@reduxjs/toolkit";

import cartReducer from "./cartSlice";
import gamesReducer from "./gamesSlice";
import visitorReducer from "./visitorSlice";

export const makeStore = () =>
  configureStore({
    reducer: {
      games: gamesReducer,
      visitor: visitorReducer,
      cart: cartReducer,
    },
  });

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore["getState"]>;
export type AppDispatch = AppStore["dispatch"];

let clientStore: AppStore | undefined;

function createClientStore(): AppStore {
  // Earlier versions kept a copy of the cart in this browser. The cart now lives on the server, and
  // a leftover copy could only confuse things, so remove it.
  try {
    window.localStorage.removeItem("turtle-games-cart");
  } catch {
    // storage may be blocked: nothing to clean up then
  }
  return makeStore();
}

/**
 * In the browser there is ONE store shared by the whole site (home page and game page see the same data).
 * On the server a fresh store is made per render, so nothing is ever shared between visitors.
 */
export const getStore = (): AppStore => {
  if (typeof window === "undefined") return makeStore();
  clientStore ??= createClientStore();
  return clientStore;
};
