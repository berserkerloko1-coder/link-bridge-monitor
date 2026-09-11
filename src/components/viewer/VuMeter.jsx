import { useEffect, useRef } from "react";

export default function VuMeter({ graph, className = "" }) {
  const barRef = useRef(null);

  useEffect(() => {
    if (!graph) return undefined;
    let raf = 0;
    const tick = () => {
      const el = barRef.current;
      if (el) {
        const level = Math.min(1, (graph.level() || 0) * 4);
        el.style.transform = `scaleX(${level})`;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [graph]);

  return (
    <div className={`h-1.5 w-full rounded-full bg-white/10 overflow-hidden ${className}`}>
      <div
        ref={barRef}
        className="h-full w-full origin-left bg-emerald-400"
        style={{ transform: "scaleX(0)" }}
      />
    </div>
  );
}
