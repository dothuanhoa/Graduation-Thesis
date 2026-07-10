import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextValue } from "./authStore";
import { authApi, type ChangePasswordPayload, type LoginPayload, type TokenResponse } from "../services/api";

const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const LEGACY_TOKEN_KEY = "token";

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
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  sessionStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};

const clearStoredTokens = () => {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY);
  sessionStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);
};

const isExpired = (payload: JwtPayload) => {
  if (!payload.exp) return true;
  return payload.exp * 1000 <= Date.now();
};

const getInitialAccessToken = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(LEGACY_TOKEN_KEY);

  const token = sessionStorage.getItem(ACCESS_TOKEN_KEY) || "";
  if (!token) return "";

  const payload = decodeJwt(token);
  if (!payload.sub || isExpired(payload)) {
    clearStoredTokens();
    return "";
  }

  return token;
};

type AuthProviderProps = {
  children: ReactNode;
};

export function AuthProvider({ children }: AuthProviderProps) {
  const [accessToken, setAccessToken] = useState(getInitialAccessToken);
  const [refreshToken, setRefreshToken] = useState(() => sessionStorage.getItem(REFRESH_TOKEN_KEY) || "");

  const payload = useMemo(() => decodeJwt(accessToken), [accessToken]);
  const isAuthenticated = Boolean(accessToken && payload.sub && !isExpired(payload));

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
    clearStoredTokens();
    setAccessToken("");
    setRefreshToken("");
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      refreshToken,
      username: payload.sub || "",
      role: payload.role || "STUDENT",
      isAuthenticated,
      login,
      firstChangePassword,
      logout,
    }),
    [accessToken, firstChangePassword, isAuthenticated, login, logout, payload.role, payload.sub, refreshToken],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
