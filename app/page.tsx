"use client";

import { invoke } from "@tauri-apps/api/tauri";
import { open } from "@tauri-apps/api/dialog";
import { Button } from "@/components/ui/button";
import {
  Folder,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";
import { Seeker } from '@/components/ui/seeker';

export default function Home() {
  const handleLoad = async () => {
    const filepath = await open({
      multiple: false,
      filters: [
        {
          name: "Mod",
          extensions: ["s3m", "mod"],
        },
      ],
    });

    if (filepath !== null) {
      await invoke("load_module", { filepath });
    }
  };

  const handlePlay = async () => {
    await invoke("play_module");
  };

  const handlePause = async () => {
    await invoke("pause_module");
  };

  return (
    <main className="max-w-[400px] w-full shadow-lg p-4 rounded-lg mx-auto">
      <div className="mb-4">
        <div className="flex items-center justify-between space-x-2">
            <div className="text-lg font-semibold text-zinc-700 overflow-hidden whitespace-nowrap">
              I am the awesome mod currently playing
            </div>
          <Button variant="outline" size="icon" onClick={handleLoad}>
            <Folder className="w-5 h-5" />
          </Button>
        </div>
      </div>
      <div className="space-y-2 mb-4">
        <Seeker defaultValue={[50]} max={100} step={1} className="w-full" />
        <div className="flex items-center justify-between text-zinc-600 text-sm">
          <span>01:40</span>
          <span>03:20</span>
        </div>
      </div>
      <div className="flex justify-center items-center space-x-2">
        <Button variant="outline" size="icon">
          <SkipBack className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handlePlay}>
          <Play className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handlePause}>
          <Pause className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon">
          <Square className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon">
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>
    </main>
  );

  // return (
  //   <div className="grid grid-rows-[20px_1fr_20px] items-center justify-items-center min-h-screen p-8 pb-20 gap-16 sm:p-20 font-[family-name:var(--font-geist-sans)]">
  //     <main className="flex flex-col gap-8 row-start-2 items-center sm:items-start">
  //       <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" ref={buttonRef} onClick={() => handleLoad()}>
  //         Load
  //       </button>
  //       <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" ref={buttonRef} onClick={() => handlePlay()}>
  //         Play
  //       </button>
  //       <button className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded" ref={buttonRef} onClick={() => handlePause()}>
  //         Pause
  //       </button>
  //     </main>
  //   </div>
  // );
}
