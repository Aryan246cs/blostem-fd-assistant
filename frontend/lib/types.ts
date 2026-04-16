export type Language = "english" | "hindi" | "tamil" | "marathi" | "bengali";

export type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  timestamp: string;
};

export type ChatSession = {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  preview?: string;
};
