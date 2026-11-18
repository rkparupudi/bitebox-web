import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
// '/pure' loads Stripe.js only when loadStripe() is first called, not on every page load.
import { loadStripe } from '@stripe/stripe-js/pure';
import type { Stripe } from '@stripe/stripe-js';
import { useState } from 'react';
import { api } from '../../api/client';
import type { Order } from '../../api/types';
import { ErrorBanner, Loading } from '../../components/ui';
import { money } from '../../lib/format';

let stripePromise: Promise<Stripe | null> | null = null;
const getStripe = (key: string) => (stripePromise ??= loadStripe(key));

/**
 * Collects payment for a pending order.
 * - PAYMENTS_PROVIDER=stripe: Stripe's PaymentElement (card details go straight to Stripe,
 *   never through our servers — that's what keeps us out of most PCI scope).
 * - PAYMENTS_PROVIDER=fake (local): two buttons that simulate Stripe's webhook.
 * Either way, the order only becomes "placed" when the API receives the payment event;
 * this screen then updates live over the WebSocket.
 */
export function PaymentPanel({ order }: { order: Order }) {
  const config = useQuery({ queryKey: ['config'], queryFn: api.config, staleTime: Infinity });
  if (config.isLoading) return <Loading />;
  if (config.data?.paymentsProvider === 'fake') return <FakePayment order={order} />;
  if (!config.data?.stripePublishableKey) {
    return <div className="banner error">Stripe is not configured: set STRIPE_PUBLISHABLE_KEY on the API.</div>;
  }
  return <StripePayment order={order} publishableKey={config.data.stripePublishableKey} />;
}

function FakePayment({ order }: { order: Order }) {
  const qc = useQueryClient();
  const simulate = useMutation({
    mutationFn: (outcome: 'succeeded' | 'failed') => api.simulatePayment(order.id, outcome),
    onSuccess: (o) => qc.setQueryData(['order', order.id], o),
  });
  return (
    <div className="stack">
      <div className="banner info">
        Local test mode: no real payment is taken. These buttons send the same event Stripe would.
      </div>
      {order.payment?.status === 'failed' && <div className="banner error">Payment was declined. Try again.</div>}
      <ErrorBanner error={simulate.error} />
      <div className="row wrap">
        <button className="btn primary" disabled={simulate.isPending} onClick={() => simulate.mutate('succeeded')}>
          Pay {money(order.totalMinor, order.currency)}
        </button>
        <button className="btn" disabled={simulate.isPending} onClick={() => simulate.mutate('failed')}>
          Simulate a declined card
        </button>
      </div>
    </div>
  );
}

function StripePayment({ order, publishableKey }: { order: Order; publishableKey: string }) {
  const secret = useQuery({ queryKey: ['payment-secret', order.id], queryFn: () => api.paymentSecret(order.id) });
  if (secret.isLoading) return <Loading label="Preparing secure payment…" />;
  if (secret.error) return <ErrorBanner error={secret.error} />;
  return (
    <Elements stripe={getStripe(publishableKey)} options={{ clientSecret: secret.data!.clientSecret, appearance: { theme: 'stripe' } }}>
      <StripeForm order={order} />
    </Elements>
  );
}

function StripeForm({ order }: { order: Order }) {
  const stripe = useStripe();
  const elements = useElements();
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  return (
    <form
      className="stack"
      onSubmit={async (e) => {
        e.preventDefault();
        if (!stripe || !elements) return;
        setBusy(true);
        setError(null);
        const { error: err } = await stripe.confirmPayment({
          elements,
          redirect: 'if_required', // cards confirm in place; redirect-based methods come back here
          confirmParams: { return_url: `${window.location.origin}/orders/${order.id}` },
        });
        setBusy(false);
        if (err) setError(err.message ?? 'Payment failed');
        else setSubmitted(true);
      }}
    >
      <PaymentElement />
      {error && <div className="banner error">{error}</div>}
      {submitted ? (
        <div className="banner info">Payment submitted. Waiting for confirmation from Stripe…</div>
      ) : (
        <button className="btn primary" disabled={!stripe || busy}>
          {busy ? 'Processing…' : `Pay ${money(order.totalMinor, order.currency)}`}
        </button>
      )}
      <p className="muted small">Test card: 4242 4242 4242 4242, any future date, any CVC.</p>
    </form>
  );
}
