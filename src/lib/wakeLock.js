export async function requestWakeLock() {
  if (typeof navigator === "undefined" || !navigator.wakeLock) return null;
  try {
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}
