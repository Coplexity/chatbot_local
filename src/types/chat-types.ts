export interface Reference {
  id: string;
  number: number;
  title: string;
  content: string;
  source: string;
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
