import { useState } from "react";
import { Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/data/translations";
import { isDemoActive, toggleDemoMode } from "@/lib/demo-mode";
import {
  usePreferences, setCorridorG, setSmoothDefault, setPdfRedKeys, setAutoAdvance, type SmoothPref,
} from "@/lib/preferences";

function Choice<T extends string | number | boolean>({ value, current, label, onPick }: { value: T; current: T; label: string; onPick: (v: T) => void }) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onPick(value)}
      className={`rounded-md border px-3 py-1 text-sm ${active ? "border-foreground bg-foreground text-background" : "border-border bg-background text-foreground hover:bg-muted"}`}
    >
      {label}
    </button>
  );
}

export function PreferencesGear({ onDemoToggled }: { onDemoToggled?: () => void }) {
  const en = useLang() === "en";
  const prefs = usePreferences();
  const [open, setOpen] = useState(false);
  const def = en ? " (default)" : " (défaut)";
  const demo = open ? isDemoActive() : false;
  const row = "flex flex-col gap-2 border-b border-border pb-3";
  return (
    <>
      <button
        type="button"
        aria-label={en ? "Preferences" : "Préférences"}
        title={en ? "Preferences" : "Préférences"}
        onClick={() => setOpen(true)}
        className="rounded-md border-2 border-border bg-muted p-1.5 text-foreground hover:bg-accent"
      >
        <Settings className="h-5 w-5" />
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{en ? "Preferences" : "Préférences"}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col gap-3 text-sm">
            <div className={row}>
              <span className="font-semibold">{en ? "Demo mode" : "Mode Démo"}</span>
              <div className="flex gap-2">
                <Choice value={false} current={demo} label={"OFF" + def} onPick={(v) => { if (v !== demo) { toggleDemoMode(); setOpen(false); onDemoToggled?.(); } }} />
                <Choice value={true} current={demo} label="ON" onPick={(v) => { if (v !== demo) { toggleDemoMode(); setOpen(false); onDemoToggled?.(); } }} />
              </div>
            </div>
            <div className={row}>
              <span className="font-semibold">{en ? "Tolerance corridor" : "Corridor de tolérance"}</span>
              <div className="flex gap-2">
                {([2, 3, 4] as const).map((g) => (
                  <Choice key={g} value={g} current={prefs.corridorG} label={`±${g} g${g === 3 ? def : ""}`} onPick={setCorridorG} />
                ))}
              </div>
            </div>
            <div className={row}>
              <span className="font-semibold">{en ? "Out-of-tolerance keys in red in PDF" : "Touches hors tolérance en rouge dans le PDF"}</span>
              <div className="flex gap-2">
                <Choice value={true} current={prefs.pdfRedKeys} label={(en ? "On" : "Activé") + def} onPick={setPdfRedKeys} />
                <Choice value={false} current={prefs.pdfRedKeys} label={en ? "Off" : "Désactivé"} onPick={setPdfRedKeys} />
              </div>
            </div>
            <div className={row}>
              <span className="font-semibold">{en ? "Curve smoothing" : "Lissage des courbes"}</span>
              <div className="flex flex-wrap gap-2">
                {([["real", en ? "Raw" : "Réel"], ["smooth", (en ? "Smoothed 3 pts" : "Lissé 3 points") + def], ["smoothPlus", en ? "Smoothed+ 5 pts" : "Lissé+ 5 points"]] as [SmoothPref, string][]).map(([v, l]) => (
                  <Choice key={v} value={v} current={prefs.smoothDefault} label={l} onPick={setSmoothDefault} />
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <span className="font-semibold">{en ? "Auto-advance (2 digits)" : "Avance automatique (2 chiffres)"}</span>
              <div className="flex gap-2">
                <Choice value={true} current={prefs.autoAdvance} label={(en ? "On" : "Activée") + def} onPick={setAutoAdvance} />
                <Choice value={false} current={prefs.autoAdvance} label={en ? "Off" : "Désactivée"} onPick={setAutoAdvance} />
              </div>
              <span className="text-xs italic text-muted-foreground">
                {en ? "The cursor only moves on once the value passes every check." : "Le curseur n'avance que si la valeur passe tous les contrôles."}
              </span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
