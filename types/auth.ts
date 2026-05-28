export type UserRole = "admin" | "student";

export type Profile = {
  id: string;
  role: UserRole;
  display_name: string | null;
  created_at: string;
  updated_at: string;
};

export type AuthUser = {
  id: string;
  email?: string;
};

export type SessionPayload = {
  user: AuthUser;
  profile: Profile;
};
