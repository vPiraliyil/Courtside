import { useEffect, useState } from 'react';

function pad(n) {
  return String(n).padStart(2, '0');
}

export default function CountdownTimer({ targetDate }) {
  const [parts, setParts] = useState(null);

  useEffect(() => {
    function tick() {
      const diff = new Date(targetDate) - Date.now();
      if (diff <= 0) {
        setParts(null);
        return;
      }
      const d = Math.floor(diff / 86400000);
      const h = Math.floor((diff % 86400000) / 3600000);
      const m = Math.floor((diff % 3600000) / 60000);
      const s = Math.floor((diff % 60000) / 1000);
      setParts({ d, h, m, s });
    }
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [targetDate]);

  if (!parts) return null;

  const units = [
    ...(parts.d > 0 ? [{ label: 'DAYS', value: parts.d, raw: true }] : []),
    { label: 'HRS',  value: pad(parts.h) },
    { label: 'MIN',  value: pad(parts.m) },
    { label: 'SEC',  value: pad(parts.s) },
  ];

  return (
    <div className="flex items-end gap-4 justify-center">
      {units.map(({ label, value }) => (
        <div key={label} className="flex flex-col items-center">
          <span className="font-display text-6xl leading-none text-white tabular-nums">
            {value}
          </span>
          <span className="text-[10px] text-white/35 tracking-[0.3em] uppercase mt-1.5">
            {label}
          </span>
        </div>
      ))}
    </div>
  );
}
