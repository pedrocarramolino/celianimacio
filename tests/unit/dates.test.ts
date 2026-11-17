import { test } from "node:test";
import assert from "node:assert/strict";
import {
  addDaysISO,
  buildShiftInterval,
  dayRange,
  intervalsOverlap,
  isISODate,
  toClockTime,
  toISODate,
  weekStartISO,
  zonedDateTimeToDate,
} from "../../utils/dates";

test("convierte hora de Madrid a UTC en invierno y verano", () => {
  assert.equal(zonedDateTimeToDate("2026-01-15", "10:00").toISOString(), "2026-01-15T09:00:00.000Z");
  assert.equal(zonedDateTimeToDate("2026-07-15", "10:00").toISOString(), "2026-07-15T08:00:00.000Z");
});

test("maneja el cambio de hora (último domingo de marzo)", () => {
  assert.equal(zonedDateTimeToDate("2026-03-29", "01:30").toISOString(), "2026-03-29T00:30:00.000Z");
  assert.equal(zonedDateTimeToDate("2026-03-29", "04:00").toISOString(), "2026-03-29T02:00:00.000Z");
});

test("ida y vuelta de fecha/hora en la zona de la empresa", () => {
  const d = zonedDateTimeToDate("2026-11-17", "23:45");
  assert.equal(toISODate(d), "2026-11-17");
  assert.equal(toClockTime(d), "23:45");
});

test("semanas empiezan en lunes", () => {
  assert.equal(weekStartISO("2026-11-17"), "2026-11-16"); // martes -> lunes
  assert.equal(weekStartISO("2026-11-22"), "2026-11-16"); // domingo -> lunes anterior
  assert.equal(weekStartISO("2026-11-16"), "2026-11-16");
  assert.equal(addDaysISO("2026-12-31", 1), "2027-01-01");
});

test("valida fechas ISO", () => {
  assert.ok(isISODate("2024-02-29"));
  assert.ok(!isISODate("2025-02-29"));
  assert.ok(!isISODate("17/11/2026"));
});

test("turno que cruza medianoche termina al día siguiente", () => {
  const { startAt, endAt } = buildShiftInterval("2026-06-20", "22:00", "03:00");
  assert.equal(toISODate(endAt), "2026-06-21");
  assert.equal((endAt.getTime() - startAt.getTime()) / 3600000, 5);
});

test("rango de un día", () => {
  const { start, end } = dayRange("2026-07-01");
  assert.equal(start.toISOString(), "2026-06-30T22:00:00.000Z");
  assert.equal(end.toISOString(), "2026-07-01T22:00:00.000Z");
});

test("solapes de intervalos (extremos no solapan)", () => {
  const a = new Date("2026-01-01T10:00:00Z");
  const b = new Date("2026-01-01T12:00:00Z");
  const c = new Date("2026-01-01T14:00:00Z");
  assert.ok(!intervalsOverlap(a, b, b, c));
  assert.ok(intervalsOverlap(a, c, b, c));
});
