import Card from "./Card";
import Spinner from "./LoadingSpinner";

type StatValue = number | "N/D";

interface OccupancyGraphProps {
  stats:       Record<string, number | string>;
  parkingSize: number;
}

export default function PicoHours({ stats, parkingSize }: OccupancyGraphProps) {
  const events: Array<{ totalSeconds: number; value: StatValue }> = [];

  for (const [timeStr, val] of Object.entries(stats)) {
    const parts = timeStr.split(":").map(Number);
    if (parts.length !== 3 || parts.some(isNaN)) continue;
    const [h, m, s] = parts;
    const statVal: StatValue = val === "N/D" || typeof val === "string" ? "N/D" : val as number;
    events.push({ totalSeconds: h * 3600 + m * 60 + s, value: statVal });
  }
  events.sort((a, b) => a.totalSeconds - b.totalSeconds);

  if (events.length === 0) {
    return (
      <Card title="Peak Hours" variant="dark" className="w-full h-full">
        <div className="flex flex-col w-full h-full items-center justify-center">
          <Spinner color="text-primary-super-light" />
          <p className="text-lg xl:text-xl text-center">Loading statistics...</p>
        </div>
      </Card>
    );
  }


  const display: (StatValue | undefined)[] = new Array(24).fill(undefined);
  let carry: StatValue | undefined = undefined;

  for (let h = 0; h < 24; h++) {
    const hourEvents = events.filter(
      e => e.totalSeconds >= h * 3600 && e.totalSeconds < (h + 1) * 3600
    );

    if (hourEvents.length > 0) {
      display[h] = hourEvents[0].value;
      carry      = hourEvents[hourEvents.length - 1].value;
    } else {
      display[h] = carry;
    }
  }

  const numericEntries = display
    .map((val, h) => ({ h, val }))
    .filter(({ val }) => typeof val === "number") as Array<{ h: number; val: number }>;

  const highlightedHours = new Set<number>();

  if (numericEntries.length > 0) {
    const maxVal = Math.max(...numericEntries.map(e => e.val));
    const firstPlace = numericEntries.filter(e => e.val === maxVal);
    firstPlace.forEach(({ h }) => highlightedHours.add(h));

    if (firstPlace.length === 1) {
      const rest = numericEntries.filter(e => e.val !== maxVal);
      if (rest.length > 0) {
        const secondVal = Math.max(...rest.map(e => e.val));
        rest.filter(e => e.val === secondVal).forEach(({ h }) => highlightedHours.add(h));
      }
    }
  }

  return (
    <Card title="Peak Hours" variant="dark" className="w-full h-full min-h-2/3">
      <div className="w-full h-full flex flex-col overflow-hidden gap-0 py-px">
        {Array.from({ length: 24 }, (_, hour) => {
          const value  = display[hour];
          const isND   = value === undefined || value === "N/D";
          const pct    = !isND && parkingSize > 0
            ? Math.min(((value as number) / parkingSize) * 100, 100)
            : 0;
          const isTop2 = highlightedHours.has(hour);

          return (
            <div key={hour} className="flex flex-1 min-h-0 items-stretch">
              <div className="shrink-0 w-14 flex items-center justify-end pr-2 border-r-4 border-background">
                <span className="text-[8px] md:text-xs xl:text-sm font-mono leading-none text-background select-none">
                  {String(hour).padStart(2, "0")}:00
                </span>
              </div>
              <div className="flex-1 flex items-center justify-between pr-1.5 py-0.5">
                {isND ? (
                  <span className="text-[8px] md:text-xs xl:text-sm font-mono leading-none text-red-600 select-none pl-1">
                    N/D
                  </span>
                ) : (
                  <div
                    className={`
                      h-full rounded-r-sm transition-[width] duration-500 ease-out
                      ${isTop2 ? "bg-secondary" : "bg-primary-super-light"}
                    `}
                    style={{ width: `${pct}%` }}
                  />
                )}
                <div className="w-1 h-4/5 rounded-xs bg-primary-super-light" />
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}