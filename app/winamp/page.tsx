"use client";

import { useWinampSkin } from "@/components/context/WinampSkin";
import {
  WinampButton,
  WinampMarquee,
  WinampSlider,
  WinampSpriteText,
  WinampToggleButton,
} from "@/components/ui/winamp";
import { useState } from "react";

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
};

const WinampTrackTitle = () => {
  return (
    <WinampMarquee
      text="Hello World! It really whips the llamas ass"
      seperator={" +++ "}
      className="absolute top-[27px] left-[110px] w-[155px]"
    />
  );
};

const WinampKilobitsAndKiloHertz = () => {
  return <>
    <WinampSpriteText text='192' className='absolute left-[111px] top-[43px]' />
    <WinampSpriteText text='44' className='absolute left-[156px] top-[43px]' />
  </>;
};

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
          <WinampTrackTitle />
          <WinampKilobitsAndKiloHertz />
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
