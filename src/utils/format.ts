// Formatting helpers matching Dispatcharr's Format.kt

export const Fmt = {
  dateTime(iso?: string | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  },

  date(iso?: string | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
    } catch {
      return iso;
    }
  },

  time(iso?: string | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return iso;
      return d.toLocaleTimeString(undefined, {
        hour: 'numeric',
        minute: '2-digit',
      });
    } catch {
      return iso;
    }
  },

  timeRange(start?: string | null, end?: string | null): string {
    return `${this.time(start)} – ${this.time(end)}`;
  },

  /** "2h 05m", "4m 12s", "45s" */
  duration(seconds?: number | null): string {
    if (seconds == null || seconds < 0) return '—';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);

    if (h > 0) {
      return `${h}h ${m.toString().padStart(2, '0')}m`;
    }
    if (m > 0) {
      return `${m}m ${s.toString().padStart(2, '0')}s`;
    }
    return `${s}s`;
  },

  /** Relative "5 min ago" / "in 2 h" / "just now" */
  relative(iso?: string | null): string {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      if (isNaN(d.getTime())) return '—';
      const diffMs = Date.now() - d.getTime();
      const diffSec = Math.floor(diffMs / 1000);
      const isPast = diffSec >= 0;
      const absSec = Math.abs(diffSec);

      if (absSec < 60) return 'just now';
      const absMin = Math.floor(absSec / 60);
      if (absMin < 60) return isPast ? `${absMin} min ago` : `in ${absMin} min`;
      const absHours = Math.floor(absMin / 60);
      if (absHours < 24) return isPast ? `${absHours} h ago` : `in ${absHours} h`;
      const absDays = Math.floor(absHours / 24);
      return isPast ? `${absDays} d ago` : `in ${absDays} d`;
    } catch {
      return '—';
    }
  },

  /** Formats bytes to B, KB, MB, GB, TB */
  bytes(b?: number | null): string {
    if (b == null) return '—';
    const units = ['B', 'KB', 'MB', 'GB', 'TB'];
    let v = b;
    let i = 0;
    while (v >= 1024 && i < units.length - 1) {
      v /= 1024;
      i++;
    }
    return i === 0 ? `${b} B` : `${v.toFixed(1)} ${units[i]}`;
  },

  /** bits/sec or kbps formatting -> "4.5 Mbps" or "850 kbps" */
  bitrate(kbps?: number | null): string {
    if (kbps == null) return '—';
    return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)} Mbps` : `${Math.round(kbps)} kbps`;
  },
};
