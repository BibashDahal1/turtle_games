"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";

import { btnGhost, btnSolid, eyebrow } from "@/components/ui/classes";
import HomeLink from "@/components/ui/HomeLink";
import SupportScene from "@/components/support/SupportScene";
import { formatMoney } from "@/lib/money";
import {
  getPaymentInvoice,
  paymentErrorMessage,
  verifyPayment,
} from "@/lib/payments";
import type { VerifyResult } from "@/lib/payments";

type View =
  | { kind: "checking" }
  | { kind: "result"; result: VerifyResult }
  | { kind: "error"; message: string };

/**
 * The page the visitor lands on after paying (or cancelling) at Khalti or eSewa.
 * It never decides anything itself: it asks OUR server, which asks the provider what really happened.
 */
export default function PaymentReturn() {
  const params = useParams<{ provider: string; reference: string }>();
  const search = useSearchParams();
  const reference = params.reference;
  // eSewa adds its Base64 answer as ?data=... (Khalti's values in the address are ignored on purpose)
  const esewaData =
    params.provider === "esewa" ? (search.get("data") ?? undefined) : undefined;

  const [view, setView] = useState<View>({ kind: "checking" });
  const started = useRef(false);

  const check = useCallback(async () => {
    setView({ kind: "checking" });
    try {
      const result = await verifyPayment(reference, esewaData);
      setView({ kind: "result", result });
    } catch (reason) {
      setView({ kind: "error", message: paymentErrorMessage(reason) });
    }
  }, [reference, esewaData]);

  useEffect(() => {
    if (started.current) return; // React Strict Mode runs effects twice in development
    started.current = true;
    void check();
  }, [check]);

  return (
    <>
      <SupportScene />
      <main className="relative z-10 flex min-h-svh items-center justify-center px-3 py-8 sm:px-5 sm:py-12">
      <div
        className={`my-auto w-full rounded-2xl border border-accent/30 bg-transparent ${
          view.kind === "result" && view.result.status === "completed"
            ? "max-w-6xl"
            : "max-w-lg"
        } p-4 text-center sm:p-7 lg:p-9`}
      >
        <p className={eyebrow}>Support us</p>

        {view.kind === "checking" && (
          <p role="status" className="text-sm text-ink/85">
            Checking your payment with{" "}
            {params.provider === "esewa" ? "eSewa" : "Khalti"}…
          </p>
        )}

        {view.kind === "error" && (
          <>
            <h1 className="mb-2 text-xl font-bold">
              We could not check this payment
            </h1>
            <p role="alert" className="mb-5 text-sm text-red-400">
              {view.message}
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <button
                type="button"
                onClick={() => void check()}
                className={btnSolid}
              >
                Check again
              </button>
              <Link href="/support" className={btnGhost}>
                Back to support
              </Link>
            </div>
          </>
        )}

        {view.kind === "result" && (
          <Result result={view.result} onCheck={() => void check()} />
        )}
      </div>
      </main>
    </>
  );
}

function Result({
  result,
  onCheck,
}: {
  result: VerifyResult;
  onCheck: () => void;
}) {
  const money = formatMoney(result.amount, result.currency);

  return (
    <>
      {result.status === "completed" ? (
        <>
          <h1 className="mb-2 text-2xl font-bold">
            Thank you for your support!
          </h1>
          <p className="mb-1 text-sm text-ink/85">
            Your payment of <strong>{money}</strong> was received.
          </p>
        </>
      ) : result.status === "failed" ? (
        <>
          <h1 className="mb-2 text-xl font-bold">Payment not completed</h1>
          <p className="mb-1 text-sm text-ink/85">
            No money was taken for {money}.
            {result.note ? ` ${result.note}` : ""}
          </p>
        </>
      ) : (
        <>
          <h1 className="mb-2 text-xl font-bold">
            We are waiting for confirmation
          </h1>
          <p className="mb-1 text-sm text-ink/85">
            We have not received a confirmed payment of {money} yet. If you have
            already paid, press Check again in a moment.
          </p>
        </>
      )}

      {result.message && (
        <p role="status" className="mt-2 text-xs text-muted">
          {result.message}
        </p>
      )}
      <p className="mt-3 text-xs text-muted">Reference: {result.reference}</p>
      {result.isTest && (
        <p role="note" className="mt-3 text-xs text-muted">
          This was a test payment: no real money moved.
        </p>
      )}

      {result.status === "completed" &&
        (result.invoiceUrl ? (
          <InvoicePreview
            invoiceUrl={result.invoiceUrl}
            reference={result.reference}
          />
        ) : (
          <div className="mt-5">
            <p role="status" className="text-sm text-muted">
              Your payment is confirmed, but the invoice is not available yet.
            </p>
            <button
              type="button"
              onClick={onCheck}
              className={`${btnGhost} mt-3`}
            >
              Check again
            </button>
          </div>
        ))}

      <div className="mt-6 flex flex-wrap justify-center gap-3">
        {result.status === "completed" ? (
          <HomeLink hash="home" className={btnSolid}>
            Back to the homepage
          </HomeLink>
        ) : (
          <>
            <button type="button" onClick={onCheck} className={btnSolid}>
              Check again
            </button>
            <Link href="/support" className={btnGhost}>
              {result.status === "failed" ? "Try again" : "Back to support"}
            </Link>
          </>
        )}
      </div>
    </>
  );
}

function InvoicePreview({
  invoiceUrl,
  reference,
}: {
  invoiceUrl: string;
  reference: string;
}) {
  const [attempt, setAttempt] = useState(0);
  const [invoice, setInvoice] = useState<
    | { status: "loading" }
    | {
        status: "ready";
        objectUrl: string;
        invoiceUrl: string;
        attempt: number;
      }
    | {
        status: "error";
        message: string;
        invoiceUrl: string;
        attempt: number;
      }
  >({ status: "loading" });

  useEffect(() => {
    let active = true;
    let objectUrl: string | null = null;

    getPaymentInvoice(invoiceUrl)
      .then((blob) => {
        if (!active) return;
        objectUrl = URL.createObjectURL(blob);
        setInvoice({ status: "ready", objectUrl, invoiceUrl, attempt });
      })
      .catch((reason: unknown) => {
        if (active) {
          setInvoice({
            status: "error",
            message: paymentErrorMessage(reason),
            invoiceUrl,
            attempt,
          });
        }
      });

    return () => {
      active = false;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [invoiceUrl, attempt]);

  const isLoading =
    invoice.status === "loading" ||
    invoice.invoiceUrl !== invoiceUrl ||
    invoice.attempt !== attempt;

  function download() {
    if (isLoading || invoice.status !== "ready") return;
    const link = document.createElement("a");
    link.href = invoice.objectUrl;
    link.download = `invoice-${reference}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
  }

  return (
    <section
      aria-label="Payment invoice"
      className="mt-7 overflow-hidden rounded-2xl border border-accent/25 bg-page/35 text-left shadow-xl shadow-ink/10"
    >
      <div className="flex flex-col gap-4 border-b border-ink/10 p-4 sm:flex-row sm:items-center sm:justify-between sm:px-6 sm:py-5">
        <div className="flex min-w-0 items-center gap-3">
          <div
            aria-hidden="true"
            className="grid size-11 shrink-0 place-items-center rounded-xl bg-accent/15 text-accent2"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="1.7"
              className="size-6"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M7 3.75h7l4 4v12.5H7a2 2 0 0 1-2-2v-13a1.5 1.5 0 0 1 2-1.5Z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M14 4v4h4M8.5 13h7m-7 3h7"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <h2 className="font-bold tracking-tight">Your payment invoice</h2>
            <p className="mt-0.5 break-all text-xs text-muted">
              PDF document · {reference}
            </p>
          </div>
        </div>
        {!isLoading && invoice.status === "ready" && (
          <div className="grid w-full grid-cols-1 gap-2 sm:w-auto sm:grid-cols-2">
            <a
              href={invoice.objectUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={`${btnGhost} w-full !px-4 !py-2.5 !text-xs`}
            >
              Open PDF
            </a>
            <button
              type="button"
              onClick={download}
              className={`${btnSolid} w-full !px-4 !py-2.5 !text-xs`}
            >
              Download PDF
            </button>
          </div>
        )}
      </div>

      {isLoading && (
        <div
          role="status"
          className="grid min-h-72 place-items-center px-5 py-12 text-center sm:min-h-96"
        >
          <div>
            <span
              aria-hidden="true"
              className="mx-auto mb-3 block size-8 animate-spin rounded-full border-2 border-accent/25 border-t-accent"
            />
            <p className="text-sm font-medium">Preparing your invoice…</p>
            <p className="mt-1 text-xs text-muted">
              This usually only takes a moment.
            </p>
          </div>
        </div>
      )}
      {!isLoading && invoice.status === "error" && (
        <div className="p-5 sm:p-7">
          <p role="alert" className="text-sm text-red-400">
            We could not load your invoice: {invoice.message}
          </p>
          <button
            type="button"
            onClick={() => setAttempt((value) => value + 1)}
            className={`${btnGhost} mt-4 !px-5 !py-2.5`}
          >
            Try loading again
          </button>
        </div>
      )}
      {!isLoading && invoice.status === "ready" && (
        <div className="bg-[#e9e7e2] p-2 sm:p-4">
          <iframe
            src={invoice.objectUrl}
            title={`Invoice for payment ${reference}`}
            className="block h-[65svh] min-h-[360px] w-full rounded-lg border border-black/10 bg-white shadow-md sm:h-[75svh] sm:min-h-[520px] lg:h-[82svh]"
          />
          <p className="px-1 pt-2 text-center text-[11px] text-muted sm:hidden">
            For a larger view, use Open PDF above.
          </p>
        </div>
      )}
    </section>
  );
}
