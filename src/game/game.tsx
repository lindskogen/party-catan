import { Tile } from "./tiles";
import { range, sum } from "lodash-es";
import { Dice } from "./Dice";
import cx from "clsx";
import { createRoot } from "react-dom/client";
import { ReactNode, useCallback, useLayoutEffect, useRef } from "react";
import PartySocket from "partysocket";
import { Data, DataMessage, Player } from "./types";
import { TILES_PER_ROW } from "./common";
import { usePerfectCursor } from "../hooks/usePerfectCursor";

interface Props {
  state: Data;
  socket: PartySocket;
}

function getRotation(colIndex: number, rowIndex: number) {
  if (rowIndex > 5) {
    return colIndex % 2 === 0 ? "27deg" : "-27deg";
  } else {
    return colIndex % 2 === 0 ? "-27deg" : "27deg";
  }
}

function renderTiles(
  tiles: [Tile, number | null][],
  renderCell: (
    count: number,
    rowIndex: number,
    tile: [Tile, number | null],
    i: number,
  ) => ReactNode,
) {
  let rowOffset = 0;

  return TILES_PER_ROW.flatMap((rowCount, rowIndex) => {
    const res = tiles
      .slice(rowOffset, rowOffset + rowCount)
      .map((tile, i) => renderCell(rowCount, rowIndex, tile, i));

    rowOffset += rowCount;

    return res;
  });
}

interface CursorProps {
  point: number[];
  color: string;
}

function Cursor({ color, point }: CursorProps) {
  const rCursor = useRef<SVGSVGElement>(null);

  const animateCursor = useCallback((point: number[]) => {
    const elm = rCursor.current;
    if (!elm) return;
    elm.style.setProperty(
      "transform",
      `translate(${point[0]}px, ${point[1]}px)`,
    );
  }, []);

  const onPointMove = usePerfectCursor(animateCursor);

  useLayoutEffect(() => onPointMove(point), [onPointMove, point]);

  return (
    <svg viewBox="55 80 300 450" ref={rCursor} width={40}>
      <polygon
        fill={color}
        points="65,99 87,107 231,251 237,273 173,273 173,293 183,299 199,331 199,363 167,363 135,299 119,299
	87,331 66,336 "
      />
      <path
        d="M231,251h16v32h-64v16h-16v-32h64V251z M231,251v-16h-16v16H231z M215,235v-16h-16v16H215z M199,219v-16h-16v16H199z
         M183,203v-16h-16v16H183z M167,187v-16h-16v16H167z M151,171v-16h-16v16H151z M135,155v-16h-16v16H135z M119,139v-16h-16v16H119z
         M103,123v-16H87v16H103z M71,107h16V91H71V75H55v272h32v-16H71V107z M119,283v16h16v-16H119z M103,315h16v-16h-16V315z M87,331h16
        v-16H87V331z M135,299v32h16v-32H135z M151,331v32h16v-32H151z M215,363v-32h-16v32H215z M199,331v-32h-16v32H199z M167,379h32v-16
        h-32V379z"
      />
    </svg>
  );
}

function getRoadMath(
  rowIndex: number,
  roadRowLength: number,
  colIndex: number,
) {
  if (rowIndex % 2 === 0) {
    return {
      // horizontal, rotated roads
      gridColumn: 6 - Math.ceil(roadRowLength / 2) + colIndex,
      gridRow: rowIndex + 1 + rowIndex / 2,

      rotate: getRotation(colIndex, rowIndex),
    };
  } else {
    return {
      // vertical roads
      gridColumn: 6 - roadRowLength + 2 * colIndex + 1,
      gridRowStart: (rowIndex - 1) * 1.5 + 2,
      gridRowEnd: "span 2",
    };
  }
}

function renderCards(cards: Player["cards"]) {
  const sum = cards.brick + cards.grain + cards.wool + cards.ore + cards.lumber;

  if (sum > 0) {
    return range(sum).map(() => "🎴");
  } else {
    return "🫱";
  }
}

function Game({ state, socket }: Props) {
  const chatBoxRef = useRef<HTMLDivElement>(null);
  const diceSum = sum(state.dice);

  useLayoutEffect(() => {
    const element = chatBoxRef.current;
    if (element) {
      element.scrollTop = Number.MAX_SAFE_INTEGER;
    }
  }, [state.chat.length]);

  const me = state.players.find((p) => p.id == socket.id);

  if (!me) {
    return <div style={{ color: "coral" }}>Connection failure</div>;
  }

  return (
    <div>
      <div id={"game"}>
        <main className={"main"}>
          {renderTiles(
            state.board.tiles,
            (count, rowIndex, [tileName, value], i) => {
              const key = `${rowIndex}_${i}`;
              return (
                <div
                  key={key}
                  className={cx("tile")}
                  style={{
                    gridColumn: 6 - count + i * 2,
                    gridRow: 1 + rowIndex * 3,
                  }}
                >
                  <div
                    className={cx(
                      "tileClip",
                      tileName,
                      diceSum === value ? "highlighted" : null,
                    )}
                  >
                    {value != null ? (
                      <span className={"tileValue"}>{value}</span>
                    ) : null}
                  </div>
                </div>
              );
            },
          )}
          {state.board.roads.map((roadRow, rowIndex) => {
            return roadRow.map((r, colIndex) => (
              <button
                key={rowIndex + "_" + colIndex}
                onClick={() =>
                  socket.send(
                    JSON.stringify({
                      type: "claim_road",
                      id: r.id,
                    } satisfies DataMessage),
                  )
                }
                className={cx(
                  "road",
                  { owned: r.playerId != null },
                  rowIndex % 2 === 0 ? "roadH" : "roadV",
                )}
                style={{
                  backgroundColor: state.players.find(
                    (p) => r.playerId === p.id,
                  )?.color,
                  ...getRoadMath(rowIndex, roadRow.length, colIndex),
                }}
              ></button>
            ));
          })}
        </main>
        <div id={"controls"}>
          <button
            onClick={() =>
              socket.send(
                JSON.stringify({ type: "roll_dice" } satisfies DataMessage),
              )
            }
          >
            <Dice values={state.dice} />
          </button>
          <div id={"players"}>
            {state.players.map((player) => (
              <div
                className={"box"}
                key={player.id}
                style={{
                  padding: 30,
                  backgroundColor: me.id === player.id ? player.color : "transparent",

                }}
              >
                {player.id === me.id ? "👤" : player.connectionState.connected ? "✅" : "🛑"} <span style={{
                color: player.id === me.id ? "black" : player.color}}>{player.name}</span>
                {player.id === me.id ? (
                  <div>
                    🌾:{player.cards.grain} 🐑:{player.cards.wool} 🪵:
                    {player.cards.lumber} 🧱:{player.cards.brick} 🪨:
                    {player.cards.ore}
                  </div>
                ) : (
                  <div>{renderCards(player.cards)}</div>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
      <div id={"chat"}>
        <div className={"box"} ref={chatBoxRef}>
          {state.chat.map((m) => {
            if (m.type === "text") {
              const player = state.players.find((p) => p.id == m.playerId);
              return (
                <div>
                <span
                  style={{color: player!.color, cursor: "pointer"}}
                  onClick={() => {
                    const el = document.getElementById(
                      "text",
                    ) as HTMLInputElement;
                    el.value += `@${player!.name} `;
                    el.focus();
                  }}
                >
                  {player!.name}
                </span>
                  : {m.text}
                </div>
              );
            } else if (m.type === "system") {
              return (
                <div style={{ color: '#ccc', fontStyle: "italic"}}>
                  {m.text}
                </div>
              );
            }
          })}
        </div>
        <form
          onSubmit={(e) => {
            e.preventDefault();

            const el = (e.target as any)["text"];
            const text = el.value.trim();

            if (text === "") {
              return
            }

            socket.send(
              JSON.stringify({
                type: "chat_message",
                text,
              } satisfies DataMessage),
            );
            el.value = "";
          }}
        >
          <input type={"text"} name={"text"} autoComplete={"off"} id={"text"} />
          <button>Send</button>
        </form>
      </div>
      <div id={"cursors"}>
        {state.players.map((p) => {
          if (p.cursor && p.id !== me.id) {
            return <Cursor key={p.id} point={p.cursor} color={p.color} />;
          }

          return null;
        })}
      </div>
    </div>
  );
}

const root = createRoot(document.getElementById("root")!);

export function renderGame(state: Data, socket: PartySocket) {
  root.render(<Game state={state} socket={socket} />);
}
