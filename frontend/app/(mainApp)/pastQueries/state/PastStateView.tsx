"use client";

import { useEffect, useState } from "react";
import ParkingDisplay, {
  ParkingState as DisplayState,
} from "@/components/ParkingDisplay";
import { getStateAt } from "@/lib/api/events";
import { Camera, Loader2, X } from "lucide-react";
import IconButton from "@/components/IconButton";
import Image from "next/image";
import Spinner from "@/components/LoadingSpinner";

import { useAuth } from "@/app/auth-provider";

// ── Types ──────────────────────────────────────────────────────────────────

interface BackendState {
  free_spots: number;
  image_url:  string | null;
  pi_timestamp: string; // ISO 8601, "2026-06-03T04:00:00+00:00"
  spots: Array<{ spot_id: string; status: number }>;
}

interface Props {
  datetime: string; 
  lotId:    string;
  lotName:  string;
}


const STATE_SESSION_KEY = "pastQueryState";


function adapt(state: BackendState, name: string): DisplayState {
  return {
    parking_name: name || "Parking Lot",
    timestamp:    state.pi_timestamp,
    spots:        state.spots,
  };
}


export default function PastStateView({ datetime, lotId, lotName }: Props) {
  const [displayState, setDisplayState] = useState<DisplayState | null>(null);
  const [imageUrl, setImageUrl]         = useState<string | null>(null);
  const [loading, setLoading]           = useState(true);
  const [error, setError]               = useState<string | null>(null);
  const [openModal, setOpenModal]       = useState(false);
  const {isAdmin} = useAuth()
  
  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(STATE_SESSION_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as BackendState;
        if (parsed?.pi_timestamp && Array.isArray(parsed?.spots)) {
          setDisplayState(adapt(parsed, lotName));
          setImageUrl(parsed.image_url);
          setLoading(false);
          return;
        }
      }
    } catch {
    }

    // ── Fallback: re-fetch usando URL params
    if (!datetime || !lotId) {
      setError(
        "Missing parameters. Please go back and search again."
      );
      setLoading(false);
      return;
    }

    getStateAt(lotId, datetime)
      .then((state: BackendState) => {
        try {
          sessionStorage.setItem(STATE_SESSION_KEY, JSON.stringify(state));
        } catch {  }
        setDisplayState(adapt(state, lotName));
      })
      .catch(() =>
        setError("Failed to load parking state. Is the backend running?")
      )
      .finally(() => setLoading(false));

  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[60vh]">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[60vh]">
        <p role="alert" className="text-sm text-center text-red-500 max-w-sm">
          {error}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex justify-center">
        <div className="w-fit h-full">
            <ParkingDisplay latestState={displayState} />
        </div>
        <div className={isAdmin ? 'h-full flex flex-col justify-end px-4' : 'hidden'}>
            <IconButton icon={<Camera size={60} onClick={()=>{console.log(imageUrl); setOpenModal(true);}} />} />
        </div>
              
    {(openModal && !!imageUrl && !!isAdmin) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="relative h-[80vh] w-[80vw]">
            <IconButton
              icon={<X size={24} />}
              onClick={() => setOpenModal(false)}
              size={48}
              className="absolute right-2 top-0 z-60" />

            <Image
              src={imageUrl}
              alt="S3 image"
              fill={true}
              className="max-h-[80vh] max-w-[80vw] object-contain"
            />
          </div>
        </div>
      )}
    </div>


    );
}
