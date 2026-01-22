export const DEV_BYPASS_AUTH = {
  enabled: true,
  email: "jcotuc@hpc.com.gt",
  role: "admin" as const,
  disabledStorageKey: "dev_bypass_auth_disabled",
};

export const isDevBypassEnabled = (): boolean => {
  if (!DEV_BYPASS_AUTH.enabled) return false;
  if (typeof window === "undefined") return false;
  return window.localStorage.getItem(DEV_BYPASS_AUTH.disabledStorageKey) !== "1";
};

export const disableDevBypass = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEV_BYPASS_AUTH.disabledStorageKey, "1");
};

export const enableDevBypass = (): void => {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEV_BYPASS_AUTH.disabledStorageKey);
};
