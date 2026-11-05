"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { Provider } from "react-redux";

import { getStore } from "./index";

/**
 * Put this INSIDE a <Suspense> boundary, right around the components that read the games.
 * Redux creates its store with Math.random(), which Next.js (cacheComponents) only allows
 * inside Suspense, not at the top of the layout.
 */
export default function StoreProvider({ children }: { children: ReactNode }) {
  const [store] = useState(getStore);

  return <Provider store={store}>{children}</Provider>;
}
