// Pure date helpers. All trade dates are "calendar dates" handled as UTC midnight.

export const isDateStr = (s) =>
  typeof s === 'string' &&
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  new Date(`${s}T00:00:00Z`).toISOString().slice(0, 10) === s;

export const toDate = (s) => new Date(`${s}T00:00:00Z`);
export const fmt = (d) => d.toISOString().slice(0, 10);

export const addDays = (d, n) => {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
};

/** Monday of the week containing d. */
export const weekStart = (d) => {
  const x = new Date(d);
  const offset = (x.getUTCDay() + 6) % 7; // Monday = 0
  x.setUTCDate(x.getUTCDate() - offset);
  return x;
};

/**
 * Resolve a named range into { from, to } Date objects (inclusive) or nulls for "all".
 * `today` (YYYY-MM-DD) comes from the client so "today / this week" follow the user's local calendar.
 */
export function resolveRange({ range = 'all', from, to, today } = {}) {
  const t = isDateStr(today) ? toDate(today) : toDate(fmt(new Date()));
  const y = t.getUTCFullYear();
  const m = t.getUTCMonth();
  switch (range) {
    case 'today':
      return { from: t, to: t };
    case 'week': {
      const s = weekStart(t);
      return { from: s, to: addDays(s, 6) };
    }
    case 'month':
      return { from: new Date(Date.UTC(y, m, 1)), to: new Date(Date.UTC(y, m + 1, 0)) };
    case 'lastMonth':
      return { from: new Date(Date.UTC(y, m - 1, 1)), to: new Date(Date.UTC(y, m, 0)) };
    case 'year':
      return { from: new Date(Date.UTC(y, 0, 1)), to: new Date(Date.UTC(y, 11, 31)) };
    case 'custom': {
      let f = isDateStr(from) ? toDate(from) : null;
      let e = isDateStr(to) ? toDate(to) : null;
      if (f && e && f > e) [f, e] = [e, f];
      return { from: f, to: e };
    }
    default:
      return { from: null, to: null };
  }
}
