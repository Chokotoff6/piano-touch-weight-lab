import { useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";

/** Tiroir glissant depuis le bord droit, sans voile : fermeture par ✕, Échap ou clic extérieur. */
export function FloatingPanel({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(open);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    if (open) {
      setMounted(true);
      const id = requestAnimationFrame(() => requestAnimationFrame(() => setShown(true)));
      return () => cancelAnimationFrame(id);
    }
    setShown(false);
    const t = window.setTimeout(() => setMounted(false), 260);
    return () => window.clearTimeout(t);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const down = (e: PointerEvent) => {
      const t = e.target as Node;
      if (ref.current && !ref.current.contains(t) && !(t as Element).closest?.("[data-floating-keep]")) onClose();
    };
    const key = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    document.addEventListener("pointerdown", down);
    document.addEventListener("keydown", key);
    return () => { document.removeEventListener("pointerdown", down); document.removeEventListener("keydown", key); };
  }, [open, onClose]);

  if (!mounted) return null;
  // Rendu dans <body> : jamais piégé sous un bloc sticky (ex. triangle Δ des graphiques).
  return createPortal(
    <div
      ref={ref}
      role="dialog"
      aria-label={title}
      className="fixed right-0 top-[140px] z-[100001] w-[min(22rem,90vw)] rounded-l-lg border border-r-0 border-foreground/40 bg-white shadow-2xl transition-transform duration-[450ms] ease-out"
      style={{ transform: shown ? "translateX(0)" : "translateX(105%)" }}
    >
      <div className="flex select-none items-center justify-between border-b border-foreground/20 px-3 py-2 text-sm font-bold" style={{ color: "#f97316" }}>
        <span>{title}</span>
        <button type="button" aria-label="Fermer" onClick={onClose} className="rounded p-1 text-foreground hover:bg-muted"><X size={16} /></button>
      </div>
      <div className="max-h-[70vh] overflow-y-auto p-3 [&>div>div:first-child]:hidden">{children}</div>
    </div>,
    document.body,
  );
}
