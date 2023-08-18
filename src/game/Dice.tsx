import cx from "clsx";

export function Dice({ values }: { values: number[] }) {
  return (
    <div className={cx("row")}>
      {values.map((v, i) => (
        <SingleDice key={i} value={v} />
      ))}
    </div>
  );
}

const NUMBER_NAMES = ["empty", "one", "two", "three", "four", "five", "six"];

function SingleDice({ value }: { value: number }) {
  const numberClass = NUMBER_NAMES[value];
  return (
    <div className={cx("dice")}>
      <div className={cx("side", numberClass)}></div>
    </div>
  );
}
