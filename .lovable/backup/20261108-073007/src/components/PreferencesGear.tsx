import { Fragment, useState } from "react";
import { AlertTriangle, ChevronRight, Settings } from "lucide-react";
import { InterventionListDialog, ModelListDialog } from "@/components/ListManagers";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { useLang } from "@/data/translations";
import { isDemoActive, toggleDemoMode } from "@/lib/demo-mode";
import {
  usePreferences, setCorridorG, setSmoothDefault, setSmoothAnalyse, setAutoAdvance, type SmoothPref,
  setTargetMode, setCustomTarget, DEFAULT_TARGETS, type TargetKind, type TargetRamp,
} from "@/lib/preferences";

function Choice<T extends string | number | boolean>({ value, current, label, onPick, tip }: { value: T; current: T; label: string; onPick: (v: T) => void; tip?: string | undefined }) {
  const active = value === current;
  const control = (
    <Button type="button" variant="outline" size="sm" onClick={() => onPick(value)} aria-pressed={active}
      className={`h-auto min-h-8 rounded-md px-2 py-1 text-xs ${active ? "border-2 border-foreground bg-muted font-bold text-foreground shadow-sm hover:bg-muted" : "border-foreground/30 bg-background text-foreground hover:bg-muted"}`}>
      {label.includes(" (") ? <span>{label.split(" (")[0]}<span className="block text-[10px]">({label.split(" (")[1]}</span></span> : label}
    </Button>
  );
  return tip ? <Tooltip delayDuration={0}><TooltipTrigger asChild>{control}</TooltipTrigger><TooltipContent className="z-[100000] max-w-72 border border-foreground/30 bg-popover text-popover-foreground shadow-lg">{tip}</TooltipContent></Tooltip> : control;
}

function RampInput({ value, disabled, onCommit }: { value: number; disabled: boolean; onCommit: (v: number) => void }) {
  return (
    <input type="text" inputMode="decimal" disabled={disabled} defaultValue={String(value)} key={String(value) + disabled}
      onFocus={(e) => e.currentTarget.select()}
      onBlur={(e) => { const v = Number(e.currentTarget.value.replace(",", ".")); if (Number.isFinite(v) && v > 0 && v < 150) onCommit(v); else e.currentTarget.value = String(value); }}
      onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
      className="w-9 rounded border border-input px-0.5 text-center disabled:bg-muted disabled:text-muted-foreground" />
  );
}

function Calc({ v }: { v: string }) {
  return <span className="inline-block w-9 rounded border border-input bg-muted px-0.5 text-center font-normal text-muted-foreground tabular-nums">{v}</span>;
}

function TargetRow({ kind, label, ramp, disabled, en }: { kind: TargetKind; label: string; ramp: TargetRamp; disabled: boolean; en: boolean }) {
  const set = (k: keyof TargetRamp) => (v: number) => setCustomTarget(kind, { ...ramp, [k]: v });
  const r1 = (v: number) => (Math.round(v * 10) / 10).toString().replace(".", en ? "." : ",");
  const f = (d: number, a: number) => r1((d - a) / 2);
  const b = (d: number, a: number) => r1((d + a) / 2);
  const g = <span className="ml-0.5">g</span>;
  return (
    <div className="flex flex-col gap-1">
      <span className="font-bold">{label}</span>
      <div className="grid grid-cols-[1.75rem_auto_auto_auto] items-center justify-start gap-x-1 gap-y-1.5">
        <span /><span className="text-[10px] text-muted-foreground">{en ? "Key 1" : "Touche 1"}</span><span /><span className="text-[10px] text-muted-foreground">{en ? "Key 88" : "Touche 88"}</span>
        {([
          [en ? "DW" : "PD", "wdStart", "wdEnd"],
          [en ? "UW" : "PR", "waStart", "waEnd"],
        ] as [string, keyof TargetRamp, keyof TargetRamp][]).map(([name, start, end]) => (
          <Fragment key={name}>
            <span className="font-bold">{name}</span>
            <span className="flex items-center"><RampInput value={ramp[start]} disabled={disabled} onCommit={set(start)} />{g}</span>
            <span>→</span>
            <span className="flex items-center"><RampInput value={ramp[end]} disabled={disabled} onCommit={set(end)} />{g}</span>
          </Fragment>
        ))}
        <span className="col-span-4 border-t border-foreground/30" />
        <span className="font-bold">F</span><span className="flex items-center"><Calc v={f(ramp.wdStart, ramp.waStart)} />{g}</span><span>→</span><span className="flex items-center"><Calc v={f(ramp.wdEnd, ramp.waEnd)} />{g}</span>
        <span className="font-bold">{en ? "BW" : "PE"}</span><span className="flex items-center"><Calc v={b(ramp.wdStart, ramp.waStart)} />{g}</span><span>→</span><span className="flex items-center"><Calc v={b(ramp.wdEnd, ramp.waEnd)} />{g}</span>
      </div>
    </div>
  );
}

export function PreferencesGear({ onDemoToggled }: { onDemoToggled?: () => void }) {
  const en = useLang() === "en";
  const prefs = usePreferences();
  const [open, setOpen] = useState(false);
  const [sub, setSub] = useState<null | "models" | "interventions">(null);
  const def = en ? " (default)" : " (défaut)";
  const demo = open ? isDemoActive() : false;
  const row = "flex flex-col gap-3 rounded-lg border border-foreground/40 bg-card p-3";
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
            <div className="grid grid-cols-2 gap-3">
            <div className={row}>
              <span className="font-semibold">{en ? "Demo mode" : "Mode Démo"}</span>
              <div className="flex gap-2">
                <Choice value={false} current={demo} label={"OFF" + def} tip={demo ? (en ? "Turns demo mode off: the sample piano, its 88 weighings and the sample Cloud data are erased." : "Désactive le mode démo : le piano fictif, ses 88 pesées et les données Cloud d'essai sont effacés.") : undefined} onPick={(v) => { if (v !== demo) { toggleDemoMode(); setOpen(false); onDemoToggled?.(); } }} />
                <Choice value={true} current={demo} label="ON" tip={en ? "Loads a full sample: fictitious piano, 88 weighings and sample Cloud data, to explore the app freely." : "Charge un profil de piano et des données Cloud fictives pour découvrir l'application. Le profil actuel sera effacé."} onPick={(v) => { if (v !== demo) { toggleDemoMode(); setOpen(false); onDemoToggled?.(); } }} />
              </div>
            </div>
            <div className={row}>
              <span className="font-semibold">{en ? "Input: jump to next key" : "Saisie : saut touche suivante"}</span>
              <div className="flex gap-2">
                <Choice value={true} current={prefs.autoAdvance} label={"Auto" + def} tip={en ? "Weighing input: the cursor jumps to the next key without \"Enter\" or \"Tab\"." : "Saisie pesée : curseur saute à la touche suivante sans « Enter » ou « Tab »."} onPick={setAutoAdvance} />
                <Choice value={false} current={prefs.autoAdvance} label={en ? "Manual" : "Manuel"} onPick={setAutoAdvance} />
              </div>
            </div>
            </div>
            <div className={row}>
              <span className="font-semibold">{en ? "Standard targets - curves 1 → 88" : "Cibles standards - courbes 1 → 88"}</span>
              <div className="flex gap-2">
                <Choice value="default" current={prefs.targetMode} label={en ? "Default" : "Défaut"} onPick={setTargetMode} />
                <Choice value="custom" current={prefs.targetMode} label={en ? "Custom" : "Personnalisé"} onPick={setTargetMode} />
              </div>
              <div className="grid grid-cols-2 gap-3">{(["upright", "grand"] as TargetKind[]).map((k) => (
                <TargetRow key={k} kind={k} label={k === "upright" ? (en ? "Upright" : "Droit") : (en ? "Grand" : "Queue")}
                  en={en} ramp={prefs.targetMode === "custom" ? prefs.customTargets[k] : DEFAULT_TARGETS[k]} disabled={prefs.targetMode !== "custom"} />
              ))}</div>
              <span className="text-xs italic text-muted-foreground">
                {en ? "Upright or grand is picked automatically from the current piano type." : "Droit ou Queue est choisi automatiquement selon le type du piano en cours."}
              </span>
              <div className="flex items-start gap-2 border-t border-foreground/40 pt-3 font-semibold"><AlertTriangle size={20} strokeWidth={2.5} className="shrink-0 text-foreground" /><span>{en ? "Tolerance (relative to Standard targets)" : "Tolérance (par rapport aux Cibles standards)"}</span></div>
              <div className="flex items-center gap-1">
                ±<input type="text" inputMode="decimal" defaultValue={String(prefs.corridorG)} key={prefs.corridorG}
                  onFocus={(e) => e.currentTarget.select()}
                  onBlur={(e) => { const v = Number(e.currentTarget.value.replace(",", ".")); if (Number.isFinite(v) && v >= 0) setCorridorG(v); else e.currentTarget.value = String(prefs.corridorG); }}
                  onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }}
                  className="w-9 rounded border border-input px-0.5 text-center" /> g{prefs.corridorG === 3 ? def : ""}
              </div>
            </div>
            <div className={row}>
              <span className="font-semibold">{en ? "Curve smoothing" : "Lissage des courbes"}</span>
              {([["bilan", en ? "Dashboard" : "Bilan", prefs.smoothDefault, setSmoothDefault, "smooth"], ["analyse", en ? "Analysis" : "Analyse", prefs.smoothAnalyse, setSmoothAnalyse, "real"]] as [string, string, SmoothPref, (v: SmoothPref) => void, SmoothPref][]).map(([id, title, cur, pick, dflt]) => (
                <div key={id} className="flex items-center gap-3">
                  <span className="w-20 text-sm font-bold">{title}</span><div className="flex flex-nowrap gap-1">
                  {([["real", en ? "Raw" : "Réel"], ["smooth", en ? "Smoothed 3 pts" : "Lissé 3 pts"], ["smoothPlus", en ? "Smoothed+ 5 pts" : "Lissé+ 5 pts"]] as [SmoothPref, string][]).map(([v, l]) => (
                    <Choice key={v} value={v} current={cur} label={l + (v === dflt ? def : "")} onPick={pick} />
                  ))}
                </div></div>
              ))}
            </div>
            {([["models", en ? "Brands & models list" : "Liste marques & modèles"], ["interventions", en ? "Intervention types list" : "Liste types d'intervention"]] as const).map(([id, label]) => (
              <button key={id} type="button" onClick={() => setSub(id)} className="flex items-center justify-between rounded-lg border border-foreground/40 bg-card p-3 text-left font-semibold hover:bg-muted">
                {label}<ChevronRight className="h-4 w-4" />
              </button>
            ))}
            <button type="button"
              disabled={typeof window === "undefined" || window.location.pathname !== "/saisie"}
              title={en ? "Available on the Weighing page" : "Disponible sur la page Pesée"}
              onClick={() => { setOpen(false); window.dispatchEvent(new CustomEvent("piano-open-antecedents")); }}
              className="flex items-center justify-between rounded-lg border border-foreground/40 bg-card p-3 text-left font-semibold hover:bg-muted disabled:cursor-default disabled:opacity-40">
              {en ? "Prior service" : "Antécédents"}<ChevronRight className="h-4 w-4" />
            </button>
          </div></TooltipProvider>
        </DialogContent>
      </Dialog>
      <ModelListDialog open={sub === "models"} onOpenChange={(o) => { if (!o) setSub(null); }} en={en} />
      <InterventionListDialog open={sub === "interventions"} onOpenChange={(o) => { if (!o) setSub(null); }} en={en} />
    </>
  );
}
