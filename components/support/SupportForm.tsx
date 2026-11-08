"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { inputClass } from "@/components/ui/FormField";
import {
  btnGhost,
  btnSolid,
  eyebrow,
  glass,
  grad,
} from "@/components/ui/classes";
import { formatMoney } from "@/lib/money";
import {
  getPaymentConfig,
  paymentErrorMessage,
  startPayment,
} from "@/lib/payments";
import type { EsewaForm, PaymentConfig, PaymentProvider } from "@/lib/payments";

const PRESETS = [100, 500, 1000, 2000];

export default function SupportForm() {
  const [config, setConfig] = useState<PaymentConfig | null>(null);
  const [configError, setConfigError] = useState<string | null>(null);
  const [amount, setAmount] = useState("500");
  const [busy, setBusy] = useState<PaymentProvider | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [esewaForm, setEsewaForm] = useState<EsewaForm | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    const controller = new AbortController();
    getPaymentConfig(controller.signal)
      .then(setConfig)
      .catch((reason: unknown) => {
        if (reason instanceof DOMException && reason.name === "AbortError")
          return;
        setConfigError(paymentErrorMessage(reason));
      });
    return () => controller.abort();
  }, []);

  // eSewa needs the browser to POST a signed form. It is submitted automatically.
  useEffect(() => {
    if (esewaForm) formRef.current?.submit();
  }, [esewaForm]);

  const parsed = Number(amount);
  const validAmount =
    config !== null &&
    Number.isInteger(parsed) &&
    parsed >= config.minAmount &&
    parsed <= config.maxAmount;

  async function pay(provider: PaymentProvider) {
    if (!config || busy) return;
    if (!validAmount) {
      setError(
        `Enter a whole amount between ${formatMoney(config.minAmount, config.currency)} and ${formatMoney(config.maxAmount, config.currency)}.`,
      );
      return;
    }

    setError(null);
    setBusy(provider);
    try {
      const result = await startPayment(provider, parsed);
      if (result.provider === "khalti") {
        window.location.assign(result.redirectUrl); // leaves the site, so stay "busy"
      } else {
        setEsewaForm(result.form);
      }
    } catch (reason) {
      setError(paymentErrorMessage(reason));
      setBusy(null);
    }
  }

  return (
    <main className="relative z-10 flex min-h-svh items-center justify-center px-4 py-16">
      <div className={`${glass} w-full max-w-lg p-6 sm:p-9`}>
        <p className={eyebrow}>Support us</p>
        <h1 className={`${grad} mb-2 text-[clamp(1.8rem,4vw,2.4rem)]`}>
          Support Turtle Games
        </h1>
        <p className="mb-6 text-sm text-ink/85">
          Your support helps the creator and the organization keep making games.
          Choose any amount you like.
        </p>

        {config?.isTest && (
          <p
            role="note"
            className="mb-5 rounded-xl border border-accent/40 bg-accent/10 p-3 text-xs"
          >
            Test mode: no real money is charged. Please use the providers test
            accounts.
          </p>
        )}

        {configError && (
          <p role="alert" className="mb-4 text-sm text-red-400">
            {configError}
          </p>
        )}

        <fieldset
          disabled={busy !== null || config === null}
          className="min-w-0"
        >
          <legend className="mb-2 text-xs font-semibold">Amount</legend>
          <div className="mb-3 flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset}
                type="button"
                aria-pressed={parsed === preset}
                onClick={() => setAmount(String(preset))}
                className={`${btnGhost} !px-4 !py-2 !text-xs ${parsed === preset ? "bg-accent/20" : ""}`}
              >
                {formatMoney(preset, config?.currency ?? "NPR")}
              </button>
            ))}
          </div>

          <label
            htmlFor="support-amount"
            className="mb-1.5 block text-xs font-semibold"
          >
            Or enter your own amount ({config?.currency ?? "NPR"})
          </label>
          <input
            id="support-amount"
            type="number"
            inputMode="numeric"
            min={config?.minAmount}
            max={config?.maxAmount}
            step={1}
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className={inputClass}
          />
          {config && (
            <p className="mt-1 text-xs text-muted">
              Whole amounts from{" "}
              {formatMoney(config.minAmount, config.currency)} to{" "}
              {formatMoney(config.maxAmount, config.currency)}.
            </p>
          )}

          <div className="mt-6 grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => void pay("khalti")}
              disabled={!config?.providers.khalti || !validAmount}
              className={`${btnSolid} disabled:opacity-50`}
            >
              {busy === "khalti" ? "Opening Khalti…" : "Pay with Khalti"}
            </button>
            <button
              type="button"
              onClick={() => void pay("esewa")}
              disabled={!config?.providers.esewa || !validAmount}
              className={`${btnSolid} disabled:opacity-50`}
            >
              {busy === "esewa" ? "Opening eSewa…" : "Pay with eSewa"}
            </button>
          </div>
          {config && !config.providers.khalti && (
            <p className="mt-2 text-xs text-muted">Khalti is not set up yet.</p>
          )}
          {config && !config.providers.esewa && (
            <p className="mt-2 text-xs text-muted">eSewa is not set up yet.</p>
          )}
        </fieldset>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-400">
            {error}
          </p>
        )}

        <Link
          href="/"
          className="mt-6 inline-block text-xs underline underline-offset-4"
        >
          Back to the site
        </Link>

        {esewaForm && (
          <form
            ref={formRef}
            method="POST"
            action={esewaForm.action}
            className="hidden"
          >
            {Object.entries(esewaForm.fields).map(([name, value]) => (
              <input key={name} type="hidden" name={name} value={value} />
            ))}
            <button type="submit">Continue to eSewa</button>
          </form>
        )}
      </div>
    </main>
  );
}
