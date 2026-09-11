import { useSyncExternalStore } from "react";

export type Lang = "fr" | "en";

export const translations = {
  fr: {
    "compare.faq.question": "❓ Les graphiques intègrent-ils des données fabricants ?",
    "compare.faq.answer":
      "Non, et c'est la raison d'être de cet outil. Les constructeurs ne publient pas d'abaques de résistance publics ou standardisés note par note pour chaque modèle, la facture instrumentale reposant sur des géométries, des réglages et des matériaux spécifiques (bois, fibre de carbone, plombage, pivotage) intrinsèquement variables. Cette plateforme est précisément un outil collaboratif et empirique conçu pour pallier ce manque : ce sont les mesures réelles partagées par les professionnels sur le terrain qui créent la base comparative. Les courbes témoins initiales proviennent exclusivement de la cartographie physique clé par clé de notre piano étalon d'atelier, servant d'ancrage concret en attendant l'enrichissement de la base par la communauté.",
  },
  en: {
    "compare.faq.question": "❓ Do the charts include manufacturer data?",
    "compare.faq.answer":
      "No, and that is precisely why this tool exists. Manufacturers do not publish public or standardised note-by-note resistance charts for each model, since piano making relies on specific geometries, regulation settings and materials (wood, carbon fibre, key leading, centre pinning) that are inherently variable. This platform is deliberately a collaborative, empirical tool designed to fill that gap: the comparative baseline is built from real measurements shared by professionals in the field. The initial reference curves come exclusively from the key-by-key physical mapping of our workshop reference piano, serving as a concrete anchor until the database is enriched by the community.",
  },
} as const;

export type TranslationKey = keyof (typeof translations)["fr"];

const STORAGE_KEY = "piano-lang";

let lang: Lang = "fr";
const listeners = new Set<() => void>();

export function initLang() {
  if (typeof window === "undefined") return;
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored === "en" || stored === "fr") {
    lang = stored;
    listeners.forEach((l) => l());
  }
}

export function setLang(next: Lang) {
  lang = next;
  if (typeof window !== "undefined") window.localStorage.setItem(STORAGE_KEY, next);
  listeners.forEach((l) => l());
}

export function getLang(): Lang {
  return lang;
}

export function useLang(): Lang {
  return useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    () => lang,
    () => "fr" as Lang,
  );
}

export function useTranslation() {
  const current = useLang();
  return {
    lang: current,
    t: (key: TranslationKey) => translations[current][key],
  };
}
