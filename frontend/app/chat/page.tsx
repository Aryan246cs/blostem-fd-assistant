"use client";

import { Suspense } from "react";
import ChatPage from "@/components/ChatPage";

export default function Chat() {
  return (
    <Suspense fallback={<div className="app-bg min-h-screen" />}>
      <ChatPage />
    </Suspense>
  );
}
