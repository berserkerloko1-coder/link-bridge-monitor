const MIME_TYPES = [
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm",
  "video/mp4",
];

export function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function recorderExtension(mime) {
  if (String(mime).includes("mp4")) return "mp4";
  return "webm";
}
