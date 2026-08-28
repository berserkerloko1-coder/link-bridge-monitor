import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Copy,
  Loader2,
  Square,
  Video,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { makePairingCode, peerIdForCode } from "@/lib/pairing";
import { createPeer, destroyPeer, waitForOpen } from "@/lib/peerClient";
import { viewerLink } from "@/lib/site";
import { requestWakeLock } from "@/lib/wakeLock";

export default function Broadcaster() {
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [code, setCode] = useState("");
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const streamRef = useRef(null);
  const callRef = useRef(null);

  const cleanup = () => {
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
    return () => cleanup();
  }, []);

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

  const startBroadcast = async () => {
    if (!name.trim()) {
      toast.error("Enter a name for this camera");
      return;
    }
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

      const nextCode = makePairingCode();
      const peer = createPeer(peerIdForCode(nextCode));
      peerRef.current = peer;

      peer.on("error", (err) => {
        const msg = err?.type === "unavailable-id" ? "Code already in use. Try starting again." : err?.message || "Could not start camera";
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

      await waitForOpen(peer);
      setCode(nextCode);
      setStatus("waiting");
    } catch (err) {
      setError(err?.message || "Could not access camera or microphone");
      setStatus("error");
      cleanup();
    }
  };

  const stopBroadcast = () => {
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
                onClick={startBroadcast}
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
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
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
    </div>
  );
}
