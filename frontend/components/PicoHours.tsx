import Card from "./Card";
import Spinner from "./LoadingSpinner";

type StatValue = number | "N/D";

interface OccupancyGraphProps {
  stats:       Record<string, number | string>;
  parkingSize: number;
}

export default function PicoHours({ stats, parkingSize }: OccupancyGraphProps) {
    // ── 1. Group by hour, taking the max numeric value per hour ────────────────
    const hourlyData = new Map<number, StatValue>();

    for (const [timeStr, val] of Object.entries(stats)) {
        const hour = parseInt(timeStr.substring(0, 2), 10);
        if (isNaN(hour) || hour < 0 || hour > 23) continue;

        const statVal: StatValue = val === "N/D" || typeof val === "string" ? "N/D" : (val as number);

        if (statVal === "N/D") {
        if (!hourlyData.has(hour)) hourlyData.set(hour, "N/D");
        } else {
        const current = hourlyData.get(hour);
        hourlyData.set(
            hour,
            current === undefined || current === "N/D"
            ? statVal
            : Math.max(current as number, statVal)
        );
        }
    }

    // ── No data at all → loading ───────────────────────────────────────────────
    if (hourlyData.size === 0) {
        return (
        <Card title="Peak Hours" variant="dark" className="w-full h-full">
            <div className="flex flex-col w-full h-full items-center justify-center">
            <Spinner color="text-primary-super-light" />
            <p className="text-lg xl:text-xl text-center">Loading statistics...</p>
            </div>
        </Card>
        );
    }

    // ── 2. Build full 24-hour array with carry-forward ─────────────────────────
    const fullDay: (StatValue | undefined)[] = new Array(24).fill(undefined);
    let lastKnown: StatValue | undefined = undefined;

    for (let h = 0; h < 24; h++) {
        if (hourlyData.has(h)) lastKnown = hourlyData.get(h)!;
        fullDay[h] = lastKnown;
    }

    // ── 3. Highlight top hours, handling ties ─────────────────────────────────
    const numericEntries = fullDay
    .map((val, h) => ({ h, val }))
    .filter(({ val }) => typeof val === "number") as { h: number; val: number }[];

    const uniqueValues = [...new Set(numericEntries.map(({ val }) => val))].sort((a, b) => b - a);

    const highlightHours = new Set<number>();

    if (uniqueValues.length > 0) {
    const firstPlaceHours = numericEntries.filter(({ val }) => val === uniqueValues[0]);

    if (firstPlaceHours.length > 1) {
        // Multiple tied for 1st → highlight all of them, no 2nd place
        firstPlaceHours.forEach(({ h }) => highlightHours.add(h));
    } else {
        // Unique 1st → highlight it + all tied 2nd places
        highlightHours.add(firstPlaceHours[0].h);
        if (uniqueValues.length > 1) {
        numericEntries
            .filter(({ val }) => val === uniqueValues[1])
            .forEach(({ h }) => highlightHours.add(h));
        }
    }
    }
    return (
        <Card title="Peak Hours" variant="dark" className="w-full h-full min-h-2/3">
        <div className="w-full h-full flex flex-col overflow-hidden gap-0 py-px">
            {Array.from({ length: 24 }, (_, hour) => {
            const value = fullDay[hour];
            const isND  = value === undefined || value === "N/D";
            const pct   = !isND && parkingSize > 0
                ? Math.min(((value as number) / parkingSize) * 100, 100)
                : 0;
            const isTop2 = highlightHours.has(hour);

            return (
                <div key={hour} className="flex flex-1 min-h-0 items-stretch">

                <div className="shrink-0 w-14 flex items-center justify-end pr-2 border-r-4 border-background">
                    <span className="text-[8px] md:text-xs xl:text-sm font-mono leading-none text-background select-none">
                    {String(hour).padStart(2, "0")}:00
                    </span>
                </div>

                <div className="flex-1 flex items-center pr-1.5 py-0.5">
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
                </div>

                </div>
            );
            })}
        </div>
        </Card>
    );
}