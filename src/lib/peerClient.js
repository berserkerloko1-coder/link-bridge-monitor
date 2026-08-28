import Peer from "peerjs";
import { ICE_SERVERS } from "@/lib/webrtc";

export function createPeer(id) {
  return new Peer(id, {
    debug: 1,
    config: ICE_SERVERS,
  });
}

export function waitForOpen(peer) {
  if (peer.id && peer.open) return Promise.resolve(peer.id);
  return new Promise((resolve, reject) => {
    const onOpen = (id) => {
      cleanup();
      resolve(id);
    };
    const onError = (err) => {
      cleanup();
      reject(err);
    };
    const cleanup = () => {
      peer.off("open", onOpen);
      peer.off("error", onError);
    };
    peer.on("open", onOpen);
    peer.on("error", onError);
  });
}

export function destroyPeer(peer) {
  if (!peer) return;
  try {
    peer.destroy();
  } catch {}
}
