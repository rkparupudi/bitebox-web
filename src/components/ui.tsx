import { createContext, ReactNode, useCallback, useContext, useState } from 'react';
import { ApiError } from '../api/client';
import type { OrderStatus } from '../api/types';
import { PROGRESS, STATUS_LABEL } from '../lib/format';

export function StatusBadge({ status }: { status: OrderStatus }) {
  return <span className={`badge s-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function LiveDot({ on }: { on: boolean }) {
  return <span className={`live ${on ? 'on' : ''}`}>{on ? 'Live' : 'Connecting…'}</span>;
}

export function ErrorBanner({ error }: { error: unknown }) {
  if (!error) return null;
  const msg = error instanceof ApiError || error instanceof Error ? error.message : 'Something went wrong';
  return <div className="banner error">{msg}</div>;
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return <div className="empty">{label}</div>;
}

export function Qty({ value, onChange, disabled }: { value: number; onChange: (n: number) => void; disabled?: boolean }) {
  return (
    <span className="qty" aria-label="quantity">
      <button type="button" disabled={disabled} onClick={() => onChange(value - 1)} aria-label="decrease">
        −
      </button>
      <span>{value}</span>
      <button type="button" disabled={disabled} onClick={() => onChange(value + 1)} aria-label="increase">
        +
      </button>
    </span>
  );
}

/** Horizontal progress bar for a customer's order. */
export function OrderProgress({ status }: { status: OrderStatus }) {
  if (status === 'cancelled' || status === 'pending_payment') return null;
  const at = PROGRESS.indexOf(status);
  return (
    <div className="track">
      {PROGRESS.map((s, i) => (
        <div key={s} className={`track-step ${i < at || status === 'delivered' ? 'done' : i === at ? 'now' : ''}`}>
          <div className="track-bar" />
          <span>{STATUS_LABEL[s]}</span>
        </div>
      ))}
    </div>
  );
}

/** Colourful placeholder art for a restaurant, derived from its name. */
export function TileArt({ name }: { name: string }) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % 360;
  const bg = `linear-gradient(135deg, hsl(${h} 70% 52%), hsl(${(h + 40) % 360} 75% 45%))`;
  const initials = name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase())
    .join('');
  return (
    <div className="tile-art" style={{ background: bg }}>
      {initials}
    </div>
  );
}

// ---------- toasts ----------

const ToastContext = createContext<(msg: string) => void>(() => {});

export function ToastProvider({ children }: { children: ReactNode }) {
  const [msg, setMsg] = useState<string | null>(null);
  const show = useCallback((m: string) => {
    setMsg(m);
    window.setTimeout(() => setMsg((cur) => (cur === m ? null : cur)), 3500);
  }, []);
  return (
    <ToastContext.Provider value={show}>
      {children}
      {msg && (
        <div className="toast" role="status">
          {msg}
        </div>
      )}
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
