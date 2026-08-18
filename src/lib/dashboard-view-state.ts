export const DASHBOARD_VIEW_STORAGE_KEY = "lead-miner:dashboard-view-v1";

type StoredDashboardView<T> = {
  filters: T;
  page: number;
  scrollY: number;
};

export function loadDashboardView<T extends Record<string, unknown>>(defaults: T): StoredDashboardView<T> | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.sessionStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<StoredDashboardView<Partial<T>>>;
    const filters = parsed.filters && typeof parsed.filters === "object"
      ? { ...defaults, ...parsed.filters }
      : defaults;
    const page = Number.isInteger(parsed.page) && Number(parsed.page) > 0 ? Number(parsed.page) : 1;
    const scrollY = Number.isFinite(parsed.scrollY) && Number(parsed.scrollY) >= 0 ? Number(parsed.scrollY) : 0;
    return { filters: filters as T, page, scrollY };
  } catch {
    window.sessionStorage.removeItem(DASHBOARD_VIEW_STORAGE_KEY);
    return null;
  }
}

export function saveDashboardView<T extends Record<string, unknown>>(filters: T, page: number, scrollY?: number) {
  if (typeof window === "undefined") return;
  let previousScrollY = 0;
  try {
    const previous = window.sessionStorage.getItem(DASHBOARD_VIEW_STORAGE_KEY);
    if (previous) {
      const parsed = JSON.parse(previous) as Partial<StoredDashboardView<T>>;
      if (Number.isFinite(parsed.scrollY) && Number(parsed.scrollY) >= 0) previousScrollY = Number(parsed.scrollY);
    }
  } catch {
    previousScrollY = 0;
  }
  window.sessionStorage.setItem(
    DASHBOARD_VIEW_STORAGE_KEY,
    JSON.stringify({ filters, page: Math.max(1, page), scrollY: scrollY ?? previousScrollY }),
  );
}
