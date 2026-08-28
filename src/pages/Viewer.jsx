import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Eye,
  Loader2,
  Square,
  Volume2,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { normalizePairingCode, peerIdForCode } from "@/lib/pairing";
import { createPeer, destroyPeer, waitForOpen } from "@/lib/peerClient";

export default function Viewer() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [code, setCode] = useState(normalizePairingCode(searchParams.get("code") || ""));
  const [selectedName, setSelectedName] = useState("");
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const videoRef = useRef(null);
  const peerRef = useRef(null);
  const callRef = useRef(null);

  const disconnectPeer = () => {
    if (callRef.current) {
      try {
        callRef.current.close();
      } catch {}
      callRef.current = null;
    }
    destroyPeer(peerRef.current);
    peerRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  useEffect(() => {
    return () => disconnectPeer();
  }, []);

  const connectTo = async () => {
    const nextCode = normalizePairingCode(code);
    if (nextCode.length < 4) {
      toast.error("Enter the camera code");
      return;
    }
    setStatus("connecting");
    setError("");
    setSelectedName(nextCode);
    disconnectPeer();

    try {
      const peer = createPeer();
      peerRef.current = peer;
      peer.on("error", (err) => {
        const msg =
          err?.type === "peer-unavailable"
            ? "No camera is using that code. Start Camera Mode first."
            : err?.message || "Could not connect to this camera";
        setError(msg);
        setStatus("error");
      });
      await waitForOpen(peer);

      peer.on("call", (call) => {
        call.answer();
        callRef.current = call;
        call.on("stream", (remote) => {
          if (videoRef.current) {
            videoRef.current.srcObject = remote;
            videoRef.current.play().catch(() => {});
          }
          setStatus("connected");
        });
        call.on("close", () => {
          setStatus((prev) => (prev === "connected" ? "disconnected" : prev));
        });
        call.on("error", (err) => {
          setError(err?.message || "Could not connect to this camera");
          setStatus("error");
        });
      });

      const conn = peer.connect(peerIdForCode(nextCode), { reliable: true });
      conn.on("error", (err) => {
        setError(err?.message || "Could not connect to this camera");
        setStatus("error");
      });
    } catch (err) {
      setError(err?.message || "Could not connect to this camera");
      setStatus("error");
    }
  };

  const disconnect = () => {
    disconnectPeer();
    setSelectedName("");
    setStatus("idle");
  };

  const statusMeta = {
    connecting: { label: "Connecting to camera.", tone: "neutral", icon: Loader2, spin: true },
    connected: { label: "Connected - streaming live", tone: "green", icon: CheckCircle2 },
    disconnected: { label: "Connection lost", tone: "red", icon: AlertCircle },
    error: { label: error, tone: "red", icon: AlertCircle },
  }[status];

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      <header className="px-6 py-5 flex items-center gap-4 border-b border-white/10">
        <button
          onClick={() => {
            if (status !== "idle") disconnect();
            navigate("/");
          }}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-semibold">Viewer Mode</h1>
          <p className="text-xs text-white/50">Watch a remote camera</p>
        </div>
      </header>

      <main className="flex-1 px-6 py-8">
        {status !== "idle" && status !== "error" ? (
          <div className="max-w-4xl mx-auto">
            <div className="relative aspect-video w-full rounded-2xl overflow-hidden bg-black border border-white/10 shadow-2xl">
              <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
              {status !== "connected" && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70 backdrop-blur-sm">
                  {statusMeta && (
                    <div className="flex items-center gap-3 text-white/70">
                      <statusMeta.icon className={`w-6 h-6 ${statusMeta.spin ? "animate-spin" : ""}`} />
                      <span className="text-sm">{statusMeta.label}</span>
                    </div>
                  )}
                </div>
              )}
              <div className="absolute top-4 left-4 flex items-center gap-2 rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-medium">
                <span
                  className={`w-2 h-2 rounded-full ${
                    status === "connected" ? "bg-red-500 animate-pulse" : "bg-amber-400"
                  }`}
                />
                {status === "connected" ? "LIVE" : "CONNECTING"}
              </div>
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between">
                <span className="rounded-full bg-black/60 backdrop-blur px-3 py-1.5 text-xs font-medium font-mono tracking-widest">
                  {selectedName}
                </span>
                <Button
                  onClick={disconnect}
                  variant="destructive"
                  className="rounded-full bg-red-600 hover:bg-red-500"
                >
                  <Square className="w-4 h-4 mr-1.5" />
                  Disconnect
                </Button>
              </div>
            </div>
            {status === "connected" && (
              <div className="mt-4 flex items-center gap-2 text-xs text-white/40">
                <Volume2 className="w-4 h-4" />
                Audio is streaming from the remote device. Use the volume controls on this phone to
                listen.
              </div>
            )}
          </div>
        ) : (
          <div className="max-w-md mx-auto">
            <Card className="bg-white/5 border-white/10 text-white">
              <CardHeader>
                <CardTitle className="text-white">Connect to a camera</CardTitle>
                <CardDescription className="text-white/50">
                  Enter the code shown on the phone that is in Camera Mode.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label htmlFor="code" className="text-white/70">
                    Camera code
                  </Label>
                  <Input
                    id="code"
                    value={code}
                    onChange={(e) => setCode(normalizePairingCode(e.target.value))}
                    placeholder="e.g. 7K3M9P"
                    className="bg-white/5 border-white/15 text-white placeholder:text-white/30 font-mono tracking-[0.35em] uppercase text-center text-lg"
                    onKeyDown={(e) => e.key === "Enter" && connectTo()}
                    autoCapitalize="characters"
                    autoCorrect="off"
                  />
                </div>
                <Button
                  onClick={connectTo}
                  className="w-full bg-white text-slate-900 hover:bg-white/90 text-base py-6"
                >
                  <Eye className="w-5 h-5 mr-2" />
                  Connect
                </Button>
              </CardContent>
            </Card>
            {status === "error" && error && (
              <div className="mt-6 flex items-center gap-3 rounded-xl bg-red-500/10 text-red-300 px-4 py-3 text-sm">
                <AlertCircle className="w-4 h-4" />
                {error}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
