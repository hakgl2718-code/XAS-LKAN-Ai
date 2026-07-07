export interface ChatTurn {
  role: "user" | "assistant";
  content: string;
}

export interface GeneratedFile {
  path: string;
  content: string;
}
