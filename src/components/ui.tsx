import { useEffect, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router';
import { ChevronLeft, Loader2, X } from 'lucide-react';
import clsx from 'clsx';

export function TopBar({
  title,
  subtitle,
  back,
  right,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  back?: boolean | string;
  right?: ReactNode;
}) {
  const navigate = useNavigate();
  return (
    <header className="pt-safe sticky top-0 z-20 border-b border-line bg-bg/95 backdrop-blur">
      <div className="flex min-h-14 items-center gap-1 px-2">
        {back && (
          <button
            aria-label="Back"
            className="rounded-full p-2 text-muted active:bg-surface-2"
            onClick={() => (typeof back === 'string' ? navigate(back) : navigate(-1))}
          >
            <ChevronLeft size={24} />
          </button>
        )}
        <div className={clsx('min-w-0 flex-1', !back && 'pl-2')}>
          <h1 className="truncate text-lg font-semibold">{title}</h1>
          {subtitle && <p className="truncate text-xs text-muted">{subtitle}</p>}
        </div>
        {right}
      </div>
    </header>
  );
}

export function Spinner({ className }: { className?: string }) {
  return <Loader2 className={clsx('animate-spin text-muted', className)} size={22} />;
}

export function Centered({ children }: { children: ReactNode }) {
  return <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-muted">{children}</div>;
}

export function ErrorNote({ error }: { error: unknown }) {
  return (
    <Centered>
      <span className="text-danger">{error instanceof Error ? error.message : 'Something went wrong'}</span>
    </Centered>
  );
}

export function Badge({ children, tone = 'muted' }: { children: ReactNode; tone?: 'muted' | 'accent' | 'warn' | 'danger' }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded-md px-1.5 py-0.5 text-[11px] font-medium leading-tight',
        tone === 'muted' && 'bg-surface-2 text-muted',
        tone === 'accent' && 'bg-accent/15 text-accent',
        tone === 'warn' && 'bg-warn/15 text-warn',
        tone === 'danger' && 'bg-danger/15 text-danger',
      )}
    >
      {children}
    </span>
  );
}

export function IconButton({
  label,
  onClick,
  children,
  tone = 'muted',
  disabled,
}: {
  label: string;
  onClick: () => void;
  children: ReactNode;
  tone?: 'muted' | 'accent' | 'danger';
  disabled?: boolean;
}) {
  return (
    <button
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'rounded-full p-2 active:bg-surface-2 disabled:opacity-30',
        tone === 'muted' && 'text-muted',
        tone === 'accent' && 'text-accent',
        tone === 'danger' && 'text-danger',
      )}
    >
      {children}
    </button>
  );
}

export function Button({
  children,
  onClick,
  variant = 'primary',
  disabled,
  type = 'button',
  className,
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: 'primary' | 'secondary' | 'danger';
  disabled?: boolean;
  type?: 'button' | 'submit';
  className?: string;
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold disabled:opacity-50',
        variant === 'primary' && 'bg-accent text-black active:bg-accent-strong',
        variant === 'secondary' && 'bg-surface-2 text-white ring-1 ring-line',
        variant === 'danger' && 'bg-danger/15 text-danger',
        className,
      )}
    >
      {children}
    </button>
  );
}

/** Bottom sheet: the main mobile pattern for pickers and forms. */
export function Sheet({
  open,
  onClose,
  title,
  children,
  tall,
}: {
  open: boolean;
  onClose: () => void;
  title: ReactNode;
  children: ReactNode;
  tall?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  if (!open) return null;
  return createPortal(
    <div className="fixed inset-0 z-40 flex flex-col justify-end">
      <div className="animate-fade absolute inset-0 bg-black/60" onClick={onClose} />
      <div
        className={clsx(
          'animate-sheet pb-safe relative flex max-h-[92dvh] flex-col rounded-t-2xl border-t border-line bg-surface',
          tall && 'h-[92dvh]',
        )}
      >
        <div className="flex items-center gap-2 px-4 pt-3 pb-2">
          <h2 className="flex-1 truncate text-base font-semibold">{title}</h2>
          <IconButton label="Close" onClick={onClose}>
            <X size={20} />
          </IconButton>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-4">{children}</div>
      </div>
    </div>,
    document.body,
  );
}

export function Confirm({
  open,
  title,
  message,
  confirmLabel = 'Delete',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  message?: ReactNode;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <Sheet open={open} onClose={onCancel} title={title}>
      {message && <p className="mb-4 text-sm text-muted">{message}</p>}
      <div className="grid grid-cols-2 gap-2">
        <Button variant="secondary" onClick={onCancel}>
          Cancel
        </Button>
        <Button variant="danger" onClick={onConfirm}>
          {confirmLabel}
        </Button>
      </div>
    </Sheet>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: ReactNode; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted">{hint}</span>}
    </label>
  );
}

export function Toggle({ checked, onChange, label }: { checked: boolean; onChange: (v: boolean) => void; label: string }) {
  return (
    <button
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={(e) => {
        e.stopPropagation();
        onChange(!checked);
      }}
      className={clsx('relative h-7 w-12 shrink-0 rounded-full transition-colors', checked ? 'bg-accent' : 'bg-surface-2 ring-1 ring-line')}
    >
      <span
        className={clsx(
          'absolute top-1 left-1 h-5 w-5 rounded-full bg-white transition-transform',
          checked && 'translate-x-5',
        )}
      />
    </button>
  );
}

export function Logo({ src, alt, size = 40 }: { src: string | null; alt: string; size?: number }) {
  return (
    <div
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-lg bg-surface-2"
      style={{ width: size, height: size }}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-contain p-1" />
      ) : (
        <span className="text-xs font-semibold text-muted">{alt.slice(0, 2).toUpperCase()}</span>
      )}
    </div>
  );
}

export function timeAgo(iso: string | null | undefined) {
  if (!iso) return null;
  const s = Math.round((Date.now() - new Date(iso).getTime()) / 1000);
  if (Number.isNaN(s)) return null;
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.floor(s / 60)}m ago`;
  if (s < 86400) return `${Math.floor(s / 3600)}h ago`;
  return `${Math.floor(s / 86400)}d ago`;
}
