"use client";

import { cn } from "@/lib/utils";
import { useEffect, useRef, useState } from "react";

export type MarqueeProps = {
  children: React.ReactNode;
  className: string;
  seperator?: string;
};

export const Marquee = ({
  children,
  className,
  seperator = "-",
}: MarqueeProps) => {
  const measurementRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [contentWidth, setContentWidth] = useState<number>(0);
  const [animate, setAnimate] = useState<boolean>(false);

  useEffect(() => {
    const handleResize = () => {
      const contentWidth = measurementRef.current!.offsetWidth;
      const containerWidth = containerRef.current!.offsetWidth;

      setContentWidth(contentWidth);
      setAnimate(containerWidth < contentWidth);
    };

    handleResize();

    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [children]);

  return (
    <>
      <div
        ref={containerRef}
        className={cn(className, "relative overflow-hidden whitespace-nowrap")}
        style={{ "--content-width": contentWidth } as React.CSSProperties}
      >
        <div ref={measurementRef} className="absolute inline-block invisible">
          {children}
        </div>
        {animate ? (
          <div className="animate-marquee inline-block">
            <span className="mx-2">{children}</span>
            <span className="mx-2">{seperator}</span>
            <span className="mx-2">{children}</span>
            <span className="mx-2">{seperator}</span>
          </div>
        ) : (
          <div className="inline-block">
            <span>{children}</span>
          </div>
        )}
      </div>
      <style jsx>{`
        @keyframes marquee {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }

        .animate-marquee {
          animation: calc(var(--content-width) * 0.06s) linear infinite marquee;
        }
      `}</style>
    </>
  );
};
