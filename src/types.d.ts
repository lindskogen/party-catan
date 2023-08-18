declare module "*.css" {
  const classes: { [key: string]: string };
  export default classes;
}

declare module "sillyname" {
  function generateStupidName(generator?: () => number): string;
  export = generateStupidName;
  namespace generateStupidName {
    export function randomNoun(generator?: () => number): string;
    export function randomAdjective(generator?: () => number): string;
  }
}
