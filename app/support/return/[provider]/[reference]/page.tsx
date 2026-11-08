import type { Metadata } from "next";
import { Suspense } from "react";

import PaymentReturn from "@/components/support/PaymentReturn";
import VisitorGate from "@/components/visitor/VisitorGate";

export const metadata: Metadata = {
  title: "Your payment | Turtle Games",
};

// Khalti and eSewa send the visitor back to this address. The page reads the address in the browser
// (inside Suspense) and asks our server to confirm the payment with the provider.
export default function PaymentReturnPage() {
  return (
    <VisitorGate>
      <Suspense fallback={null}>
        <PaymentReturn />
      </Suspense>
    </VisitorGate>
  );
}
