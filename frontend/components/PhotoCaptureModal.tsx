"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { X } from "lucide-react";
import IconButton from "@/components/IconButton";
import Spinner from "@/components/LoadingSpinner";
import { takePhoto } from "@/lib/api/parkingLots";

interface Props {
  parkingId: string;
  onClose: () => void;
}

export default function PhotoCaptureModal({ parkingId, onClose }: Props) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [error, setError]       = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    takePhoto(parkingId)
      .then((src) => { if (!cancelled) setImageSrc(src); })
      .catch((err: Error) => { if (!cancelled) setError(err.message); });
    return () => { cancelled = true; };
  }, [parkingId]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
      <div className="relative h-[80vh] w-[80vw]">

        {/* Close button — always visible */}
        <IconButton
          icon={<X size={24} />}
          onClick={onClose}
          size={48}
          className="absolute right-2 top-0 z-60"
        />

        {/* Loading */}
        {!imageSrc && !error && (
          <div className="flex h-full w-full items-center justify-center">
            <Spinner />
          </div>
        )}

        {/* Error */}
        {error && (
          <div className="flex h-full w-full items-center justify-center">
            <p role="alert" className="max-w-sm text-center text-sm text-red-500">
              {error}
            </p>
          </div>
        )}

        {/* Image — identical sizing/behaviour to PastStateView */}
        {imageSrc && (
          <Image
            src={imageSrc}
            alt="Live parking snapshot"
            fill
            className="max-h-[80vh] max-w-[80vw] object-contain"
          />
        )}
      </div>
    </div>
  );
}