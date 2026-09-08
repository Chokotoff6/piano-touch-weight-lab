// Blocs dédiés au rapport PDF : fiche compactée (4 colonnes) et graphique d'analyse.
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type PdfInfo = {
  marque: string;
  modele: string;
  typePiano: string;
  serial: string;
  fabrication: string;
  profil: string;
  pays: string;
  ville: string;
  entretien: string;
  remarques: string;
  usage?: string;
  zone?: string;
  dateMesure: string;
};

const CELL = "border border-neutral-400 px-2 py-1 align-top text-[11px] leading-tight";
const KEY = "font-semibold text-neutral-600";

function Line2({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className={KEY}>{label} : </span>
      <span className="text-black">{value || "—"}</span>
    </div>
  );
}

export function PdfInfoTable({ info }: { info: PdfInfo }) {
  return (
    <div className="w-full bg-white">
      <div className="mb-1 text-[13px] font-bold text-black">Informations piano</div>
      <div className="grid grid-cols-5">
        <div className={CELL}>
          <Line2 label="Marque" value={info.marque} />
          <Line2 label="Modèle" value={info.modele} />
          <Line2 label="Type" value={info.typePiano} />
        </div>
        <div className={CELL}>
          <Line2 label="N° de série" value={info.serial} />
          <Line2 label="Modifications importantes" value={info.remarques} />
        </div>
        <div className={CELL}>
          <Line2 label="Année" value={info.fabrication} />
          <Line2 label="Profil d'usine" value={info.profil} />
        </div>
        <div className={CELL}>
          <Line2 label="Lieu" value={[info.ville, info.pays].filter(Boolean).join(", ")} />
          <Line2 label="Entretien" value={info.entretien} />
          <Line2 label="Usage instrument" value={info.usage ?? ""} />
        </div>
        <div className={CELL}>
          <Line2 label="Zone géographique" value={info.zone ?? ""} />
          <Line2 label="Date/Heure mesure" value={info.dateMesure} />
        </div>
      </div>
    </div>
  );
}

export type ChartPoint = {
  key: number;
  wa: number | null;
  wd: number | null;
  friction: number | null;
  balance: number | null;
};

export function PdfComparisonChart({
  data,
  frictionTarget,
}: {
  data: ChartPoint[];
  frictionTarget: number | null;
}) {
  return (
    <div className="w-full bg-white">
      <div className="mb-1 text-[13px] font-bold text-black">
        Analyse comparative
        {frictionTarget !== null && ` — friction cible usine ${frictionTarget} g (± 1 g)`}
      </div>
      <div style={{ width: 960, height: 420 }}>
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#e5e7eb" />
            <XAxis dataKey="key" tick={{ fontSize: 10, fill: "#111827" }} interval={3} />
            <YAxis tick={{ fontSize: 10, fill: "#111827" }} domain={[0, "auto"]} />
            <Tooltip />
            <Legend wrapperStyle={{ fontSize: 11 }} />
            {frictionTarget !== null && (
              <>
                <ReferenceLine y={frictionTarget} stroke="#16a34a" strokeWidth={1.5} />
                <ReferenceLine y={frictionTarget + 1} stroke="#16a34a" strokeDasharray="4 3" />
                <ReferenceLine y={frictionTarget - 1} stroke="#16a34a" strokeDasharray="4 3" />
              </>
            )}
            <Line
              type="monotone"
              dataKey="wa"
              name="Poids descendant"
              stroke="#1d4ed8"
              dot={false}
              strokeWidth={1.6}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="wd"
              name="Poids remontant"
              stroke="#b91c1c"
              dot={false}
              strokeWidth={1.6}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="friction"
              name="Friction"
              stroke="#047857"
              dot={false}
              strokeWidth={1.6}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="balance"
              name="Poids d'équilibre"
              stroke="#7c3aed"
              dot={false}
              strokeWidth={1.6}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export type MetricKeyPdf = "wa" | "wd" | "balance" | "friction";

/**
 * Domaine vertical en nombres ENTIERS : écart réel (max - min) majoré de 10 %,
 * arrondi vers l'extérieur pour que chaque graduation soit un entier.
 */
export function paddedDomain(values: Array<number | null | undefined>): [number, number] {
  const nums = values.filter((v): v is number => typeof v === "number" && Number.isFinite(v));
  if (nums.length === 0) return [0, 1];
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  const pad = Math.max((max - min) * 0.1, 1);
  return [Math.floor(min - pad), Math.ceil(max + pad)];
}

/** Cadre PDF isolé pour une seule métrique : noir et blanc, axe gradué en entiers. */
export function PdfMetricChart({
  title,
  metric,
  data,
}: {
  title: string;
  metric: MetricKeyPdf;
  data: ChartPoint[];
}) {
  const domain = paddedDomain(data.map((point) => point[metric]));
  return (
    <div className="w-full bg-white">
      <div className="mb-1 text-[13px] font-bold text-black">{title}</div>
      <div style={{ width: 960, height: 300 }} className="bg-white">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
            <CartesianGrid stroke="#d1d5db" />
            <XAxis dataKey="key" tick={{ fontSize: 10, fill: "#111827" }} interval={3} />
            <YAxis
              tick={{ fontSize: 10, fill: "#111827" }}
              domain={domain}
              width={44}
              tickCount={8}
              allowDecimals={false}
              axisLine={{ stroke: "#111827" }}
              tickLine={{ stroke: "#111827" }}
            />
            <Line
              type="monotone"
              dataKey={metric}
              name={title}
              stroke="#111827"
              dot={false}
              strokeWidth={1.6}
              connectNulls
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

