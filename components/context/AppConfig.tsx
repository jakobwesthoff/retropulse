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

export type AppConfig = {
  use_winamp_skin: boolean;
  winamp_skin_path: string | null;
};

const AppConfigContext = createContext<Promise<AppConfig> | null>(null);

export const AppConfigProvider = ({ children }: PropsWithChildren) => {
  const [isClient, setIsClient] = useState(false);
  const suspender = useMemo(() => createDeferred<AppConfig>(), []);

  useEffect(() => {
    // useEffect is only called on the client
    setIsClient(true);
    invoke<AppConfig>("get_app_config").then((config) => {
      console.log("Received AppConfig", config);
      suspender.resolve(config);
    });
  }, [suspender]);

  if (!isClient) {
    // We do not render anyhthing on the server, as it will simply cause an
    // endless loop, if something in there uses the useAppConfig hook.
    return null;
  }

  return (
    <AppConfigContext.Provider value={suspender.promise}>
      {children}
    </AppConfigContext.Provider>
  );
};

export const useAppConfig = (): AppConfig => {
  const context = useContext(AppConfigContext);

  if (!context) {
    throw new Error("useAppConfig can only be used within a AppConfigProvider");
  }

  return use(context);
};
