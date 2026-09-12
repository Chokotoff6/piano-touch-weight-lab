import { useState, type ReactNode } from "react";

/**
 * Bouton « i » standardisé : au clic, ouvre une fenêtre flottante blanche
 * avec un voile de fond léger (rgba(0,0,0,0.15)). Aucun logo « ? ».
 */
export function InfoDot({
  children,
  label,
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label={label ?? "Info"}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
        }}
        className={`inline-flex h-4 w-4 shrink-0 cursor-pointer items-center justify-center rounded-full border border-foreground/60 align-middle text-[10px] font-bold normal-case leading-none text-foreground/70 ${className ?? ""}`}
      >
        i
      </button>
      {open && (
        <div
          className="fixed inset-0 z-[99999] flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.15)" }}
          onClick={(event) => {
            event.stopPropagation();
            setOpen(false);
          }}
          role="presentation"
        >
          <div
            className="max-h-[80vh] w-full max-w-md overflow-y-auto rounded-lg border border-gray-300 p-6 text-left text-sm font-normal normal-case leading-relaxed !text-gray-900 shadow-xl"
            style={{ backgroundColor: "#FFFFFF" }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            {children}
          </div>
        </div>
      )}
    </>
  );
}

export default InfoDot;
