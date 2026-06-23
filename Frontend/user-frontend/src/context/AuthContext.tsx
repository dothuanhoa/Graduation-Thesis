import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextValue } from "./authStore";
import { authApi, type ChangePasswordPayload, type LoginPayload, type TokenResponse } from "../services/api";

type JwtPayload = {
  sub?: string;
  role?: string;
  exp?: number;
};

const decodeJwt = (token: string): JwtPayload => {
  try {
    const [, payload] = token.split(".");
    if (!payload) return {};
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(normalized)
        .split("")
        .map((char) => `%${`00${char.charCodeAt(0).toString(16)}`.slice(-2)}`)
        .join(""),
    );
    return JSON.parse(json) as JwtPayload;
  } catch {
    return {};
  }
};

const saveTokens = ({ accessToken, refreshToken }: TokenResponse) => {
  localStorage.setItem("accessToken", accessToken);
  localStorage.setItem("refreshToken", refreshToken);
  localStorage.setItem("token", accessToken);
};

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState(() => localStorage.getItem("accessToken") || localStorage.getItem("token") || "");
  const [refreshToken, setRefreshToken] = useState(() => localStorage.getItem("refreshToken") || "");

  const payload = useMemo(() => decodeJwt(accessToken), [accessToken]);

  const applyTokenResponse = useCallback((tokens: TokenResponse) => {
    saveTokens(tokens);
    setAccessToken(tokens.accessToken);
    setRefreshToken(tokens.refreshToken);
  }, []);

  const login = useCallback(async (loginPayload: LoginPayload) => {
    const tokens = await authApi.login(loginPayload);
    applyTokenResponse(tokens);
  }, [applyTokenResponse]);

  const firstChangePassword = useCallback(async (changePayload: ChangePasswordPayload) => {
    const tokens = await authApi.firstChangePassword(changePayload);
    applyTokenResponse(tokens);
  }, [applyTokenResponse]);

  const logout = useCallback(() => {
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("token");
    setAccessToken("");
    setRefreshToken("");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      refreshToken,
      username: payload.sub || "",
      role: payload.role || "STUDENT",
      isAuthenticated: Boolean(accessToken),
      login,
      firstChangePassword,
      logout,
    }),
    [accessToken, firstChangePassword, login, logout, payload.role, payload.sub, refreshToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
