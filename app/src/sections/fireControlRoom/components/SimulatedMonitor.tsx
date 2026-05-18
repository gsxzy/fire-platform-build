import { useRef, useEffect } from 'react';

export default function SimulatedMonitor({ label }: { label: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let frame = 0;
    let raf: number;
    const w = canvas.width;
    const h = canvas.height;

    const draw = () => {
      frame++;
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, w, h);

      // Grid
      ctx.strokeStyle = 'rgba(30, 41, 59, 0.5)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 40) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke(); }
      for (let i = 0; i < h; i += 40) { ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }

      // Scanlines
      ctx.fillStyle = 'rgba(0, 0, 0, 0.12)';
      for (let i = 0; i < h; i += 4) ctx.fillRect(0, i, w, 1);

      // Noise
      for (let i = 0; i < 20; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.06})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }

      // Moving target
      const tx = w * 0.3 + Math.sin(frame * 0.012) * w * 0.25;
      const ty = h * 0.4 + Math.cos(frame * 0.018) * h * 0.18;
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(tx, ty, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Crosshair
      ctx.strokeStyle = 'rgba(239, 68, 68, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(tx - 14, ty); ctx.lineTo(tx + 14, ty); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(tx, ty - 14); ctx.lineTo(tx, ty + 14); ctx.stroke();

      // Corner brackets
      ctx.strokeStyle = 'rgba(59, 130, 246, 0.4)';
      ctx.lineWidth = 1.5;
      const cs = 12;
      [[0, 0], [w, 0], [0, h], [w, h]].forEach(([cx, cy]) => {
        ctx.beginPath();
        if (cx === 0) { ctx.moveTo(cs, cy as number); ctx.lineTo(3, cy as number); ctx.lineTo(3, cy === 0 ? cs : (cy as number) - cs); }
        else { ctx.moveTo((cx as number) - cs, cy as number); ctx.lineTo((cx as number) - 3, cy as number); ctx.lineTo((cx as number) - 3, cy === 0 ? cs : (cy as number) - cs); }
        ctx.stroke();
      });

      // Timestamp
      ctx.fillStyle = '#22c55e';
      ctx.font = '10px monospace';
      ctx.fillText(new Date().toLocaleString('zh-CN'), 10, 18);

      // Label
      ctx.fillStyle = '#94a3b8';
      ctx.font = '10px monospace';
      ctx.fillText(`[模拟画面] ${label}`, 10, 34);

      // Signal bars
      ctx.fillStyle = '#f59e0b';
      for (let i = 0; i < 4; i++) { const barH = 2 + i * 2.5; ctx.fillRect(w - 26 + i * 4, 16 - barH, 2.5, barH); }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [label]);

  return (
    <div className="relative w-full h-full rounded overflow-hidden bg-[#0f1720]">
      <canvas ref={canvasRef} width={480} height={270} className="w-full h-full" />
      <div className="absolute inset-0 pointer-events-none opacity-[0.03]" style={{ backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.08) 2px, rgba(255,255,255,0.08) 4px)' }} />
    </div>
  );
}
