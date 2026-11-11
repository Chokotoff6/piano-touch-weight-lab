import { useEffect, useRef, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/** Fenêtre volante déplaçable, sans voile : fermeture par ✕, Échap ou clic extérieur. */
export function FloatingPanel({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ x: number; y: number } | null>(null);
  const drag = useRef<{ dx: number; dy: number } | null>(null);

  useEffect(() => {
    if (!open) return;
    if (!pos) setPos({ x: Math.max(16, window.innerWidth - 400), y: 180 });
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !(t as Element).closest?.("[data-floating-keep]")) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open, onClose, pos]);

  if (!open || !pos) return null;
  return (
    <div ref={ref} role="dialog" aria-label={title} className="fixed z-[100001] w-[min(22rem,90vw)] rounded-lg border border-foreground/40 bg-card shadow-xl" style={{ left: pos.x, top: pos.y }}>
      <div
        className="flex cursor-move select-none items-center justify-between border-b border-foreground/20 px-3 py-2 text-sm font-bold"
        style={{ color: "#f97316", touchAction: "none" }}
        onPointerDown={(e) => { drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y }; (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId); }}
        onPointerMove={(e) => { if (!drag.current) return; setPos({ x: Math.min(Math.max(0, e.clientX - drag.current.dx), window.innerWidth - 80), y: Math.min(Math.max(0, e.clientY - drag.current.dy), window.innerHeight - 40) }); }}
        onPointerUp={() => { drag.current = null; }}
      >
        <span>{title}</span>
        <button type="button" aria-label="Fermer" onPointerDown={(e) => e.stopPropagation()} onClick={onClose} className="rounded p-1 text-foreground hover:bg-muted"><X size={16} /></button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-3 [&>div>div:first-child]:hidden">{children}</div>
    </div>
  );
}
