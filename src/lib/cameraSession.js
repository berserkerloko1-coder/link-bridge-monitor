import { normalizePairingCode, peerIdForCode } from "@/lib/pairing";
import { createPeer, destroyPeer, waitForOpen } from "@/lib/peerClient";

const RETRY_MS = 2000;
const RETRY_MAX_MS = 15000;

export function createCameraSession({
  code,
  onStatus,
  onStream,
  onClose,
  onError,
  onMessage,
}) {
  const cameraCode = normalizePairingCode(code);
  let generation = 0;
  let peer = null;
  let call = null;
  let conn = null;
  let retryTimer = null;
  let talkCall = null;
  let talkStream = null;
  let stopped = true;

  const clearRetry = () => {
    if (retryTimer) {
      clearTimeout(retryTimer);
      retryTimer = null;
    }
  };

  const hangupMedia = () => {
    try {
      talkCall?.close();
    } catch {}
    talkCall = null;
    if (talkStream) {
      talkStream.getTracks().forEach((track) => track.stop());
      talkStream = null;
    }
    try {
      call?.close();
    } catch {}
    call = null;
    try {
      conn?.close();
    } catch {}
    conn = null;
    destroyPeer(peer);
    peer = null;
  };

  let retryDelay = RETRY_MS;
  const scheduleRetry = (myGen) => {
    if (stopped || myGen !== generation) return;
    clearRetry();
    const delay = retryDelay;
    retryDelay = Math.min(retryDelay * 2, RETRY_MAX_MS);
    retryTimer = setTimeout(() => {
      retryTimer = null;
      if (stopped || myGen !== generation) return;
      connect();
    }, delay);
  };

  const connect = async () => {
    const myGen = ++generation;
    stopped = false;
    clearRetry();
    hangupMedia();
    onStatus?.("connecting");
    retryDelay = RETRY_MS;

    try {
      const nextPeer = createPeer();
      if (myGen !== generation || stopped) {
        destroyPeer(nextPeer);
        return;
      }
      peer = nextPeer;
      await waitForOpen(peer);
      if (myGen !== generation || stopped) return;

      peer.on("error", (err) => {
        if (myGen !== generation || stopped) return;
        const msg =
          err?.type === "peer-unavailable"
            ? "No camera is using that code. Start Camera Mode first."
            : err?.message || "Could not connect to this camera";
        onError?.(msg);
        onStatus?.("connecting");
        scheduleRetry(myGen);
      });

      peer.on("call", (incoming) => {
        if (myGen !== generation || stopped) {
          try {
            incoming.close();
          } catch {}
          return;
        }
        incoming.answer();
        call = incoming;
        incoming.on("stream", (remote) => {
          if (myGen !== generation || stopped) return;
          onStream?.(remote);
          onStatus?.("connected");
        });
        incoming.on("close", () => {
          if (myGen !== generation || stopped) return;
          onClose?.();
          onStatus?.("connecting");
          scheduleRetry(myGen);
        });
        incoming.on("error", (err) => {
          if (myGen !== generation || stopped) return;
          onError?.(err?.message || "Could not connect to this camera");
          onStatus?.("connecting");
          scheduleRetry(myGen);
        });
      });

      conn = peer.connect(peerIdForCode(cameraCode), { reliable: true });
      conn.on("open", () => {
        if (myGen !== generation || stopped) return;
        try {
          conn.send({ type: "hello", role: "viewer" });
        } catch {}
      });
      conn.on("data", (msg) => {
        if (myGen !== generation || stopped) return;
        onMessage?.(msg);
      });
      conn.on("error", (err) => {
        if (myGen !== generation || stopped) return;
        onError?.(err?.message || "Could not connect to this camera");
        onStatus?.("connecting");
        scheduleRetry(myGen);
      });
    } catch (err) {
      if (myGen !== generation || stopped) return;
      onError?.(err?.message || "Could not connect to this camera");
      onStatus?.("connecting");
      scheduleRetry(myGen);
    }
  };

  const disconnect = () => {
    generation += 1;
    stopped = true;
    clearRetry();
    hangupMedia();
  };

  const send = (data) => {
    try {
      if (conn?.open) conn.send(data);
    } catch {}
  };

  const startTalk = async () => {
    if (!peer || stopped) throw new Error("Not connected");
    const mic = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    });
    talkStream = mic;
    talkCall = peer.call(peerIdForCode(cameraCode), mic);
    return mic;
  };

  const stopTalk = () => {
    try {
      talkCall?.close();
    } catch {}
    talkCall = null;
    if (talkStream) {
      talkStream.getTracks().forEach((track) => track.stop());
      talkStream = null;
    }
  };

  return {
    code: cameraCode,
    connect,
    disconnect,
    send,
    startTalk,
    stopTalk,
  };
}
