import { RefreshCw } from "lucide-react";

export function CycleLabel({ title, value }: { title: string; value: string }) {
  return <span className="inline-flex shrink-0 items-center whitespace-nowrap" style={{ gap: "clamp(3px, 0.4vw, 6px)" }}><span className="font-bold text-foreground">{title}</span><RefreshCw strokeWidth={2.5} aria-hidden="true" className="h-[0.85em] w-[0.85em] shrink-0 text-muted-foreground/60" /><span className="font-medium text-foreground">{value}</span></span>;
}