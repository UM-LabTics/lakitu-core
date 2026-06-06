import Card from "./Card";
import Spinner from "./LoadingSpinner";

interface OccupancyGraphProps {
  stats:       Record<string, number>;
  parkingSize: number;
}

export default function PicoHours({ stats, parkingSize }: OccupancyGraphProps) {
  const hourlyMax = new Map<number, number>();

  for (const [time, count] of Object.entries(stats)) {
    const hour = parseInt(time.substring(0, 2), 10);
    if (!isNaN(hour) && hour >= 0 && hour <= 23) {
      hourlyMax.set(hour, Math.max(hourlyMax.get(hour) ?? 0, count));
    }
  }

  const sortedHours = [...hourlyMax.keys()].sort((a, b) => a - b);

  if (sortedHours.length === 0) {
    return (
        <Card title="Peak Hours" variant="dark" className="w-full h-full">
            <div className="flex flex-col w-full h-full items-center justify-center">
                <Spinner color="text-primary-super-light" />
                <p className="text-lg xl:text-xl text-center">
                    Loading statistics...
                </p>
            </div>
        </Card>
    );
  }

  // ── Identify the 2 hours with the highest peak ─────────────────────────────
  const top2Hours = new Set(
    [...hourlyMax.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 2)
      .map(([h]) => h)
  );

  return (
    <Card title="Peak Hours" variant="dark" className="w-full h-full">
        <div className="w-full h-full flex flex-col overflow-hidden gap-0 py-px">
        {sortedHours.map((hour) => {
            const value  = hourlyMax.get(hour) ?? 0;
            const pct    = parkingSize > 0 ? Math.min((value / parkingSize) * 100, 100) : 0;
            const isTop2 = top2Hours.has(hour);

            return (
            <div key={hour} className="flex flex-1 min-h-0 items-stretch">

                <div className="shrink-0 w-14 flex items-center justify-end pr-2 border-r-4 border-background">
                    <span className="text-xs xl:text-sm font-mono leading-none text-background select-none">
                        {String(hour).padStart(2, "0")}:00
                    </span>
                </div>

                <div className="flex-1 flex items-center pr-1.5 py-1">
                    <div
                        className={`
                        h-full rounded-r-sm transition-[width] duration-500 ease-out
                        ${isTop2 ? "bg-secondary" : "bg-primary-super-light"}
                        `}
                        style={{ width: `${pct}%` }}
                    />
                </div>

            </div>
            );
        })}
        </div>
    </Card>
  );
}