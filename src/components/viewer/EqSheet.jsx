import { EQ_TOGGLES } from "@/lib/eq";
import VuMeter from "@/components/viewer/VuMeter";

export default function EqSheet({ open, toggles, volume, muted, graph, cameraLabel, onToggle, onVolume, onMute, onClose }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-40 flex items-end sm:items-center justify-center">
      <button className="absolute inset-0 bg-black/60" onClick={onClose} aria-label="Close equalizer" />
      <div className="relative w-full max-w-md rounded-t-2xl sm:rounded-2xl bg-slate-900 border border-white/10 p-5 text-white">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Listen</h2>
            <p className="text-xs text-white/50 mt-1">
              EQ on {cameraLabel || "this camera"}. Toggles stack.
            </p>
          </div>
          <button onClick={onClose} className="text-xs text-white/50 hover:text-white">
            Done
          </button>
        </div>

        <VuMeter graph={graph} className="mt-4" />

        <div className="mt-4 grid grid-cols-2 gap-2">
          {EQ_TOGGLES.map((item) => {
            const on = !!toggles[item.id];
            return (
              <button
                key={item.id}
                onClick={() => onToggle(item.id)}
                className={`rounded-xl border px-3 py-3 text-left ${
                  on ? "border-white bg-white/10" : "border-white/10 bg-white/5"
                }`}
              >
                <p className="text-sm font-medium">{item.label}</p>
                <p className="text-[11px] text-white/45 mt-0.5 leading-snug">{item.hint}</p>
              </button>
            );
          })}
        </div>

        <div className="mt-5">
          <div className="flex items-center justify-between text-xs text-white/50 mb-2">
            <span>Volume</span>
            <button onClick={onMute} className="uppercase tracking-wide">
              {muted ? "Unmute" : "Mute"}
            </button>
          </div>
          <input
            type="range"
            min="0"
            max="2"
            step="0.05"
            value={muted ? 0 : volume}
            onChange={(e) => onVolume(Number(e.target.value))}
            className="w-full accent-white"
          />
        </div>
      </div>
    </div>
  );
}
