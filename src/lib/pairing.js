const ALPHABET = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ";

export function makePairingCode(length = 6) {
  const bytes = crypto.getRandomValues(new Uint8Array(length));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

export function normalizePairingCode(value) {
  return String(value || "")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "");
}

export function peerIdForCode(code) {
  return `lbmon-${normalizePairingCode(code)}`;
}
