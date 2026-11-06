"use client";

import CartButton from "@/components/shop/CartButton";
import AddToCartButton from "@/components/shop/AddToCartButton";
import { btnGhost } from "@/components/ui/classes";
import { useAppSelector } from "@/store/hooks";
import { selectAllGames } from "@/store/gamesSlice";

/**
 * A bar fixed to the bottom of the game page: the price, "Add to cart" and the cart button.
 * It finds its game in the Redux store by slug, so it does not depend on how GameView draws the page.
 */
export default function GameBuyBar({ slug }: { slug: string }) {
  const game = useAppSelector((state) =>
    selectAllGames(state).find((g) => g.slug === slug),
  );

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-accent/25 bg-page/35 px-4 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] pt-3 backdrop-blur-xl backdrop-saturate-150 sm:px-8 lg:px-16">
      <div className="mx-auto flex w-full max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2">
        <div className="min-w-0">
          {game ? (
            <>
              <p className="truncate text-sm font-bold">{game.name}</p>
              {game.price == null && (
                <p className="text-xs text-muted">
                  Not available to order yet.
                </p>
              )}
            </>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {game && game.price != null ? <AddToCartButton game={game} /> : null}
          <CartButton className={`${btnGhost} !px-4 !py-2 !text-xs`} />
        </div>
      </div>
    </div>
  );
}
