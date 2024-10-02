import { cn } from "@/lib/utils";
import { WinampSprite } from "./winamp-sprite";

export type WinampDigitsProps = {
  value: number;
  padding?: number;
  className?: string;
};

export const WinampDigits = ({
  value,
  padding = 0,
  className,
}: WinampDigitsProps) => {
  const digits = value
    .toString()
    .padStart(padding, "0")
    .split("")
    .map((digit, i) => (
      <WinampSprite key={i} sprite={`numbers-digit-${digit}`} />
    ));

  return (
    <div className={cn(`flex text-nowrap`, className)} style={{ gap: "3px" }}>
      {digits}
    </div>
  );
};
