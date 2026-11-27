import { useEffect, useState, type CSSProperties, type PointerEvent as ReactPointerEvent } from "react";

export type CompactKeypadProps = {
  en: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onDigit: (digit: string) => void;
  onErase: () => void;
  onPrev: () => void;
  onNext: () => void;
  onUndo: () => void;
  onRedo: () => void;
};

/** Bandeau bas 2 lignes (Vue Complète tablette). Aucun focus pris : la case active le garde. */
export function CompactKeypad({ en, canUndo, canRedo, onDigit, onErase, onPrev, onNext, onUndo, onRedo }: CompactKeypadProps) {
  const press = (action: () => void, disabled = false) => (e: ReactPointerEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (!disabled) action();
  };
  // Zoom Safari (pincement) : contre-échelle via visualViewport, le pavé garde sa taille réelle en bas de l'écran visible.
  const [vv, setVv] = useState<CSSProperties | undefined>(undefined);
  useEffect(() => {
    const v = window.visualViewport;
    if (!v) return;
    const update = () => {
      if (Math.abs(v.scale - 1) < 0.01) { setVv(undefined); return; }
      setVv({ left: v.offsetLeft + v.width * 0.125, top: v.offsetTop + v.height, right: "auto", bottom: "auto", width: v.width * v.scale * 0.75, transform: `scale(${1 / v.scale}) translateY(-100%)`, transformOrigin: "top left" });
    };
    update();
    v.addEventListener("resize", update);
    v.addEventListener("scroll", update);
    return () => { v.removeEventListener("resize", update); v.removeEventListener("scroll", update); };
  }, []);
  const key = "flex min-h-[48px] flex-1 select-none items-center justify-center rounded-md border border-input bg-background text-lg font-semibold text-foreground active:bg-accent touch-manipulation";
  const digits = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "0"];
  return (
    <div
      className="fixed bottom-0 left-[12.5%] z-[9000] w-[75%] rounded-t-lg border-x border-t border-input bg-muted/95 px-2 pb-2 pt-2 shadow-lg"
      data-compact-keypad=""
      style={vv}
      onPointerDown={(e) => e.preventDefault()}
      role="group"
      aria-label={en ? "Weighing keypad" : "Pavé de pesée"}
    >
      <div className="flex flex-col gap-1.5">
        <div className="flex gap-1.5">
          {digits.map((d) => (
            <button key={d} type="button" tabIndex={-1} className={key} onPointerDown={press(() => onDigit(d))}>{d}</button>
          ))}
        </div>
        <div className="flex gap-1.5">
          <button type="button" tabIndex={-1} className={`${key} text-sm ${canUndo ? "" : "opacity-40"}`} onPointerDown={press(onUndo, !canUndo)}>{en ? "Undo" : "Annuler"}</button>
          <button type="button" tabIndex={-1} className={`${key} text-sm`} onPointerDown={press(onErase)}>⌫ {en ? "Erase" : "Effacer"}</button>
          <button type="button" tabIndex={-1} className={`${key} text-sm`} onPointerDown={press(onPrev)}>← {en ? "Previous" : "Précédent"}</button>
          <button type="button" tabIndex={-1} className={`${key} text-sm`} onPointerDown={press(onNext)}>{en ? "Next" : "Suivant"} →</button>
          <button type="button" tabIndex={-1} className={`${key} text-sm ${canRedo ? "" : "opacity-40"}`} onPointerDown={press(onRedo, !canRedo)}>{en ? "Redo" : "Rétablir"}</button>
        </div>
      </div>
    </div>
  );
}
