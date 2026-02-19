import { cn, frequencyLabel, frequencyColor, frequencyBg } from "@/lib/utils";
import type { FrequencyClass } from "@/lib/supabase";

interface FrequencyTagProps {
  frequency: FrequencyClass | null;
  className?: string;
}

export function FrequencyTag({ frequency, className }: FrequencyTagProps) {
  if (!frequency) return null;

  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold",
        frequencyColor(frequency),
        frequencyBg(frequency),
        className
      )}
    >
      {frequencyLabel(frequency)}
    </span>
  );
}
