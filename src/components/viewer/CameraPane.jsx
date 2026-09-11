import { AlertCircle, Loader2, X } from "lucide-react";

export default function CameraPane({
  slot,
  focused,
  canRemove,
  videoRef,
  onFocus,
  onRemove,
}) {
  const live = slot.status === "connected";
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onFocus}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") onFocus();
      }}
      className={`relative h-full min-h-0 overflow-hidden bg-black text-left ${
        focused ? "ring-2 ring-white" : "ring-1 ring-white/10"
      }`}
    >
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className="absolute inset-0 h-full w-full object-cover"
      />
      {!live && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/70">
          {slot.status === "connecting" ? (
            <Loader2 className="w-6 h-6 animate-spin text-white/70" />
          ) : (
            <AlertCircle className="w-6 h-6 text-red-300" />
          )}
          <p className="mt-2 text-xs text-white/60 px-3 text-center">
            {slot.error || (slot.status === "connecting" ? "Connecting" : "Waiting")}
          </p>
        </div>
      )}
      <div className="absolute top-2 left-2 flex items-center gap-1.5 rounded-full bg-black/60 px-2 py-1 text-[10px] font-medium tracking-wide">
        <span className={`w-1.5 h-1.5 rounded-full ${live ? "bg-red-500 animate-pulse" : "bg-amber-400"}`} />
        {live ? "LIVE" : "WAIT"}
      </div>
      <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-2">
        <span className="truncate rounded-full bg-black/60 px-2 py-1 font-mono text-[11px] tracking-widest">
          {slot.code}
        </span>
        {canRemove && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onRemove();
            }}
            className="rounded-full bg-black/60 p-1 text-white/70 hover:text-white"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
