import { useEffect, useState } from "react";

// Near-black "sleeping screen" disguise. Looks like the phone is off,
// with only a barely-visible time so it reads as an always-on display.
// Tap handling (3 taps to exit) is owned by the parent via onTap.
export default function StealthDimScreen({ onTap }) {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(t);
  }, []);

  const time = now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });

  return (
    <div
      onClick={onTap}
      className="fixed inset-0 z-50 select-none bg-black flex items-center justify-center"
    >
      <span className="text-white/[0.04] text-7xl font-light tracking-tight pointer-events-none">
        {time}
      </span>
    </div>
  );
}
