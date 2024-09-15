"use client";

import { Channel, invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import { Button } from "@/components/ui/button";
import {
  Folder,
  Pause,
  Play,
  SkipBack,
  SkipForward,
  Square,
} from "lucide-react";
import { Seeker } from "@/components/ui/seeker";
import { useEffect, useState } from "react";

type PlayerEvent =
  | { event: "playing" }
  | { event: "paused" }
  | { event: "positionUpdated"; data: { position: number; duration: number } };

export default function Home() {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    const channel = new Channel<PlayerEvent>();
    channel.onmessage = (message) => {
      switch (message.event) {
        case "positionUpdated":
          setDuration(message.data.duration);
          setPosition(message.data.position);
          break;
        default:
          console.log("Received player event of type ", message.event);
      }
    };

    const subscriptionPromise = invoke("subscribe_to_player_events", {
      channel,
    });

    return () => {
      subscriptionPromise.then((id) => {
        invoke("unsubscribe_from_player_events", { id });
      });
    };
  }, []);

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

  const formatSeconds = (seconds: number): string => {
    const rounded = Math.round(seconds);
    const s = rounded % 60;
    const m = Math.floor(rounded / 60);

    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
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
        <Seeker
          value={[Math.round(position)]}
          max={Math.round(duration)}
          step={1}
          className="w-full"
        />
        <div className="flex items-center justify-between text-zinc-600 text-sm">
          <span>{formatSeconds(position)}</span>
          <span>{formatSeconds(duration)}</span>
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
}
