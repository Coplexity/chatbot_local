import type { Citation } from "./api-types";

// Reference extends Citation with display properties
export interface Reference extends Citation {
  id: string;
  number: number;
}

export interface Message {
  id: number;
  sender: "user" | "bot";
  text: string;
  time: string;
  references?: Reference[];
}

export interface ChatHistory {
  chatId: string;
  title: string;
  messages: Message[];
}

