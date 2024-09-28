"use client";

import { useWinampSkin } from "@/components/context/WinampSkin";
import { cn } from "@/lib/utils";
import {
  forwardRef,
  MouseEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";

type WinampButtonProps = {
  className?: string;
  onClick?: (e: MouseEvent) => void;
  onMouseDown?: (e: MouseEvent) => void;
  onMouseUp?: (e: MouseEvent) => void;
  children?: React.ReactNode;
  sprite: string;
  style?: React.CSSProperties;
};

const WinampButton = forwardRef<HTMLButtonElement, WinampButtonProps>(
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

const WinampPlayerControls = () => {
  return (
    <>
      <WinampButton
        sprite="cbuttons-previous"
        className="absolute top-[88px] left-[16px]"
      />
      <WinampButton
        sprite="cbuttons-play"
        className="absolute top-[88px] left-[39px]"
      />
      <WinampButton
        sprite="cbuttons-pause"
        className="absolute top-[88px] left-[62px]"
      />
      <WinampButton
        sprite="cbuttons-stop"
        className="absolute top-[88px] left-[85px]"
      />
      <WinampButton
        sprite="cbuttons-next"
        className="absolute top-[88px] left-[108px]"
      />
      <WinampButton
        sprite="cbuttons-eject"
        className="absolute top-[89px] left-[136px]"
      />
    </>
  );
};

type WinampToggleButtonProps = {
  sprite: string;
  checked: boolean;
  className?: string;
  onChange?: (checked: boolean) => void;
  children?: React.ReactNode;
};

const WinampToggleButton = ({
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

const WinampShuffleRepeat = () => {
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);

  return (
    <>
      <WinampToggleButton
        sprite="shufrep-shuffle"
        className="absolute top-[89px] left-[164px]"
        checked={shuffle}
        onChange={setShuffle}
      />
      <WinampToggleButton
        sprite="shufrep-repeat"
        className="absolute top-[89px] left-[211px]"
        checked={repeat}
        onChange={setRepeat}
      />
    </>
  );
};

const WinampWindowButtons = () => {
  const [equalizer, setEqualizer] = useState(false);
  const [playlist, setPlaylist] = useState(false);

  return (
    <>
      <WinampToggleButton
        sprite="shufrep-eq"
        className="absolute top-[58px] left-[219px]"
        checked={equalizer}
        onChange={setEqualizer}
      />
      <WinampToggleButton
        sprite="shufrep-playlist"
        className="absolute top-[58px] left-[242px]"
        checked={playlist}
        onChange={setPlaylist}
      />
    </>
  );
};

const WinampMonoStereo = () => {
  // @TODO: Use setMono and setStereo to update the state, when playing
  const [mono] = useState(false);
  const [stereo] = useState(false);

  return (
    <>
      <WinampToggleButton
        sprite="monoster-mono"
        className="absolute top-[41px] left-[212px]"
        checked={mono}
      />
      <WinampToggleButton
        sprite="monoster-stereo"
        className="absolute top-[41px] left-[241px]"
        checked={stereo}
      />
    </>
  );
};

type WinampSliderProps = {
  value: number;
  onChange?: (value: number) => void;
  background: (value: number) => string;
  thumb: string;
  className?: string;
};

const WinampSlider = ({
  value,
  background,
  thumb,
  className,
  onChange,
}: WinampSliderProps) => {
  const offsetX = useRef(0);
  const [isDragging, setIsDragging] = useState(false);
  const [newValue, setNewValue] = useState(value);
  const thumbRef = useRef<HTMLButtonElement>(null);
  const [thumbWidth, setThumbWidth] = useState(0);
  const referenceRef = useRef<HTMLDivElement>(null);

  const calculateValue = useCallback((x: number) => {
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
    setThumbWidth(thumbRef.current?.getBoundingClientRect().width || 0);
  }, []);

  useEffect(() => {
    if (isDragging) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // @TODO: No idea, which this can't be MouseEvent :(. So a quick hack to get it working
      const handleMouseMove = (e: any) => {
        setNewValue(calculateValue(e.clientX));
      };

      const handleMouseUp = () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
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
    (e: MouseEvent) => {
      const x = e.clientX;
      const thumbRect = thumbRef.current?.getBoundingClientRect();
      const thumbWidth = thumbRect?.width || 0;
      const thumbLeft = thumbRect?.left || 0;
      offsetX.current = x - thumbLeft - thumbWidth / 2;
      setNewValue(calculateValue(x));
      setIsDragging(true);
      console.log("Dragging");
    },
    [calculateValue]
  );

  return (
    <div className={cn("relative", className)}>
      <div
        className={cn(
          "w-full h-full",
          `winamp-${background(isDragging ? newValue : value)}`
        )}
      >
        <div
          ref={referenceRef}
          className="relative h-full flex items-center"
          style={{
            left: `${Math.round(thumbWidth / 2)}px`,
            width: `calc(100% - ${thumbWidth}px)`,
          }}
        >
          <WinampButton
            ref={thumbRef}
            className={`absolute translate-x-[-50%]`}
            sprite={thumb}
            onMouseDown={handleThumbMouseDown}
            style={{ left: `${(isDragging ? newValue : value) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

const WinampSoundSliders = () => {
  return (
    <>
      <WinampSlider
        value={0.5}
        background={(v) => `volume-background-${Math.round(v * 27)}`}
        thumb="volume-thumb"
        className="absolute top-[57px] left-[107px]"
      />
      <WinampSlider
        value={0.5}
        background={(v) =>
          `balance-background-${Math.round(Math.abs(v - 0.5) * 2 * 27)}`
        }
        thumb="balance-thumb"
        className="absolute top-[57px] left-[177px]"
      />
    </>
  );
};

const WindampTrackSlider = () => {
  return (
    <WinampSlider
      value={0.5}
      background={() => `posbar-background`}
      thumb="posbar-thumb"
      className="absolute top-[72px] left-[16px]"
    />
  );
}

export default function WinampUI() {
  const skin = useWinampSkin();

  return (
    <>
      <div className={`winamp-ui`}>
        <WinampButton sprite="titlebar-main" />
        <div className="winamp-main-main relative">
          <WinampPlayerControls />
          <WinampShuffleRepeat />
          <WinampWindowButtons />
          <WinampMonoStereo />
          <WinampSoundSliders />
          <WindampTrackSlider />
        </div>
      </div>
      <style jsx>{`
        .winamp-ui {
          --winamp-skin: url(${skin.sprites.encodedImage});
        }
        .sprite-map {
          background-image: var(--winamp-skin);
          background-repeat: no-repeat;
          image-rendering: pixelated;
          background-size: ${skin.sprites.width}px ${skin.sprites.height}px;
          width: ${skin.sprites.width}px;
          height: ${skin.sprites.height}px;
        }

        ${skin.css}
      `}</style>
    </>
  );
}
