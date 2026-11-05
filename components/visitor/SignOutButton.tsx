"use client";

import { useAppDispatch } from "@/store/hooks";
import { logoutVisitor } from "@/store/visitorSlice";

/** Signs this browser out. Pass the button classes you want, e.g. className={`${btnGhost} !px-5 !py-2 !text-xs`}. */
export default function SignOutButton({ className }: { className?: string }) {
  const dispatch = useAppDispatch();

  return (
    <button
      type="button"
      className={className}
      onClick={() => void dispatch(logoutVisitor())}
    >
      Sign out
    </button>
  );
}
