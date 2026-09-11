import { orientationOf, paneRects } from "@/lib/layout";
import { getAudioContext } from "@/lib/audioGraph";

export function createCompositeStream(videos, audioStreams, { width = 1280, height = 720 } = {}) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { alpha: false });
  if (!ctx) throw new Error("Could not compose the split view");

  let running = true;
  let raf = 0;

  const draw = () => {
    if (!running) return;
    const live = videos.filter(Boolean);
    const rects = paneRects(Math.max(1, live.length), width, height, orientationOf(width, height));
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, width, height);
    live.forEach((video, i) => {
      const rect = rects[i];
      if (!rect || !video) return;
      try {
        if (video.readyState >= 2) {
          ctx.drawImage(video, rect.x, rect.y, rect.w, rect.h);
        }
      } catch {}
    });
    raf = requestAnimationFrame(draw);
  };
  draw();

  const canvasStream = canvas.captureStream(20);
  const mixed = new MediaStream(canvasStream.getVideoTracks());

  const audioCtx = getAudioContext();
  let dest = null;
  if (audioCtx) {
    dest = audioCtx.createMediaStreamDestination();
    (audioStreams || []).forEach((stream) => {
      if (!stream?.getAudioTracks?.().length) return;
      try {
        audioCtx.createMediaStreamSource(stream).connect(dest);
      } catch {}
    });
    dest.stream.getAudioTracks().forEach((track) => mixed.addTrack(track));
  }

  return {
    stream: mixed,
    stop() {
      running = false;
      cancelAnimationFrame(raf);
      canvasStream.getTracks().forEach((track) => track.stop());
    },
  };
}

export function snapshotFromVideo(video, { label = "" } = {}) {
  if (!video || video.readyState < 2) {
    throw new Error("Wait until the picture is live");
  }
  const canvas = document.createElement("canvas");
  canvas.width = video.videoWidth || 1280;
  canvas.height = video.videoHeight || 720;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  ctx.fillStyle = "rgba(0,0,0,0.55)";
  ctx.fillRect(0, canvas.height - 36, canvas.width, 36);
  ctx.fillStyle = "#fff";
  ctx.font = "16px ui-sans-serif, system-ui, sans-serif";
  const stamp = [label, new Date().toLocaleString()].filter(Boolean).join("  ·  ");
  ctx.fillText(stamp, 12, canvas.height - 14);
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) reject(new Error("Could not capture still"));
        else resolve(blob);
      },
      "image/jpeg",
      0.92
    );
  });
}
