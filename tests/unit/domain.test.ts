import { test } from "node:test";
import assert from "node:assert/strict";
import { distanceMeters } from "../../utils/geo";
import { toCsv } from "../../utils/csv";
import {
  canTransition,
  computeShiftStatus,
  findConflicts,
  projectEventStaff,
  projectShiftMembership,
} from "../../services/domain/assignment-rules";
import {
  allowedActions,
  checkInWindow,
  computeWorkedMinutes,
  evaluateLocation,
  isActionAllowed,
  lateIncident,
} from "../../services/domain/attendance-rules";
import { matchShiftAvailability, validateSlots } from "../../services/domain/availability-rules";
import { hoursByEmployee, totals } from "../../services/domain/reports";
import type { Assignment, AttendanceSession, WeeklyAvailability } from "../../types";
import { zonedDateTimeToDate } from "../../utils/dates";

const target = { locationId: null, name: "Sala", address: "", lat: 41.3874, lng: 2.1686, radiusMeters: 150 };

test("distancia Haversine aproximada", () => {
  const d = distanceMeters({ lat: 41.3874, lng: 2.1686 }, { lat: 41.3964, lng: 2.1686 });
  assert.ok(Math.abs(d - 1000) < 15, `distancia ${d}`);
});

test("evaluación de ubicación dentro/fuera/sin GPS", () => {
  const now = new Date();
  const inside = evaluateLocation({ reading: { coords: { lat: 41.3875, lng: 2.1687 }, accuracyMeters: 10 }, readingError: null, target, maxAccuracyMeters: 100, stage: "check_in", now });
  assert.equal(inside.withinRadius, true);
  assert.equal(inside.incidents.length, 0);

  const outside = evaluateLocation({ reading: { coords: { lat: 41.40, lng: 2.1686 }, accuracyMeters: 300 }, readingError: null, target, maxAccuracyMeters: 100, stage: "check_in", now });
  assert.equal(outside.withinRadius, false);
  assert.deepEqual(outside.incidents.map((i) => i.type).sort(), ["low_accuracy", "outside_radius"]);

  const none = evaluateLocation({ reading: null, readingError: "denegado", target, maxAccuracyMeters: 100, stage: "check_out", now });
  assert.equal(none.withinRadius, null);
  assert.equal(none.incidents[0]?.type, "location_unavailable");
});

test("máquina de estados del fichaje", () => {
  assert.deepEqual(allowedActions(null), ["check_in"]);
  assert.ok(isActionAllowed("open", "break_start"));
  assert.ok(!isActionAllowed("on_break", "check_out"));
  assert.ok(!isActionAllowed("closed", "check_in"));
  assert.ok(!isActionAllowed(null, "check_out"));
});

test("ventana de entrada limitada a 120 min y retrasos", () => {
  const s = new Date("2026-05-01T10:00:00Z");
  const e = new Date("2026-05-01T14:00:00Z");
  assert.equal(checkInWindow(s, e, 500).opensAt.toISOString(), "2026-05-01T08:00:00.000Z");
  assert.equal(lateIncident(s, new Date("2026-05-01T10:05:00Z")), null);
  assert.equal(lateIncident(s, new Date("2026-05-01T10:30:00Z"))?.type, "late_check_in");
  assert.equal(computeWorkedMinutes(s, e, 30), 210);
});

const mk = (id: string, shiftId: string, start: string, end: string, status: Assignment["status"] = "confirmed"): Assignment => ({
  id,
  shiftId,
  eventId: "e",
  employeeId: "emp",
  employeeName: "Ana",
  eventName: "Boda",
  shiftName: "Montaje",
  shiftStartAt: new Date(start),
  shiftEndAt: new Date(end),
  status,
  cancelledReason: "",
  createdAt: null,
  updatedAt: null,
  createdBy: null,
});

test("detección de turnos solapados", () => {
  const existing = [
    mk("a", "s1", "2026-05-01T10:00:00Z", "2026-05-01T14:00:00Z"),
    mk("b", "s2", "2026-05-01T15:00:00Z", "2026-05-01T18:00:00Z", "cancelled"),
  ];
  const conflicts = findConflicts(existing, { startAt: new Date("2026-05-01T13:00:00Z"), endAt: new Date("2026-05-01T16:00:00Z") }, "s3");
  assert.deepEqual(conflicts.map((c) => c.shiftId), ["s1"]);
  // El mismo turno no se considera conflicto consigo mismo
  assert.equal(findConflicts(existing, { startAt: new Date("2026-05-01T10:00:00Z"), endAt: new Date("2026-05-01T14:00:00Z") }, "s1").length, 0);
});

test("proyecciones de turno y evento", () => {
  const p1 = projectShiftMembership({ staffEmployeeIds: [], confirmedEmployeeIds: [] }, "x", "pending");
  assert.deepEqual(p1, { staffEmployeeIds: ["x"], confirmedEmployeeIds: [] });
  const p2 = projectShiftMembership(p1, "x", "confirmed");
  assert.deepEqual(p2.confirmedEmployeeIds, ["x"]);
  const p3 = projectShiftMembership(p2, "x", "cancelled");
  assert.deepEqual(p3, { staffEmployeeIds: [], confirmedEmployeeIds: [] });
  assert.equal(computeShiftStatus("open", 0, 2), "open");
  assert.equal(computeShiftStatus("open", 1, 2), "partially_filled");
  assert.equal(computeShiftStatus("partially_filled", 2, 2), "filled");
  assert.equal(computeShiftStatus("cancelled", 2, 2), "cancelled");
  assert.deepEqual(projectEventStaff(["x", "y"], "x", "cancelled", true), ["x", "y"]);
  assert.deepEqual(projectEventStaff(["x", "y"], "x", "cancelled", false), ["y"]);
  assert.ok(canTransition(null, "pending"));
  assert.ok(!canTransition(null, "cancelled"));
});

test("disponibilidad frente a turno", () => {
  const week: WeeklyAvailability = {
    id: "emp_2026-05-04",
    employeeId: "emp",
    weekStart: "2026-05-04",
    days: [
      { date: "2026-05-04", status: "partial", slots: [{ start: "09:00", end: "14:00" }] },
      { date: "2026-05-05", status: "unavailable", slots: [] },
      { date: "2026-05-06", status: "available", slots: [] },
      { date: "2026-05-07", status: "unset", slots: [] },
      { date: "2026-05-08", status: "unset", slots: [] },
      { date: "2026-05-09", status: "unset", slots: [] },
      { date: "2026-05-10", status: "unset", slots: [] },
    ],
    note: "",
    updatedAt: null,
    updatedBy: null,
  };
  const at = (d: string, s: string, e: string) => ({ startAt: zonedDateTimeToDate(d, s), endAt: zonedDateTimeToDate(d, e) });
  assert.equal(matchShiftAvailability(at("2026-05-04", "10:00", "13:00"), week), "partial_match");
  assert.equal(matchShiftAvailability(at("2026-05-04", "13:00", "16:00"), week), "outside_slots");
  assert.equal(matchShiftAvailability(at("2026-05-05", "10:00", "12:00"), week), "unavailable");
  assert.equal(matchShiftAvailability(at("2026-05-06", "10:00", "12:00"), week), "available");
  assert.equal(matchShiftAvailability(at("2026-05-07", "10:00", "12:00"), week), "unknown");
  assert.equal(matchShiftAvailability(at("2026-05-07", "10:00", "12:00"), null), "unknown");
  assert.equal(validateSlots({ date: "2026-05-04", status: "partial", slots: [{ start: "09:00", end: "12:00" }, { start: "11:00", end: "13:00" }] }), "Hay franjas que se solapan.");
});

test("CSV escapa separadores y evita inyección de fórmulas", () => {
  const csv = toCsv(["a", "b"], [["x;y", "=SUM(A1)"]]);
  assert.ok(csv.startsWith("﻿"));
  assert.ok(csv.includes('"x;y"'));
  assert.ok(csv.includes("'=SUM(A1)"));
});

test("agregación de horas", () => {
  const base = { shiftId: "s", eventId: "e", userId: "u", eventName: "E", shiftName: "S", shiftStartAt: new Date(), shiftEndAt: new Date(), checkIn: { clientAt: new Date(), serverAt: null, coords: null, accuracyMeters: null, distanceMeters: null, withinRadius: null, validation: "client" as const }, checkOut: null, breakCount: 0, adminNote: "", createdAt: null, updatedAt: null, hasIncident: false, incidents: [] };
  const sessions: AttendanceSession[] = [
    { ...base, id: "1", employeeId: "a", employeeName: "Ana", status: "closed", workedMinutes: 120, totalBreakMinutes: 10 },
    { ...base, id: "2", employeeId: "a", employeeName: "Ana", status: "open", workedMinutes: null, totalBreakMinutes: 0 },
    { ...base, id: "3", employeeId: "b", employeeName: "Bru", status: "closed", workedMinutes: 60, totalBreakMinutes: 0 },
  ];
  const rows = hoursByEmployee(sessions);
  assert.equal(rows[0]?.label, "Ana");
  assert.equal(rows[0]?.workedMinutes, 120);
  assert.equal(rows[0]?.incomplete, 1);
  assert.equal(totals(rows).workedMinutes, 180);
});
