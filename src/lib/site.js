export const PUBLIC_APP_URL = "https://berserkerloko1-coder.github.io/link-bridge-monitor/";

export function viewerLink(code) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  const base = import.meta.env.BASE_URL || "/";
  return `${origin}${base}#/viewer?code=${encodeURIComponent(code)}`;
}
