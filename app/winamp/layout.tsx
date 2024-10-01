import {
  WinampSkinned,
  WinampSkinProvider,
} from "@/components/context/WinampSkin";

export default function WinampLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <WinampSkinProvider>
      <WinampSkinned>
        {children}
      </WinampSkinned>
    </WinampSkinProvider>
  );
}
