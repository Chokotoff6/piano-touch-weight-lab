import type { ClimateZone } from "./piano-constants";

/** Tables de datation : [seuil, année], évaluées du plus grand au plus petit. */
type Table = Array<[number, number]>;

const YAMAHA_J: Table = [
  [4300000, 2025], [4100000, 2024], [3950000, 2023], [3900000, 2022], [3800000, 2021],
  [3650000, 2020], [3520000, 2019], [3450000, 2018], [3400000, 2017], [3250000, 2016],
  [3140000, 2015], [3027800, 2014], [2925300, 2013], [2920000, 2012], [2820000, 2011],
  [2718000, 2010], [2618000, 2009], [2516130, 2008], [2414070, 2007], [2210860, 2006],
  [2204800, 2005], [2082400, 2004], [2008300, 2003], [1963500, 2002], [1857500, 2001],
  [1750000, 2000], [1643700, 1999],
];

const YAMAHA_PLAIN: Table = [
  [6570000, 2025], [6520000, 2021], [6480000, 2020], [6460000, 2018], [6430000, 2016],
  [6400000, 2015], [6380000, 2014], [6350000, 2013], [6320000, 2012], [6300000, 2011],
  [6290000, 2010], [6210000, 2008], [6180000, 2007], [6150000, 2006], [6115000, 2005],
  [6080000, 2004], [6020000, 2003], [5960000, 2002], [5910000, 2001], [5834000, 2000],
  [5780000, 1999], [5720000, 1998], [5640000, 1997], [5540000, 1996], [5360000, 1995],
  [4820000, 1990], [3930000, 1985], [3030000, 1980], [1940000, 1975], [982000, 1970],
];

const KAWAI_F: Table = [
  [200000, 2024], [191000, 2023], [180000, 2022], [168000, 2021], [153000, 2020],
  [142000, 2019], [131000, 2018], [120000, 2017], [112000, 2016], [101000, 2015],
  [91000, 2014], [80000, 2013], [67900, 2012], [57700, 2011], [48847, 2010],
  [39000, 2009], [30450, 2008], [18700, 2007], [10600, 2006], [4700, 2005],
  [2200, 2004], [200, 2003],
];

const KAWAI_PLAIN: Table = [
  [2820000, 2025], [2790000, 2024], [2780000, 2023], [2770000, 2022], [2750000, 2021],
  [2740000, 2020], [2730000, 2019], [2710000, 2018], [2700000, 2017], [2686000, 2016],
  [2675000, 2015], [2660000, 2014], [2648000, 2013], [2634000, 2012], [2620000, 2011],
  [2615000, 2010], [2600000, 2009], [2580000, 2008], [2560000, 2007], [2540000, 2006],
  [2518000, 2005], [2490000, 2004], [2460000, 2003], [2430000, 2002], [2410000, 2001],
  [2380000, 2000], [1950000, 1990], [1626000, 1980], [1125000, 1975], [425000, 1970],
];

const STEINWAY: Table = [
  [623000, 2024], [621500, 2023], [620000, 2022], [618000, 2021], [615000, 2020],
  [612000, 2019], [609000, 2018], [606000, 2017], [603000, 2016], [600000, 2015],
  [596000, 2014], [593000, 2013], [590000, 2012], [588000, 2011], [585000, 2010],
  [579000, 2008], [576000, 2007], [573000, 2006], [570000, 2005], [566000, 2004],
  [562000, 2003], [558000, 2002], [554000, 2001], [550000, 2000], [512000, 1990],
  [490000, 1985], [465000, 1980], [420000, 1970], [365000, 1960],
];

const BECHSTEIN: Table = [
  [212000, 2023], [211000, 2021], [210000, 2020], [208500, 2018], [207000, 2017],
  [205500, 2016], [204000, 2015], [202500, 2014], [201000, 2013], [199500, 2012],
  [198200, 2011], [197000, 2010], [196000, 2009], [195000, 2008], [194000, 2007],
  [193000, 2006], [192000, 2005], [191000, 2004], [190000, 2003], [189000, 2002],
  [188000, 2001], [187537, 2000], [183917, 1995], [180821, 1990], [177500, 1985],
  [172500, 1980], [162300, 1970],
];

const PLEYEL: Table = [
  [261500, 2013], [261400, 2010], [261300, 2005], [261200, 2000], [260500, 1998],
  [259800, 1996], [259100, 1995], [258400, 1993], [257500, 1990], [255200, 1985],
  [253000, 1980], [240000, 1970], [216000, 1950], [118000, 1900],
];

const clean = (v: string | undefined) => (v ?? "").replace(/\s+/g, "").toUpperCase();

export function brandKey(brand: string): string {
  const b = clean(brand);
  if (b.includes("YAMAHA")) return "YAMAHA";
  if (b.includes("KAWAI")) return "KAWAI";
  if (b.includes("STEINWAY")) return "STEINWAY";
  if (b.includes("BECHSTEIN")) return "BECHSTEIN";
  if (b.includes("PLEYEL")) return "PLEYEL";
  if (b.includes("BÖSENDORFER") || b.includes("BOSENDORFER")) return "BOSENDORFER";
  return b;
}

const lookup = (table: Table, n: number): number | null => {
  for (const [threshold, year] of table) if (n >= threshold) return year;
  return null;
};

/** Année de fabrication déduite de la marque et du numéro de série éclaté. */
export function datePiano(brand: string, prefix: string, num: string): number | null {
  const key = brandKey(brand);
  const p = clean(prefix);
  const n = parseInt(clean(num), 10);
  if (!Number.isFinite(n)) return null;
  switch (key) {
    case "YAMAHA":
      return p === "J" ? lookup(YAMAHA_J, n) : p === "" ? lookup(YAMAHA_PLAIN, n) : null;
    case "KAWAI":
      return p === "F" ? lookup(KAWAI_F, n) : p === "" ? lookup(KAWAI_PLAIN, n) : null;
    case "STEINWAY":
      return lookup(STEINWAY, n);
    case "BECHSTEIN":
      return lookup(BECHSTEIN, n);
    case "PLEYEL":
      return lookup(PLEYEL, n);
    default:
      return null;
  }
}

export const SERIAL_FORMAT_ERROR =
  "❌ Le format du numéro de série ne correspond pas à la marque sélectionnée. Vérifiez les lettres de début/fin et le nombre de caractères.";

type FormatSpec = { prefixes: string[]; suffixAllowed: boolean; digits: [number, number] };

const FORMATS: Record<string, FormatSpec> = {
  YAMAHA: { prefixes: ["", "J"], suffixAllowed: false, digits: [6, 7] },
  KAWAI: { prefixes: ["", "F"], suffixAllowed: true, digits: [4, 7] },
  STEINWAY: { prefixes: [""], suffixAllowed: false, digits: [6, 6] },
  BECHSTEIN: { prefixes: [""], suffixAllowed: false, digits: [6, 6] },
  PLEYEL: { prefixes: [""], suffixAllowed: false, digits: [6, 6] },
};

/** true si la combinaison lettres/chiffres est cohérente avec la marque. */
export function isSerialFormatValid(
  brand: string,
  prefix: string,
  num: string,
  suffix: string,
): boolean {
  const spec = FORMATS[brandKey(brand)];
  const digits = clean(num);
  if (!spec) return true;
  if (digits === "") return true;
  if (!/^\d+$/.test(digits)) return false;
  if (digits.length < spec.digits[0] || digits.length > spec.digits[1]) return false;
  const p = clean(prefix);
  if (!spec.prefixes.includes(p)) return false;
  const s = clean(suffix);
  if (s !== "" && (!spec.suffixAllowed || !/^[A-Z]{1,3}$/.test(s))) return false;
  return true;
}

export type FactoryProfile = { label: string; frictionTarget: number | null };

/** Profil d'usine : origine de fabrication déduite du préfixe, du numéro ou de la zone climatique. */
export function factoryProfile(
  brand: string,
  prefix: string,
  zone: ClimateZone | null,
  typePiano: string | undefined,
  num?: string,
): FactoryProfile {
  const key = brandKey(brand);
  if (key === "YAMAHA" || key === "KAWAI") {
    if (clean(prefix) !== "") return { label: "Europe/Climats Humides", frictionTarget: 13 };
    const n = parseInt(clean(num), 10);
    // Règle synchrone : gros numéros sans préfixe = production Europe, sans attendre la météo.
    if (Number.isFinite(n) && n >= 2000000)
      return { label: "Europe/Climats Humides", frictionTarget: 13 };
    if (zone === 3 || zone === 5) return { label: "Japon/Climat Sec", frictionTarget: 11 };
    if (zone === 1 || zone === 2 || zone === 4)
      return { label: "Europe/Climats Humides", frictionTarget: 13 };
    return { label: "—", frictionTarget: null };
  }

  const t = (typePiano ?? "").toLowerCase();
  if (t.includes("queue")) return { label: "Standard piano à queue", frictionTarget: 12 };
  if (t.includes("droit")) return { label: "Standard piano droit", frictionTarget: 13 };
  return { label: "—", frictionTarget: null };
}
