
export interface Profile {
  id: string;
  name: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
}

export interface ProjectMember {
  id: string;
  name: string;
  avatar_url?: string;
  role?: string;
}

export interface Project {
  id: string;
  name: string;
  description: string;
  code: string;
  user_id: string;
  created_at: string;
  members?: string[];
  member_roles?: Record<string, string>;
}
