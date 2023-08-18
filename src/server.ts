import { PartyKitConnection, PartyKitServer } from "partykit/server";
import { getShuffledGameTiles, Tile } from "./game/tiles";
import { capitalize, groupBy, range, shuffle, uniqueId } from "lodash-es";
import { Board, Data, DataMessage, Player, Road } from "./game/types";
import { TILES_PER_ROW } from "./game/common";
import { randomAdjective, randomNoun } from "sillyname";

function createRoads(): Road[][] {
  const roadsPerRow = [6, 4, 8, 5, 10, 6, 10, 5, 8, 4, 6];

  return roadsPerRow.map((count) =>
    range(count).map(() => ({ playerId: null, id: uniqueId("road") })),
  );
}

function createBoard(): Board {
  const { tiles: allTiles, values: allValues } = getShuffledGameTiles();

  const robberPosition = allTiles.findIndex((t) => t === "Desert");

  let rowOffset = 0;
  let valueOffset = 0;
  const tiles: [Tile, number | null][][] = [];
  TILES_PER_ROW.forEach((rowCount, rowIndex) => {
    tiles.push(
      allTiles.slice(rowOffset, rowOffset + rowCount).map((tileName) => {
        if (tileName === "Desert") {
          return [tileName, null];
        } else {
          return [tileName, allValues[valueOffset++]];
        }
      }),
    );

    rowOffset += rowCount;
  });

  const flatTiles = tiles.flat();

  const tilesByValue = groupBy(flatTiles, ([t, v]) => v ?? 7);

  console.log(tilesByValue);

  return {
    tiles: flatTiles,
    tilesByValue,
    roads: createRoads(),
    robberPosition,
  };
}

const motd = `Welcome to settlers of catan
  
Commands:
/clear\t\t\tClears the chat`;

const state: Data = {
  board: createBoard(),
  players: [],
  playerTurn: 0,
  dice: [1, 1],
  chat: [{type: "system", text: motd}],
};

function rollSingleDice() {
  return Math.round(1 + Math.random() * 5);
}

function rollDice() {
  const d1 = rollSingleDice();
  const d2 = rollSingleDice();

  state.dice = [d1, d2];
}

function generateName() {
  return capitalize(`${randomAdjective()}${randomNoun()}`);
}

function generateSecret(): string {
  return btoa(Math.random().toString()).substring(10, 60);
}

const COLORS = shuffle([
  "#FF5733",
  "#3498DB",
  "#9B59B6",
  "#F39C12",
  "#FFCC00",
  "#FF00FF",
  "#800080",
  "#8A2BE2",
  "#00FA9A",
  "#2E8B57",
]);

function getColor(index: number) {
  return COLORS[index];
}

function createPlayer(id: string, index: number): Player {
  return {
    id,
    connectionState: { connected: true, lastSeen: new Date().getTime() },
    cursor: undefined,
    name: generateName(),
    color: getColor(index),
    cards: { brick: 2, grain: 1, ore: 0, lumber: 2, wool: 0 },
  };
}

const secrets: Record<string, string | undefined> = {};

function updateUserSecret(ws: PartyKitConnection) {
  const newSecret = generateSecret();
  secrets[ws.id] = newSecret;
  ws.send(JSON.stringify({ type: "set_secret", secret: newSecret }));
}

export default {
  onConnect(websocket, room, ctx) {
    if (secrets[websocket.id]) {
      websocket.send(JSON.stringify({ type: "reconnect_challenge" }));
    } else {
      // This is invoked whenever a user joins a room
      state.players.push(createPlayer(websocket.id, state.players.length));
      updateUserSecret(websocket);
      websocket.send(JSON.stringify(state));
    }
  },
  onClose(ws, room) {
    const p = state.players.find((p) => p.id === ws.id);
    if (p) {
      p.connectionState.connected = false;
      p.connectionState.lastSeen = new Date().getTime();
      room.broadcast(JSON.stringify({ type: "update", state }));
    }
  },
  // optionally, you can respond to HTTP requests as well
  onRequest(request, room) {
    return new Response("hello from room: " + room.id);
  },
  onMessage(msg, ws, room) {
    const m: DataMessage = JSON.parse(msg as string);

    switch (m.type) {
      case "reconnect_challenge_response": {
        if (secrets[ws.id] != null && m.secret === secrets[ws.id]) {
          updateUserSecret(ws);
          const p = state.players.find((p) => p.id === ws.id);
          if (p) {
            p.connectionState.connected = true;
            p.connectionState.lastSeen = new Date().getTime();
            room.broadcast(JSON.stringify({ type: "update", state }));
          }
        } else {
          ws.send(JSON.stringify({ type: "failed_auth" }));
        }

        break;
      }
      case "cursor_data": {
        const p = state.players.find((p) => p.id === ws.id);
        if (p) {
          p.cursor = m.point;
          p.connectionState.connected = true;
          p.connectionState.lastSeen = new Date().getTime();
        }
        break;
      }
      case "roll_dice": {
        rollDice();
        break;
      }
      case "claim_road": {
        state.board.roads.find((b) => {
          const road = b.find((r) => m.id === r.id);
          if (road) {
            road.playerId = ws.id;
          }
        });
        break;
      }
      case "chat_message": {
        if (m.text.toLowerCase() == "/clear") {
          const name = state.players.find((p) => p.id === ws.id)?.name ?? "Someone";
          state.chat = [{ type:"system", text: `${name} cleared the chat...` }];
        } else {
          state.chat.push({ type: "text", playerId: ws.id, text: m.text });
        }
        break;
      }
      default:
        return m satisfies never;
    }

    room.broadcast(JSON.stringify({ type: "update", state }));
  },
} satisfies PartyKitServer;
