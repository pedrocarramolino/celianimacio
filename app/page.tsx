"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { homePathFor, useAuth } from "@/features/auth/auth-provider";
import { FullScreenLoader } from "@/components/layout/states";
import { ConfigMissing } from "@/components/layout/config-missing";

export default function Home() {
  const { session, loading, configured } = useAuth();
  const router = useRouter();
  useEffect(() => {
    if (configured && !loading) router.replace(homePathFor(session));
  }, [configured, loading, router, session]);
  if (!configured) return <ConfigMissing />;
  return <FullScreenLoader />;
}
