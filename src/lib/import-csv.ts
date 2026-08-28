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

export function parseDiagnosticCsv(content: string): ImportedDiagnostic {
  const lines = content.replace(/^\uFEFF/, "").split(/\r?\n/);
  const meta: Record<string, string> = {};
  let headerIndex = -1;

  lines.forEach((line, index) => {
    const values = parseLine(line);
    if (values.length >= 5 && values[0] === "Touche") headerIndex = index;
    if (headerIndex === -1 && values[0]?.trim() && values.length >= 2) {
      meta[values[0]] = values.slice(1).join(";");
    }
  });

  if (headerIndex === -1) {
    throw new Error("Format CSV Touchweight non reconnu");
  }

  const rows = Array.from({ length: 88 }, () => ({ wa: "", wd: "" }));
  for (const line of lines.slice(headerIndex + 1)) {
    const values = parseLine(line);
    const key = Number(values[0]);
    if (!Number.isInteger(key) || key < 1 || key > 88) continue;
    rows[key - 1] = { wa: values[1] ?? "", wd: values[2] ?? "" };
  }

  return { meta, rows };
}
