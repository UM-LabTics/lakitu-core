import { Camera } from "lucide-react";
import IconButton from "@/components/IconButton";
import PastStateView from "./PastStateView";

interface SearchParams {
  datetime?: string; 
  lotId?:   string;
  lotName?: string;
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {
    datetime = "",
    lotId    = "",
    lotName  = "",
  } = await searchParams;

  return (
    <div className="w-full h-full flex justify-center">
            <PastStateView
            datetime={datetime}
            lotId={lotId}
            lotName={lotName}
            />
    </div>
  );
}