"use client";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useEffect, useState } from "react";


export default function ParkingLotDetail() {
  const params = useParams();
  const parkingId = params?.parkingId as string;
  const [occupancy, setOccupancy] = useState<number | null>(null);

  useEffect(() => {
    // Placehoder mientras la API no está disponible, simula con un número aleatorio entre 0 y 100%
    const mockOccupancy = Math.floor(Math.random() * 100);
    setOccupancy(mockOccupancy);

    const interval = setInterval(() => {
      setOccupancy(Math.floor(Math.random() * 100));
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  return (
    <div>
      <Link className=" text-2xl bg-amber-500 " href="/liveFeed">← Back to Live Feed</Link>
      <h1>{parkingId?.toUpperCase()}</h1>
      <div>
        <p>Current Occupancy:</p>
        <p className="text-2xl font-bold">{occupancy !== null ? `${occupancy}%` : "Loading..."}</p>
      </div>
    </div>
  );
}
