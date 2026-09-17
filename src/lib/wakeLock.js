export async function requestWakeLock() {
  if (typeof navigator === "undefined" || !navigator.wakeLock) return null;
  try {
    return await navigator.wakeLock.request("screen");
  } catch {
    return null;
  }
}

/** Keep the camera/viewer tab awake. Re-grabs lock on release, visibility, and pageshow. */
export function attachKeepAwake() {
  let lock = null;
  let stopped = false;

  const grab = async () => {
    if (stopped) return;
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      lock?.release?.();
    } catch {}
    lock = await requestWakeLock();
    if (lock) {
      lock.addEventListener("release", () => {
        if (!stopped) setTimeout(grab, 250);
      });
    }
  };

  const onVisible = () => {
    if (document.visibilityState === "visible") grab();
  };

  grab();
  document.addEventListener("visibilitychange", onVisible);
  window.addEventListener("pageshow", grab);
  window.addEventListener("focus", grab);

  return () => {
    stopped = true;
    document.removeEventListener("visibilitychange", onVisible);
    window.removeEventListener("pageshow", grab);
    window.removeEventListener("focus", grab);
    try {
      lock?.release?.();
    } catch {}
    lock = null;
  };
}
