import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  ArrowLeft,
  Camera,
  Columns2,
  Eye,
  Flashlight,
  Focus,
  LayoutGrid,
  Maximize2,
  Mic,
  PictureInPicture2,
  Plus,
  SlidersHorizontal,
  Square,
  Volume2,
  VolumeX,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import CameraPane from "@/components/viewer/CameraPane";
import EqSheet from "@/components/viewer/EqSheet";
import RecordingsList from "@/components/viewer/RecordingsList";
import { createAudioGraph, getAudioContext, resumeAudioContext } from "@/lib/audioGraph";
import { createCameraSession } from "@/lib/cameraSession";
import { createCompositeStream, snapshotFromVideo } from "@/lib/composite";
import { emptyToggles } from "@/lib/eq";
import { defaultLayout, gridClass, MAX_CAMERAS } from "@/lib/layout";
import { normalizePairingCode } from "@/lib/pairing";
import { recorderExtension, startMediaRecorder } from "@/lib/recording";
import { deleteRecording, listRecordings, saveRecording } from "@/lib/recordStore";
import { getLastCamera, getRoster, upsertRoster } from "@/lib/storage";
import { requestWakeLock } from "@/lib/wakeLock";

function makeSlot(code) {
  return {
    id: crypto.randomUUID(),
    code: normalizePairingCode(code),
    status: "connecting",
    error: "",
    muted: false,
    volume: 1,
    eq: emptyToggles(),
  };
}

function formatDuration(ms) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const m = String(Math.floor(total / 60)).padStart(2, "0");
  const s = String(total % 60).padStart(2, "0");
  return `${m}:${s}`;
}

export default function Viewer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const quickMode = searchParams.get("quick") === "1";

  const [codeInput, setCodeInput] = useState(
    normalizePairingCode(searchParams.get("code") || getLastCamera() || "")
  );
  const [roster, setRoster] = useState(() => getRoster());
  const [slots, setSlots] = useState([]);
  const [focusedId, setFocusedId] = useState("");
  const [layoutMode, setLayoutMode] = useState("auto");
  const [eqOpen, setEqOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [recordMenu, setRecordMenu] = useState(false);
  const [recording, setRecording] = useState(null);
  const [now, setNow] = useState(Date.now());
  const [clips, setClips] = useState([]);
  const [talking, setTalking] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [needGesture, setNeedGesture] = useState(false);
  const [chromeVisible, setChromeVisible] = useState(true);

  const slotsRef = useRef(slots);
  const sessionsRef = useRef(new Map());
  const graphsRef = useRef(new Map());
  const streamsRef = useRef(new Map());
  const videoElsRef = useRef(new Map());
  const recorderRef = useRef(null);
  const compositeRef = useRef(null);
  const gridRef = useRef(null);
  const chromeTimerRef = useRef(null);

  useEffect(() => {
    slotsRef.current = slots;
  }, [slots]);

  useEffect(() => {
    listRecordings()
      .then(setClips)
      .catch(() => {});
    const fromUrl = normalizePairingCode(searchParams.get("code") || "");
    const last = getLastCamera();
    const target = fromUrl || (quickMode ? last : "");
    if (target) addCamera(target);
    return () => {
      sessionsRef.current.forEach((session) => session.disconnect());
      graphsRef.current.forEach((graph) => graph.close());
      sessionsRef.current.clear();
      graphsRef.current.clear();
      if (recorderRef.current) {
        try {
          recorderRef.current.stop();
        } catch {}
      }
      compositeRef.current?.stop();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!slots.length) return undefined;
    let lock = null;
    const grab = async () => {
      lock = await requestWakeLock();
    };
    grab();
    const onVisible = () => {
      if (document.visibilityState === "visible") grab();
    };
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      lock?.release?.();
    };
  }, [slots.length]);

  useEffect(() => {
    if (!recording) return undefined;
    const timer = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(timer);
  }, [recording]);

  useEffect(() => {
    slots.forEach((slot) => {
      const graph = graphsRef.current.get(slot.id);
      if (!graph) return;
      graph.setVolume(slot.volume);
      graph.setMuted(slot.muted);
      graph.setToggles(slot.eq);
    });
  }, [slots]);

  const patchSlot = (id, patch) => {
    setSlots((prev) => prev.map((slot) => (slot.id === id ? { ...slot, ...patch } : slot)));
  };

  const bindVideo = (id) => (el) => {
    if (el) {
      videoElsRef.current.set(id, el);
      const stream = streamsRef.current.get(id);
      if (stream && el.srcObject !== stream) {
        el.srcObject = stream;
        el.muted = true;
        el.play().catch(() => {});
      }
    } else {
      videoElsRef.current.delete(id);
    }
  };

  const attachStream = (id, remote) => {
    streamsRef.current.set(id, remote);
    const el = videoElsRef.current.get(id);
    const ctx = getAudioContext();
    let graph = graphsRef.current.get(id);
    if (!graph && ctx) {
      graph = createAudioGraph(ctx);
      graphsRef.current.set(id, graph);
    }
    const slot = slotsRef.current.find((item) => item.id === id);
    let attached = false;
    if (graph) {
      attached = graph.attach(remote);
      if (slot) {
        graph.setVolume(slot.volume);
        graph.setMuted(slot.muted);
        graph.setToggles(slot.eq);
      }
    }
    if (el) {
      el.srcObject = remote;
      el.muted = attached || !remote.getAudioTracks().length ? true : !attached;
      if (!attached && remote.getAudioTracks().length) el.muted = false;
      else el.muted = true;
      el.play().catch(() => {});
    }
    if (ctx && ctx.state !== "running") setNeedGesture(true);
  };

  const addCamera = async (rawCode, { fromForm } = {}) => {
    await resumeAudioContext();
    const nextCode = normalizePairingCode(rawCode);
    if (nextCode.length < 4) {
      if (fromForm) toast.error("Enter the camera code");
      return false;
    }
    if (slotsRef.current.some((slot) => slot.code === nextCode)) {
      toast.error("That camera is already on screen");
      return false;
    }
    if (slotsRef.current.length >= MAX_CAMERAS) {
      toast.error("Four cameras is the split-screen limit");
      return false;
    }

    const slot = makeSlot(nextCode);
    setSlots((prev) => [...prev, slot]);
    setFocusedId(slot.id);
    setRoster(upsertRoster({ code: nextCode, label: nextCode }));
    setNeedGesture(getAudioContext()?.state !== "running");

    const session = createCameraSession({
      code: nextCode,
      onStatus: (status) =>
        patchSlot(slot.id, status === "connected" ? { status, error: "" } : { status }),
      onStream: (remote) => {
        attachStream(slot.id, remote);
        patchSlot(slot.id, { status: "connected", error: "" });
      },
      onClose: () => patchSlot(slot.id, { status: "connecting" }),
      onError: (error) => patchSlot(slot.id, { error, status: "connecting" }),
      onMessage: (msg) => {
        if (msg?.type === "torch" && msg.ok === false) {
          toast.error("This camera cannot turn on the lamp");
          setTorchOn(false);
        }
      },
    });
    sessionsRef.current.set(slot.id, session);
    session.connect();
    return true;
  };

  const dropCamera = (id) => {
    sessionsRef.current.get(id)?.disconnect();
    graphsRef.current.get(id)?.close();
    sessionsRef.current.delete(id);
    graphsRef.current.delete(id);
    streamsRef.current.delete(id);
    setSlots((prev) => {
      const next = prev.filter((slot) => slot.id !== id);
      if (focusedId === id) setFocusedId(next[0]?.id || "");
      return next;
    });
  };

  const leaveAll = () => {
    if (recording) stopRecording();
    sessionsRef.current.forEach((session) => session.disconnect());
    graphsRef.current.forEach((graph) => graph.close());
    sessionsRef.current.clear();
    graphsRef.current.clear();
    streamsRef.current.clear();
    setSlots([]);
    setFocusedId("");
  };

  const focused = slots.find((slot) => slot.id === focusedId) || slots[0] || null;
  const count = slots.length;
  const layout = layoutMode === "auto" ? defaultLayout(count) : layoutMode;
  const graph = focused ? graphsRef.current.get(focused.id) : null;

  const bumpChrome = () => {
    setChromeVisible(true);
    if (chromeTimerRef.current) clearTimeout(chromeTimerRef.current);
    chromeTimerRef.current = setTimeout(() => setChromeVisible(false), 4000);
  };

  const enableAudio = async () => {
    const ctx = await resumeAudioContext();
    if (ctx?.state === "running") setNeedGesture(false);
    slots.forEach((slot) => {
      const stream = streamsRef.current.get(slot.id);
      if (stream) attachStream(slot.id, stream);
    });
  };

  const connectFromForm = async () => {
    const ok = await addCamera(codeInput, { fromForm: true });
    if (ok) {
      setAddOpen(false);
      setCodeInput("");
    }
  };

  const startRecording = async (mode) => {
    if (!focused) return;
    await resumeAudioContext();
    try {
      let stream;
      if (mode === "view") {
        if (slots.length < 2) {
          toast.error("Split recording needs two cameras");
          return;
        }
        const videos = slots.map((slot) => videoElsRef.current.get(slot.id)).filter(Boolean);
        const audios = slots
          .filter((slot) => !slot.muted)
          .map((slot) => graphsRef.current.get(slot.id)?.destStream)
          .filter((item) => item?.getAudioTracks?.().length);
        const composite = createCompositeStream(videos, audios);
        compositeRef.current = composite;
        stream = composite.stream;
      } else if (mode === "audio") {
        stream = graphsRef.current.get(focused.id)?.destStream;
        if (!stream?.getAudioTracks?.().length) {
          const raw = streamsRef.current.get(focused.id);
          stream = raw ? new MediaStream(raw.getAudioTracks()) : null;
        }
        if (!stream?.getAudioTracks?.().length) {
          toast.error("This camera has no audio");
          return;
        }
      } else {
        const raw = streamsRef.current.get(focused.id);
        const videoTrack = raw?.getVideoTracks?.()[0];
        if (!videoTrack) {
          toast.error("Wait until the picture is live");
          return;
        }
        const processed = graphsRef.current.get(focused.id)?.destStream;
        stream = new MediaStream([
          videoTrack,
          ...(processed?.getAudioTracks() || raw.getAudioTracks()),
        ]);
      }
      recorderRef.current = startMediaRecorder(stream, { audioOnly: mode === "audio" });
      setRecording({ mode, startedAt: Date.now(), code: focused.code });
      setRecordMenu(false);
      toast.success(mode === "audio" ? "Recording audio" : mode === "view" ? "Recording split view" : "Recording video");
    } catch (err) {
      compositeRef.current?.stop();
      compositeRef.current = null;
      toast.error(err?.message || "Could not record");
    }
  };

  const stopRecording = async () => {
    const rec = recorderRef.current;
    recorderRef.current = null;
    const current = recording;
    setRecording(null);
    if (!rec) return;
    try {
      const blob = await rec.stop();
      compositeRef.current?.stop();
      compositeRef.current = null;
      const ext = recorderExtension(blob.type);
      const name = `${current?.mode || "clip"}-${current?.code || "cam"}-${Date.now()}.${ext}`;
      const saved = await saveRecording({
        blob,
        name,
        kind: current?.mode || "video",
        code: current?.code || "",
        mime: blob.type,
      });
      setClips((prev) => [saved, ...prev]);
      toast.success("Saved on this phone");
    } catch (err) {
      toast.error(err?.message || "Could not save recording");
    }
  };

  const takeStill = async () => {
    if (!focused) return;
    try {
      const blob = await snapshotFromVideo(videoElsRef.current.get(focused.id), {
        label: focused.code,
      });
      const saved = await saveRecording({
        blob,
        name: `still-${focused.code}-${Date.now()}.jpg`,
        kind: "still",
        code: focused.code,
        mime: "image/jpeg",
      });
      setClips((prev) => [saved, ...prev]);
      toast.success("Still saved");
    } catch (err) {
      toast.error(err?.message || "Could not capture still");
    }
  };

  const holdTalk = async (event) => {
    event.preventDefault();
    const session = focused && sessionsRef.current.get(focused.id);
    if (!session || focused.status !== "connected") {
      toast.error("Connect first");
      return;
    }
    try {
      await session.startTalk();
      setTalking(true);
    } catch {
      toast.error("Microphone blocked");
    }
  };

  const releaseTalk = () => {
    if (!focused) return;
    sessionsRef.current.get(focused.id)?.stopTalk();
    setTalking(false);
  };

  const toggleTorch = () => {
    if (!focused || focused.status !== "connected") return;
    const next = !torchOn;
    sessionsRef.current.get(focused.id)?.send({ type: "torch", on: next });
    setTorchOn(next);
  };

  const togglePip = async () => {
    const video = focused && videoElsRef.current.get(focused.id);
    if (!video) return;
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture();
      else await video.requestPictureInPicture();
    } catch {
      toast.error("Picture-in-picture is not available on this phone");
    }
  };

  const toggleFullscreen = async () => {
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else await (gridRef.current || document.documentElement).requestFullscreen();
    } catch {
      toast.error("Fullscreen is not available");
    }
  };

  const live = count > 0;
  const usedCodes = new Set(slots.map((slot) => slot.code));
  const availableRoster = roster.filter((item) => !usedCodes.has(item.code));

  const connectCard = (
    <Card className="bg-white/5 border-white/10 text-white">
      <CardHeader>
        <CardTitle className="text-white">Connect to a camera</CardTitle>
        <CardDescription className="text-white/50">
          Enter the code on the home phone. You can add more cameras after this and split the screen.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="code" className="text-white/70">
            Camera code
          </Label>
          <Input
            id="code"
            value={codeInput}
            onChange={(e) => setCodeInput(normalizePairingCode(e.target.value))}
            placeholder="e.g. 7K3M9P"
            className="bg-white/5 border-white/15 text-white placeholder:text-white/30 font-mono tracking-[0.35em] uppercase text-center text-lg"
            onKeyDown={(e) => e.key === "Enter" && connectFromForm()}
            autoCapitalize="characters"
            autoCorrect="off"
          />
        </div>
        {availableRoster.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {availableRoster.map((item) => (
              <button
                key={item.code}
                onClick={async () => {
                  const ok = await addCamera(item.code, { fromForm: true });
                  if (ok) {
                    setAddOpen(false);
                    setCodeInput("");
                  }
                }}
                className="rounded-full border border-white/15 bg-white/5 px-3 py-1 font-mono text-xs tracking-widest"
              >
                {item.code}
              </button>
            ))}
          </div>
        )}
        <Button
          onClick={connectFromForm}
          className="w-full bg-white text-slate-900 hover:bg-white/90 text-base py-6"
        >
          <Eye className="w-5 h-5 mr-2" />
          Connect
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col relative">
      <header
        className={`px-4 py-3 flex items-center gap-3 border-b border-white/10 transition-opacity ${
          live && !chromeVisible ? "opacity-0 pointer-events-none" : "opacity-100"
        }`}
      >
        <button
          onClick={() => {
            leaveAll();
            navigate("/");
          }}
          className="p-2 rounded-lg hover:bg-white/10"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="min-w-0 flex-1">
          <h1 className="text-lg font-semibold leading-tight">Viewer</h1>
          <p className="text-xs text-white/50 truncate">
            {live ? `${count} camera${count === 1 ? "" : "s"}` : "Watch remote cameras"}
          </p>
        </div>
        {live && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => setLayoutMode("single")}
              className={`p-2 rounded-lg ${layout === "single" ? "bg-white/15" : "hover:bg-white/10"}`}
              aria-label="Single"
            >
              <Focus className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode("split")}
              disabled={count < 2}
              className={`p-2 rounded-lg disabled:opacity-30 ${layout === "split" ? "bg-white/15" : "hover:bg-white/10"}`}
              aria-label="Split"
            >
              <Columns2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => setLayoutMode("grid")}
              disabled={count < 3}
              className={`p-2 rounded-lg disabled:opacity-30 ${layout === "grid" ? "bg-white/15" : "hover:bg-white/10"}`}
              aria-label="Grid"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              onClick={toggleFullscreen}
              className="p-2 rounded-lg hover:bg-white/10"
              aria-label="Fullscreen"
            >
              <Maximize2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setCodeInput("");
                setAddOpen(true);
              }}
              className="p-2 rounded-lg hover:bg-white/10"
              aria-label="Add camera"
            >
              <Plus className="w-5 h-5" />
            </button>
          </div>
        )}
      </header>

      <main className="flex-1 flex flex-col min-h-0" onPointerDown={live ? bumpChrome : undefined}>
        {!live ? (
          <div className="flex-1 px-6 py-8">
            <div className="max-w-md mx-auto">{connectCard}</div>
            <div className="max-w-md mx-auto mt-6">
              <RecordingsList
                items={clips}
                onDelete={async (clip) => {
                  URL.revokeObjectURL(clip.url);
                  await deleteRecording(clip.id);
                  setClips((prev) => prev.filter((item) => item.id !== clip.id));
                }}
              />
            </div>
          </div>
        ) : (
          <>
            <div
              ref={gridRef}
              className={`flex-1 min-h-0 grid auto-rows-fr ${gridClass(count, layoutMode)} bg-black`}
            >
              {(layout === "single" ? [focused].filter(Boolean) : slots).map((slot) => (
                <CameraPane
                  key={slot.id}
                  slot={slot}
                  focused={focused?.id === slot.id}
                  canRemove={count > 1}
                  videoRef={bindVideo(slot.id)}
                  onFocus={() => {
                    setFocusedId(slot.id);
                    setTorchOn(false);
                    bumpChrome();
                  }}
                  onRemove={() => dropCamera(slot.id)}
                />
              ))}
            </div>

            {needGesture && (
              <button
                onClick={enableAudio}
                className="absolute top-16 inset-x-4 z-20 rounded-xl bg-amber-400 text-slate-950 text-sm font-medium py-3"
              >
                Tap for sound
              </button>
            )}

            <div
              className={`border-t border-white/10 bg-slate-950/95 backdrop-blur pb-[env(safe-area-inset-bottom)] transition-opacity ${
                chromeVisible ? "opacity-100" : "opacity-0 pointer-events-none"
              }`}
            >
              {recording && (
                <div className="flex items-center justify-between px-4 pt-3 text-sm text-red-300">
                  <span className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                    REC {recording.mode} {formatDuration(now - recording.startedAt)}
                  </span>
                  <button onClick={stopRecording} className="uppercase text-xs tracking-wide">
                    Stop
                  </button>
                </div>
              )}
              <div className="px-3 py-3 flex items-center gap-1 overflow-x-auto">
                <DockButton
                  label={focused?.muted ? "Unmute" : "Mute"}
                  onClick={() => focused && patchSlot(focused.id, { muted: !focused.muted })}
                >
                  {focused?.muted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                </DockButton>
                <DockButton label="EQ" onClick={() => setEqOpen(true)}>
                  <SlidersHorizontal className="w-5 h-5" />
                </DockButton>
                <DockButton
                  label={recording ? "Stop" : "Record"}
                  danger={!!recording}
                  onClick={() => (recording ? stopRecording() : setRecordMenu((v) => !v))}
                >
                  {recording ? <Square className="w-5 h-5" /> : <span className="w-4 h-4 rounded-full bg-red-500" />}
                </DockButton>
                <DockButton label="Still" onClick={takeStill}>
                  <Camera className="w-5 h-5" />
                </DockButton>
                <DockButton
                  label={talking ? "Talking" : "Talk"}
                  danger={talking}
                  onPointerDown={holdTalk}
                  onPointerUp={releaseTalk}
                  onPointerCancel={releaseTalk}
                >
                  <Mic className="w-5 h-5" />
                </DockButton>
                <DockButton label="Lamp" onClick={toggleTorch}>
                  <Flashlight className={`w-5 h-5 ${torchOn ? "text-amber-300" : ""}`} />
                </DockButton>
                <DockButton label="PiP" onClick={togglePip}>
                  <PictureInPicture2 className="w-5 h-5" />
                </DockButton>
                <DockButton label="Leave" onClick={leaveAll}>
                  <Square className="w-5 h-5" />
                </DockButton>
              </div>
              {recordMenu && !recording && (
                <div className="px-4 pb-3 grid grid-cols-3 gap-2">
                  <Button onClick={() => startRecording("video")} className="bg-white text-slate-900 hover:bg-white/90">
                    Video
                  </Button>
                  <Button
                    onClick={() => startRecording("audio")}
                    variant="outline"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                  >
                    Audio
                  </Button>
                  <Button
                    onClick={() => startRecording("view")}
                    variant="outline"
                    className="border-white/15 bg-white/5 text-white hover:bg-white/10"
                    disabled={count < 2}
                  >
                    Split view
                  </Button>
                </div>
              )}
              <p className="px-4 pb-3 text-[11px] text-white/35">
                Hold Talk to speak through the home phone. Recordings stay on this phone. Tap a pane
                to focus it for EQ, lamp, and talk.
              </p>
              <RecordingsList
                items={clips}
                onDelete={async (clip) => {
                  URL.revokeObjectURL(clip.url);
                  await deleteRecording(clip.id);
                  setClips((prev) => prev.filter((item) => item.id !== clip.id));
                }}
              />
            </div>
          </>
        )}
      </main>

      <EqSheet
        open={eqOpen}
        toggles={focused?.eq || emptyToggles()}
        volume={focused?.volume ?? 1}
        muted={!!focused?.muted}
        graph={graph}
        cameraLabel={focused?.code}
        onToggle={(id) => {
          if (!focused) return;
          patchSlot(focused.id, { eq: { ...focused.eq, [id]: !focused.eq[id] } });
        }}
        onVolume={(value) => focused && patchSlot(focused.id, { volume: value, muted: value === 0 })}
        onMute={() => focused && patchSlot(focused.id, { muted: !focused.muted })}
        onClose={() => setEqOpen(false)}
      />

      {addOpen && (
        <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
          <button className="absolute inset-0 bg-black/60" onClick={() => setAddOpen(false)} />
          <div className="relative w-full max-w-md p-4">
            {connectCard}
          </div>
        </div>
      )}
    </div>
  );
}

function DockButton({ label, children, onClick, danger, ...props }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 flex flex-col items-center gap-1 px-3 py-1.5 rounded-xl ${
        danger ? "text-red-300" : "text-white/80"
      }`}
      {...props}
    >
      {children}
      <span className="text-[10px] tracking-wide">{label}</span>
    </button>
  );
}
