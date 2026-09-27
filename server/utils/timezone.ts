const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000; // +05:30 in milliseconds

/**
 * Returns current date components in Asia/Kolkata (IST)
 */
export function getNowInIST(date: Date = new Date()): { year: number; month: number; day: number } {
  const istDate = new Date(date.getTime() + IST_OFFSET_MS);
  return {
    year: istDate.getUTCFullYear(),
    month: istDate.getUTCMonth(),
    day: istDate.getUTCDate(),
  };
}

/**
 * Returns the exact UTC Date corresponding to 00:00:00.000 IST on a given calendar day
 */
export function getStartOfDayIST(year: number, monthIndex: number, day: number): Date {
  return new Date(Date.UTC(year, monthIndex, day, 0, 0, 0, 0) - IST_OFFSET_MS);
}

export type DateRangePreset = 'today' | 'yesterday' | '7days' | '1month' | 'all' | 'custom';

export interface DateRangeBounds {
  start?: Date;
  end?: Date;
  label: string;
}

/**
 * Returns exact half-open UTC boundaries [start, end) for queries in Asia/Kolkata timezone
 */
export function getDateRangeBounds(
  range: DateRangePreset = 'all',
  customStartDate?: string,
  customEndDate?: string
): DateRangeBounds {
  const now = new Date();
  const { year, month, day } = getNowInIST(now);

  const startOfToday = getStartOfDayIST(year, month, day);
  const startOfTomorrow = getStartOfDayIST(year, month, day + 1);

  if (range === 'today') {
    return {
      start: startOfToday,
      end: startOfTomorrow,
      label: 'Today (IST)',
    };
  }

  if (range === 'yesterday') {
    const startOfYesterday = getStartOfDayIST(year, month, day - 1);
    return {
      start: startOfYesterday,
      end: startOfToday,
      label: 'Yesterday (IST)',
    };
  }

  if (range === '7days') {
    const startOf7DaysAgo = getStartOfDayIST(year, month, day - 6);
    return {
      start: startOf7DaysAgo,
      end: startOfTomorrow,
      label: 'Last 7 Days (IST)',
    };
  }

  if (range === '1month') {
    const startOf30DaysAgo = getStartOfDayIST(year, month, day - 29);
    return {
      start: startOf30DaysAgo,
      end: startOfTomorrow,
      label: 'Last 30 Days (IST)',
    };
  }

  if (range === 'custom' && customStartDate && customEndDate) {
    const [sy, sm, sd] = customStartDate.split('-').map(Number);
    const [ey, em, ed] = customEndDate.split('-').map(Number);

    if (sy && sm && sd && ey && em && ed) {
      const start = getStartOfDayIST(sy, sm - 1, sd);
      const end = getStartOfDayIST(ey, em - 1, ed + 1); // half-open end of day
      return {
        start,
        end,
        label: `${customStartDate} to ${customEndDate} (IST)`,
      };
    }
  }

  return {
    start: undefined,
    end: undefined,
    label: 'All Time',
  };
}

/**
 * Formats a Date object or ISO string in Asia/Kolkata format: "27 Sep 2026, 05:30 PM (IST)"
 */
export function formatDateIST(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(d) + ' IST';
}

/**
 * Formats a Date object or ISO string in Asia/Kolkata date-only format: "27 Sep 2026"
 */
export function formatDateOnlyIST(date: Date | string | null | undefined): string {
  if (!date) return '—';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '—';

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(d);
}
