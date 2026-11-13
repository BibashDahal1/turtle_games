"use client";

import { useEffect, useRef, useState } from "react";
import Logo from "@/components/Logo";
import CartButton from "@/components/shop/CartButton";
import ConfirmSignOut from "@/components/ConfirmSignOut";
import { btnGhost } from "@/components/ui/classes";
import { NAV } from "@/lib/nav";
import { useAppSelector } from "@/store/hooks";
import { selectVisitorStatus } from "@/store/visitorSlice";
import { useVisitorAuth } from "@/components/visitor/VisitorAuthProvider";
import SupportAccessLink from "@/components/visitor/SupportAccessLink";

export default function SiteHeader() {
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState("home");
  const toggleRef = useRef<HTMLButtonElement>(null);
  const visitorStatus = useAppSelector(selectVisitorStatus);
  const { openSignIn } = useVisitorAuth();

  // Close on Escape and return focus to the toggle button
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        toggleRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  // Lock body scroll while the drawer is open
  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  // Auto-close if the viewport grows to the desktop layout
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 1024px)");
    const onChange = (e: MediaQueryListEvent) => {
      if (e.matches) setOpen(false);
    };
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  // Highlight the section currently in view
  useEffect(() => {
    const ids = NAV.map((n) => n.toLowerCase());
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) setActive(e.target.id);
        });
      },
      { rootMargin: "-40% 0px -55% 0px" },
    );
    ids.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  // Close first (unlocks scroll), then scroll. Otherwise the anchor jump
  // is swallowed by the locked body.
  const goTo = (e: React.MouseEvent<HTMLAnchorElement>, id: string) => {
    e.preventDefault();
    setOpen(false);
    document.body.style.overflow = "";
    requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
      history.replaceState(null, "", `#${id}`);
    });
  };

  const linkCls = (id: string) =>
    `transition-opacity ${
      active === id ? "opacity-100" : "opacity-70 hover:opacity-100"
    }`;

  return (
    <header className="fixed inset-x-0 top-0 z-50 bg-linear-to-b from-page/80 to-transparent pt-[env(safe-area-inset-top)]">
      <div className="mx-auto flex items-center justify-between gap-3 px-4 py-4 sm:px-8 lg:px-12 lg:py-5">
        <a
          href="#home"
          onClick={(e) => goTo(e, "home")}
          aria-label="Turtle Games home"
          className="flex shrink-0 items-center"
        >
          <Logo priority />
        </a>

        {/* Desktop nav */}
        <nav
          aria-label="Primary"
          className="hidden gap-8 text-sm font-medium lg:flex xl:gap-10"
        >
          {NAV.map((n) => {
            const id = n.toLowerCase();
            if (id === "support") {
              return (
                <SupportAccessLink
                  key={n}
                  className={linkCls(id)}
                  onClick={() => setOpen(false)}
                >
                  {n}
                </SupportAccessLink>
              );
            }
            return (
              <a
                key={n}
                href={`#${id}`}
                onClick={(e) => goTo(e, id)}
                aria-current={active === id ? "true" : undefined}
                className={linkCls(id)}
              >
                {n}
              </a>
            );
          })}
        </nav>

        {/* Desktop actions: cart + sign-in state */}
        <div className="hidden items-center gap-3 lg:flex">
          <CartButton className={`${btnGhost} !px-4 !py-2 !text-xs`} />
          {visitorStatus === "signedIn" ? (
            <ConfirmSignOut className={`${btnGhost} !px-4 !py-2 !text-xs`} />
          ) : (
            <button
              type="button"
              onClick={() => openSignIn()}
              className={`${btnGhost} !px-4 !py-2 !text-xs`}
            >
              Sign in
            </button>
          )}
        </div>

        {/* Mobile / tablet: cart + hamburger */}
        <div className="flex items-center gap-2 lg:hidden">
          <CartButton className={`${btnGhost} !px-3 !py-2 !text-xs`} />
          <button
            ref={toggleRef}
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Close menu" : "Open menu"}
            className="relative grid h-10 w-10 place-items-center rounded-full border border-ink/10 bg-transparent transition-colors hover:bg-ink/10 active:bg-ink/10"
          >
            <span aria-hidden className="relative block h-3.5 w-5">
              <span
                className={`absolute left-0 h-0.5 w-full bg-current transition-all duration-300 ${
                  open ? "top-1/2 -translate-y-1/2 rotate-45" : "top-0"
                }`}
              />
              <span
                className={`absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-current transition-opacity duration-200 ${
                  open ? "opacity-0" : "opacity-100"
                }`}
              />
              <span
                className={`absolute left-0 h-0.5 w-full bg-current transition-all duration-300 ${
                  open ? "top-1/2 -translate-y-1/2 -rotate-45" : "bottom-0"
                }`}
              />
            </span>
          </button>
        </div>
      </div>

      {/* Mobile drawer */}
      <div
        id="mobile-menu"
        hidden={!open}
        className="fixed inset-x-0 bottom-0 top-[calc(4.5rem+env(safe-area-inset-top))] overflow-y-auto bg-page/40 backdrop-blur-sm lg:hidden"
      >
        <nav
          aria-label="Mobile"
          className="flex min-h-full flex-col gap-2 px-6 py-8"
        >
          {NAV.map((n) => {
            const id = n.toLowerCase();
            if (id === "support") {
              return (
                <SupportAccessLink
                  key={n}
                  className={`border-b border-ink/10 py-4 text-2xl font-semibold ${linkCls(id)}`}
                  onClick={() => setOpen(false)}
                >
                  {n}
                </SupportAccessLink>
              );
            }
            return (
              <a
                key={n}
                href={`#${id}`}
                onClick={(e) => goTo(e, id)}
                aria-current={active === id ? "true" : undefined}
                className={`border-b border-ink/10 py-4 text-2xl font-semibold ${linkCls(id)}`}
              >
                {n}
              </a>
            );
          })}

          <div className="mt-6 flex flex-col gap-3 pb-[env(safe-area-inset-bottom)]">
            {visitorStatus === "signedIn" ? (
              <ConfirmSignOut className={`${btnGhost} w-full justify-center`} />
            ) : (
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  openSignIn();
                }}
                className={`${btnGhost} w-full justify-center`}
              >
                Sign in
              </button>
            )}
          </div>
        </nav>
      </div>
    </header>
  );
}
