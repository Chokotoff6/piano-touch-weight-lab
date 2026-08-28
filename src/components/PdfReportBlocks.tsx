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
      <div className="grid grid-cols-4">
        <div className={CELL}>
          <Line2 label="Marque" value={info.marque} />
          <Line2 label="Modèle" value={info.modele} />
          <Line2 label="Type" value={info.typePiano} />
        </div>
        <div className={CELL}>
          <Line2 label="N° de série" value={info.serial} />
          <Line2 label="Remarques" value={info.remarques} />
        </div>
        <div className={CELL}>
          <Line2 label="Année" value={info.fabrication} />
          <Line2 label="Profil d'usine" value={info.profil} />
        </div>
        <div className={CELL}>
          <Line2 label="Lieu" value={[info.ville, info.pays].filter(Boolean).join(", ")} />
          <Line2 label="Entretien" value={info.entretien} />
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
        Analyse comparative des 88 touches
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
              name="Downweight (Wa)"
              stroke="#1d4ed8"
              dot={false}
              strokeWidth={1.6}
              connectNulls
              isAnimationActive={false}
            />
            <Line
              type="monotone"
              dataKey="wd"
              name="Upweight (Wd)"
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
              name="Balance"
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
