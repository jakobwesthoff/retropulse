import { cn, computedStyleRect } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";
import { WinampSpriteText } from "./winamp-sprite-text";

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
