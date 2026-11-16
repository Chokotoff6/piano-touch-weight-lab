import { useRef, useState, type ReactNode } from "react";
import { Tooltip } from "@/components/ui/tooltip";

/** Infobulle : survol souris inchangé ; au doigt, appui long (400 ms) affiche l'aide sans déclencher l'action. */
export function TouchTooltip({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);
  const longPress = useRef(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clear = () => { if (timer.current) clearTimeout(timer.current); timer.current = null; };
  return (
    <Tooltip open={open} onOpenChange={(o) => { if (!longPress.current) setOpen(o); }}>
      <span
        className="contents"
        onContextMenu={(e) => { if (longPress.current) e.preventDefault(); }}
        onPointerDownCapture={(e) => {
          if (e.pointerType !== "touch") return;
          longPress.current = false; clear();
          timer.current = setTimeout(() => { longPress.current = true; setOpen(true); }, 400);
        }}
        onPointerUpCapture={(e) => {
          if (e.pointerType !== "touch") return;
          clear();
          if (longPress.current) setTimeout(() => { longPress.current = false; setOpen(false); }, 1500);
        }}
        onPointerCancelCapture={() => { clear(); longPress.current = false; setOpen(false); }}
        onClickCapture={(e) => { if (longPress.current) { e.preventDefault(); e.stopPropagation(); } }}
      >
        {children}
      </span>
    </Tooltip>
  );
}
