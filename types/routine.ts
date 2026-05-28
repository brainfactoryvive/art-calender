export type Routine = {
  id: string;
  user_id: string;
  slot: number;
  emoji: string;
  title: string;
  created_at: string;
  updated_at: string;
};

export type RoutineLog = {
  id: string;
  user_id: string;
  routine_id: string;
  log_date: string;
  completed: boolean;
  created_at: string;
  updated_at: string;
};

export type RoutineDraft = {
  slot: number;
  emoji: string;
  title: string;
};

export const ROUTINE_SLOTS = [1, 2, 3] as const;
