"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import Logo from "@/components/Logo";
import { btnSolid, eyebrow, glass, grad } from "@/components/ui/classes";
import { useAppDispatch } from "@/store/hooks";
import { registerVisitor } from "@/store/visitorSlice";
import type { FieldErrors, RegisterFailure } from "@/store/visitorSlice";

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
  "w-full rounded-xl border border-accent/30 bg-panel/60 px-4 py-3 text-sm text-ink placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent aria-[invalid=true]:border-red-400";

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
    <div className={`col-span-6 ${span}`}>
      <label htmlFor={id} className="mb-1.5 block text-xs font-semibold">
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

export default function VisitorForm() {
  const dispatch = useAppDispatch();
  const [values, setValues] = useState<FormValues>(EMPTY);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

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
    <main className="relative z-10 flex min-h-svh items-center justify-center px-4 py-16">
      <form
        onSubmit={onSubmit}
        className={`${glass} w-full max-w-2xl p-6 sm:p-9`}
        aria-labelledby="visitor-title"
      >
        <Logo className="mb-6 h-12" />
        <p className={eyebrow}>Before you dive in</p>
        <h1
          id="visitor-title"
          className={`${grad} mb-2 text-[clamp(1.8rem,4vw,2.6rem)]`}
        >
          Tell us who is visiting
        </h1>
        <p className="mb-7 text-sm text-ink/85">
          Fill this in once. This browser will remember you, so you will not be
          asked again.
        </p>

        <div className="grid grid-cols-6 gap-x-4 gap-y-4">
          <Field
            name="firstName"
            label="First name"
            value={values.firstName}
            onChange={onText("firstName")}
            errors={fieldErrors.firstName}
            required
            autoComplete="given-name"
            span="sm:col-span-2"
          />
          <Field
            name="middleName"
            label="Middle name"
            value={values.middleName}
            onChange={onText("middleName")}
            errors={fieldErrors.middleName}
            optional
            autoComplete="additional-name"
            span="sm:col-span-2"
          />
          <Field
            name="lastName"
            label="Last name"
            value={values.lastName}
            onChange={onText("lastName")}
            errors={fieldErrors.lastName}
            required
            autoComplete="family-name"
            span="sm:col-span-2"
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
            span="sm:col-span-2"
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
            span="sm:col-span-4"
          />
          <Field
            name="country"
            label="Country"
            value={values.country}
            onChange={onText("country")}
            errors={fieldErrors.country}
            required
            autoComplete="country-name"
            span="sm:col-span-3"
          />
          <Field
            name="city"
            label="City"
            value={values.city}
            onChange={onText("city")}
            errors={fieldErrors.city}
            optional
            autoComplete="address-level2"
            span="sm:col-span-3"
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
            span="sm:col-span-6"
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
                I agree that Turtle Games may store these details so I can visit
                the site.
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
          <p role="alert" className="mt-5 text-sm text-red-400">
            {formError}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className={`${btnSolid} mt-7 w-full disabled:opacity-60`}
        >
          {submitting ? "Entering…" : "Enter the site"}
        </button>
      </form>
    </main>
  );
}
