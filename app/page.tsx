"use client";

import { Channel, invoke } from "@tauri-apps/api/core";
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
import { useEffect, useState } from "react";
import { Marquee } from "@/components/ui/marquee";

type PlayerEvent =
  | {
      event: "loaded";
      data: {
        filename: string;
        filepath: string;
        metadata: Array<{ key: string; value: string }>;
        duration: number;
      };
    }
  | { event: "playing"; data: undefined }
  | { event: "paused"; data: undefined }
  | { event: "stopped"; data: undefined }
  | { event: "positionUpdated"; data: { position: number; duration: number } };

export default function Home() {
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [title, setTitle] = useState("");

  useEffect(() => {
    const channel = new Channel<PlayerEvent>();
    channel.onmessage = (message) => {
      switch (message.event) {
        case "loaded":
          console.log(message);
          setDuration(message.data.duration);
          setPosition(0);
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
        case "positionUpdated":
          setDuration(message.data.duration);
          setPosition(message.data.position);
          break;
        case "stopped":
          setPosition(0);
          break;
        default:
          console.log(
            "Received player event of type ",
            message.event,
            message.data
          );
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
      directory: true,
      filters: [],
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

  const handleStop = async () => {
    await invoke("stop_module");
  };

  const handlePrevious = async () => {
    await invoke("previous_module");
  };

  const handleNext = async () => {
    await invoke("next_module");
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
