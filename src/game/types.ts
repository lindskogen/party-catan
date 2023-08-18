import { Tile } from "./tiles";

export interface ConnectionState {
  lastSeen: number,
  connected: boolean;
}

export interface Player {
  id: string;
  color: string;
  name: string;
  connectionState: ConnectionState;
  cursor: [number, number] | undefined;
  cards: {
    brick: number;
    lumber: number;
    ore: number;
    grain: number;
    wool: number;
  };
}

export interface Board {
  tilesByValue: Record<string, [Tile, number | null][]>;
  robberPosition: number;
  tiles: [Tile, number | null][];
  roads: Road[][];
}

export interface Data {
  board: Board;
  players: Player[];
  playerTurn: number;
  dice: number[];
  chat: TextMessage[]
}

export type TextMessage = {
  type: "text";
  playerId: string;
  text: string;
} | {
  type: "system";
  text: string;
}

export interface Road {
  playerId: string | null;
  id: string;
}

export type DataMessage =
  | { type: "roll_dice" }
  | { type: "claim_road"; id: string }
  | { type: "cursor_data"; point: [number, number] }
  | { type: "chat_message"; text: string }
  | { type: "reconnect_challenge_response"; secret: string };
