"use client";

import AdminButton from "@/components/AdminButton";
import IconButton from "@/components/IconButton";
import { Camera } from "lucide-react";
import { useRouter } from "next/navigation";
import { usePathname } from "next/navigation";
import { useStatsContext } from "./StatsContext";
import { useState } from "react";
import PhotoCaptureModal from "@/components/PhotoCaptureModal";

const ADMIN_BUTTONS = [
  { href: "/stats/dailyOccupancy",text: "Daily Occupancy" },
  { href: "/stats/heatmap", text: "Usage Heatmap" },
  { href: "/stats/spotRotations", text: "Spot Rotations" },
  { href: "/stats/spotUsage", text: "Spot Usage" },
] as const;

export default function AdminButtonGrid() {
    const { selectedLotId } = useStatsContext();
    const router = useRouter();
    const pathname = usePathname();
    const [photoOpen, setPhotoOpen] = useState(false);       // ← new

    return (
        <>
            <div className="w-full h-fit flex gap-4" >
                <IconButton disabled={!selectedLotId} size={112} icon={<Camera size={"80%"} onClick={()=>setPhotoOpen(true)} />} />
                <div className="grid grid-cols-2 grid-rows-2 gap-4 w-full pb-8 flex-1">
                {ADMIN_BUTTONS.map((ref) => (
                    <AdminButton key={ref.href} onClick={()=>router.push(ref.href)} selected={pathname===ref.href} height="auto" width="auto" className="flex-1" >
                        {ref.text}
                    </AdminButton>
                ))}
                </div>
            </div>
            {photoOpen && selectedLotId && (
                <PhotoCaptureModal parkingId={selectedLotId} onClose={() => setPhotoOpen(false)} />
            )}
        </>
    );
}