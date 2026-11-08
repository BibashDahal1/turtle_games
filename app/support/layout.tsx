import type { ReactNode } from "react";

export default function SupportLayout({ children }: { children: ReactNode }) {
  return <div className="bright-ocean relative">{children}</div>;
}
