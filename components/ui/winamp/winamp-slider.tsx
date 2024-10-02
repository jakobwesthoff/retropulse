import { cn, computedStyleRect } from '@/lib/utils';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WinampButton } from './winamp-button';

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
