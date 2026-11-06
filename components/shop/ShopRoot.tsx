import CartDrawer from "./CartDrawer";
import CartSync from "./CartSync";

/** Put ONE of these inside every page that has the cart (inside the page's <VisitorGate>). */
export default function ShopRoot() {
  return (
    <>
      <CartSync />
      <CartDrawer />
    </>
  );
}
