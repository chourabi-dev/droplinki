export function loadJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

export function saveJSON<T>(key: string, value: T) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota errors in prototype
  }
}

export const STORAGE_KEYS = {
  deliveries: "droplink:deliveries",
  driver: "droplink:driver",
  auth: "droplink:auth",
  counter: "droplink:counter",
};
