import { ApiError, apiGet, apiGetBlob, apiPost } from "@/lib/api";

export type PaymentProvider = "khalti" | "esewa";

export interface PaymentConfig {
  minAmount: number;
  maxAmount: number;
  currency: string;
  /** true while the site runs in test mode: no real money moves */
  isTest: boolean;
  /** which providers have their keys set up on the server */
  providers: Record<PaymentProvider, boolean>;
}

export interface EsewaForm {
  action: string;
  fields: Record<string, string>;
}

export type StartResult =
  | { provider: "khalti"; reference: string; redirectUrl: string }
  | { provider: "esewa"; reference: string; form: EsewaForm };

export type PaymentStatus = "initiated" | "pending" | "completed" | "failed";

export interface VerifyResult {
  reference: string;
  provider: PaymentProvider;
  amount: number;
  currency: string;
  status: PaymentStatus;
  note: string;
  isTest: boolean;
  /** false when the provider could not be reached just now */
  checked: boolean;
  message: string;
  invoiceUrl: string | null;
}

export function getPaymentConfig(signal?: AbortSignal) {
  return apiGet<PaymentConfig>("/payments/config/", signal);
}

export function startPayment(provider: PaymentProvider, amount: number) {
  return apiPost<StartResult>("/payments/start/", { provider, amount });
}

/** `data` is eSewa's Base64 answer from the success redirect (leave out for Khalti). */
export function verifyPayment(reference: string, data?: string) {
  return apiPost<VerifyResult>("/payments/verify/", {
    reference,
    ...(data ? { data } : {}),
  });
}

export function getPaymentInvoice(invoiceUrl: string) {
  return apiGetBlob(invoiceUrl);
}

/** A readable message for a failed payment request (including the amount rules). */
export function paymentErrorMessage(error: unknown): string {
  if (
    error instanceof ApiError &&
    error.data &&
    typeof error.data === "object"
  ) {
    const amount = (error.data as { amount?: unknown }).amount;
    if (Array.isArray(amount) && amount.length > 0) return amount.join(" ");
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}
