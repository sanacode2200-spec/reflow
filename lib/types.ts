export type Occupation = "pt" | "ot" | "st";

export type SessionStatus = "scheduled" | "draft" | "completed";

export type Staff = {
  id: string;
  name: string;
  occupation: Occupation;
};

export type Schedule = {
  id: string;
  patient_id: string;
  therapist_id: string;
  start_at: string; // ISO8601
  end_at: string; // ISO8601
  recurrence_rule: string | null;
  units: number;
  session_status: SessionStatus | null;
  comment: string | null;
  is_cancelled: boolean;
};

export type Patient = {
  id: string;
  name: string;
};

export type ScheduleInstance = {
  id: string;
  schedule_id: string;
  patient_id: string;
  therapist_id: string;
  start_at: Date;
  end_at: Date;
  is_recurring: boolean;
  units: number;
  session_status: SessionStatus | null;
  comment: string | null;
  is_cancelled: boolean;
};
