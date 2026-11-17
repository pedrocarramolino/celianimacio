import { Badge, type BadgeVariant } from "@/components/ui/badge";
import {
  ASSIGNMENT_STATUS_LABELS,
  ATTENDANCE_STATUS_LABELS,
  EVENT_STATUS_LABELS,
  SHIFT_STATUS_LABELS,
  type AssignmentStatus,
  type AttendanceStatus,
  type EventStatus,
  type ShiftStatus,
} from "@/types";

const eventTone: Record<EventStatus, BadgeVariant> = {
  draft: "neutral",
  scheduled: "default",
  in_progress: "warning",
  completed: "success",
  cancelled: "danger",
};
const shiftTone: Record<ShiftStatus, BadgeVariant> = {
  open: "danger",
  partially_filled: "warning",
  filled: "success",
  cancelled: "neutral",
};
const assignmentTone: Record<AssignmentStatus, BadgeVariant> = {
  pending: "warning",
  confirmed: "success",
  cancelled: "neutral",
};
const attendanceTone: Record<AttendanceStatus, BadgeVariant> = {
  open: "success",
  on_break: "warning",
  closed: "neutral",
};

export const EventStatusBadge = ({ status }: { status: EventStatus }) => (
  <Badge variant={eventTone[status]}>{EVENT_STATUS_LABELS[status]}</Badge>
);
export const ShiftStatusBadge = ({ status }: { status: ShiftStatus }) => (
  <Badge variant={shiftTone[status]}>{SHIFT_STATUS_LABELS[status]}</Badge>
);
export const AssignmentStatusBadge = ({ status }: { status: AssignmentStatus }) => (
  <Badge variant={assignmentTone[status]}>{ASSIGNMENT_STATUS_LABELS[status]}</Badge>
);
export const AttendanceStatusBadge = ({ status }: { status: AttendanceStatus }) => (
  <Badge variant={attendanceTone[status]}>{ATTENDANCE_STATUS_LABELS[status]}</Badge>
);
