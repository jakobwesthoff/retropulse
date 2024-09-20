"use client";

import { Channel, invoke } from "@tauri-apps/api/core";
import {
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
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

export type PlayerEventsSubscription = (event: PlayerEvent) => void;

export type PlayerEventBrokerContext = {
  subscribe(fn: PlayerEventsSubscription): string;
  unsubscribe(id: string): void;
};

const PlayerEventBrokerContext = createContext<
  PlayerEventBrokerContext | undefined
>(undefined);

export const PlayerEventBrokerProvider = ({ children }: PropsWithChildren) => {
  const subscriptionsRef = useRef<Map<string, PlayerEventsSubscription>>(
    new Map()
  );

  const dispatchEvent = useCallback((message: PlayerEvent): void => {
    subscriptionsRef.current.forEach((subscription) => subscription(message));
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
      subscriptionPromise.then((id) =>
        invoke("unsubscribe_from_player_events", { id })
      );
    };
  }, [dispatchEvent]);

  const subscribe = useCallback((fn: PlayerEventsSubscription): string => {
    const id = Math.random().toString(36).substring(2, 11);
    subscriptionsRef.current.set(id, fn);
    console.log("Internal PlayerEvents subscription:", id);
    return id;
  }, []);

  const unsubscribe = useCallback((id: string): void => {
    subscriptionsRef.current.delete(id);
    console.log("Internal PlayerEvents unsubscription:", id);
  }, []);

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

export const usePlayerEventBroker = (): PlayerEventBrokerContext => {
  const context = useContext(PlayerEventBrokerContext);
  if (!context) {
    throw new Error(
      "usePlayerEventBroker can only be used within a PlayerEventBrokerProvider"
    );
  }
  return context;
};
