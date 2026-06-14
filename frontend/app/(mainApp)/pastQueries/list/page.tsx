import PastQueriesList from "./pastQueriesList";

interface SearchParams {
  fromDatetime?: string;
  toDatetime?:   string;
  lotId?:        string;
  lotName?:      string; 
}

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const {
    fromDatetime = "",
    toDatetime   = "",
    lotId        = "",
    lotName      = "",
  } = await searchParams;

  return (
    <PastQueriesList
      fromDatetime={fromDatetime}
      toDatetime={toDatetime}
      lotId={lotId}
      lotName={lotName}
      page={'1'}
    />
  );
}