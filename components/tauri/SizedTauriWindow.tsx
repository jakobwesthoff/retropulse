import { getCurrentWindow, LogicalSize } from "@tauri-apps/api/window";
import { useEffect } from "react";

type SizedTauriWindowProps = {
  width: number;
  height: number;
  children: React.ReactNode;
};

export const SizedTauriWindow = ({
  width,
  height,
  children,
}: SizedTauriWindowProps) => {
  useEffect(() => {
    if (typeof window !== "undefined") {
      let tauriWindow = getCurrentWindow();
      tauriWindow.setSize(new LogicalSize(width, height));
    }
  }, [width, height]);

  return children;
};
