import { createContext } from "react";
import type { ChangePasswordPayload, LoginPayload } from "../services/api";

export type AuthContextValue = {
  accessToken: string;
  refreshToken: string;
  username: string;
  role: string;
  isAuthenticated: boolean;
  login: (payload: LoginPayload) => Promise<void>;
  firstChangePassword: (payload: ChangePasswordPayload) => Promise<void>;
  logout: () => void;
};

export const AuthContext = createContext<AuthContextValue | null>(null);
