const KEYS = {
  deviceName: "lb_device_name",
  pairingCode: "lb_pairing_code",
  lastCamera: "lb_last_camera",
  roster: "lb_camera_roster",
};

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

function writeJson(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}

export function getDeviceName() {
  try {
    return localStorage.getItem(KEYS.deviceName) || "";
  } catch {
    return "";
  }
}

export function setDeviceName(name) {
  try {
    localStorage.setItem(KEYS.deviceName, name);
  } catch {}
}

export function getPairingCode() {
  try {
    return localStorage.getItem(KEYS.pairingCode) || "";
  } catch {
    return "";
  }
}

export function setPairingCode(code) {
  try {
    localStorage.setItem(KEYS.pairingCode, code);
  } catch {}
}

export function getLastCamera() {
  try {
    return localStorage.getItem(KEYS.lastCamera) || "";
  } catch {
    return "";
  }
}

export function setLastCamera(code) {
  try {
    localStorage.setItem(KEYS.lastCamera, code);
  } catch {}
}

export function getRoster() {
  const raw = readJson(KEYS.roster, []);
  if (!Array.isArray(raw)) return [];
  return raw.filter((item) => item && typeof item.code === "string" && item.code);
}

export function upsertRoster({ code, label }) {
  if (!code) return getRoster();
  const next = [
    { code, label: label || code, lastUsed: Date.now() },
    ...getRoster().filter((item) => item.code !== code),
  ].slice(0, 12);
  writeJson(KEYS.roster, next);
  setLastCamera(code);
  return next;
}

export function removeRoster(code) {
  const next = getRoster().filter((item) => item.code !== code);
  writeJson(KEYS.roster, next);
  return next;
}
