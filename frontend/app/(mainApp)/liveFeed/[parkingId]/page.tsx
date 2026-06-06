import { ParkingFeed } from "./_components/ParkingFeed";

interface Props {
  params: Promise<{ parkingId: string }>;
}

export default async function ParkingFeedPage({ params }: Props) {
  const { parkingId } = await params;

  return <ParkingFeed parkingId={parkingId} />;
}