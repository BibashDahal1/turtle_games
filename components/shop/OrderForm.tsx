"use client";

import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";

import FormField from "@/components/ui/FormField";
import { btnGhost, btnSolid } from "@/components/ui/classes";
import { formatMoney } from "@/lib/money";
import { useAppDispatch, useAppSelector } from "@/store/hooks";
import {
  placeOrder,
  selectCartPlacing,
  selectCartTotal,
} from "@/store/cartSlice";
import type {
  OrderFailure,
  OrderFieldErrors,
  OrderInput,
} from "@/store/cartSlice";
import { selectVisitor } from "@/store/visitorSlice";

type Field = keyof OrderInput;

function isOrderFailure(error: unknown): error is OrderFailure {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "fieldErrors" in error
  );
}

export default function OrderForm({ onBack }: { onBack: () => void }) {
  const dispatch = useAppDispatch();
  const visitor = useAppSelector(selectVisitor);
  const placing = useAppSelector(selectCartPlacing);
  const total = useAppSelector(selectCartTotal);

  // Pre-filled from the visitor's saved details when this form opens. Editing here only changes
  // THIS order: the visitor's saved details are never touched.
  const [values, setValues] = useState<OrderInput>(() => ({
    firstName: visitor?.firstName ?? "",
    middleName: visitor?.middleName ?? "",
    lastName: visitor?.lastName ?? "",
    email: visitor?.email ?? "",
    phone: visitor?.phone ?? "",
    country: visitor?.country ?? "",
    city: visitor?.city ?? "",
    address: "",
    landmark: "",
    note: "",
  }));
  const [fieldErrors, setFieldErrors] = useState<OrderFieldErrors>({});
  const [formError, setFormError] = useState<string | null>(null);

  const onChange =
    (name: Field) =>
    (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues((prev) => ({ ...prev, [name]: event.target.value }));
    };

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (placing) return;

    setFormError(null);
    setFieldErrors({});

    try {
      // On success the drawer switches to the confirmation by itself.
      await dispatch(
        placeOrder({
          firstName: values.firstName.trim(),
          middleName: values.middleName.trim(),
          lastName: values.lastName.trim(),
          email: values.email.trim(),
          phone: values.phone.trim(),
          country: values.country.trim(),
          city: values.city.trim(),
          address: values.address.trim(),
          landmark: values.landmark.trim(),
          note: values.note.trim(),
        }),
      ).unwrap();
    } catch (error) {
      const failure: OrderFailure = isOrderFailure(error)
        ? error
        : {
            message: "Something went wrong. Please try again.",
            fieldErrors: {},
          };
      setFieldErrors(failure.fieldErrors);
      setFormError(failure.message);
    }
  }

  const common = { idPrefix: "order" } as const;

  return (
    <form onSubmit={onSubmit} aria-labelledby="order-title">
      <h2 id="order-title" className="mb-1 text-xl font-bold">
        Delivery details
      </h2>
      <p className="mb-5 text-xs text-muted">
        We filled in what we know about you. Change anything for this order.
        Please give a phone number and email you can answer: your order is
        confirmed only after we reach you by call or email. There is no online
        payment.
      </p>

      <div className="grid grid-cols-6 gap-x-3 gap-y-3.5">
        <FormField
          {...common}
          name="firstName"
          label="First name"
          value={values.firstName}
          onChange={onChange("firstName")}
          errors={fieldErrors.firstName}
          required
          autoComplete="given-name"
          span="sm:col-span-2"
        />
        <FormField
          {...common}
          name="middleName"
          label="Middle name"
          value={values.middleName}
          onChange={onChange("middleName")}
          errors={fieldErrors.middleName}
          optional
          autoComplete="additional-name"
          span="sm:col-span-2"
        />
        <FormField
          {...common}
          name="lastName"
          label="Last name"
          value={values.lastName}
          onChange={onChange("lastName")}
          errors={fieldErrors.lastName}
          required
          autoComplete="family-name"
          span="sm:col-span-2"
        />
        <FormField
          {...common}
          name="email"
          label="Email"
          type="email"
          inputMode="email"
          value={values.email}
          onChange={onChange("email")}
          errors={fieldErrors.email}
          required
          autoComplete="email"
          span="sm:col-span-3"
        />
        <FormField
          {...common}
          name="phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          placeholder="+977 9800000000"
          value={values.phone}
          onChange={onChange("phone")}
          errors={fieldErrors.phone}
          required
          autoComplete="tel"
          span="sm:col-span-3"
        />
        <FormField
          {...common}
          name="country"
          label="Country"
          value={values.country}
          onChange={onChange("country")}
          errors={fieldErrors.country}
          required
          autoComplete="country-name"
          span="sm:col-span-3"
        />
        <FormField
          {...common}
          name="city"
          label="City"
          value={values.city}
          onChange={onChange("city")}
          errors={fieldErrors.city}
          required
          autoComplete="address-level2"
          span="sm:col-span-3"
        />
        <FormField
          {...common}
          name="address"
          label="Delivery address"
          placeholder="Street, area, ward, house number"
          value={values.address}
          onChange={onChange("address")}
          errors={fieldErrors.address}
          required
          maxLength={250}
          autoComplete="street-address"
        />
        <FormField
          {...common}
          name="landmark"
          label="Nearby landmark"
          value={values.landmark}
          onChange={onChange("landmark")}
          errors={fieldErrors.landmark}
          optional
          maxLength={150}
        />
        <FormField
          {...common}
          name="note"
          label="Note for us"
          value={values.note}
          onChange={onChange("note")}
          errors={fieldErrors.note}
          optional
          multiline
          maxLength={500}
        />
      </div>

      {formError && (
        <p role="alert" className="mt-4 text-sm text-red-400">
          {formError}
        </p>
      )}

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={placing}
          className={`${btnGhost} !px-5 !py-2.5 !text-xs`}
        >
          Back to cart
        </button>
        <button
          type="submit"
          disabled={placing}
          className={`${btnSolid} !py-2.5 disabled:opacity-60`}
        >
          {placing
            ? "Placing order…"
            : `Place order · ${formatMoney(total.amount, total.currency)}`}
        </button>
      </div>
    </form>
  );
}
