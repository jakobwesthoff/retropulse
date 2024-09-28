import type { Metadata } from "next";
import "./globals.css";
import { PlayerEventBrokerProvider } from "@/components/context/PlayerEventBroker";
import { Suspense } from "react";
import { AppConfigProvider } from "@/components/context/AppConfig";

export const metadata: Metadata = {
  title: "Retropulse",
  description: "The best place to listen to your favorite tracker/mod music",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">
        <Suspense fallback={<></>}>
          <AppConfigProvider>
            <PlayerEventBrokerProvider>
              {children}
            </PlayerEventBrokerProvider>
          </AppConfigProvider>
        </Suspense>
      </body>
    </html>
  );
}
