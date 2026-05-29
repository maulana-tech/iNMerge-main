"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function GithubCallbackPage() {
  const router = useRouter();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("code");

    if (code) {
      sessionStorage.setItem("code", code);
      sessionStorage.setItem("code_timestamp", Date.now().toString());
    }

    router.replace("/issues");
  }, [router]);

  return <div className="flex items-center justify-center min-h-screen">Authenticating with GitHub...</div>;
}
