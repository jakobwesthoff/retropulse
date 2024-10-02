"use client";

import { useAppConfig } from "@/components/context/AppConfig";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Home() {
  const { use_winamp_skin } = useAppConfig();
  const router = useRouter();

  useEffect(() => {
    if (use_winamp_skin) {
      router.push("/winamp");
    } else {
      router.push("/modern");
    }
  });

  return <div>Redirecting...</div>;
}
