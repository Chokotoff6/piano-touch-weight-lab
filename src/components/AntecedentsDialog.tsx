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

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  en: boolean;
  ids: string[];
  datesRaw: string | undefined;
  minYear?: number;
  onSave: (ids: string[], datesRaw: string) => void;
};

export function AntecedentsDialog({ open, onOpenChange, en, ids, datesRaw, minYear, onSave }: Props) {
  const items = useInterventions().filter((i) => i.id !== INITIAL_DIAGNOSTIC_ID);
  const [sel, setSel] = useState<string[]>(ids);
  const [dates, setDates] = useState<Record<string, string>>(parseAntecedentDates(datesRaw));
  const [lastOpen, setLastOpen] = useState(false);
  if (open && !lastOpen) { setLastOpen(true); setSel(ids); setDates(parseAntecedentDates(datesRaw)); }
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
  const setPart = (id: string, part: "y" | "m", val: string) => {
    const [y = "", m = ""] = (dates[id] ?? "").split("-");
    const ny = part === "y" ? val : y;
    const nm = part === "m" ? val : m;
    setDates({ ...dates, [id]: ny ? (nm ? `${ny}-${nm}` : ny) : "" });
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
            const [y = "", m = ""] = (dates[item.id] ?? "").split("-");
            return (
              <div key={item.id} className="flex flex-wrap items-center gap-2">
                <button type="button" className={`list-chip ${active ? "list-chip-active" : ""}`} onClick={() => toggle(item.id)}>
                  {interventionLabel(item, en)}
                </button>
                {active && (
                  <>
                    <select value={m} onChange={(e) => setPart(item.id, "m", e.target.value)} className="rounded border border-input bg-background px-1 py-0.5 text-sm" aria-label={en ? "Month" : "Mois"}>
                      <option value="">{en ? "Month" : "Mois"}</option>
                      {months.map((label, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{label}</option>)}
                    </select>
                    <select value={y} onChange={(e) => setPart(item.id, "y", e.target.value)} className="rounded border border-input bg-background px-1 py-0.5 text-sm" aria-label={en ? "Year" : "Année"}>
                      <option value="">{en ? "Year" : "Année"}</option>
                      {years.map((yy) => <option key={yy} value={String(yy)}>{yy}</option>)}
                    </select>
                  </>
                )}
              </div>
            );
          })}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{en ? "Cancel" : "Annuler"}</Button>
          <Button onClick={() => {
            const kept: Record<string, string> = {};
            sel.forEach((id) => { if (dates[id]) kept[id] = dates[id]; });
            onSave(sel, serializeDates(kept));
            onOpenChange(false);
          }}>{en ? "Save" : "Valider"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
