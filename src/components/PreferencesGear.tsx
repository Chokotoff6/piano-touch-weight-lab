import { useState } from "react";
import { Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLang } from "@/data/translations";
import { isDemoActive, toggleDemoMode } from "@/lib/demo-mode";
import {
  usePreferences, setCorridorG, setSmoothDefault, setPdfRedKeys, setAutoAdvance, type SmoothPref,
  setTargetMode, setCustomTarget, DEFAULT_TARGETS, type TargetKind, type TargetRamp,
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

function RampInput({ value, disabled, onCommit }: { value: number; disabled: boolean; onCommit: (v: number) => void }) {
  return (
    <input type="text" inputMode="decimal" disabled={disabled} defaultValue={String(value)} key={String(value) + disabled}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => { const v = Number(e.currentTarget.value.replace(",", ".")); if (Number.isFinite(v) && v > 0 && v < 150) onCommit(v); else e.currentTarget.value = String(value); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className="w-14 rounded border border-gray-300 px-1 text-center disabled:bg-muted disabled:text-muted-foreground" />
  );
}

function TargetRow({ kind, label, ramp, disabled }: { kind: TargetKind; label: string; ramp: TargetRamp; disabled: boolean }) {
  const set = (k: keyof TargetRamp) => (v: number) => setCustomTarget(kind, { ...ramp, [k]: v });
  return (
    <div className="grid grid-cols-[4.5rem_auto_auto] items-center gap-x-2 gap-y-1">
      <span className="font-medium">{label}</span>
      <span>PD <RampInput value={ramp.wdStart} disabled={disabled} onCommit={set("wdStart")} /> → <RampInput value={ramp.wdEnd} disabled={disabled} onCommit={set("wdEnd")} /> g</span>
      <span>PR <RampInput value={ramp.waStart} disabled={disabled} onCommit={set("waStart")} /> → <RampInput value={ramp.waEnd} disabled={disabled} onCommit={set("waEnd")} /> g</span>
    </div>
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
              <span className="font-semibold">{en ? "Out-of-tolerance keys in red (charts & PDF)" : "Touches hors tolérance en rouge (graphiques & PDF)"}</span>
              <div className="flex gap-2">
                <Choice value={true} current={prefs.pdfRedKeys} label={(en ? "On" : "Activé") + def} onPick={setPdfRedKeys} />
                <Choice value={false} current={prefs.pdfRedKeys} label={en ? "Off" : "Désactivé"} onPick={setPdfRedKeys} />
              </div>
            </div>
            <div className={`${row} ${prefs.pdfRedKeys ? "" : "pointer-events-none opacity-40"}`}>
              <span className="font-semibold">{en ? "Tolerance (relative to Standard Target)" : "Tolérance (par rapport à Cible Standard)"}</span>
              <div className="flex items-center gap-1">
                ±<input type="text" inputMode="decimal" disabled={!prefs.pdfRedKeys} defaultValue={String(prefs.corridorG)} key={prefs.corridorG}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => { const v = Number(e.currentTarget.value.replace(",", ".")); if (Number.isFinite(v) && v >= 0) setCorridorG(v); else e.currentTarget.value = String(prefs.corridorG); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  className="w-14 rounded border border-gray-300 px-1 text-center" /> g{prefs.corridorG === 3 ? def : ""}
              </div>
            </div>
            <div className={row}>
              <span className="font-semibold">{en ? "Standard Target (A0 → last C)" : "Cible standard (La0 → dernier Do)"}</span>
              <div className="flex gap-2">
                <Choice value="default" current={prefs.targetMode} label={en ? "Default" : "Défaut"} onPick={setTargetMode} />
                <Choice value="custom" current={prefs.targetMode} label={en ? "Custom" : "Personnalisé"} onPick={setTargetMode} />
              </div>
              {(["upright", "grand"] as TargetKind[]).map((k) => (
                <TargetRow key={k} kind={k} label={k === "upright" ? (en ? "Upright" : "Droit") : (en ? "Grand" : "Queue")}
                  ramp={prefs.targetMode === "custom" ? prefs.customTargets[k] : DEFAULT_TARGETS[k]} disabled={prefs.targetMode !== "custom"} />
              ))}
              <span className="text-xs italic text-muted-foreground">
                {en ? "Upright or grand is picked automatically from the current piano type." : "Droit ou Queue est choisi automatiquement selon le type du piano en cours."}
              </span>
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
