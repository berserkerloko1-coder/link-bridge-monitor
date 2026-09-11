import { Download, Play, Trash2 } from "lucide-react";

export default function RecordingsList({ items, onDelete }) {
  if (!items?.length) return null;
  return (
    <div className="px-4 pb-4">
      <p className="text-xs uppercase tracking-wide text-white/40 mb-2">Saved on this phone</p>
      <div className="space-y-2">
        {items.map((clip) => (
          <div
            key={clip.id}
            className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-3 py-2"
          >
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm">{clip.name}</p>
              <p className="text-[11px] text-white/40">
                {clip.kind} · {clip.code} · {new Date(clip.createdAt).toLocaleString()}
              </p>
            </div>
            <a
              href={clip.url}
              target="_blank"
              rel="noreferrer"
              className="p-2 text-white/70 hover:text-white"
              aria-label="Play"
            >
              <Play className="w-4 h-4" />
            </a>
            <a
              href={clip.url}
              download={clip.name}
              className="p-2 text-white/70 hover:text-white"
              aria-label="Download"
            >
              <Download className="w-4 h-4" />
            </a>
            <button
              onClick={() => onDelete(clip)}
              className="p-2 text-white/70 hover:text-red-300"
              aria-label="Delete"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
