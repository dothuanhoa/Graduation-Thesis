import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { AuthContext, type AuthContextValue } from "./authStore";
import {
  authApi,
  clearClientAuthTokens,
  getStoredAccessToken,
  isAccessTokenExpired,
  registerAuthSessionHandlers,
  setStoredAccessToken,
  type ChangePasswordPayload,
  type LoginPayload,
  type TokenResponse,
} from "../services/api";

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

const isExpired = (payload: JwtPayload) => {
  if (!payload.exp) return true;
  return payload.exp * 1000 <= Date.now();
};

const clearStoredTokens = () => {
  clearClientAuthTokens(false);
};

const saveTokens = ({ accessToken }: TokenResponse) => {
  setStoredAccessToken(accessToken, false);
};

const getInitialAccessToken = () => {
  const token = getStoredAccessToken();
  if (!token) return "";

  if (isAccessTokenExpired(token, 0)) {
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
  const [isInitializing, setIsInitializing] = useState(true);

  const payload = useMemo(() => decodeJwt(accessToken), [accessToken]);
  const isAuthenticated = Boolean(accessToken && payload.sub && !isExpired(payload));

  useEffect(
    () =>
      registerAuthSessionHandlers({
        onAccessTokenChange: (nextAccessToken) => {
          setAccessToken(nextAccessToken);
          setIsInitializing(false);
        },
        onSessionExpired: () => {
          setAccessToken("");
          setIsInitializing(false);
        },
      }),
    [],
  );

  useEffect(() => {
    let active = true;

    const bootstrapSession = async () => {
      const currentAccessToken = getInitialAccessToken();
      if (currentAccessToken) {
        if (active) {
          setAccessToken(currentAccessToken);
          setIsInitializing(false);
        }
        return;
      }

      try {
        const tokens = await authApi.refresh();
        if (!active) return;
        saveTokens(tokens);
        setAccessToken(tokens.accessToken);
      } catch {
        clearStoredTokens();
        if (active) {
          setAccessToken("");
        }
      } finally {
        if (active) {
          setIsInitializing(false);
        }
      }
    };

    void bootstrapSession();

    return () => {
      active = false;
    };
  }, []);

  const applyTokenResponse = useCallback((tokens: TokenResponse) => {
    saveTokens(tokens);
    setAccessToken(tokens.accessToken);
    setIsInitializing(false);
  }, []);

  const login = useCallback(
    async (loginPayload: LoginPayload) => {
      const tokens = await authApi.login(loginPayload);
      applyTokenResponse(tokens);
    },
    [applyTokenResponse],
  );

  const firstChangePassword = useCallback(
    async (changePayload: ChangePasswordPayload) => {
      const tokens = await authApi.firstChangePassword(changePayload);
      applyTokenResponse(tokens);
    },
    [applyTokenResponse],
  );

  const logout = useCallback(() => {
    void authApi.logout().catch(() => undefined);
    clearStoredTokens();
    setAccessToken("");
    setIsInitializing(false);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      accessToken,
      username: payload.sub || "",
      role: payload.role || "STUDENT",
      isAuthenticated,
      isInitializing,
      login,
      firstChangePassword,
      logout,
    }),
    [accessToken, firstChangePassword, isAuthenticated, isInitializing, login, logout, payload.role, payload.sub],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
