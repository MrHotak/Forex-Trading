// RFC 4180 CSV with protection against spreadsheet formula injection.

export function csvCell(value) {
  if (value === null || value === undefined) return '';
  let s = value instanceof Date ? value.toISOString() : String(value);
  // A cell starting with = + - @ (or tab / CR) can execute as a formula in Excel / Sheets.
  if (/^[=+\-@\t\r]/.test(s) && Number.isNaN(Number(s))) s = `'${s}`;
  if (/[",\r\n]/.test(s)) s = `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function toCsv(columns, rows) {
  const head = columns.map((c) => csvCell(c.header)).join(',');
  const body = rows.map((r) => columns.map((c) => csvCell(c.value(r))).join(','));
  // BOM so Excel opens UTF-8 (Persian text) correctly.
  return `﻿${[head, ...body].join('\r\n')}\r\n`;
}
