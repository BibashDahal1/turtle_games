"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";

import { setUnauthorizedHandler } from "@/lib/api";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  restoreSession,
  selectVisitorStatus,
  sessionExpired,
} from "@/store/visitorSlice";
import VisitorAuthDialog from "./VisitorAuthDialog";

type VisitorAuthContextValue = {
  openSignIn: (nextPath?: string, onAuthenticated?: () => void) => void;
};

const VisitorAuthContext = createContext<VisitorAuthContextValue | null>(null);

export function useVisitorAuth() {
  const context = useContext(VisitorAuthContext);
  if (!context) {
    throw new Error("useVisitorAuth must be used within VisitorAuthProvider");
  }
  return context;
}

export default function VisitorAuthProvider({
  children,
}: {
  children: ReactNode;
}) {
  const dispatch = useAppDispatch();
  const router = useRouter();
  const status = useAppSelector(selectVisitorStatus);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [supportPrompt, setSupportPrompt] = useState(false);
  const nextPathRef = useRef<string | null>(null);
  const onAuthenticatedRef = useRef<(() => void) | null>(null);
  const previousFocusRef = useRef<HTMLElement | null>(null);

  const dismissSignIn = useCallback(() => {
    setDialogOpen(false);
    setSupportPrompt(false);
    nextPathRef.current = null;
    onAuthenticatedRef.current = null;
    if (previousFocusRef.current?.isConnected) {
      previousFocusRef.current.focus();
    }
  }, []);

  const completeSignIn = useCallback(() => {
    setDialogOpen(false);
    setSupportPrompt(false);
    if (previousFocusRef.current?.isConnected) {
      previousFocusRef.current.focus();
    }
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => dispatch(sessionExpired()));
    void dispatch(restoreSession()).then((result) => {
      if (restoreSession.fulfilled.match(result)) completeSignIn();
    });
    return () => setUnauthorizedHandler(null);
  }, [completeSignIn, dispatch]);

  useEffect(() => {
    if (status !== "signedIn") return;
    const onAuthenticated = onAuthenticatedRef.current;
    onAuthenticatedRef.current = null;
    onAuthenticated?.();
    if (nextPathRef.current) {
      const nextPath = nextPathRef.current;
      nextPathRef.current = null;
      router.push(nextPath);
    }
  }, [router, status]);

  const openSignIn = useCallback(
    (nextPath?: string, onAuthenticated?: () => void) => {
      nextPathRef.current = nextPath ?? null;
      onAuthenticatedRef.current = onAuthenticated ?? null;
      setSupportPrompt(nextPath === "/support");
      previousFocusRef.current =
        document.activeElement instanceof HTMLElement
          ? document.activeElement
          : null;
      setDialogOpen(true);
    },
    [],
  );

  return (
    <VisitorAuthContext.Provider value={{ openSignIn }}>
      {children}
      {dialogOpen && (
        <VisitorAuthDialog
          onClose={dismissSignIn}
          onSuccess={completeSignIn}
          supportPrompt={supportPrompt}
        />
      )}
    </VisitorAuthContext.Provider>
  );
}
