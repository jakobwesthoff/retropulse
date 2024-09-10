"use client";

import { invoke } from "@tauri-apps/api/tauri";
import { open } from '@tauri-apps/api/dialog';
import { useRef } from "react";

export default function Home() {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = async () => {
    if (buttonRef.current!.disabled) {
      return;
    }

    buttonRef.current!.disabled = true;

    const filepath = await open(
      {
        multiple: false,
        filters: [{
          name: 'Mod',
          extensions: ['s3m']
        }]
      }
    );

    if (filepath !== null) {
      await invoke("play_module", { filepath });
    }

    buttonRef.current!.disabled = false;
  };

  return (
    <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
      <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
        <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" ref={buttonRef} onClick={() => handleClick()}>
          Action!
        </button>
      </main>
    </div>
  );
}
