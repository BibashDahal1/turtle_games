"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

import { inputClass } from "@/components/ui/FormField";
import SupportScene from "@/components/support/SupportScene";
import {
  btnGhost,
  eyebrow,
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
    <>
      <SupportScene />
      <main className="relative z-10 flex min-h-svh items-center justify-center px-4 py-16 text-[#3f2a17]">
        <div className="w-full max-w-lg rounded-2xl border border-white/55 bg-[#fff9e8]/45 p-6 text-[#3f2a17] shadow-2xl shadow-[#50310b]/20 backdrop-blur-xl sm:p-9">
          <p className={eyebrow}>Support us</p>
          <h1 className={`${grad} mb-2 text-[clamp(1.8rem,4vw,2.4rem)]`}>
            Support Turtle Games
          </h1>
          <p className="mb-6 text-sm leading-relaxed text-[#3f2a17]">
            Your support helps the creator and the organization keep making
            games. Choose any amount you like.
          </p>

          {config?.isTest && (
            <p
              role="note"
              className="mb-5 rounded-xl border border-[#8d5b22]/30 bg-white/70 p-3 text-xs text-[#3f2a17]"
            >
              Test mode: no real money is charged. Please use the providers test
              accounts.
            </p>
          )}

          {configError && (
            <p role="alert" className="mb-4 text-sm text-red-800">
              {configError}
            </p>
          )}

          <fieldset
            disabled={busy !== null || config === null}
            className="min-w-0"
          >
            <legend className="mb-2 text-xs font-bold text-[#3f2a17]">
              Amount
            </legend>
            <div className="mb-3 flex flex-wrap gap-2">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  aria-pressed={parsed === preset}
                  onClick={() => setAmount(String(preset))}
                  className={`${btnGhost} !border-[#8d5b22]/45 !px-4 !py-2 !text-xs !text-[#3f2a17] ${parsed === preset ? "!bg-[#f3dfb1]" : "!bg-white/75"}`}
                >
                  {formatMoney(preset, config?.currency ?? "NPR")}
                </button>
              ))}
            </div>

            <label
              htmlFor="support-amount"
              className="mb-1.5 block text-xs font-bold text-[#3f2a17]"
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
              className={`${inputClass} !border-[#8d5b22]/40 !bg-white/90 !text-[#2d2117] placeholder:!text-[#745f49]`}
            />
            {config && (
              <p className="mt-1 text-xs text-[#604a32]">
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
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-[#5d2e8e]/30 bg-white/95 px-4 py-3 text-sm font-bold text-[#352044] shadow-md shadow-[#351b4a]/10 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5d2e8e] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
              >
                <Image
                  src="/payments/khalti.svg"
                  alt=""
                  aria-hidden="true"
                  width={36}
                  height={36}
                  className="size-9 shrink-0"
                />
                <span>
                  {busy === "khalti" ? "Opening Khalti…" : "Pay with Khalti"}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void pay("esewa")}
                disabled={!config?.providers.esewa || !validAmount}
                className="inline-flex min-h-14 items-center justify-center gap-3 rounded-xl border border-[#16843b]/30 bg-white/95 px-4 py-3 text-sm font-bold text-[#175b31] shadow-md shadow-[#174b2b]/10 transition hover:-translate-y-0.5 hover:bg-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#16843b] disabled:cursor-not-allowed disabled:opacity-55 motion-reduce:transition-none"
              >
                <Image
                  src="/payments/esewa.svg"
                  alt=""
                  aria-hidden="true"
                  width={36}
                  height={36}
                  className="size-9 shrink-0"
                />
                <span>
                  {busy === "esewa" ? "Opening eSewa…" : "Pay with eSewa"}
                </span>
              </button>
            </div>
            {config && !config.providers.khalti && (
              <p className="mt-2 text-xs text-[#604a32]">
                Khalti is not set up yet.
              </p>
            )}
            {config && !config.providers.esewa && (
              <p className="mt-2 text-xs text-[#604a32]">
                eSewa is not set up yet.
              </p>
            )}
          </fieldset>

          {error && (
            <p role="alert" className="mt-4 text-sm font-semibold text-red-800">
              {error}
            </p>
          )}

          <Link
            href="/"
            className="mt-6 inline-block text-xs font-semibold text-[#4a2d13] underline underline-offset-4"
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
    </>
  );
}
