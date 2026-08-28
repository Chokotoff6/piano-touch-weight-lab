export type ImportedDiagnostic = {
  meta: Record<string, string>;
  rows: { wa: string; wd: string }[];
};

const unquote = (value: string) => {
  const trimmed = value.trim();
  if (trimmed.startsWith('"') && trimmed.endsWith('"')) {
    return trimmed.slice(1, -1).replace(/""/g, '"');
  }
  return trimmed;
};

const parseLine = (line: string) => {
  const values: string[] = [];
  let value = "";
  let quoted = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      if (quoted && line[i + 1] === '"') {
        value += '"';
        i += 1;
      } else {
        quoted = !quoted;
      }
    } else if (char === ";" && !quoted) {
      values.push(value);
      value = "";
    } else {
      value += char;
    }
  }

  values.push(value);
  return values.map(unquote);
};

const REQUIRED_EXPORT_HEADERS = ["Touche", "Wa (g)", "Wd (g)"];
const REQUIRED_TECH_HEADERS = ["note_index", "wa", "wd"];

function looksLikeExportHeader(values: string[]) {
  return REQUIRED_EXPORT_HEADERS.every((h) => values.includes(h));
}

function looksLikeTechnicalHeader(values: string[]) {
  return REQUIRED_TECH_HEADERS.every((h) => values.includes(h));
}

export function parseDiagnosticCsv(content: string): ImportedDiagnostic {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  const meta: Record<string, string> = {};
  let headerIndex = -1;
  let headerType: "export" | "technical" | null = null;

  lines.forEach((line, index) => {
    const values = parseLine(line);
    if (!headerType && values.length >= 3) {
      if (looksLikeExportHeader(values)) {
        headerIndex = index;
        headerType = "export";
      } else if (looksLikeTechnicalHeader(values)) {
        headerIndex = index;
        headerType = "technical";
      }
    }
    if (headerIndex === -1 && values[0]?.trim() && values.length >= 2) {
      meta[values[0]] = values.slice(1).join(";");
    }
  });

  if (headerIndex === -1 || headerType === null) {
    throw new Error("INVALID_CSV");
  }

  const headerValues = parseLine(lines[headerIndex]!);
  const indexCol = headerType === "export" ? headerValues.indexOf("Touche") : headerValues.indexOf("note_index");
  const waCol = headerType === "export" ? headerValues.indexOf("Wa (g)") : headerValues.indexOf("wa");
  const wdCol = headerType === "export" ? headerValues.indexOf("Wd (g)") : headerValues.indexOf("wd");

  if (indexCol === -1 || waCol === -1 || wdCol === -1) {
    throw new Error("INVALID_CSV");
  }

  const rows = Array.from({ length: 88 }, () => ({ wa: "", wd: "" }));
  for (const line of lines.slice(headerIndex + 1)) {
    const values = parseLine(line);
    if (values.length <= Math.max(indexCol, waCol, wdCol)) continue;
    const rawKey = values[indexCol]?.trim();
    if (!rawKey) continue;
    const key = Number(rawKey);
    if (!Number.isInteger(key) || key < 1 || key > 88) continue;
    rows[key - 1] = { wa: values[waCol] ?? "", wd: values[wdCol] ?? "" };
  }

  return { meta, rows };
}
