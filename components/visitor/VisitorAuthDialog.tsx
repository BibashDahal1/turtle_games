"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";

import { btnGhost } from "@/components/ui/classes";
import VisitorForm from "./VisitorForm";

export default function VisitorAuthDialog({
  onClose,
  onSuccess,
  supportPrompt,
}: {
  onClose: () => void;
  onSuccess: () => void;
  supportPrompt: boolean;
}) {
  const closeRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onClose();
        return;
      }

      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        "button:not([disabled]), input:not([disabled]), a[href]",
      );
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    window.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown, true);
    };
  }, [onClose]);

  return createPortal(
    <div className="fixed inset-0 z-[100] grid place-items-center overflow-y-auto p-4">
      <button
        type="button"
        aria-label="Close sign-in dialog"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-black/55 backdrop-blur-sm"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="visitor-auth-title"
        aria-describedby="visitor-auth-description"
        className="relative my-auto max-h-[calc(100dvh-2rem)] w-full max-w-2xl overflow-hidden rounded-2xl border border-white/30 bg-page/10 p-4 text-ink shadow-2xl backdrop-blur-md sm:p-6"
      >
        <div className="mb-3 flex items-start justify-between gap-4">
          <div>
            <h2 id="visitor-auth-title" className="text-xl font-bold">
              Sign in to Turtle Games
            </h2>
            <p
              id="visitor-auth-description"
              className="mt-1 text-sm text-ink/75"
            >
              {supportPrompt
                ? "Please sign in to continue to Support."
                : "Enter your visitor details to continue."}
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className={`${btnGhost} !px-3 !py-2`}
          >
            Close
          </button>
        </div>
        <VisitorForm presentation="dialog" onSuccess={onSuccess} />
      </div>
    </div>,
    document.body,
  );
}
