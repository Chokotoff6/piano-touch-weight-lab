import { Fragment, useState } from "react";
import { AlertTriangle, Settings } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useLang } from "@/data/translations";
import { isDemoActive, toggleDemoMode } from "@/lib/demo-mode";
import {
  usePreferences, setCorridorG, setSmoothDefault, setSmoothAnalyse, setAutoAdvance, type SmoothPref,
  setTargetMode, setCustomTarget, DEFAULT_TARGETS, type TargetKind, type TargetRamp,
} from "@/lib/preferences";

function Choice<T extends string | number | boolean>({ value, current, label, onPick, tip }: { value: T; current: T; label: string; onPick: (v: T) => void; tip?: string }) {
  const active = value === current;
  const control = (
    <Button type="button" variant="outline" size="sm" onClick={() => onPick(value)} aria-pressed={active}
      className={`h-auto min-h-8 rounded-md px-2 py-1 text-xs ${active ? "border-foreground bg-foreground text-background hover:bg-foreground hover:text-background" : "border-border bg-background text-foreground hover:bg-muted"}`}>
      {label.includes(" (") ? <span>{label.split(" (")[0]}<span className="block text-[10px]">({label.split(" (")[1]}</span></span> : label}
    </Button>
  );
  return tip ? <Tooltip delayDuration={0}><TooltipTrigger asChild>{control}</TooltipTrigger><TooltipContent className="z-[100000] max-w-72 border-border bg-foreground text-background">{tip}</TooltipContent></Tooltip> : control;
}

function RampInput({ value, disabled, onCommit }: { value: number; disabled: boolean; onCommit: (v: number) => void }) {
  return (
    <input type="text" inputMode="decimal" disabled={disabled} defaultValue={String(value)} key={String(value) + disabled}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => { const v = Number(e.currentTarget.value.replace(",", ".")); if (Number.isFinite(v) && v > 0 && v < 150) onCommit(v); else e.currentTarget.value = String(value); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className="w-14 rounded border border-input px-1 text-center disabled:bg-muted disabled:text-muted-foreground" />
  );
}

function TargetRow({ kind, label, ramp, disabled, en }: { kind: TargetKind; label: string; ramp: TargetRamp; disabled: boolean; en: boolean }) {
  const set = (k: keyof TargetRamp) => (v: number) => setCustomTarget(kind, { ...ramp, [k]: v });
  const r1 = (v: number) => (Math.round(v * 10) / 10).toString().replace(".", en ? "." : ",");
  const f = (d: number, a: number) => r1((d - a) / 2);
  const b = (d: number, a: number) => r1((d + a) / 2);
  return (
    <div className="flex flex-col gap-1">
      <span className="font-medium">{label}</span>
      <div className="grid grid-cols-[2rem_minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-x-2 gap-y-1.5">
        {([
          [en ? "DW" : "PD", "wdStart", "wdEnd"],
          [en ? "UW" : "PR", "waStart", "waEnd"],
        ] as [string, keyof TargetRamp, keyof TargetRamp][]).map(([name, start, end]) => (
          <Fragment key={name}>
            <span className="font-bold">{name}</span>
            <span className="flex items-center gap-0.5"><RampInput value={ramp[start]} disabled={disabled} onCommit={set(start)} /><span>g</span></span>
            <span>→</span>
            <span className="flex items-center gap-0.5"><RampInput value={ramp[end]} disabled={disabled} onCommit={set(end)} /><span>g</span></span>
          </Fragment>
        ))}
        <span className="font-bold">F</span><span className="tabular-nums">{f(ramp.wdStart, ramp.waStart)} g</span><span>→</span><span className="tabular-nums">{f(ramp.wdEnd, ramp.waEnd)} g</span>
        <span className="font-bold">{en ? "BW" : "PE"}</span><span className="tabular-nums">{b(ramp.wdStart, ramp.waStart)} g</span><span>→</span><span className="tabular-nums">{b(ramp.wdEnd, ramp.waEnd)} g</span>
      </div>
    </div>
  );
}

export function PreferencesGear({ onDemoToggled }: { onDemoToggled?: () => void }) {
  const en = useLang() === "en";
  const prefs = usePreferences();
  const [open, setOpen] = useState(false);
  const def = en ? " (default)" : " (défaut)";
  const demo = open ? isDemoActive() : false;
  const row = "flex flex-col gap-3 rounded-lg border border-border bg-card p-3";
  return (
    <>
      <Button
        variant="outline"
        type="button"
        aria-label={en ? "Preferences" : "Préférences"}
        title={en ? "Preferences" : "Préférences"}
        onClick={() => setOpen(true)}
        className="rounded-md border-2 border-border bg-muted p-1.5 text-foreground hover:bg-accent"
      >
        <Settings className="h-5 w-5" />
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] max-w-xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{en ? "Preferences" : "Préférences"}</DialogTitle>
          </DialogHeader>
          <TooltipProvider delayDuration={0}><div className="flex flex-col gap-3 text-sm">
            <div className={row}>
              <span className="font-semibold">{en ? "Demo mode" : "Mode Démo"}</span>
              <div className="flex gap-2">
                <Choice value={false} current={demo} label={"OFF" + def} tip={en ? "Turns demo mode off: the sample piano, its 88 weighings and the sample Cloud data are erased." : "Désactive le mode démo : le piano fictif, ses 88 pesées et les données Cloud d'essai sont effacés."} onPick={(v) => { if (v !== demo) { toggleDemoMode(); setOpen(false); onDemoToggled?.(); } }} />
                <Choice value={true} current={demo} label="ON" tip={en ? "Loads a full sample: fictitious piano, 88 weighings and sample Cloud data, to explore the app freely." : "Charge un jeu d'essai complet : piano fictif, 88 pesées et données Cloud fictives, pour découvrir l'application."} onPick={(v) => { if (v !== demo) { toggleDemoMode(); setOpen(false); onDemoToggled?.(); } }} />
              </div>
            </div>
            <div className={row}>
              <span className="font-semibold">{en ? "Standard targets (1 → 88)" : "Cibles standards (1 → 88)"}</span>
              <div className="flex gap-2">
                <Choice value="default" current={prefs.targetMode} label={en ? "Default" : "Défaut"} onPick={setTargetMode} />
                <Choice value="custom" current={prefs.targetMode} label={en ? "Custom" : "Personnalisé"} onPick={setTargetMode} />
              </div>
              {(["upright", "grand"] as TargetKind[]).map((k) => (
                <TargetRow key={k} kind={k} label={k === "upright" ? (en ? "Upright" : "Droit") : (en ? "Grand" : "Queue")}
                  en={en} ramp={prefs.targetMode === "custom" ? prefs.customTargets[k] : DEFAULT_TARGETS[k]} disabled={prefs.targetMode !== "custom"} />
              ))}
              <span className="text-xs italic text-muted-foreground">
                {en ? "Upright or grand is picked automatically from the current piano type." : "Droit ou Queue est choisi automatiquement selon le type du piano en cours."}
              </span>
              <div className="flex items-start gap-2 border-t border-border pt-3 font-semibold"><AlertTriangle size={20} strokeWidth={2.5} className="shrink-0 text-foreground" /><span>{en ? "Tolerance (relative to Standard targets)" : "Tolérance (par rapport aux Cibles standards)"}</span></div>
              <div className="flex items-center gap-1">
                ±<input type="text" inputMode="decimal" defaultValue={String(prefs.corridorG)} key={prefs.corridorG}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => { const v = Number(e.currentTarget.value.replace(",", ".")); if (Number.isFinite(v) && v >= 0) setCorridorG(v); else e.currentTarget.value = String(prefs.corridorG); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  className="w-14 rounded border border-input px-1 text-center" /> g{prefs.corridorG === 3 ? def : ""}
              </div>
            </div>
            <div className={row}>
              <span className="font-semibold">{en ? "Curve smoothing" : "Lissage des courbes"}</span>
              {([["bilan", en ? "Dashboard" : "Bilan", prefs.smoothDefault, setSmoothDefault, "smooth"], ["analyse", en ? "Analysis" : "Analyse", prefs.smoothAnalyse, setSmoothAnalyse, "real"]] as [string, string, SmoothPref, (v: SmoothPref) => void, SmoothPref][]).map(([id, title, cur, pick, dflt]) => (
                <div key={id} className="flex flex-col gap-2">
                  <span className="text-base font-bold">{title}</span><div className="grid grid-cols-3 gap-1">
                  {([["real", en ? "Raw" : "Réel"], ["smooth", en ? "Smoothed 3 pts" : "Lissé 3 pts"], ["smoothPlus", en ? "Smoothed+ 5 pts" : "Lissé+ 5 pts"]] as [SmoothPref, string][]).map(([v, l]) => (
                    <Choice key={v} value={v} current={cur} label={l + (v === dflt ? def : "")} onPick={pick} />
                  ))}
                </div></div>
              ))}
            </div>
            <div className={row}>
              <span className="font-semibold">{en ? "Input: jump to next key" : "Saisie : saut touche suivante"}</span>
              <div className="flex gap-2">
                <Choice value={true} current={prefs.autoAdvance} label={"Auto" + def} onPick={setAutoAdvance} />
                <Choice value={false} current={prefs.autoAdvance} label={en ? "Manual" : "Manuel"} onPick={setAutoAdvance} />
              </div>
              <span className="text-xs italic text-muted-foreground">
                {en ? "The cursor only moves on once the value passes every check." : "Le curseur n'avance que si la valeur passe tous les contrôles."}
              </span>
            </div>
          </div></TooltipProvider>
        </DialogContent>
      </Dialog>
    </>
  );
}
