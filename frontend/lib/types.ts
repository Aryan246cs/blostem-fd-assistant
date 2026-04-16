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

export type FDPlan = {
  bank: string;
  logo: string;
  rate: string;
  maxRate: number;
  tenure: string;
  tenureYears: number;
  type: string;
  compounding: string;
  description: string;
  link: string;
};
