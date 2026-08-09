const STORAGE_PREFIX = "studentNotificationReadIds";

const normalizeOwner = (owner?: string) => owner?.trim() || "anonymous";

const getStorageKey = (owner?: string) => `${STORAGE_PREFIX}:${normalizeOwner(owner)}`;

export const getStoredReadNotificationIds = (owner?: string) => {
  if (typeof window === "undefined") return new Set<string>();

  try {
    const rawValue = window.localStorage.getItem(getStorageKey(owner));
    const parsed = rawValue ? JSON.parse(rawValue) : [];
    if (!Array.isArray(parsed)) return new Set<string>();
    return new Set(parsed.map((value) => String(value)));
  } catch {
    return new Set<string>();
  }
};

export const rememberReadNotification = (owner: string | undefined, notificationId: string) => {
  if (typeof window === "undefined") return;

  const nextIds = getStoredReadNotificationIds(owner);
  nextIds.add(String(notificationId));
  window.localStorage.setItem(getStorageKey(owner), JSON.stringify(Array.from(nextIds)));
};
