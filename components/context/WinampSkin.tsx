"use client";

import { createDeferred } from "@/lib/utils";
import { invoke } from "@tauri-apps/api/core";
import {
  createContext,
  PropsWithChildren,
  use,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { useAppConfig } from "./AppConfig";

export type SpriteMap = {
  meta: {
    [key: string]: {
      x: number;
      y: number;
      width: number;
      height: number;
    };
  };
  encodedImage: string;
  width: number;
  height: number;
};

type WinampSkin = {
  sprites: SpriteMap;
  cssMap: Map<string, Map<string, string>>;
  css: string;
};

const WinampSkinContext = createContext<Promise<WinampSkin> | null>(null);

const createCssMap = (sprites: SpriteMap): Map<string, Map<string, string>> => {
  const cssMap: Map<string, Map<string, string>> = new Map();

  for (const [name, { x, y, width, height }] of Object.entries(sprites.meta)) {
    // Add .winamp- prefix to make it a proper css class
    const cssName = `.winamp-${name}`;
    cssMap.set(
      cssName,
      new Map<string, string>([
        ["background-image", "var(--winamp-skin)"],
        ["background-position", `-${x}px -${y}px`],
        ["width", `${width}px`],
        ["height", `${height}px`],
      ])
    );
  }

  return cssMap;
};

const createWinampSkin = (sprites: SpriteMap) => {
  return {
    sprites,
    cssMap: createCssMap(sprites),
    get css() {
      const rules = Array.from<[string, Map<string, string>]>(
        this.cssMap.entries()
      ).map(([selector, styles]) => {
        const cssBody = Array.from(styles.entries())
          .map(([key, value]) => `${key}: ${value};`)
          .join("");

        return `${selector} { ${cssBody} }`;
      });

      return rules.join("\n");
    },
  };
};

export const WinampSkinProvider = ({ children }: PropsWithChildren) => {
  const [isClient, setIsClient] = useState(false);
  const suspender = useMemo(() => createDeferred<WinampSkin>(), []);
  const appConfig = useAppConfig();

  useEffect(() => {
    // useEffect is only called on the client
    setIsClient(true);
    invoke<SpriteMap>("get_winamp_sprite_map").then((sprites) => {
      suspender.resolve(createWinampSkin(sprites));
    });
  }, [suspender, appConfig]);

  if (!isClient) {
    // We do not render anyhthing on the server, as it will simply cause an
    // endless loop, if something in there uses the useAppConfig hook.
    return null;
  }

  return (
    <WinampSkinContext.Provider value={suspender.promise}>
      {children}
    </WinampSkinContext.Provider>
  );
};

export const useWinampSkin = (): WinampSkin => {
  const context = useContext(WinampSkinContext);

  if (!context) {
    throw new Error(
      "useWinampSkin can only be used within a WinampSkinProvider"
    );
  }

  return use(context);
};

export type WinampSkinnedProps = {
  children: React.ReactNode;
};

export const WinampSkinned = ({ children }: WinampSkinnedProps) => {
  const skin = useWinampSkin();

  return (
    <>
      <div className="winamp-ui align-top inline-block">{children}</div>
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
