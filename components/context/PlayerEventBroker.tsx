"use client";

import { Channel, invoke } from "@tauri-apps/api/core";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  PropsWithChildren,
  useCallback,
  useRef,
  useMemo,
} from "react";

export type PlayerEvent =
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
  | { event: "positionUpdated"; data: { position: number; duration: number } }
  | { event: "seeked"; data: { position: number; duration: number } };

interface PlayerEventBroker {
  subscribe: (callback: (event: PlayerEvent) => void) => string;
  unsubscribe: (id: string) => void;
}

const PlayerEventBrokerContext = createContext<PlayerEventBroker | undefined>(
  undefined
);

const PlayerEventBrokerProvider = ({ children }: PropsWithChildren) => {
  const [subscribers, setSubscribers] = useState<
    Map<string, (event: PlayerEvent) => void>
  >(new Map());
  const subscribersRef = useRef(subscribers);

  useEffect(() => {
    subscribersRef.current = subscribers;
  }, [subscribers]);

  const subscribe = useCallback(
    (callback: (event: PlayerEvent) => void): string => {
      const id = Math.random().toString(36).substr(2, 9);
      setSubscribers((prev) => new Map(prev).set(id, callback));
      console.log(
        "PlayerEventsBroker: Subscribing to player events with id",
        id
      );
      return id;
    },
    []
  );

  const unsubscribe = useCallback((id: string): void => {
    console.error(
      "PlayerEventsBroker: Unsubscribing from player events with id",
      id
    );
    setSubscribers((prev) => {
      const newSubscribers = new Map(prev);
      newSubscribers.delete(id);
      return newSubscribers;
    });
  }, []);

  const dispatchEvent = useCallback((event: PlayerEvent) => {
    subscribersRef.current.forEach((callback) => callback(event));
  }, []);

  useEffect(() => {
    const channel = new Channel<PlayerEvent>();
    channel.onmessage = (message) => {
      dispatchEvent(message);
    };

    const subscriptionPromise = invoke("subscribe_to_player_events", {
      channel,
    });

    return () => {
      subscriptionPromise.then((id) => {
        invoke("unsubscribe_from_player_events", { id });
      });
    };
  }, [dispatchEvent]);

  const value = useMemo(
    () => ({ subscribe, unsubscribe }),
    [subscribe, unsubscribe]
  );

  return (
    <PlayerEventBrokerContext.Provider value={value}>
      {children}
    </PlayerEventBrokerContext.Provider>
  );
};

const usePlayerEventBroker = () => {
  const context = useContext(PlayerEventBrokerContext);
  if (context === undefined) {
    throw new Error(
      "usePlayerEventBroker must be used within a PlayerEventBrokerProvider"
    );
  }
  return context;
};

export { PlayerEventBrokerProvider, usePlayerEventBroker };
