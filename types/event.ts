export type CalendarEvent = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  start_date: string;
  end_date: string;
  color_code: string;
  is_global: boolean;
  is_major: boolean;
  created_at: string;
  updated_at: string;
};

export type UpsertEventPayload = {
  title: string;
  description?: string | null;
  start_date: string;
  end_date: string;
  color_code: string;
  is_global?: boolean;
  is_major?: boolean;
};

export type EventFormValues = {
  title: string;
  description: string;
  start_date: string;
  end_date: string;
  color_code: string;
  is_major: boolean;
  reminder_24h?: boolean;
  reminder_3d?: boolean;
};
