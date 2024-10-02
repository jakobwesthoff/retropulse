"use client";

import { SizedTauriWindow } from "@/components/tauri/SizedTauriWindow";
import { WinampButton } from '@/components/ui/winamp/winamp-button';
import { WinampDigits } from '@/components/ui/winamp/winamp-digits';
import { WinampMarquee } from '@/components/ui/winamp/winamp-marquee';
import { WinampSlider } from '@/components/ui/winamp/winamp-slider';
import { WinampSprite } from '@/components/ui/winamp/winamp-sprite';
import { WinampSpriteText } from '@/components/ui/winamp/winamp-sprite-text';
import { WinampToggleButton } from '@/components/ui/winamp/winamp-toggle-button';
import { cn } from "@/lib/utils";
import { useState } from "react";

type WinampPlayerControlsProps = {
  onPrevious: () => void;
  onPlay: () => void;
  onPause: () => void;
  onStop: () => void;
  onNext: () => void;
  onEject: () => void;
};

const WinampPlayerControls = ({
  onPrevious,
  onPlay,
  onPause,
  onStop,
  onNext,
  onEject,
}: WinampPlayerControlsProps) => {
  return (
    <>
      <WinampButton
        sprite="cbuttons-previous"
        className="absolute top-[88px] left-[16px]"
        onClick={onPrevious}
      />
      <WinampButton
        sprite="cbuttons-play"
        className="absolute top-[88px] left-[39px]"
        onClick={onPlay}
      />
      <WinampButton
        sprite="cbuttons-pause"
        className="absolute top-[88px] left-[62px]"
        onClick={onPause}
      />
      <WinampButton
        sprite="cbuttons-stop"
        className="absolute top-[88px] left-[85px]"
        onClick={onStop}
      />
      <WinampButton
        sprite="cbuttons-next"
        className="absolute top-[88px] left-[108px]"
        onClick={onNext}
      />
      <WinampButton
        sprite="cbuttons-eject"
        className="absolute top-[89px] left-[136px]"
        onClick={onEject}
      />
    </>
  );
};

type WinampShuffleRepeatProps = {
  shuffle: boolean;
  onShuffleChange: (checked: boolean) => void;
  repeat: boolean;
  onRepeatChange: (checked: boolean) => void;
};

const WinampShuffleRepeat = ({
  shuffle,
  onShuffleChange,
  repeat,
  onRepeatChange,
}: WinampShuffleRepeatProps) => {
  return (
    <>
      <WinampToggleButton
        sprite="shufrep-shuffle"
        className="absolute top-[89px] left-[164px]"
        checked={shuffle}
        onChange={onShuffleChange}
      />
      <WinampToggleButton
        sprite="shufrep-repeat"
        className="absolute top-[89px] left-[211px]"
        checked={repeat}
        onChange={onRepeatChange}
      />
    </>
  );
};

type WinampWindowButtonsProps = {
  equalizer: boolean;
  playlist: boolean;
  onEqualizerChange: (checked: boolean) => void;
  onPlaylistChange: (checked: boolean) => void;
};

const WinampWindowButtons = ({
  equalizer,
  onEqualizerChange: onChangeEqualizer,
  playlist,
  onPlaylistChange: onChangePlaylist,
}: WinampWindowButtonsProps) => {
  return (
    <>
      <WinampToggleButton
        sprite="shufrep-eq"
        className="absolute top-[58px] left-[219px]"
        checked={equalizer}
        onChange={onChangeEqualizer}
      />
      <WinampToggleButton
        sprite="shufrep-playlist"
        className="absolute top-[58px] left-[242px]"
        checked={playlist}
        onChange={onChangePlaylist}
      />
    </>
  );
};

enum Channels {
  MONO,
  STEREO,
}

type WinampChannelsIndicatorProps = {
  channels: Channels;
};

const WinampChannelsIndicator = ({
  channels,
}: WinampChannelsIndicatorProps) => {
  return (
    <>
      <WinampToggleButton
        sprite="monoster-mono"
        className="absolute top-[41px] left-[212px]"
        checked={channels === Channels.MONO}
      />
      <WinampToggleButton
        sprite="monoster-stereo"
        className="absolute top-[41px] left-[241px]"
        checked={channels === Channels.STEREO}
      />
    </>
  );
};

type WinampSoundSlidersProps = {
  volume: number;
  onVolumeChange: (newValue: number) => void;
  balance: number;
  onBalanceChange: (newValue: number) => void;
};

const WinampSoundSliders = ({
  volume,
  onVolumeChange,
  balance,
  onBalanceChange,
}: WinampSoundSlidersProps) => {
  return (
    <>
      <WinampSlider
        value={volume}
        onChange={onVolumeChange}
        background={(v) => `volume-background-${Math.round(v * 27)}`}
        thumb="volume-thumb"
        className="absolute top-[57px] left-[107px]"
      />
      <WinampSlider
        value={balance * 0.5 + 0.5}
        onChange={(newValue) => {
          // Normalize the value to [-1, 1]
          const normalized = newValue * 2 - 1;
          // Snap around 0
          const snapped = Math.abs(normalized) < 0.2 ? 0 : normalized;
          onBalanceChange(snapped);
        }}
        background={(v) =>
          `balance-background-${Math.round(Math.abs(v - 0.5) * 2 * 27)}`
        }
        thumb="balance-thumb"
        className="absolute top-[57px] left-[177px]"
      />
    </>
  );
};

type WinampTrackSliderProps = {
  value: number;
  onChange?: (value: number) => void;
};

const WindampTrackSlider = ({ value, onChange }: WinampTrackSliderProps) => {
  return (
    <WinampSlider
      value={value}
      onChange={onChange}
      background={() => `posbar-background`}
      thumb="posbar-thumb"
      className="absolute top-[72px] left-[16px]"
    />
  );
};

type WinampTrackTitleProps = {
  title: string;
};

const WinampTrackTitle = ({ title }: WinampTrackTitleProps) => {
  return (
    <WinampMarquee
      text={title}
      seperator={" +++ "}
      className="absolute top-[27px] left-[110px] w-[155px]"
    />
  );
};

type WinampKilobitsAndKiloHertzProps = {
  kbps: number;
  kHz: number;
};

const WinampKilobitsAndKiloHertz = ({
  kbps,
  kHz,
}: WinampKilobitsAndKiloHertzProps) => {
  return (
    <>
      <WinampSpriteText
        text={kbps.toString()}
        className="absolute left-[111px] top-[43px]"
      />
      <WinampSpriteText
        text={kHz.toString()}
        className="absolute left-[156px] top-[43px]"
      />
    </>
  );
};

enum PlayState {
  PLAYING = "playpaus-playing",
  PAUSED = "playpaus-paused",
  STOPPED = "playpaus-stopped",
}

type WinampPlayStateIndicatorProps = {
  state: PlayState;
};

const WinampPlayStateIndicator = ({ state }: WinampPlayStateIndicatorProps) => {
  const workIndicator = {
    [PlayState.PLAYING]: "playpaus-not-working",
    [PlayState.PAUSED]: null,
    [PlayState.STOPPED]: null,
  }[state];

  return (
    <>
      <WinampSprite
        sprite={state.toString()}
        className="absolute top-[28px] left-[26px]"
      />
      {workIndicator !== null && (
        <WinampSprite
          sprite={workIndicator}
          className="absolute top-[28px] left-[24px]"
        />
      )}
    </>
  );
};

enum PlayTimeMode {
  Played,
  Remaining,
}

type WinampPlayTimeProps = {
  current: number;
  total: number;
  mode: PlayTimeMode;
  onModeChange?: (mode: PlayTimeMode) => void;
};

const WinampPlayTime = ({
  current,
  total,
  mode,
  onModeChange = () => {},
}: WinampPlayTimeProps) => {
  const calcBase = mode === PlayTimeMode.Played ? current : total - current;

  const minutes = Math.floor(calcBase / 60);
  const seconds = Math.floor(calcBase % 60);

  const minusSign = {
    [PlayTimeMode.Played]: "numbers-no-minus-sign",
    [PlayTimeMode.Remaining]: "numbers-minus-sign",
  }[mode];

  return (
    <div
      className="absolute top-[26px] left-[39px] flex"
      onClick={() =>
        onModeChange(
          mode == PlayTimeMode.Played
            ? PlayTimeMode.Remaining
            : PlayTimeMode.Played
        )
      }
    >
      <WinampSprite sprite={minusSign} className="mt-[6px]" />
      <WinampDigits value={minutes} padding={2} className="ml-[3px]" />
      <WinampDigits value={seconds} padding={2} className="ml-[10px]" />
    </div>
  );
};

type WinampBodyProps = {
  children: React.ReactNode;
  doubleSize?: boolean;
  onTitlebarMouseDown?: () => void;
  onTitlebarMouseUp?: () => void;
  onTitlebarClick?: () => void;
};

const WinampPlayerWindow = ({
  doubleSize = false,
  onTitlebarMouseDown = () => {},
  onTitlebarMouseUp = () => {},
  onTitlebarClick = () => {},
  children,
}: WinampBodyProps) => {
  return (
    <>
      <div
        className={cn(
          "winamp-player-window",
          "flex flex-col",
          doubleSize && "winamp-player-doubled"
        )}
      >
        <WinampButton
          sprite="titlebar-main"
          onClick={onTitlebarClick}
          onMouseDown={onTitlebarMouseDown}
          onMouseUp={onTitlebarMouseUp}
        />
        <div className="winamp-main-main relative">{children}</div>
      </div>
      <style jsx>{`
        .winamp-player-window {
          image-rendering: -moz-crisp-edges;
          image-rendering: -o-crisp-edges;
          image-rendering: -webkit-optimize-contrast;
          -ms-interpolation-mode: nearest-neighbor;
          image-rendering: pixelated;
        }

        /* @TODO: Might not work on all Systems/Browsers. Has to be tested, when
         * doing crossplatform integration. */
        .winamp-player-doubled {
          transform-origin: 0 0;
          transform: scale(2);
        }
      `}</style>
    </>
  );
};

type WinampClutterBarProps = {
  onOptionsClick: () => void;
  onDoubleSizeChange: () => void;
  doubleSize: boolean;
  // @TODO: I have no idea, what the A, I and V buttons are usually doing
  // anymore. We can extend this API, should be need it.
};

const WinampClutterBar = ({
  onOptionsClick,
  onDoubleSizeChange,
  doubleSize,
}: WinampClutterBarProps) => {
  return (
    <div className="flex flex-col">
      <WinampButton
        sprite="clutterbar-options"
        className="absolute top-[0px] left-[0px]"
        onClick={onOptionsClick}
      />
      <WinampToggleButton
        sprite="clutterbar-doublesize"
        className="absolute top-[0px] left-[250px]"
        checked={doubleSize}
        onChange={onDoubleSizeChange}
      />
    </div>
  );
};

export default function WinampUI() {
  const [trackPosition, setTrackPosition] = useState<number>(0.5);
  const [volume, setVolume] = useState<number>(0.8);
  const [balance, setBalance] = useState<number>(0.5);
  const [equalizer] = useState(false);
  const [playlist] = useState(false);
  const [shuffle, setShuffle] = useState(false);
  const [repeat, setRepeat] = useState(false);
  const [playtimeMode, setPlaytimeMode] = useState(PlayTimeMode.Played);

  // @TODO: Allow for toggling using the clutterbar
  const [doubleSize] = useState(true);

  return (
    <SizedTauriWindow
      width={275 * (doubleSize ? 2 : 1)}
      height={130 * (doubleSize ? 2 : 1)}
    >
      <WinampPlayerWindow doubleSize={doubleSize}>
        <WinampPlayerControls
          onPrevious={() => {}}
          onPlay={() => {}}
          onPause={() => {}}
          onStop={() => {}}
          onNext={() => {}}
          onEject={() => {}}
        />
        <WinampShuffleRepeat
          shuffle={shuffle}
          onShuffleChange={(newValue) => setShuffle(newValue)}
          repeat={repeat}
          onRepeatChange={(newValue) => setRepeat(newValue)}
        />
        <WinampWindowButtons
          equalizer={equalizer}
          playlist={playlist}
          onEqualizerChange={() => {}}
          onPlaylistChange={() => {}}
        />
        <WinampChannelsIndicator channels={Channels.MONO} />
        <WinampSoundSliders
          volume={volume}
          onVolumeChange={(newValue) => setVolume(newValue)}
          balance={balance}
          onBalanceChange={(newValue) => setBalance(newValue)}
        />
        <WindampTrackSlider
          value={trackPosition}
          onChange={(newValue) => {
            setTrackPosition(newValue);
          }}
        />
        <WinampTrackTitle title="Some really long and therefore scrolling title" />
        <WinampKilobitsAndKiloHertz kbps={192} kHz={44} />
        <WinampPlayStateIndicator state={PlayState.PLAYING} />
        <WinampPlayTime
          current={77}
          total={182}
          mode={playtimeMode}
          onModeChange={(mode) => setPlaytimeMode(mode)}
        />
        {/*@TODO: Implement the clutterbar, which is hard to do, as it consists of
      one image for each of its state even though it has all seperate "button
      zones".*/}
      </WinampPlayerWindow>
    </SizedTauriWindow>
  );
}
