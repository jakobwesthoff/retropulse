"use client";

import { useWinampSkin } from "@/components/context/WinampSkin";
import {
  WinampButton,
  WinampDigits,
  WinampMarquee,
  WinampSlider,
  WinampSprite,
  WinampSpriteText,
  WinampToggleButton,
} from "@/components/ui/winamp";
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
  onTitlebarMouseDown?: () => void;
  onTitlebarMouseUp?: () => void;
  onTitlebarClick?: () => void;
};

const WinampPlayerWindow = ({
  onTitlebarMouseDown = () => {},
  onTitlebarMouseUp = () => {},
  onTitlebarClick = () => {},
  children,
}: WinampBodyProps) => {
  return (
    <div className="flex flex-col">
      <WinampButton
        sprite="titlebar-main"
        onClick={onTitlebarClick}
        onMouseDown={onTitlebarMouseDown}
        onMouseUp={onTitlebarMouseUp}
      />
      <div className="winamp-main-main relative">{children}</div>
    </div>
  );
};

type WinampSkinnedProps = {
  children: React.ReactNode;
};

const WinampSkinned = ({ children }: WinampSkinnedProps) => {
  const skin = useWinampSkin();

  return (
    <>
      <div className="winamp-ui">{children}</div>
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

  return (
    <WinampSkinned>
      <WinampPlayerWindow>
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
      </WinampPlayerWindow>
    </WinampSkinned>
  );
}
