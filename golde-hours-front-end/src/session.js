const TOKEN_KEY = "golden_hours_token";

export function getToken() {
  return localStorage.getItem(TOKEN_KEY);
}

export function saveSession(authResult) {
  localStorage.setItem(TOKEN_KEY, authResult.access_token);
  return authResult.user;
}

export function clearSession() {
  localStorage.removeItem(TOKEN_KEY);
}
