import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useInterventions, interventionLabel, INITIAL_DIAGNOSTIC_ID, ANTECEDENT_GROUPS, ANTECEDENT_ITEMS, ANTECEDENT_KEYWORDS } from "@/lib/interventions";

export const ANTECEDENTS_DATES_KEY = "antecedents_dates";
export const ANTECEDENTS_DETAILS_KEY = "antecedents_details";
/** JSON {id: "précision"} */
export const parseAntecedentDetails = (raw: string | undefined): Record<string, string> => {
  try {
    const v = JSON.parse(String(raw ?? "") || "{}");
    return v && typeof v === "object" && !Array.isArray(v) ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, String(x ?? "")])) : {};
  } catch { return {}; }
};

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
export type CustomAntecedent = { label: string; date: string; detail?: string };
export const parseCustomAntecedents = (raw: string | undefined): CustomAntecedent[] => {
  try {
    const v = JSON.parse(String(raw ?? "") || "[]");
    return Array.isArray(v) ? v.map((x) => ({ label: String(x?.label ?? ""), date: String(x?.date ?? ""), ...(x?.detail ? { detail: String(x.detail) } : {}) })) : [];
  } catch { return []; }
};

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  en: boolean;
  ids: string[];
  datesRaw: string | undefined;
  customRaw?: string | undefined;
  detailsRaw?: string | undefined;
  minYear?: number;
  onSave: (ids: string[], datesRaw: string, customRaw: string, detailsRaw: string) => void;
};

export function AntecedentsDialog({ open, onOpenChange, en, ids, datesRaw, customRaw, detailsRaw, minYear, onSave }: Props) {
  const workshop = useInterventions().filter((i) => i.id !== INITIAL_DIAGNOSTIC_ID);
  const known = new Set(ANTECEDENT_ITEMS.map((i) => i.id));
  // Étiquettes déjà cochées hors catalogue (ex. ajouts d'atelier anciens) : conservées et affichées.
  const extraItems = workshop.filter((i) => !known.has(i.id) && i.id !== "final" && ids.includes(i.id));
  const items = [...ANTECEDENT_ITEMS, ...extraItems];
  const [sel, setSel] = useState<string[]>(ids);
  const [dates, setDates] = useState<Record<string, string>>(parseAntecedentDates(datesRaw));
  const [details, setDetails] = useState<Record<string, string>>(parseAntecedentDetails(detailsRaw));
  const [customs, setCustoms] = useState<CustomAntecedent[]>(parseCustomAntecedents(customRaw));
  const [removedCustoms, setRemovedCustoms] = useState<CustomAntecedent[]>([]);
  const [draft, setDraft] = useState<CustomAntecedent | null>(null);
  const [query, setQuery] = useState("");
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [lastOpen, setLastOpen] = useState(false);
  const [focusId, setFocusId] = useState<string | null>(null);
  const dKey = (d: string | undefined) => (/^\d{4}/.test(d ?? "") ? (d as string) : "9999");
  if (open && !lastOpen) {
    const d0 = parseAntecedentDates(datesRaw);
    setLastOpen(true); setSel([...ids].sort((a, b) => dKey(d0[a]).localeCompare(dKey(d0[b])))); setDates(d0); setDetails(parseAntecedentDetails(detailsRaw));
    setCustoms(parseCustomAntecedents(customRaw).sort((a, b) => dKey(a.date).localeCompare(dKey(b.date)))); setRemovedCustoms([]); setDraft(null); setQuery(""); setOpenGroup(null); setFocusId(null);
  }
  if (!open && lastOpen) setLastOpen(false);
  const fold = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const q = fold(query.trim());
  const matchItem = (it: { id: string; fr: string; en: string }) =>
    !q || fold(`${it.fr} ${it.en} ${ANTECEDENT_KEYWORDS[it.id] ?? ""}`).includes(q);
  const noResult = q !== "" && items.filter((it) => !sel.includes(it.id)).every((it) => !matchItem(it));

  const nowY = new Date().getFullYear();
  const start = Math.max(1900, Math.min(minYear && minYear > 1800 ? minYear : 1950, nowY));
  const years: number[] = [];
  for (let y = nowY; y >= start; y--) years.push(y);
  const months = en ? MONTHS_EN : MONTHS_FR;

  const toggle = (id: string) => {
    if (sel.includes(id)) {
      setSel(sel.filter((x) => x !== id));
      const d = { ...dates }; delete d[id]; setDates(d);
      const t = { ...details }; delete t[id]; setDetails(t);
    } else {
      setSel([...sel, id]); setFocusId(id);
      if (q) {
        const g = ANTECEDENT_GROUPS.find((gr) => gr.items.some((it) => it.id === id));
        if (g) setOpenGroup(g.id);
      }
      setQuery("");
    }
  };
  const merge = (cur: string, part: "y" | "m", val: string) => {
    const [y = "", m = ""] = (cur ?? "").split("-");
    const ny = part === "y" ? val : y;
    const nm = part === "m" ? val : m;
    return ny || nm ? (nm ? `${ny}-${nm}` : ny) : "";
  };
  const setPart = (id: string, part: "y" | "m", val: string) => setDates({ ...dates, [id]: merge(dates[id] ?? "", part, val) });
  const setCustom = (i: number, patch: Partial<CustomAntecedent>) =>
    setCustoms(customs.map((c, k) => (k === i ? { ...c, ...patch } : c)));

  const selectCls = "shrink-0 rounded border border-input bg-background px-1 py-0.5 text-sm";
  const dateSelects = (value: string, onPart: (part: "y" | "m", v: string) => void) => {
    const [y = "", m = ""] = value.split("-");
    return (
      <>
        <select value={m} onChange={(e) => onPart("m", e.target.value)} className={selectCls} aria-label={en ? "Month" : "Mois"}
          onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); e.currentTarget.blur(); } }}>
          <option value="">{en ? "Month" : "Mois"}</option>
          {months.map((label, i) => <option key={i} value={String(i + 1).padStart(2, "0")}>{label}</option>)}
        </select>
        <select value={y} onChange={(e) => { onPart("y", e.target.value); e.currentTarget.blur(); }} className={selectCls} aria-label={en ? "Year" : "Année"}>
          <option value="">{en ? "Year" : "Année"}</option>
          {years.map((yy) => <option key={yy} value={String(yy)}>{yy}</option>)}
        </select>
      </>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[95vw] max-w-4xl">
        <DialogHeader>
          <DialogTitle>{en ? "Instrument history (prior to KeyWeight)" : "Antécédents de l'instrument (avant KeyWeight)"}
        </DialogHeader>
        <div className="space-y-1.5 border-b-2 border-foreground/50 pb-2">
          {sel.length === 0 && customs.length === 0 && (
            <div className="text-xs italic text-muted-foreground">{en ? "No prior history entered" : "Aucun antécédent renseigné"}</div>
          )}
          {sel.map((id) => {
            const it = items.find((i) => i.id === id);
            return (
              <div key={id} className="flex flex-nowrap items-center gap-1.5">
                <span className="list-chip list-chip-active shrink-0 whitespace-nowrap">{it ? interventionLabel(it, en) : id}</span>
                <input key={focusId === id ? "f" : "n"} autoFocus={focusId === id} value={details[id] ?? ""} onChange={(e) => setDetails({ ...details, [id]: e.target.value })} maxLength={80}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); (e.currentTarget.nextElementSibling as HTMLElement | null)?.focus(); } }}
                  placeholder={en ? "Optional detail..." : "Détail optionnel..."} className="list-input min-w-[14rem] flex-1" />
                {dateSelects(dates[id] ?? "", (p, v) => setPart(id, p, v))}
                <button type="button" className="shrink-0 px-1 text-muted-foreground" aria-label={en ? "Remove" : "Retirer"} onClick={() => toggle(id)}>✕</button>
              </div>
            );
          })}
          {customs.map((c, i) => (
            <div key={`c${i}`} className="flex flex-nowrap items-center gap-1.5">
              <span className="list-chip shrink-0 whitespace-nowrap bg-muted text-foreground">{c.label}</span>
              <input value={c.detail ?? ""} onChange={(e) => setCustom(i, { detail: e.target.value })} maxLength={80}
                placeholder={en ? "Optional remark" : "Remarque optionnelle"} className="list-input min-w-[14rem] flex-1" />
              {dateSelects(c.date, (p, v) => setCustom(i, { date: merge(c.date, p, v) }))}
              <button type="button" className="shrink-0 px-1 text-muted-foreground" aria-label={en ? "Remove" : "Retirer"}
                onClick={() => { setRemovedCustoms([...removedCustoms, c]); setCustoms(customs.filter((_, k) => k !== i)); }}>✕</button>
            </div>
          ))}
        </div>
        <div className="relative">
          <input value={query} onChange={(e) => setQuery(e.target.value)} className="list-input w-full pr-7"
            placeholder={en ? "Search an intervention (e.g. hammers, tuning, pinblock)" : "Rechercher une intervention (ex : marteaux, accord, sommier)"} />
          {query && (
            <button type="button" className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground" aria-label={en ? "Clear" : "Effacer"} onClick={() => setQuery("")}>✕</button>
          )}
        </div>
        <div className="flex justify-end">
          <button type="button" className="text-xs text-muted-foreground underline" onClick={() => setOpenGroup(openGroup === "*" ? null : "*")}>
            {openGroup === "*" ? (en ? "Collapse all" : "Tout replier") : (en ? "Expand all" : "Tout déplier")}
          </button>
        </div>
        <div className="max-h-[55vh] space-y-1 overflow-y-auto pr-1">
          {["sound", "action", "structure", "equipment"].map((gid) => ANTECEDENT_GROUPS.find((x) => x.id === gid)).filter((g): g is (typeof ANTECEDENT_GROUPS)[number] => !!g).map((g) => {
            const remaining = g.items.filter((it) => !sel.includes(it.id));
            const visible = remaining.filter(matchItem);
            if (q && visible.length === 0) return null;
            const count = g.items.length - remaining.length;
            const isOpen = q ? true : openGroup === "*" || openGroup === g.id;
            return (
              <div key={g.id} className="rounded border border-border">
                <button type="button" className="flex w-full items-center justify-between px-2 py-1.5 text-left text-sm font-semibold"
                  onClick={() => setOpenGroup(openGroup === g.id ? null : g.id)}>
                  <span>{isOpen ? "▾" : "▸"} {en ? g.en : g.fr}{count > 0 && ` (${count})`}</span>
                </button>
                {isOpen && (
                  <div className="flex flex-wrap gap-1.5 px-2 pb-2">
                    {visible.length === 0 && (
                      <span className="text-xs italic text-muted-foreground">{en ? "All items selected" : "Toutes les tâches sont sélectionnées"}</span>
                    )}
                    {visible.map((item) => (
                      <button key={item.id} type="button" className="list-chip" onClick={() => toggle(item.id)}>
                        {interventionLabel(item, en)}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
          {noResult && (
            <div className="px-2 py-1 text-xs italic text-muted-foreground">{en ? "No result" : "Aucun résultat"}</div>
          )}
          {extraItems.filter((it) => !sel.includes(it.id) && matchItem(it)).length > 0 && (
            <div className="flex flex-wrap gap-1.5 px-2 py-1">
              {extraItems.filter((it) => !sel.includes(it.id) && matchItem(it)).map((item) => (
                <button key={item.id} type="button" className="list-chip" onClick={() => toggle(item.id)}>{interventionLabel(item, en)}</button>
              ))}
            </div>
          )}
          <div className="rounded border border-border">
            <div className="px-2 py-1.5 text-sm font-semibold">{en ? "Custom interventions" : "Interventions sur mesure"}</div>
            <div className="space-y-2 px-2 pb-2">
              {removedCustoms.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {removedCustoms.map((c, i) => (
                    <button key={`r${i}`} type="button" className="list-chip bg-muted"
                      onClick={() => { setCustoms([...customs, c]); setRemovedCustoms(removedCustoms.filter((_, k) => k !== i)); }}>
                      {c.label}
                    </button>
                  ))}
                </div>
              )}
              {draft ? (
                <div className="flex flex-nowrap items-center gap-2">
                  <input value={draft.label} onChange={(e) => setDraft({ ...draft, label: e.target.value })} maxLength={120} autoFocus
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    placeholder={en ? "Describe the intervention..." : "Nom de l'intervention..."} className="list-input min-w-[12rem] flex-1" />
                  <input value={draft.detail ?? ""} onChange={(e) => setDraft({ ...draft, detail: e.target.value })} maxLength={80}
                    onKeyDown={(e) => { if (e.key === "Enter") e.preventDefault(); }}
                    placeholder={en ? "Optional remark" : "Remarque optionnelle"} className="list-input min-w-[10rem] flex-1" />
                  {dateSelects(draft.date, (p, v) => setDraft({ ...draft, date: merge(draft.date, p, v) }))}
                  <Button type="button" size="sm" className="shrink-0" disabled={!draft.label.trim()}
                    onClick={() => { setCustoms([...customs, { label: draft.label.trim(), date: draft.date, ...(draft.detail?.trim() ? { detail: draft.detail.trim() } : {}) }]); setDraft(null); }}>
                    {en ? "Confirm" : "Valider"}
                  </Button>
                  <button type="button" className="shrink-0 text-xs text-muted-foreground underline" onClick={() => setDraft(null)}>
                    {en ? "Cancel" : "Annuler"}
                  </button>
                </div>
              ) : (
                <button type="button" className="list-chip" onClick={() => setDraft({ label: "", date: "" })}>
                  {en ? "+ Add" : "+ Ajouter"}
                </button>
              )}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>{en ? "Cancel" : "Annuler"}</Button>
          <Button onClick={() => {
            const kept: Record<string, string> = {};
            sel.forEach((id) => { if (dates[id]) kept[id] = dates[id]; });
            const keptDetails: Record<string, string> = {};
            sel.forEach((id) => { const d = (details[id] ?? "").trim(); if (d) keptDetails[id] = d; });
            const cleanCustoms = customs.map((c) => ({ label: c.label.trim(), date: c.date, ...(c.detail?.trim() ? { detail: c.detail.trim() } : {}) })).filter((c) => c.label);
            onSave(sel, serializeDates(kept), cleanCustoms.length ? JSON.stringify(cleanCustoms) : "",
              Object.keys(keptDetails).length ? JSON.stringify(keptDetails) : "");
            onOpenChange(false);
          }}>{en ? "Save" : "Valider"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
