const KEYS = {
  deviceName: "lb_device_name",
  pairingCode: "lb_pairing_code",
  lastCamera: "lb_last_camera",
};

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
