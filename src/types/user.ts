
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

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
}
