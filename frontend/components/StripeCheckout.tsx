'use client';

import { useState, useEffect } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { api } from '../lib/api';

// Initialize Stripe outside of component to avoid recreating the object on every render
const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || 'pk_test_mock');

function CheckoutForm({ artworkId }: { artworkId: string }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!stripe || !elements) return;

    setLoading(true);
    setError('');

    // Task 4: Securely confirm the payment on the client side.
    // The raw credit card details never touch our server, only Stripe's servers.
    const { error: submitError } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/payment-success`,
      },
    });

    if (submitError) {
      setError(submitError.message || 'Payment failed.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement />
      {error && <div className="text-red-500 text-sm font-medium">{error}</div>}
      <button 
        type="submit" 
        disabled={!stripe || loading}
        className="w-full py-3 px-4 bg-green-600 hover:bg-green-700 text-white font-bold rounded-lg shadow-lg disabled:opacity-50 transition-colors"
      >
        {loading ? 'Processing...' : 'Pay Now'}
      </button>
    </form>
  );
}

export default function StripeCheckout({ artworkId }: { artworkId: string }) {
  const [clientSecret, setClientSecret] = useState('');

  useEffect(() => {
    // Task 4: Fetch Client Secret securely.
    // We pass ONLY the artworkId. The backend queries the database for the price,
    // ensuring Zero-Trust pricing (preventing price tampering).
    api.post('/payments/create-intent', { artworkId })
      .then(res => setClientSecret(res.data.clientSecret))
      .catch(err => console.error('Failed to initialize checkout', err));
  }, [artworkId]);

  if (!clientSecret) {
    return <div className="animate-pulse flex space-x-4">Loading secure checkout...</div>;
  }

  return (
    <div className="p-6 bg-white rounded-xl shadow-xl max-w-md w-full border border-gray-100 text-gray-900">
      <h3 className="text-xl font-bold mb-6 text-gray-800">Secure Checkout</h3>
      <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
        <CheckoutForm artworkId={artworkId} />
      </Elements>
      <div className="mt-4 flex items-center justify-center text-xs text-gray-500 space-x-2">
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15l-5-5 1.41-1.41L11 14.17l7.59-7.59L20 8l-9 9z"/></svg>
        <span>Payments secured by Stripe (PCI-DSS Compliant)</span>
      </div>
    </div>
  );
}
