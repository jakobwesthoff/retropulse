import { cn } from '@/lib/utils';
import { forwardRef, MouseEventHandler } from 'react';

export type WinampButtonProps = {
  className?: string;
  onClick?: MouseEventHandler<HTMLButtonElement>;
  onMouseDown?: MouseEventHandler<HTMLButtonElement>;
  onMouseUp?: MouseEventHandler<HTMLButtonElement>;
  children?: React.ReactNode;
  sprite: string;
  style?: React.CSSProperties;
};

export const WinampButton = forwardRef<HTMLButtonElement, WinampButtonProps>(
  function WinampButton(
    {
      sprite,
      className,
      onClick = () => {},
      onMouseDown = () => {},
      onMouseUp = () => {},
      style = {},
      children = null,
    },
    ref
  ) {
    return (
      <button
        ref={ref}
        className={cn(
          `winamp-${sprite}`,
          "cursor-auto m-0 p-0 block",
          className
        )}
        onClick={onClick}
        onMouseDown={onMouseDown}
        onMouseUp={onMouseUp}
        style={style}
      >
        {children}
      </button>
    );
  }
);
