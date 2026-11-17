export type CsvCell = string | number | boolean | null | undefined;

function escapeCell(value: CsvCell, separator: string): string {
  if (value == null) return "";
  let s = String(value);
  // Evita inyección de fórmulas al abrir el CSV en hojas de cálculo.
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  if (s.includes('"') || s.includes(separator) || s.includes("\n") || s.includes("\r")) {
    s = `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

/** Genera CSV con separador ";" (por defecto en Excel en español) y BOM UTF-8. */
export function toCsv(headers: string[], rows: CsvCell[][], separator = ";"): string {
  const lines = [headers, ...rows].map((r) => r.map((c) => escapeCell(c, separator)).join(separator));
  return "﻿" + lines.join("\r\n");
}

export function downloadTextFile(filename: string, content: string, mime = "text/csv;charset=utf-8"): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}
