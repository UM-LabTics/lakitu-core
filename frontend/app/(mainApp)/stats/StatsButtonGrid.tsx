"use client";

import AdminButton from "@/components/AdminButton";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";

const ADMIN_BUTTONS = [
  { href: "/stats/dailyOccupancy",text: "Daily Occupancy" },
  { href: "/stats/heatmap", text: "Usage Heatmap" },
  { href: "/stats/spotRotations", text: "Spot Rotations" },
  { href: "/stats/spotUsage", text: "Spot Usage" },
] as const;

export default function AdminButtonGrid() {
    const router = useRouter();
    const pathname = usePathname();
    return (
        <div className="grid grid-cols-2 grid-rows-2 gap-4 w-fit pb-8">
        {ADMIN_BUTTONS.map((ref) => (
            <AdminButton key={ref.href} onClick={()=>router.push(ref.href)} selected={pathname===ref.href} height="auto">
                {ref.text}
            </AdminButton>
        ))}
        </div>
    );
}