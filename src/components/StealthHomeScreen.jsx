import { useEffect, useState } from "react";
import {
  Phone,
  Mail,
  MessageSquare,
  Calendar,
  Calculator,
  CloudSun,
  Map,
  Music,
  Image,
  Clock,
  StickyNote,
  Settings,
  Signal,
  Wifi,
  BatteryFull,
} from "lucide-react";

const APPS = [
  { icon: Phone, label: "Phone", bg: "bg-green-500" },
  { icon: Mail, label: "Mail", bg: "bg-blue-500" },
  { icon: MessageSquare, label: "Messages", bg: "bg-emerald-600" },
  { icon: Calendar, label: "Calendar", bg: "bg-white", fg: "text-slate-900" },
  { icon: Calculator, label: "Calc", bg: "bg-slate-800" },
  { icon: CloudSun, label: "Weather", bg: "bg-sky-500" },
  { icon: Map, label: "Maps", bg: "bg-teal-500" },
  { icon: Music, label: "Music", bg: "bg-rose-500" },
  { icon: Image, label: "Photos", bg: "bg-amber-400", fg: "text-amber-900" },
  { icon: Clock, label: "Clock", bg: "bg-black" },
  { icon: StickyNote, label: "Notes", bg: "bg-yellow-400", fg: "text-yellow-900" },
  { icon: Settings, label: "Settings", bg: "bg-slate-500" },
];

const DOCK = [
  { icon: Phone, label: "Phone", bg: "bg-green-500" },
  { icon: MessageSquare, label: "Messages", bg: "bg-emerald-600" },
  { icon: Music, label: "Music", bg: "bg-rose-500" },
  { icon: Settings, label: "Settings", bg: "bg-slate-500" },
];

export default function StealthHomeScreen({ onTap }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 10000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div
      onClick={onTap}
      className="fixed inset-0 z-50 select-none overflow-hidden bg-gradient-to-b from-indigo-700 via-purple-800 to-slate-900"
    >
      <div className="flex items-center justify-between px-6 pt-3 pb-1 text-white text-sm font-semibold pointer-events-none">
        <span>{time}</span>
        <div className="flex items-center gap-1.5">
          <Signal className="w-4 h-4" />
          <Wifi className="w-4 h-4" />
          <BatteryFull className="w-6 h-6" />
        </div>
      </div>

      <div className="px-6 pt-10 grid grid-cols-4 gap-x-4 gap-y-6 pointer-events-none">
        {APPS.map((app, i) => (
          <div key={i} className="flex flex-col items-center gap-1.5">
            <div
              className={`w-[3.25rem] h-[3.25rem] rounded-[1.1rem] ${app.bg} flex items-center justify-center shadow-lg`}
            >
              <app.icon className={`w-7 h-7 ${app.fg || "text-white"}`} />
            </div>
            <span className="text-[10px] text-white/90 leading-none">{app.label}</span>
          </div>
        ))}
      </div>

      <div className="absolute bottom-3 left-3 right-3 pointer-events-none">
        <div className="backdrop-blur-xl bg-white/15 rounded-[1.75rem] px-4 py-3 flex justify-around">
          {DOCK.map((app, i) => (
            <div
              key={i}
              className={`w-[3.25rem] h-[3.25rem] rounded-[1.1rem] ${app.bg} flex items-center justify-center shadow-lg`}
            >
              <app.icon className="w-7 h-7 text-white" />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
