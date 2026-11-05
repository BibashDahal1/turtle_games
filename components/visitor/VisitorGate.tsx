"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";

import { setUnauthorizedHandler } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  restoreSession,
  selectVisitorError,
  selectVisitorStatus,
  sessionExpired,
} from "@/store/visitorSlice";
import { btnSolid, glass, sec } from "@/components/ui/classes";

import VisitorForm from "./VisitorForm";

/**
 * Shows the site only to signed-in visitors.
 * Must be rendered inside <StoreProvider> (which itself sits inside <Suspense>).
 */
export default function VisitorGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectVisitorStatus);
  const error = useAppSelector(selectVisitorError);

  // Any 401 from the API means the cookie is gone or invalid: go back to the form.
  useEffect(() => {
    setUnauthorizedHandler(() => dispatch(sessionExpired()));
    return () => setUnauthorizedHandler(null);
  }, [dispatch]);

  // On every page load, ask the server whether this browser's cookie is still valid.
  useEffect(() => {
    void dispatch(restoreSession());
  }, [dispatch]);

  if (status === "signedIn") return <>{children}</>;

  if (status === "signedOut") return <VisitorForm />;

  if (status === "error") {
    return (
      <main className={`${sec} min-h-svh items-center px-4`}>
        <div className={`${glass} w-full max-w-md p-8 text-center`}>
          <p role="alert" className="mb-5 text-ink/85">
            {error ?? "Could not reach the server."}
          </p>
          <button
            type="button"
            className={btnSolid}
            onClick={() => void dispatch(restoreSession())}
          >
            Try again
          </button>
        </div>
      </main>
    );
  }

  // status === "checking": render nothing from the site until we know who this is.
  return (
    <div role="status" aria-busy="true" className="min-h-svh">
      <span className="sr-only">Loading</span>
    </div>
  );
}
