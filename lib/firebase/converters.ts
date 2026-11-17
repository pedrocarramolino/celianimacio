import { Timestamp, type DocumentData } from "firebase/firestore";

export function toDate(value: unknown): Date | null {
  if (value instanceof Timestamp) return value.toDate();
  if (value instanceof Date) return value;
  return null;
}

export function toDateStrict(value: unknown): Date {
  return toDate(value) ?? new Date(0);
}

export function str(data: DocumentData, key: string, fallback = ""): string {
  const v = data[key];
  return typeof v === "string" ? v : fallback;
}

export function strOrNull(data: DocumentData, key: string): string | null {
  const v = data[key];
  return typeof v === "string" ? v : null;
}

export function num(data: DocumentData, key: string, fallback = 0): number {
  const v = data[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

export function bool(data: DocumentData, key: string, fallback = false): boolean {
  const v = data[key];
  return typeof v === "boolean" ? v : fallback;
}

export function strArray(data: DocumentData, key: string): string[] {
  const v = data[key];
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];
}

export function oneOf<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return typeof value === "string" && (allowed as readonly string[]).includes(value) ? (value as T) : fallback;
}
