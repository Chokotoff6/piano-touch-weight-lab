// Migration unique des brouillons locaux vers la convention Stanwood
// (wd = Poids descendant, wa = Poids remontant). Les colonnes de la base
// (wa_values = descendant) restent inchangées : le pont est fait à la lecture.
const FLAG = "ptw_stanwood_v1";
const ROW_KEYS = ["ptw_draft_rows", "ptw_last_synced_rows"];

export function migrateStanwoodStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const ls = window.localStorage;
    if (ls.getItem(FLAG) === "1") return;
    for (const key of ROW_KEYS) {
      const raw = ls.getItem(key);
      if (!raw) continue;
      const rows = JSON.parse(raw) as Array<{ wa?: string; wd?: string }>;
      if (!Array.isArray(rows)) continue;
      ls.setItem(key, JSON.stringify(rows.map((r) => ({ wd: r?.wa ?? "", wa: r?.wd ?? "" }))));
    }
    ls.setItem(FLAG, "1");
  } catch {
    /* stockage indisponible */
  }
}

migrateStanwoodStorage();
