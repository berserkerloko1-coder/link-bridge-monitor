const VIDEO_MIME_TYPES = [
  "video/webm;codecs=vp8,opus",
  "video/webm;codecs=vp9,opus",
  "video/webm;codecs=vp8",
  "video/webm",
  "video/mp4",
];

const AUDIO_MIME_TYPES = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];

export function pickRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return VIDEO_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function pickAudioRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  return AUDIO_MIME_TYPES.find((type) => MediaRecorder.isTypeSupported(type)) || "";
}

export function recorderExtension(mime) {
  const value = String(mime || "");
  if (value.includes("mp4")) return value.startsWith("audio/") ? "m4a" : "mp4";
  if (value.startsWith("audio/")) return "webm";
  return "webm";
}

export function canRecord() {
  return typeof MediaRecorder !== "undefined";
}

export function startMediaRecorder(stream, { audioOnly = false } = {}) {
  if (!canRecord()) {
    throw new Error("This phone cannot record from the browser");
  }
  if (!stream || typeof stream.getTracks !== "function" || stream.getTracks().length === 0) {
    throw new Error("Nothing to record");
  }
  const mime = audioOnly ? pickAudioRecorderMime() : pickRecorderMime();
  const rec = mime ? new MediaRecorder(stream, { mimeType: mime }) : new MediaRecorder(stream);
  const chunks = [];
  rec.ondataavailable = (e) => {
    if (e.data && e.data.size) chunks.push(e.data);
  };
  const done = new Promise((resolve, reject) => {
    rec.onerror = () => reject(rec.error || new Error("Recording failed"));
    rec.onstop = () => {
      const type =
        rec.mimeType || mime || (audioOnly ? "audio/webm" : "video/webm");
      resolve(new Blob(chunks, { type }));
    };
  });
  rec.start(1000);
  return {
    mimeType: rec.mimeType || mime,
    state: () => rec.state,
    stop() {
      if (rec.state !== "inactive") rec.stop();
      return done;
    },
  };
}
