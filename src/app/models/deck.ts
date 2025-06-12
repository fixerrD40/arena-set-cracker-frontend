import { ColorIdentity } from "./color";

export interface Deck {
  id?: number;
  name: string;
  arenaDeck: string;
  identity?: ColorIdentity;
  cards?: Record<string, number>;
  tags?: string[];
  notes?: string;
  createdAt?: string;
}