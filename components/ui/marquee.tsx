"use client";

import React, { ReactNode, useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

interface MarqueeProps {
  children: ReactNode;
  className?: string;
  seperator?: string;
}

export const Marquee = ({
  children,
  className,
  seperator = "-",
}: MarqueeProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const measurementRef = useRef<HTMLDivElement>(null);
  const [animate, setAnimate] = useState(false);
  const [contentWidth, setContentWidth] = useState(0);

  useEffect(() => {
    const checkOverflow = () => {
      if (containerRef.current && measurementRef.current) {
        const containerWidth = containerRef.current.offsetWidth;
        const textWidth = measurementRef.current.offsetWidth;

        if (textWidth > containerWidth) {
          setAnimate(true);
          setContentWidth(textWidth);
        } else {
          setAnimate(false);
        }
      }
    };

    checkOverflow();
    window.addEventListener("resize", checkOverflow);

    return () => window.removeEventListener("resize", checkOverflow);
  }, [children]);

  return (
    <div
      ref={containerRef}
      className={cn("overflow-hidden w-full", className)}
      style={{ "--content-width": contentWidth } as React.CSSProperties}
    >
      <div
        ref={measurementRef}
        className="absolute whitespace-nowrap invisible"
      >
        {children}
      </div>
      {animate ? (
        <div
          className={`whitespace-nowrap inline-block ${
            animate ? "animate-scroll" : ""
          }`}
        >
          <span>{children}</span>
          <span className="mx-4">{seperator}</span>
          <span>{children}</span>
          <span className="mx-4">{seperator}</span>
        </div>
      ) : (
        <div className="whitespace-nowrap inline-block">
          <span>{children}</span>
        </div>
      )}
      <style jsx>{`
        @keyframes scrollText {
          0% {
            transform: translateX(0%);
          }
          100% {
            transform: translateX(-50%);
          }
        }
        .animate-scroll {
          animation: calc(var(--content-width) * 0.05s) linear 0s infinite
            normal none running scrollText;
        }
      `}</style>
    </div>
  );
};
