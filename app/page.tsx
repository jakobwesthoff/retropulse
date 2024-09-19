"use client";

import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import {
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
  StepForward,
} from "lucide-react";
import { Seeker } from "@/components/ui/seeker";
import { useCallback, useEffect, useState } from "react";
import { Marquee } from "@/components/ui/marquee";
import { usePlayerEventBroker } from "@/components/context/PlayerEventBroker";

export default function Home() {
  const [title, setTitle] = useState("");
  const broker = usePlayerEventBroker();

  useEffect(() => {
    console.warn("Home: Subscribing to player events");
    const subscriptionId = broker.subscribe((message) => {
      switch (message.event) {
        case "loaded":
          console.log(message);
          const title = message.data.metadata.find(
            (candidate) => candidate.key === "title"
          );
          const artist = message.data.metadata.find(
            (candidate) => candidate.key === "artist"
          );

          if (title) {
            if (artist) {
              setTitle(`${artist.value} - ${title.value}`);
            } else {
              setTitle(title.value);
            }
          } else {
            setTitle(message.data.filename);
          }
          break;
      }
    });

    return () => {
      broker.unsubscribe(subscriptionId);
    };
  }, [broker]);

  const handleLoad = useCallback(async () => {
    const filepath = await open({
      multiple: false,
      directory: true,
      filters: [],
    });

    if (filepath !== null) {
      await invoke("load_module", { filepath });
    }
  }, []);

  const handlePlay = useCallback(async () => {
    await invoke("play_module");
  }, []);

  const handlePause = useCallback(async () => {
    await invoke("pause_module");
  }, []);

  const handleStop = useCallback(async () => {
    await invoke("stop_module");
  }, []);

  const handlePrevious = useCallback(async () => {
    await invoke("previous_module");
  }, []);

  const handleNext = useCallback(async () => {
    await invoke("next_module");
  }, []);

  return (
    <main className="max-w-[400px] w-full shadow-lg p-4 rounded-lg mx-auto">
      <div className="mb-4">
        <div className="flex items-center justify-between space-x-2">
          <Marquee className="text-lg font-semibold text-zinc-700">
            {title}
          </Marquee>
          <Button
            variant="outline"
            size="icon"
            className="flex-shrink-0"
            onClick={handleLoad}
          >
            {/* There is no eject icon, but a rotated step-forward actually is a
                pretty good eject symbol ;) */}
            <StepForward className="-rotate-90 w-5 h-5" />
          </Button>
        </div>
      </div>
      <Seeker className="mb-4" />
      <div className="flex justify-center items-center space-x-2">
        <Button variant="outline" size="icon" onClick={handlePrevious}>
          <SkipBack className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handlePlay}>
          <Play className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handlePause}>
          <Pause className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleStop}>
          <Square className="w-5 h-5" />
        </Button>
        <Button variant="outline" size="icon" onClick={handleNext}>
          <SkipForward className="w-5 h-5" />
        </Button>
      </div>
    </main>
  );
}
