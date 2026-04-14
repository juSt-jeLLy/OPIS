const STORAGE_KEY = "opis_user_id";
const FALLBACK_USER_ID = "demo-user";

const generateUserId = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `user-${crypto.randomUUID()}`;
  }

  return `user-${Math.random().toString(36).slice(2)}-${Date.now()}`;
};

export const getOrCreateUserId = (): string => {
  if (typeof window === "undefined") {
    return FALLBACK_USER_ID;
  }

  const existing = window.localStorage.getItem(STORAGE_KEY);
  if (existing && existing.trim().length > 0) {
    return existing;
  }

  const created = generateUserId();
  window.localStorage.setItem(STORAGE_KEY, created);
  return created;
};

