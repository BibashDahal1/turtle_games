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

/**
 * In the browser there is ONE store shared by the whole site (home page and game page see the same data).
 * On the server a fresh store is made per render, so nothing is ever shared between visitors.
 */
export const getStore = (): AppStore => {
  if (typeof window === "undefined") return makeStore();
  clientStore ??= makeStore();
  return clientStore;
};
