"use client";

import { useState } from "react";
import { getStateAt, getStatesBetween } from "@/lib/api/events";
import type { ParkingSpot, ParkingStateSnapshot, StatesResponse } from "@/lib/types/parking";
import PastQuerier from "./pastQuerier";

export default function PastQueries() {



  return (
    <div className="flex flex-col justify-baseline items-center w-full min-h-full">
      <PastQuerier/>
    </div>
  );
}