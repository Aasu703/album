"use client";

import { Elements, PaymentElement, useElements, useStripe } from "@stripe/react-stripe-js";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { useAuth } from "@/components/AuthProvider";
import { api } from "@/lib/api";
import { getStripe, isStripeConfigured } from "@/app/lib/stripe";
import type { Artwork } from "@/app/lib/types";

interface BuyNowCheckoutProps {
  artwork: Artwork;
}

function extractErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "response" in error) {
    const response = (error as { response?: { data?: { message?: unknown } } }).response;
    const message = response?.data?.message;
    if (Array.isArray(message)) return message.join(", ");
    if (typeof message === "string") return message;
  }
  return error instanceof Error ? error.message : "Something went wrong.";
}

function CheckoutForm({ onSuccess }: { onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!stripe || !elements) {
      return;
    }

    setSubmitting(true);
    setError(null);

    const { error: confirmError, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}${window.location.pathname}?checkout=return`,
      },
      redirect: "if_required",
    });

    if (confirmError) {
      setError(confirmError.message ?? "Payment failed.");
      setSubmitting(false);
      return;
    }

    if (paymentIntent?.status === "succeeded") {
      onSuccess();
    } else {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <PaymentElement />
      {error ? <p className="text-sm text-[#a93b3b]">{error}</p> : null}
      <button
        type="submit"
        disabled={!stripe || submitting}
        className="min-h-11 w-full rounded-full bg-[#4D96FF] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-50"
      >
        {submitting ? "Processing..." : "Pay now"}
      </button>
    </form>
  );
}

/** Buy-It-Now checkout: creates a PaymentIntent, then mounts Stripe Elements to confirm it. */
export default function BuyNowCheckout({ artwork }: BuyNowCheckoutProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const isOwner =
    user &&
    typeof artwork.painterId === "object" &&
    artwork.painterId !== null &&
    "id" in artwork.painterId &&
    artwork.painterId.id === user.id;

  async function startCheckout() {
    if (!user) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await api.post("/payments/create-intent", { artworkId: artwork.id });
      setClientSecret(res.data.clientSecret);
    } catch (err) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  if (success) {
    return (
      <p className="rounded-xl border border-[#6BCB77]/40 bg-[#6BCB77]/10 p-3 text-sm font-semibold text-[#2f7a3c]">
        Purchase complete! The artist has been notified.
      </p>
    );
  }

  if (isOwner) {
    return (
      <p className="rounded-xl border border-[#E9ECEF] bg-[#F8F9FA] p-3 text-sm text-[#6C757D]">
        This is your own listing.
      </p>
    );
  }

  if (!isStripeConfigured) {
    return (
      <div className="space-y-2">
        <p className="text-2xl font-bold text-[#1A1A2E]">${artwork.price}</p>
        <button
          type="button"
          disabled
          title="Stripe is not configured yet"
          className="min-h-11 w-full rounded-full bg-[#4D96FF] px-5 text-sm font-semibold text-white shadow-sm opacity-50"
        >
          Buy Now (payments not configured yet)
        </button>
      </div>
    );
  }

  if (clientSecret) {
    return (
      <Elements stripe={getStripe()} options={{ clientSecret }}>
        <CheckoutForm onSuccess={() => setSuccess(true)} />
      </Elements>
    );
  }

  return (
    <div className="space-y-2">
      <p className="text-2xl font-bold text-[#1A1A2E]">${artwork.price}</p>
      {error ? <p className="text-sm text-[#a93b3b]">{error}</p> : null}
      <button
        type="button"
        onClick={() => void startCheckout()}
        disabled={loading}
        className="min-h-11 w-full rounded-full bg-[#4D96FF] px-5 text-sm font-semibold text-white shadow-sm transition hover:brightness-95 disabled:opacity-50"
      >
        {loading ? "Loading..." : "Buy Now"}
      </button>
    </div>
  );
}
