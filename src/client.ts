import PartySocket from "partysocket";
import { renderGame } from "./game/game";
import { Data, DataMessage } from "./game/types";
import { throttle } from "lodash-es";

const getId = () => localStorage.getItem("id") ?? undefined;
const setId = (id: string) => localStorage.setItem("id", id);

const getSecret = () => localStorage.getItem("secret") ?? undefined;
const setSecret = (secret: string) => localStorage.setItem("secret", secret);

const socket = new PartySocket({
  host: window.location.host, // for local development
  // host: "my-party.username.partykit.dev", // for production
  id: getId(),
  room: "my-room",
});

let state: Data = {
  board: {
    tiles: [],
    roads: [],
    robberPosition: 0,
    tilesByValue: {},
  },
  players: [],
  playerTurn: 0,
  dice: [1, 1],
  chat: []
};

socket.addEventListener("message", (evt) => {
  try {
    const eventData = JSON.parse(evt.data);

    switch (eventData.type) {
      case "reconnect_challenge": {
        socket.send(
          JSON.stringify({
            type: "reconnect_challenge_response",
            secret: getSecret()!,
          } satisfies DataMessage),
        );
        break;
      }
      case "set_secret": {
        setId(socket._pk);
        setSecret(eventData.secret);
        const stopSendingCursorData = startSendingCursorData(socket);
        socket.addEventListener("close", stopSendingCursorData);
        break;
      }
      case "update": {
        console.log(state);
        state = eventData.state;
        renderGame(state, socket);

        break;
      }
    }
  } catch (e) {
    console.error(e, evt.data);
  }
});

function startSendingCursorData(socket: PartySocket): () => void {
  let listener = throttle((event: MouseEvent) => {
    socket.send(
      JSON.stringify({
        type: "cursor_data",
        point: [event.clientX, event.clientY],
      } satisfies DataMessage),
    );
  }, 80);
  window.addEventListener("mousemove", listener);

  return function stopSendingCursorData() {
    window.removeEventListener("mousemove", listener);
  };
}

renderGame(state, socket);
