import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  BellOff,
  CheckCircle2,
  Copy,
  Disc,
  Download,
  EyeOff,
  Home as HomeIcon,
  Loader2,
  Moon,
  Play,
  Square,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import StealthDimScreen from "@/components/StealthDimScreen";
import StealthHomeScreen from "@/components/StealthHomeScreen";
import { makePairingCode, peerIdForCode } from "@/lib/pairing";
import { createPeer, destroyPeer, waitForOpen } from "@/lib/peerClient";
import { pickRecorderMime, recorderExtension } from "@/lib/recording";
import { viewerLink } from "@/lib/site";
import { getDeviceName, getPairingCode, setDeviceName, setPairingCode } from "@/lib/storage";
import { requestWakeLock } from "@/lib/wakeLock";

export default function Broadcaster() {
  const navigate = useNavigate();
  const [name, setName] = useState(() => getDeviceName());
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const [stealthMode, setStealthMode] = useState(false);
  const [showStealthSetup, setShowStealthSetup] = useState(false);
  const [stealthRecording, setStealthRecording] = useState(false);
  const [stealthDisguise, setStealthDisguise] = useState("dim");
  const [recordingUrl, setRecordingUrl] = useState(null);
  const [recordingName, setRecordingName] = useState("");

  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const callRef = useRef(null);
  const tapCountRef = useRef(0);
  const tapTimerRef = useRef(null);
  const autoStartAttemptedRef = useRef(false);
  const mediaRecorderRef = useRef(null);
  const recordChunksRef = useRef([]);
  const recordingUrlRef = useRef(null);

  const stopRecorder = () => {
    const rec = mediaRecorderRef.current;
    if (!rec) return;
    try {
      if (rec.state !== "inactive") rec.stop();
    } catch {}
    mediaRecorderRef.current = null;
  };

  const cleanup = () => {
    stopRecorder();
    if (callRef.current) {
      try {
        callRef.current.close();
      } catch {}
      callRef.current = null;
    }
    destroyPeer(peerRef.current);
    peerRef.current = null;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      cleanup();
      if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
    };
  }, []);

  useEffect(() => {
    if (videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current;
      videoRef.current.play().catch(() => {});
    }
  }, [status]);

  useEffect(() => {
    if (status === "idle") return undefined;
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
  }, [status]);

  const openPeer = async (preferredCode) => {
    let nextCode = preferredCode || makePairingCode();
    for (let attempt = 0; attempt < 4; attempt += 1) {
      const peer = createPeer(peerIdForCode(nextCode));
      try {
        await waitForOpen(peer);
        return { peer, code: nextCode };
      } catch (err) {
        destroyPeer(peer);
        if (err?.type === "unavailable-id") {
          nextCode = makePairingCode();
          continue;
        }
        throw err;
      }
    }
    throw new Error("Could not get a camera code. Try starting again.");
  };

  const startBroadcast = async (forcedName) => {
    const cameraName = (forcedName ?? name).trim();
    if (!cameraName) {
      toast.error("Enter a name for this camera");
      return;
    }
    setName(cameraName);
    setDeviceName(cameraName);
    setStatus("starting");
    setError("");
    try {
      const media = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment" },
        audio: true,
      });
      streamRef.current = media;
      if (videoRef.current) {
        videoRef.current.srcObject = media;
        videoRef.current.play().catch(() => {});
      }

      const { peer, code: nextCode } = await openPeer(getPairingCode());
      peerRef.current = peer;
      setPairingCode(nextCode);

      peer.on("error", (err) => {
        const msg =
          err?.type === "unavailable-id"
            ? "Code already in use. Try starting again."
            : err?.message || "Could not start camera";
        setError(msg);
        setStatus("error");
      });

      peer.on("disconnected", () => {
        setStatus((prev) => (prev === "connected" ? "waiting" : prev));
      });

      peer.on("connection", (conn) => {
        conn.on("open", () => {
          const call = peer.call(conn.peer, media);
          callRef.current = call;
          setStatus("connected");
          call.on("close", () => {
            setStatus((prev) => (prev === "connected" ? "waiting" : prev));
          });
        });
      });

      setCode(nextCode);
      setStatus("waiting");
    } catch (err) {
      const msg = err?.message || "Could not access camera or microphone";
      cleanup();
      if (videoRef.current) videoRef.current.srcObject = null;
      setError(msg);
      setStatus("idle");
      toast.error(msg);
    }
  };

  useEffect(() => {
    if (autoStartAttemptedRef.current) return;
    autoStartAttemptedRef.current = true;
    const saved = getDeviceName();
    if (saved) startBroadcast(saved);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startRecorder = (stream) => {
    const mime = pickRecorderMime();
    if (!mime || typeof MediaRecorder === "undefined") {
      toast.error("This phone cannot record while hidden");
      return false;
    }
    try {
      recordChunksRef.current = [];
      const rec = new MediaRecorder(stream, { mimeType: mime });
      rec.ondataavailable = (e) => {
        if (e.data && e.data.size) recordChunksRef.current.push(e.data);
      };
      rec.onstop = () => {
        const blob = new Blob(recordChunksRef.current, { type: rec.mimeType || mime });
        if (recordingUrlRef.current) URL.revokeObjectURL(recordingUrlRef.current);
        const url = URL.createObjectURL(blob);
        recordingUrlRef.current = url;
        setRecordingUrl(url);
        setRecordingName(`camera-${Date.now()}.${recorderExtension(rec.mimeType || mime)}`);
      };
      rec.start(1000);
      mediaRecorderRef.current = rec;
      return true;
    } catch {
      toast.error("Could not start recording");
      return false;
    }
  };

  const enterStealth = () => {
    if (!streamRef.current) return;
    if (stealthRecording) {
      const ok = startRecorder(streamRef.current);
      if (!ok) return;
    }
    setShowStealthSetup(false);
    setStealthMode(true);
    tapCountRef.current = 0;
  };

  const handleStealthTap = () => {
    tapCountRef.current += 1;
    if (tapTimerRef.current) clearTimeout(tapTimerRef.current);
    if (tapCountRef.current >= 3) {
      tapCountRef.current = 0;
      stopRecorder();
      setStealthMode(false);
    } else {
      tapTimerRef.current = setTimeout(() => {
        tapCountRef.current = 0;
      }, 800);
    }
  };

  const stopBroadcast = () => {
    stopRecorder();
    setStealthMode(false);
    setShowStealthSetup(false);
    cleanup();
    setStatus("idle");
    setCode("");
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const copyCode = async () => {
    try {
      await navigator.clipboard.writeText(code);
      toast.success("Code copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const copyViewerLink = async () => {
    try {
      await navigator.clipboard.writeText(viewerLink(code));
      toast.success("Viewer link copied");
    } catch {
      toast.error("Could not copy");
    }
  };

  const statusMeta = {
    idle: null,
    starting: { label: "Starting camera.", tone: "neutral", icon: Loader2, spin: true },
    waiting: { label: "Waiting for a viewer to connect.", tone: "amber", icon: Video, pulse: true },
    connected: { label: "Viewer connected - streaming live", tone: "green", icon: CheckCircle2 },
    error: { label: error, tone: "red", icon: AlertCircle },
  }[status];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-6 py-5 flex items-center gap-4 border-b border-white/10">
        <button
          onClick={() => {
            if (status !== "idle") stopBroadcast();
            navigate("/");
          }}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">Camera Mode</h1>
          <p className="text-xs text-white/50">This device is broadcasting</p>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 py-10">
        {status === "idle" ? (
          <Card className="w-full max-w-md bg-white/5 border-white/10 text-white">
            <CardHeader>
              <CardTitle className="text-white">Set up this camera</CardTitle>
              <CardDescription className="text-white/50">
                Give this device a name so you can recognize it from your viewer.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="name" className="text-white/70">
                  Camera name
                </Label>
                <Input
                  id="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Living Room iPhone"
                  className="bg-white/5 border-white/15 text-white placeholder:text-white/30"
                  onKeyDown={(e) => e.key === "Enter" && startBroadcast()}
                />
              </div>
              <Button
                onClick={() => startBroadcast()}
                className="w-full bg-white text-slate-900 hover:bg-white/90 text-base py-6"
              >
                <Video className="w-5 h-5 mr-2" />
                Start broadcasting
              </Button>
              <p className="text-xs text-white/40 text-center leading-relaxed">
                Your browser will ask permission to use the camera and microphone. No Base44
                account is required.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="w-full max-w-3xl">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === "connected" ? "bg-red-500" : "bg-amber-400"
                  } ${status === "waiting" ? "animate-pulse" : ""}`}
                />
                {status === "connected" ? "LIVE" : "STANDBY"}
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-2">
                <span className="rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-medium">
                  {name}
                </span>
                <Button
                  onClick={stopBroadcast}
                  variant="destructive"
                  className="rounded-full bg-red-600 hover:bg-red-500"
                >
                  <Square className="w-4 h-4 mr-1.5" />
                  Stop
                </Button>
              </div>
            </div>

            {code && (
              <div className="mt-5 rounded-xl bg-white/5 border border-white/10 px-4 py-4">
                <p className="text-xs text-white/50 text-center">Viewer code</p>
                <p className="mt-1 text-center font-mono text-3xl tracking-[0.35em] text-white">
                  {code}
                </p>
                <button
                  onClick={copyCode}
                  className="mt-3 mx-auto flex items-center gap-2 text-xs text-white/60 hover:text-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy code
                </button>
                <p className="mt-3 text-center text-xs text-white/40">
                  On the phone you take with you, open this same website and enter the code — even
                  when you are not on this Wi-Fi.
                </p>
                <button
                  onClick={copyViewerLink}
                  className="mt-2 mx-auto flex items-center gap-2 text-xs text-white/60 hover:text-white"
                >
                  <Copy className="w-3.5 h-3.5" />
                  Copy viewer link
                </button>
                <p className="mt-3 text-center text-xs text-amber-300/80">
                  Keep this tab open and the phone plugged in while you are away.
                </p>
              </div>
            )}

            {(status === "waiting" || status === "connected") && (
              <Button
                onClick={() => setShowStealthSetup(true)}
                variant="outline"
                className="mt-5 w-full border-white/15 bg-white/5 text-white hover:bg-white/10 py-6"
              >
                <EyeOff className="w-4 h-4 mr-2" />
                Hide screen
              </Button>
            )}

            {recordingUrl && (
              <div className="mt-5 rounded-xl bg-white/5 border border-white/10 px-4 py-4">
                <p className="text-sm font-medium">Hidden recording ready</p>
                <p className="text-xs text-white/50 mt-1">
                  Saved on this phone only. Download it before you close this tab.
                </p>
                <div className="mt-3 flex gap-2">
                  <a
                    href={recordingUrl}
                    download={recordingName}
                    className="inline-flex items-center justify-center rounded-md bg-white text-slate-900 hover:bg-white/90 text-sm font-medium h-10 px-4"
                  >
                    <Download className="w-4 h-4 mr-2" />
                    Download
                  </a>
                  <a
                    href={recordingUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center rounded-md border border-white/15 bg-white/5 hover:bg-white/10 text-sm font-medium h-10 px-4"
                  >
                    <Play className="w-4 h-4 mr-2" />
                    Play
                  </a>
                </div>
              </div>
            )}

            {statusMeta && (
              <div
                className={`mt-5 flex items-center gap-3 rounded-xl px-4 py-3 text-sm ${
                  statusMeta.tone === "green"
                    ? "bg-green-500/10 text-green-300"
                    : statusMeta.tone === "amber"
                      ? "bg-amber-500/10 text-amber-300"
                      : statusMeta.tone === "red"
                        ? "bg-red-500/10 text-red-300"
                        : "bg-white/5 text-white/60"
                }`}
              >
                <statusMeta.icon
                  className={`w-4 h-4 ${statusMeta.spin ? "animate-spin" : ""} ${
                    statusMeta.pulse ? "animate-pulse" : ""
                  }`}
                />
                <span>{statusMeta.label}</span>
              </div>
            )}
          </div>
        )}
      </main>

      {showStealthSetup && (
        <div className="fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center p-4">
          <div className="w-full max-w-md rounded-2xl bg-slate-900 border border-white/10 p-5 text-white">
            <h2 className="text-lg font-semibold">Hide this screen</h2>
            <p className="text-sm text-white/50 mt-1 leading-relaxed">
              The camera keeps running. Triple-tap anywhere to come back.
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <button
                onClick={() => setStealthDisguise("dim")}
                className={`rounded-xl border p-4 text-left ${
                  stealthDisguise === "dim"
                    ? "border-white bg-white/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <Moon className="w-5 h-5 mb-2" />
                <p className="text-sm font-medium">Sleeping</p>
                <p className="text-xs text-white/50 mt-1">Looks like the phone is off</p>
              </button>
              <button
                onClick={() => setStealthDisguise("home")}
                className={`rounded-xl border p-4 text-left ${
                  stealthDisguise === "home"
                    ? "border-white bg-white/10"
                    : "border-white/10 bg-white/5"
                }`}
              >
                <HomeIcon className="w-5 h-5 mb-2" />
                <p className="text-sm font-medium">Home screen</p>
                <p className="text-xs text-white/50 mt-1">Looks like a regular phone</p>
              </button>
            </div>
            <button
              onClick={() => setStealthRecording((v) => !v)}
              className="mt-4 w-full flex items-center justify-between rounded-xl border border-white/10 bg-white/5 px-4 py-3"
            >
              <span className="flex items-center gap-2 text-sm">
                <Disc className="w-4 h-4" />
                Record while hidden
              </span>
              <span
                className={`w-10 h-6 rounded-full relative transition-colors ${
                  stealthRecording ? "bg-white" : "bg-white/20"
                }`}
              >
                <span
                  className={`absolute top-0.5 h-5 w-5 rounded-full transition-all ${
                    stealthRecording ? "left-4 bg-slate-900" : "left-0.5 bg-white"
                  }`}
                />
              </span>
            </button>
            <p className="mt-3 flex items-start gap-2 text-xs text-white/40 leading-relaxed">
              <BellOff className="w-3.5 h-3.5 mt-0.5 shrink-0" />
              Silence this phone and keep it plugged in. This is for your own home camera, not
              hidden recording of other people.
            </p>
            <div className="mt-5 flex gap-2">
              <Button
                variant="outline"
                className="flex-1 border-white/15 bg-transparent text-white hover:bg-white/10"
                onClick={() => setShowStealthSetup(false)}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-white text-slate-900 hover:bg-white/90"
                onClick={enterStealth}
              >
                Hide now
              </Button>
            </div>
          </div>
        </div>
      )}

      {stealthMode &&
        (stealthDisguise === "home" ? (
          <StealthHomeScreen onTap={handleStealthTap} />
        ) : (
          <StealthDimScreen onTap={handleStealthTap} />
        ))}
    </div>
  );
}
