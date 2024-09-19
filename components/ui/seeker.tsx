"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";
import { useCallback, useEffect, useRef, useState } from "react";
import { usePlayerEventBroker } from "@/components/context/PlayerEventBroker";
import { invoke } from "@tauri-apps/api/core";

export type SeekerProps = {
  className?: string;
};

const Seeker = ({ className }: SeekerProps) => {
  const broker = usePlayerEventBroker();

  const [isSeeking, setIsSeeking] = useState(false);
  const [displayedSliderValue, setDisplayedSliderValue] = useState(0);
  const [realPosition, setRealPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  const isSeekingRef = useRef(isSeeking);
  useEffect(() => {
    isSeekingRef.current = isSeeking;
  }, [isSeeking]);

  useEffect(() => {
    const subscriptionId = broker.subscribe((message) => {
      switch (message.event) {
        case "positionUpdated":
          if (!isSeekingRef.current) {
            setDisplayedSliderValue(message.data.position);
          }
          setDuration(message.data.duration);
          setRealPosition(message.data.position);
          break;
        case "seeked":
          setDisplayedSliderValue(message.data.position);
          setRealPosition(message.data.position);
          setDuration(message.data.duration);
          setIsSeeking(false);
          break;
        case "stopped":
          // @TODO: Something is still wrong here, the slider is not reset to 0
          // properly
          setDisplayedSliderValue(0);
          setRealPosition(0);
          setDuration(0);
          setIsSeeking(false);
          break;
      }
    });

    return () => {
      broker.unsubscribe(subscriptionId);
    };
  }, [broker]);

  const handleOnValueChange = useCallback(([value]: [number]) => {
    setIsSeeking(true);
    setDisplayedSliderValue(value);
  }, []);

  const handleOnValueCommit = useCallback(async ([newValue]: [number]) => {
    await invoke("seek_module", { position: newValue });
    setDisplayedSliderValue(newValue);
  }, []);

  const formatSeconds = useCallback((seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
  }, []);

  return (
    <div className={cn("space-y-2", className)}>
      <SliderPrimitive.Root
        className={cn(
          "group/root relative flex w-full touch-none select-none items-center"
        )}
        onValueChange={handleOnValueChange}
        onValueCommit={handleOnValueCommit}
        value={[displayedSliderValue]}
        max={duration}
        step={1}
      >
        <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-primary/20">
          <SliderPrimitive.Range className="absolute h-full bg-primary" />
        </SliderPrimitive.Track>
        <SliderPrimitive.Thumb className="opacity-0 group-hover/root:opacity-100 transition-opacity duration-400 block h-4 w-4 rounded-full border border-primary/50 bg-background shadow transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-0" />
      </SliderPrimitive.Root>
      <div className="flex items-center justify-between text-zinc-600 text-sm">
        <span>{formatSeconds(realPosition)}</span>
        <span>{formatSeconds(duration)}</span>
      </div>
    </div>
  );
};

Seeker.displayName = SliderPrimitive.Root.displayName;

export { Seeker };
