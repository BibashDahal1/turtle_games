"use client";

import Link from "next/link";
import type { ReactNode, MouseEvent } from "react";

import { useVisitorAuth } from "./VisitorAuthProvider";
import { useAppSelector } from "@/store/hooks";
import { selectVisitorStatus } from "@/store/visitorSlice";

export default function SupportAccessLink({
  children,
  className,
  onClick,
}: {
  children: ReactNode;
  className?: string;
  onClick?: () => void;
}) {
  const status = useAppSelector(selectVisitorStatus);
  const { openSignIn } = useVisitorAuth();

  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.();
    if (status !== "signedIn") {
      event.preventDefault();
      openSignIn("/support");
    }
  }

  return (
    <Link
      href="/support"
      onClick={handleClick}
      className={className}
    >
      {children}
    </Link>
  );
}
