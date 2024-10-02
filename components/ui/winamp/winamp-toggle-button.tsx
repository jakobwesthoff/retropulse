import { cn } from '@/lib/utils';
import { WinampButton } from './winamp-button';

export type WinampToggleButtonProps = {
  sprite: string;
  checked: boolean;
  className?: string;
  onChange?: (checked: boolean) => void;
  children?: React.ReactNode;
};

export const WinampToggleButton = ({
  checked,
  sprite,
  onChange = () => {},
  className,
  children,
}: WinampToggleButtonProps) => {
  return (
    <WinampButton
      sprite={sprite}
      className={cn(className, checked ? "checked" : "")}
      onClick={() => onChange(!checked)}
    >
      {children}
    </WinampButton>
  );
};
