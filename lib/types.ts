export type Occupation = "pt" | "ot" | "st";

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
};
