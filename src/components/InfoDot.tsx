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
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          setOpen(true);
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
            className="relative max-h-[80vh] w-auto max-w-md overflow-y-auto rounded-lg border border-gray-300 py-5 pl-5 pr-9 text-left text-sm font-normal normal-case leading-relaxed !text-gray-900 shadow-xl"
            style={{ backgroundColor: "#FFFFFF" }}
            onClick={(event) => event.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <button
              type="button"
              aria-label="Fermer"
              onClick={(event) => {
                event.preventDefault();
                event.stopPropagation();
                setOpen(false);
              }}
              className="absolute right-2 top-2 inline-flex h-6 w-6 items-center justify-center rounded-full text-base leading-none !text-gray-500 hover:!text-gray-900"
            >
              ×
            </button>
            {children}
          </div>
        </div>
      )}

    </>
  );
}

export default InfoDot;
