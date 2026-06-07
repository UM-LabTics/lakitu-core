import PastQueriesList from "./pastQueriesList";

interface SearchParams {
  fromDatetime?: string;
  toDatetime?: string;
  lotId?: string;
}

// Next.js 15+ — searchParams is a Promise that must be awaited
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {
    fromDatetime = "",
    toDatetime = "",
    lotId = "",
  } = await searchParams;

  return (
    <PastQueriesList
      fromDatetime={fromDatetime}
      toDatetime={toDatetime}
      lotId={lotId}
    />
  );
}