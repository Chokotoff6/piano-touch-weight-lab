import {
  COUNTRY_CLIMATE_FALLBACKS,
  DEFAULT_CLIMATE_ZONE,
  type ClimateZone,
} from "./piano-constants";

type Box = { latMin: number; latMax: number; lonMin: number; lonMax: number; zone: ClimateZone };

// Bounding boxes simplifiées, évaluées dans l'ordre (première correspondance retenue).
const BOXES: Box[] = [
  // Zone 5 — aride / désertique (Afrique du Nord, Moyen-Orient, Sahara)
  { latMin: 12, latMax: 36, lonMin: -18, lonMax: 60, zone: 5 },
  // Zone 4 — tropical humide (bande intertropicale)
  { latMin: -35, latMax: 12, lonMin: -180, lonMax: 180, zone: 4 },
  // Zone 3 — méditerranéen (sud de l'Europe)
  { latMin: 34, latMax: 45, lonMin: -10, lonMax: 45, zone: 3 },
  // Zone 1 — océanique (façade atlantique européenne)
  { latMin: 45, latMax: 62, lonMin: -11, lonMax: 8, zone: 1 },
  // Zone 2 — continental (reste de l'hémisphère nord tempéré)
  { latMin: 30, latMax: 72, lonMin: -180, lonMax: 180, zone: 2 },
];

export function zoneFromCoords(lat: number, lon: number): ClimateZone | null {
  for (const b of BOXES) {
    if (lat >= b.latMin && lat <= b.latMax && lon >= b.lonMin && lon <= b.lonMax) return b.zone;
  }
  return null;
}

export function fallbackZone(country: string): ClimateZone {
  return COUNTRY_CLIMATE_FALLBACKS[country.trim().toUpperCase()] ?? DEFAULT_CLIMATE_ZONE;
}

/** Géocodage Nominatim, avec filet de sécurité systématique sur le climat du pays. */
export async function resolveClimateZone(city: string, country: string): Promise<ClimateZone> {
  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&city=${encodeURIComponent(
      city,
    )}&country=${encodeURIComponent(country)}`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return fallbackZone(country);
    const data = (await res.json()) as Array<{ lat?: string; lon?: string }>;
    const hit = Array.isArray(data) ? data[0] : undefined;
    const lat = Number(hit?.lat);
    const lon = Number(hit?.lon);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) return fallbackZone(country);
    return zoneFromCoords(lat, lon) ?? fallbackZone(country);
  } catch {
    return fallbackZone(country);
  }
}
