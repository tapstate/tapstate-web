export const AUTH_TOKEN_KEY = "tapstate.auth.token";

export function browserSessionStorage(): Storage | null {
  if (typeof window === "undefined") return null;

  return window.sessionStorage;
}

export function loadStoredToken(
  storage: Storage | null = browserSessionStorage(),
): string | null {
  return storage?.getItem(AUTH_TOKEN_KEY) ?? null;
}

export function saveStoredToken(storage: Storage | null, token: string) {
  storage?.setItem(AUTH_TOKEN_KEY, token);
}

export function clearStoredToken(
  storage: Storage | null = browserSessionStorage(),
) {
  storage?.removeItem(AUTH_TOKEN_KEY);
}
