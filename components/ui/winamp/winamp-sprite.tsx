import { cn } from '@/lib/utils';

export type WinampSpriteProps = {
  className?: string;
  sprite: string;
};

export const WinampSprite = ({ sprite, className }: WinampSpriteProps) => {
  return <div className={cn(`winamp-${sprite}`, className)} />;
};
