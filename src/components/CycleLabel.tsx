import { RefreshCw } from "lucide-react";

export function CycleLabel({ title, value }: { title: string; value: string }) {
  return <><span className="font-bold text-foreground">{title}</span><RefreshCw size={12} strokeWidth={2.5} aria-hidden="true" className="shrink-0 text-muted-foreground/60" /><span className="font-medium text-foreground">{value}</span></>;
}