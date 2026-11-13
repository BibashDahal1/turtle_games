"use client";

import type { ReactNode } from "react";

import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  restoreSession,
  selectVisitorError,
  selectVisitorStatus,
} from "@/store/visitorSlice";
import { btnSolid, glass, sec } from "@/components/ui/classes";

import VisitorForm from "./VisitorForm";

/**
 * Protects pages that require a signed-in visitor.
 * Must be rendered inside the root visitor auth and store providers.
 */
export default function VisitorGate({ children }: { children: ReactNode }) {
  const dispatch = useAppDispatch();
  const status = useAppSelector(selectVisitorStatus);
  const error = useAppSelector(selectVisitorError);

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
