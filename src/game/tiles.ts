import { shuffle } from "lodash-es";

enum Resource {
  Brick = "brick",
  Lumber = "lumber",
  Ore = "ore",
  Grain = "grain",
  Wool = "wool",
}

interface StaticTileData {
  resourceType?: Resource;
}

export interface GameTileData extends StaticTileData {
  value: number;
}

export type Tile = keyof typeof TILES;

export const TILES = {
  Hills: {
    resourceType: Resource.Brick,
  },
  Forest: {
    resourceType: Resource.Lumber,
  },
  Mountains: {
    resourceType: Resource.Ore,
  },
  Fields: {
    resourceType: Resource.Grain,
  },
  Pasture: {
    resourceType: Resource.Wool,
  },
  Desert: {},
} satisfies Record<string, StaticTileData>;

export const getShuffledGameTiles = () => {
  const locations: Tile[] = [
    "Hills",
    "Hills",
    "Hills",
    "Forest",
    "Forest",
    "Forest",
    "Forest",
    "Mountains",
    "Mountains",
    "Mountains",
    "Fields",
    "Fields",
    "Fields",
    "Fields",
    "Pasture",
    "Pasture",
    "Pasture",
    "Pasture",
    "Desert",
  ];

  const values = [2, 3, 3, 4, 4, 5, 5, 6, 6, 8, 8, 9, 9, 10, 10, 11, 11, 12];

  return { tiles: shuffle(locations), values: shuffle(values) };
};
