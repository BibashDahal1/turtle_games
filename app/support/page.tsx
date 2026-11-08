import type { Metadata } from "next";
import { Suspense } from "react";

import SupportForm from "@/components/support/SupportForm";
import VisitorGate from "@/components/visitor/VisitorGate";

export const metadata: Metadata = {
  title: "Support | Turtle Games",
  description:
    "Support the creator and the organization with a payment of any amount.",
};

// The visitor gate lives in the page (not the layout), like on the other pages.
export default function SupportPage() {
  return (
    <VisitorGate>
      <Suspense fallback={null}>
        <SupportForm />
      </Suspense>
    </VisitorGate>
  );
}
