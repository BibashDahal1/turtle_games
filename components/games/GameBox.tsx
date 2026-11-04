import type { CSSProperties } from "react";

/**
 * helper: lets us pass CSS custom properties in a style prop.
 *
 * The CSS-3D game box that used to live here is replaced by the three.js box in
 * ./three/gameBox3d.ts. Only this helper is kept because GameCard and the layouts still use it.
 */
export const cssVars = (o: Record<string, string | number>) =>
  o as unknown as CSSProperties;
