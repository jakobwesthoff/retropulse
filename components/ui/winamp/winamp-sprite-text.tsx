import { cn } from '@/lib/utils';

export type WinampSpriteTextProps = {
  className?: string;
  text: string;
};

export const WinampSpriteText = ({
  text,
  className,
}: WinampSpriteTextProps) => {
  const charWidth = 5;
  const characterMap = new Map([
    ["a", "a"],
    ["b", "b"],
    ["c", "c"],
    ["d", "d"],
    ["e", "e"],
    ["f", "f"],
    ["g", "g"],
    ["h", "h"],
    ["i", "i"],
    ["j", "j"],
    ["k", "k"],
    ["l", "l"],
    ["m", "m"],
    ["n", "n"],
    ["o", "o"],
    ["p", "p"],
    ["q", "q"],
    ["r", "r"],
    ["s", "s"],
    ["t", "t"],
    ["u", "u"],
    ["v", "v"],
    ["w", "w"],
    ["x", "x"],
    ["y", "y"],
    ["z", "z"],
    ["A", "a"],
    ["B", "b"],
    ["C", "c"],
    ["D", "d"],
    ["E", "e"],
    ["F", "f"],
    ["G", "g"],
    ["H", "h"],
    ["I", "i"],
    ["J", "j"],
    ["K", "k"],
    ["L", "l"],
    ["M", "m"],
    ["N", "n"],
    ["O", "o"],
    ["P", "p"],
    ["Q", "q"],
    ["R", "r"],
    ["S", "s"],
    ["T", "t"],
    ["U", "u"],
    ["V", "v"],
    ["W", "w"],
    ["X", "x"],
    ["Y", "y"],
    ["Z", "z"],
    ['"', "quote"],
    ["@", "at"],
    [" ", "space"],
    ["0", "zero"],
    ["1", "one"],
    ["2", "two"],
    ["3", "three"],
    ["4", "four"],
    ["5", "five"],
    ["6", "six"],
    ["7", "seven"],
    ["8", "eight"],
    ["9", "nine"],
    ["...", "elipsis"],
    [".", "dot"],
    [":", "colon"],
    ["(", "brace-open"],
    [")", "brace-close"],
    ["-", "minus"],
    ["'", "single-quote"],
    ["!", "exclamation-mark"],
    ["_", "underscore"],
    ["+", "plus"],
    ["\\", "backslash"],
    ["/", "slash"],
    ["[", "square-bracket-open"],
    ["]", "square-bracket-close"],
    ["^", "caret"],
    ["&", "ampersand"],
    ["%", "percent"],
    [",", "comma"],
    ["=", "equal-sign"],
    ["$", "dollar"],
    ["#", "hash"],
    ["å", "a-with-ring-above"],
    ["Å", "a-with-ring-above"],
    ["ö", "o-with-diaresis"],
    ["Ö", "o-with-diaresis"],
    ["ä", "a-with-diaresis"],
    ["Ä", "a-with-diaresis"],
    ["?", "question-mark"],
    ["*", "asterisk"],
  ]);

  const letters = text
    .split("")
    .map((char) => characterMap.get(char) || "space")
    .map((name) => `winamp-text-${name}`)
    .map((className, i) => <div key={i} className={className} />);
  return (
    <div
      className={cn(`flex text-nowrap`, className)}
      style={{ width: `${charWidth * text.length}px` }}
    >
      {letters}
    </div>
  );
};
