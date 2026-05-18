import { useRef, useEffect } from 'react';

export default function SimulatedVideo({ label }: { label: string }) {
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
      ctx.fillStyle = '#0b1220';
      ctx.fillRect(0, 0, w, h);

      ctx.strokeStyle = 'rgba(30, 41, 59, 0.6)';
      ctx.lineWidth = 1;
      for (let i = 0; i < w; i += 40) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.stroke();
      }
      for (let i = 0; i < h; i += 40) {
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke();
      }

      ctx.fillStyle = 'rgba(0, 0, 0, 0.15)';
      for (let i = 0; i < h; i += 4) ctx.fillRect(0, i, w, 1);

      for (let i = 0; i < 30; i++) {
        ctx.fillStyle = `rgba(255, 255, 255, ${Math.random() * 0.08})`;
        ctx.fillRect(Math.random() * w, Math.random() * h, 1, 1);
      }

      const x = w * 0.3 + Math.sin(frame * 0.015) * w * 0.2;
      const y = h * 0.4 + Math.cos(frame * 0.02) * h * 0.15;
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(x, y, 7, 0, Math.PI * 2);
      ctx.fill();
      ctx.shadowBlur = 0;

      ctx.strokeStyle = 'rgba(239, 68, 68, 0.7)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(x - 18, y); ctx.lineTo(x + 18, y); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x, y - 18); ctx.lineTo(x, y + 18); ctx.stroke();

      ctx.strokeStyle = 'rgba(59, 130, 246, 0.5)';
      ctx.lineWidth = 2;
      const cornerSize = 16;
      [[0, 0], [w, 0], [0, h], [w, h]].forEach(([cx, cy]) => {
        ctx.beginPath();
        if (cx === 0) {
          ctx.moveTo(cornerSize, cy as number); ctx.lineTo(4, cy as number);
          ctx.lineTo(4, cy === 0 ? cornerSize : (cy as number) - cornerSize);
        } else {
          ctx.moveTo((cx as number) - cornerSize, cy as number); ctx.lineTo((cx as number) - 4, cy as number);
          ctx.lineTo((cx as number) - 4, cy === 0 ? cornerSize : (cy as number) - cornerSize);
        }
        ctx.stroke();
      });

      ctx.fillStyle = '#22c55e';
      ctx.font = '12px monospace';
      ctx.fillText(new Date().toLocaleString('zh-CN'), 12, 22);

      ctx.fillStyle = '#94a3b8';
      ctx.font = '11px monospace';
      ctx.fillText(`[模拟画面] ${label}`, 12, 40);

      ctx.fillStyle = '#f59e0b';
      for (let i = 0; i < 4; i++) {
        const barH = 3 + i * 3;
        ctx.fillRect(w - 30 + i * 5, 20 - barH, 3, barH);
      }

      raf = requestAnimationFrame(draw);
    };

    draw();
    return () => cancelAnimationFrame(raf);
  }, [label]);

  return (
    <div className="relative w-full h-full rounded overflow-hidden bg-[#0b1220]">
      <canvas ref={canvasRef} width={640} height={360} className="w-full h-full" />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.04]"
        style={{
          backgroundImage: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 4px)',
        }}
      />
    </div>
  );
}
