import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export interface DateRange {
  from: string; // yyyy-mm-dd
  to: string; // yyyy-mm-dd
}

export const todayISO = () => new Date().toISOString().slice(0, 10);

export const oneYearAgoISO = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() - 1);
  return d.toISOString().slice(0, 10);
};

export const defaultDateRange = (): DateRange => ({
  from: oneYearAgoISO(),
  to: todayISO(),
});

interface Props {
  value: DateRange;
  onChange: (r: DateRange) => void;
  className?: string;
}

export function DateRangeFilter({ value, onChange, className }: Props) {
  return (
    <div className={`flex flex-wrap items-end gap-3 ${className ?? ""}`}>
      <div className="space-y-1">
        <Label htmlFor="range-from" className="text-xs text-muted-foreground">
          From
        </Label>
        <Input
          id="range-from"
          type="date"
          className="h-9 w-[160px]"
          value={value.from}
          max={value.to}
          onChange={(e) => onChange({ ...value, from: e.target.value })}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="range-to" className="text-xs text-muted-foreground">
          To
        </Label>
        <Input
          id="range-to"
          type="date"
          className="h-9 w-[160px]"
          value={value.to}
          min={value.from}
          onChange={(e) => onChange({ ...value, to: e.target.value })}
        />
      </div>
    </div>
  );
}
