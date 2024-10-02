import { cn, computedStyleRect } from "@/lib/utils";
import React, {
  forwardRef,
  MouseEventHandler,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

export type WinampSpriteProps = {
  className?: string;
  sprite: string;
};

export const WinampSprite = ({ sprite, className }: WinampSpriteProps) => {
  return <div className={cn(`winamp-${sprite}`, className)} />;
};

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

export type WinampSliderProps = {
  value: number;
  onChange?: (value: number) => void;
  background: (value: number) => string;
  thumb: string;
  className?: string;
};

export const WinampSlider = ({
  value,
  background,
  thumb,
  className,
  onChange,
}: WinampSliderProps) => {
  const offsetX = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  // We need a value to use during mouse drags as a state to trigger rerenders
  const [dragRenderValue, setDragRenderValue] = useState(value);
  // and we need essentially the same value, but as a reference to access in
  // mouse up event handler
  const newValue = useRef(value);
  const thumbRef = useRef<HTMLButtonElement>(null);
  // This value will be in layout space not in "real" space
  // See the comment in the useEffect below for details
  const [layoutThumbWidth, setLayoutThumbWidth] = useState(0);
  const referenceRef = useRef<HTMLDivElement>(null);

  const calculateValue = useCallback((x: number) => {
    if (!referenceRef.current) {
      return 0;
    }

    const referenceRect = referenceRef.current?.getBoundingClientRect();
    const referenceLeft = referenceRect?.left || 0;
    const referenceWidth = referenceRect?.width || 0;
    // Calculate the new value based on the mouse position over the thumb in relation to the reference
    const newValue = Math.min(
      1,
      Math.max(0, (x - offsetX.current - referenceLeft) / referenceWidth)
    );

    return newValue;
  }, []);

  useEffect(() => {
    // This is a bit of a hack to get the thumb width, as we are using the
    // "layout" value here, even if the thumb is scaled by a transform (double
    // size). All the other code paths of the slider are working with the "real
    // value" as they reacting to mouse move events, which are not affected by
    // the scale transform.  Just keep in mind, that the thumbWidth property is
    // in "layout" pixels not "real" pixels.
    setLayoutThumbWidth(computedStyleRect(thumbRef.current).width);
  }, []);

  useEffect(() => {
    if (isDragging) {
      const handleMouseMove = (e: MouseEvent) => {
        newValue.current = calculateValue(e.clientX);
        setDragRenderValue(newValue.current);
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
        onChange?.(newValue.current);
        setIsDragging(false);
      };

      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
    }

    return () => {
      window.removeEventListener("mousemove", () => {});
      window.removeEventListener("mouseup", () => {});
    };
  }, [isDragging, onChange, calculateValue]);

  const handleThumbMouseDown = useCallback(
    (e: React.MouseEvent) => {
      const x = e.clientX;
      const thumbRect = thumbRef.current?.getBoundingClientRect();
      const thumbWidth = thumbRect?.width || 0;
      const thumbLeft = thumbRect?.left || 0;
      offsetX.current = x - thumbLeft - thumbWidth / 2;
      setDragRenderValue(calculateValue(x));
      setIsDragging(true);
    },
    [calculateValue]
  );

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "w-full h-full",
          `winamp-${background(isDragging ? dragRenderValue : value)}`
        )}
      >
        <div
          ref={referenceRef}
          className="relative h-full flex items-center"
          style={{
            left: `${Math.round(layoutThumbWidth / 2)}px`,
            width: `calc(100% - ${layoutThumbWidth}px)`,
          }}
        >
          <WinampButton
            ref={thumbRef}
            className={`absolute translate-x-[-50%]`}
            sprite={thumb}
            onMouseDown={handleThumbMouseDown}
            style={{ left: `${(isDragging ? dragRenderValue : value) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

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

export type WinampMarqueeProps = {
  text: string;
  seperator: string;
  className?: string;
};

export const WinampMarquee = ({
  text,
  seperator,
  className,
}: WinampMarqueeProps) => {
  const charWidth = 5;

  const [fullLength, setFullLength] = useState(0);
  const [textLength, setTextLength] = useState(0);
  useEffect(() => {
    setFullLength(text.length + seperator.length);
    setTextLength(text.length);
  }, [text, seperator]);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  useEffect(() => {
    if (!containerRef.current) return;
    const computedRect = computedStyleRect(containerRef.current);
    setContainerWidth(computedRect.width);
  }, []);

  const [animated, setAnimated] = useState(false);
  useEffect(() => {
    setAnimated(containerWidth < textLength * charWidth);
  }, [containerWidth, textLength, fullLength]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(className, "overflow-hidden relative")}
      >
        {animated ? (
          <div
            className="animate-marquee flex"
            style={{ "--characters": fullLength } as React.CSSProperties}
          >
            <WinampSpriteText text={text} className="float-left" />
            <WinampSpriteText text={seperator} className="float-left" />
            <WinampSpriteText text={text} className="float-left" />
            <WinampSpriteText text={seperator} className="float-left" />
          </div>
        ) : (
          <div>
            <WinampSpriteText text={text} />
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes marquee {
          from {
            transform: translateX(0);
          }
          to {
            transform: translateX(-100%);
          }
        }

        .animate-marquee {
          /* animate in non smooth steps of var(--characters) */
          animation: marquee calc(var(--characters) * 0.3s)
            steps(var(--characters)) infinite;
          width: calc(var(--characters) * ${charWidth}px);
        }
      `}</style>
    </>
  );
};

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
