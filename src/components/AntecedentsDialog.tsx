import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useInterventions, interventionLabel, INITIAL_DIAGNOSTIC_ID } from "@/lib/interventions";

export const ANTECEDENTS_DATES_KEY = "antecedents_dates";

/** "id=YYYY-MM|id=YYYY|..." <-> map */
export const parseAntecedentDates = (raw: string | undefined): Record<string, string> => {
  const out: Record<string, string> = {};
  String(raw ?? "").split("|").forEach((p) => {
    const [k, v] = p.split("=");
    if (k && v) out[k.trim()] = v.trim();
  });
  return out;
};
const serializeDates = (m: Record<string, string>) =>
  Object.entries(m).filter(([, v]) => v).map(([k, v]) => `${k}=${v}`).join("|");

const MONTHS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const MONTHS_EN = ["January","February","March","April","May","June","July","August","September","October","November","December"];

export const ANTECEDENTS_CUSTOM_KEY = "antecedents_custom";
export type CustomAntecedent = { label: string; date: string };
export const parseCustomAntecedents = (raw: string | undefined): CustomAntecedent[] => {
  try {
    const v = JSON.parse(String(raw ?? "") || "[]");
    return Array.isArray(v) ? v.map((x) => ({ label: String(x?.label ?? ""), date: String(x?.date ?? "") })) : [];
  } catch { return []; }
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  en: boolean;
  ids: string[];
  datesRaw: string | undefined;
  customRaw?: string | undefined;
  minYear?: number;
  onSave: (ids: string[], datesRaw: string, customRaw: string) => void;
};

export function AntecedentsDialog({ open, onOpenChange, en, ids, datesRaw, customRaw, minYear, onSave }: Props) {
  const items = useInterventions().filter((i) => i.id !== INITIAL_DIAGNOSTIC_ID);
  const [sel, setSel] = useState<string[]>(ids);
  const [dates, setDates] = useState<Record<string, string>>(parseAntecedentDates(datesRaw));
  const [customs, setCustoms] = useState<CustomAntecedent[]>(parseCustomAntecedents(customRaw));
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) { setLastOpen(true); setSel(ids); setDates(parseAntecedentDates(datesRaw)); setCustoms(parseCustomAntecedents(customRaw)); }
  if (!open && lastOpen) setLastOpen(false);

  const nowY = new Date().getFullYear();
  const start = Math.max(1900, Math.min(minYear && minYear > 1800 ? minYear : 1950, nowY));
  const years: number[] = [];
  for (let y = nowY; y >= start; y--) years.push(y);
  const months = en ? MONTHS_EN : MONTHS_FR;

  const toggle = (id: string) => {
    if (sel.includes(id)) {
      setSel(sel.filter((x) => x !== id));
      const d = { ...dates }; delete d[id]; setDates(d);
    } else setSel([...sel, id]);
  };
  const merge = (cur: string, part: "y" | "m", val: string) => {
    const [y = "", m = ""] = (cur ?? "").split("-");
    const ny = part === "y" ? val : y;
    const nm = part === "m" ? val : m;
    return ny ? (nm ? `${ny}-${nm}` : ny) : "";
  };
  const setPart = (id: string, part: "y" | "m", val: string) => setDates({ ...dates, [id]: merge(dates[id] ?? "", part, val) });
  const setCustom = (i: number, patch: Partial<CustomAntecedent>) =>
    setCustoms(customs.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const selectCls = "rounded border border-input bg-background px-1 py-0.5 text-sm";
  const dateSelects = (value: string, onPart: (part: "y" | "m", v: string) => void) => {
    const [y = "", m = ""] = value.split("-");
    return (
      <>
        <select value={m} onChange={(e) => onPart("m", e.target.value)} className={selectCls} aria-label={en ? "Month" : "Mois"}>
          <option value="">{en ? "Month" : "Mois"}</option>
          {months.map((label, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{label}</option>)}
        </select>
        <select value={y} onChange={(e) => onPart("y", e.target.value)} className={selectCls} aria-label={en ? "Year" : "Année"}>
          <option value="">{en ? "Year" : "Année"}</option>
          {years.map((yy) => <option key={yy} value={String(yy)}>{yy}</option>)}
        </select>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{en ? "Piano history prior to KeyWeight" : "Historique du piano avant KeyWeight"}</DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] space-y-2 overflow-y-auto pr-1">
          {items.map((item) => {
            const active = sel.includes(item.id);
            return (
              <div key={item.id} className="flex flex-wrap items-center gap-2">
                <button type="button" className={`list-chip ${active ? "list-chip-active" : ""}`} onClick={() => toggle(item.id)}>
                  {interventionLabel(item, en)}
                </button>
                {active && dateSelects(dates[item.id] ?? "", (p, v) => setPart(item.id, p, v))}
              </div>
            );
          })}
          {customs.map((c, i) => (
            <div key={`c${i}`} className="flex flex-wrap items-center gap-2">
              <input value={c.label} onChange={(e) => setCustom(i, { label: e.target.value })} maxLength={120} autoFocus={!c.label}
                placeholder={en ? "Describe the intervention..." : "Précisez l'intervention..."} className="list-input min-w-0 flex-1" />
              {dateSelects(c.date, (p, v) => setCustom(i, { date: merge(c.date, p, v) }))}
              <button type="button" className="px-1 text-muted-foreground" aria-label={en ? "Remove" : "Retirer"}
                onClick={() => setCustoms(customs.filter((_, k) => k !== i))}>✕</button>
            </div>
          ))}
          <button type="button" className="list-chip" onClick={() => setCustoms([...customs, { label: "", date: "" }])}>
            {en ? "+ Add" : "+ Ajouter"}
          </button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{en ? "Cancel" : "Annuler"}</Button>
          <Button onClick={() => {
            const kept: Record<string, string> = {};
            sel.forEach((id) => { if (dates[id]) kept[id] = dates[id]; });
            const cleanCustoms = customs.map((c) => ({ label: c.label.trim(), date: c.date })).filter((c) => c.label);
            onSave(sel, serializeDates(kept), cleanCustoms.length ? JSON.stringify(cleanCustoms) : "");
            onOpenChange(false);
          }}>{en ? "Save" : "Valider"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
