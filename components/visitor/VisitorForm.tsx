"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import dynamic from "next/dynamic";

import Logo from "@/components/Logo";
import WaterRipple from "@/components/effects/WaterRipple";
import { btnSolid, eyebrow, glass, grad } from "@/components/ui/classes";
import { useAppDispatch } from "@/store/hooks";
import { registerVisitor } from "@/store/visitorSlice";
import type { FieldErrors, RegisterFailure } from "@/store/visitorSlice";

const VisitorScene = dynamic(() => import("./VisitorScene"), {
  ssr: false,
});

interface FormValues {
  firstName: string;
  middleName: string;
  lastName: string;
  age: string;
  email: string;
  phone: string;
  country: string;
  city: string;
  consent: boolean;
}

const EMPTY: FormValues = {
  firstName: "",
  middleName: "",
  lastName: "",
  age: "",
  email: "",
  phone: "",
  country: "",
  city: "",
  consent: false,
};

const inputClass =
  "w-full rounded-xl border border-ink/20 bg-ink/5 px-4 py-2 text-sm text-ink " +
  "placeholder:text-muted backdrop-blur-sm transition-colors " +
  "hover:border-accent/50 focus:bg-ink/10 " +
  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent " +
  "aria-[invalid=true]:border-red-400";

type TextField = Exclude<keyof FormValues, "consent">;

interface FieldProps {
  name: TextField;
  label: string;
  value: string;
  onChange: (event: ChangeEvent<HTMLInputElement>) => void;
  errors?: string[];
  optional?: boolean;
  required?: boolean;
  type?: string;
  autoComplete?: string;
  inputMode?: "numeric" | "tel" | "email" | "text";
  /** full responsive span classes, e.g. "col-span-3 sm:col-span-2" */
  span: string;
}

function Field({
  name,
  label,
  value,
  onChange,
  errors,
  optional,
  required,
  type = "text",
  autoComplete,
  inputMode,
  span,
}: FieldProps) {
  const id = `visitor-${name}`;
  const errorId = `${id}-error`;
  const hasError = Boolean(errors?.length);

  return (
    <div className={span}>
      <label htmlFor={id} className="mb-1 block text-xs font-semibold">
        {label}
        {optional && (
          <span className="font-normal text-muted"> (optional)</span>
        )}
      </label>
      <input
        id={id}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        required={required}
        autoComplete={autoComplete}
        inputMode={inputMode}
        aria-invalid={hasError}
        aria-describedby={hasError ? errorId : undefined}
        className={inputClass}
        {...(type === "number" ? { min: 1, max: 120 } : {})}
      />
      {hasError && (
        <p id={errorId} role="alert" className="mt-1 text-xs text-red-400">
          {errors?.join(" ")}
        </p>
      )}
    </div>
  );
}

function isRegisterFailure(error: unknown): error is RegisterFailure {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "fieldErrors" in error
  );
}

// breathing room kept between the form and the screen edges (px)
const EDGE_X = 16;
const EDGE_Y = 12;

export default function VisitorForm() {
  const dispatch = useAppDispatch();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const mainRef = useRef<HTMLElement>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const [scale, setScale] = useState(1);

  // the form page never scrolls
  useEffect(() => {
    const html = document.documentElement;
    const body = document.body;
    const prevHtml = html.style.overflow;
    const prevBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    window.scrollTo(0, 0);
    return () => {
      html.style.overflow = prevHtml;
      body.style.overflow = prevBody;
    };
  }, []);

  // Scale the form down (never up) so it always fits the viewport.
  // offsetWidth/offsetHeight ignore CSS transforms, so measuring the form
  // never feeds back into itself.
  useLayoutEffect(() => {
    const main = mainRef.current;
    const form = formRef.current;
    if (!main || !form) return;

    const fit = () => {
      const availW = main.clientWidth - EDGE_X * 2;
      const availH = main.clientHeight - EDGE_Y * 2;
      const w = form.offsetWidth;
      const h = form.offsetHeight;
      if (!w || !h || availW <= 0 || availH <= 0) return;
      const next = Math.min(1, availW / w, availH / h);
      setScale((prev) => (Math.abs(prev - next) < 0.001 ? prev : next));
    };

    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(main); // viewport changes
    observer.observe(form); // content changes (errors, fonts, wrapping)
    return () => observer.disconnect();
  }, []);

  const onText =
    (name: TextField) => (event: ChangeEvent<HTMLInputElement>) => {
      setValues((prev) => ({ ...prev, [name]: event.target.value }));
    };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting) return;

    const age = Number(values.age);
    if (!Number.isInteger(age)) {
      setFieldErrors({ age: ["Enter your age as a whole number."] });
      setFormError("Please check the highlighted fields.");
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setFieldErrors({});

    try {
      // On success the visitor is signed in and the gate replaces this form with the site.
      await dispatch(
        registerVisitor({
          firstName: values.firstName.trim(),
          middleName: values.middleName.trim(),
          lastName: values.lastName.trim(),
          age,
          email: values.email.trim(),
          phone: values.phone.trim(),
          country: values.country.trim(),
          city: values.city.trim(),
          consent: values.consent,
        }),
      ).unwrap();
    } catch (error) {
      const failure: RegisterFailure = isRegisterFailure(error)
        ? error
        : {
            message: "Something went wrong. Please try again.",
            fieldErrors: {},
          };
      setFieldErrors(failure.fieldErrors);
      setFormError(failure.message);
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 overflow-hidden bg-page text-ink">
      <WaterRipple
        scope="window"
        quality={0.65}
        intensity={0.7}
        backgroundDepth={0}
      />
      {/* rigged 3D turtle: waves first, then swims its usual background route */}
      <VisitorScene />

      <main
        ref={mainRef}
        className="relative z-10 flex h-dvh items-center justify-center overflow-hidden px-4"
      >
        <form
          ref={formRef}
          onSubmit={onSubmit}
          style={{ transform: `scale(${scale})`, transformOrigin: "center" }}
          className={`${glass} w-full max-w-2xl shrink-0 !bg-page/25 p-4 backdrop-blur-md sm:p-7 max-h-none`}
          aria-labelledby="visitor-title"
        >
          <Logo className="mb-3 h-8 sm:mb-4 sm:h-10" />
          <p className={eyebrow}>Before you dive in</p>
          <h1
            id="visitor-title"
            className={`${grad} mb-1 text-[clamp(1.4rem,3.6vw,2.3rem)]`}
          >
            Tell us who is visiting
          </h1>

          <div className="grid grid-cols-6 gap-x-3 gap-y-2.5 sm:gap-x-4 sm:gap-y-3">
            <Field
              name="firstName"
              label="First name"
              value={values.firstName}
              onChange={onText("firstName")}
              errors={fieldErrors.firstName}
              required
              autoComplete="given-name"
              span="col-span-3 sm:col-span-2"
            />
            <Field
              name="middleName"
              label="Middle name"
              value={values.middleName}
              onChange={onText("middleName")}
              errors={fieldErrors.middleName}
              optional
              autoComplete="additional-name"
              span="col-span-3 sm:col-span-2"
            />
            <Field
              name="lastName"
              label="Last name"
              value={values.lastName}
              onChange={onText("lastName")}
              errors={fieldErrors.lastName}
              required
              autoComplete="family-name"
              span="col-span-6 sm:col-span-2"
            />
            <Field
              name="age"
              label="Age"
              type="number"
              inputMode="numeric"
              value={values.age}
              onChange={onText("age")}
              errors={fieldErrors.age}
              required
              span="col-span-2"
            />
            <Field
              name="email"
              label="Email"
              type="email"
              inputMode="email"
              value={values.email}
              onChange={onText("email")}
              errors={fieldErrors.email}
              required
              autoComplete="email"
              span="col-span-4"
            />
            <Field
              name="country"
              label="Country"
              value={values.country}
              onChange={onText("country")}
              errors={fieldErrors.country}
              required
              autoComplete="country-name"
              span="col-span-3"
            />
            <Field
              name="city"
              label="City"
              value={values.city}
              onChange={onText("city")}
              errors={fieldErrors.city}
              optional
              autoComplete="address-level2"
              span="col-span-3"
            />
            <Field
              name="phone"
              label="Phone"
              type="tel"
              inputMode="tel"
              value={values.phone}
              onChange={onText("phone")}
              errors={fieldErrors.phone}
              optional
              autoComplete="tel"
              span="col-span-6"
            />

            <div className="col-span-6">
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  checked={values.consent}
                  onChange={(event) =>
                    setValues((prev) => ({
                      ...prev,
                      consent: event.target.checked,
                    }))
                  }
                  required
                  aria-invalid={Boolean(fieldErrors.consent?.length)}
                  className="mt-0.5 size-4 shrink-0 accent-accent"
                />
                <span>
                  I agree that Turtle Games may store these details so I can
                  visit the site.
                </span>
              </label>
              {fieldErrors.consent?.length ? (
                <p role="alert" className="mt-1 text-xs text-red-400">
                  {fieldErrors.consent.join(" ")}
                </p>
              ) : null}
            </div>
          </div>

          {formError && (
            <p role="alert" className="mt-3 text-sm text-red-400">
              {formError}
            </p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className={`${btnSolid} mt-4 w-full disabled:opacity-60 sm:mt-5`}
          >
            {submitting ? "Entering…" : "Enter the site"}
          </button>
        </form>
      </main>
    </div>
  );
}
