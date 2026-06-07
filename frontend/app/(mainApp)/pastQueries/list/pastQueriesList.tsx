"use client";

import { useEffect, useRef, useState } from "react";
import Card from "@/components/Card";
import { getStatesBetween } from "@/lib/api/events";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { StatesResponse } from "@/lib/types/parking";
import { useRouter } from "next/navigation";
import { ParkingStateSnapshot } from "@/lib/types/parking";

interface Props {
  fromDatetime: string;
  toDatetime:   string;
  lotId:        string;
  lotName:      string;
  page:         string;
}

export const LIST_SESSION_KEY  = "pastQueryList";
export const STATE_SESSION_KEY = "pastQueryState";

function formatDate(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return [
    String(d.getUTCDate()).padStart(2, "0"),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    d.getUTCFullYear(),
  ].join("/");
}

function formatDateTime(iso: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const date = [
    String(d.getUTCDate()).padStart(2, "0"),
    String(d.getUTCMonth() + 1).padStart(2, "0"),
    d.getUTCFullYear(),
  ].join("/");
  const time = [
    String(d.getUTCHours()).padStart(2, "0"),
    String(d.getUTCMinutes()).padStart(2, "0"),
  ].join(":");
  return `${date} ${time}`;
}

export default function PastQueriesList({ fromDatetime, toDatetime, lotId, lotName, page: urlPage }: Props) {
  const [states, setStates]                       = useState<ParkingStateSnapshot[] | null>(null);
  const [page, setPage]                           = useState<string>(urlPage || "1");
  const [totalPages, setTotalPages]               = useState<string | null>(null);
  const [totalUpdates, setTotalUpdates]           = useState<string | null>(null);
  const [loading, setLoading]                     = useState(true);    // initial data load
  const [paginationLoading, setPaginationLoading] = useState(false);   // page-nav fetch
  const [error, setError]                         = useState<string | null>(null);

  const listRef = useRef<HTMLDivElement>(null);
  const router  = useRouter();

  // ── Derived guards ─────────────────────────────────────────────────────────
  const currentPage   = parseInt(page) || 1;
  const totalPagesNum = totalPages !== null ? parseInt(totalPages) : null;
  const busy          = loading || paginationLoading;
  const canGoPrev     = currentPage > 1 && !busy;
  // Allow next when total is unknown (optimistic); once known, cap it correctly
  const canGoNext     = (totalPagesNum === null || currentPage < totalPagesNum) && !busy;

  // ── Initial load ───────────────────────────────────────────────────────────
  useEffect(() => {
    // Fast path: full StatesResponse was cached by PastQuerier or a previous page nav
    try {
      const raw = sessionStorage.getItem(LIST_SESSION_KEY);
      if (raw) {
        const parsed: StatesResponse = JSON.parse(raw);
        if (Array.isArray(parsed?.items)) {
          setStates(parsed.items as ParkingStateSnapshot[]);
          setPage(parsed.page.toString());
          setTotalPages(parsed.pages.toString());
          setTotalUpdates(parsed.total.toString());
          setLoading(false);
          return;
        }
      }
    } catch {
      // sessionStorage unavailable or data malformed — fall through to fetch
    }

    // Fallback: re-fetch using URL params (refresh / direct link / back)
    if (!fromDatetime || !toDatetime || !lotId) {
      setError("Missing query parameters. Please go back and search again.");
      setLoading(false);
      return;
    }

    getStatesBetween(lotId, fromDatetime, toDatetime, parseInt(urlPage) || 1)
      .then((data: StatesResponse) => {
        try {
          sessionStorage.setItem(LIST_SESSION_KEY, JSON.stringify(data));
        } catch { /* storage quota exceeded — non-fatal */ }
        setStates(data.items as ParkingStateSnapshot[]);
        setPage(data.page.toString());
        setTotalPages(data.pages.toString());
        setTotalUpdates(data.total.toString());

      })
      .catch(() => setError("Failed to fetch states. Is the backend running?"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Pagination fetch ───────────────────────────────────────────────────────
  /** Called only from the prev/next buttons. Keeps the current list visible
   *  while loading the new page (uses paginationLoading, not loading). */
  async function fetchPage(targetPage: number) {
    // Guardrails: no re-entry, no out-of-bounds
    if (busy) return;
    if (targetPage < 1) return;
    if (totalPagesNum !== null && targetPage > totalPagesNum) return;

    setPaginationLoading(true);
    setError(null);

    try {
      const data = await getStatesBetween(lotId, fromDatetime, toDatetime, targetPage);
      try {
        sessionStorage.setItem(LIST_SESSION_KEY, JSON.stringify(data));
      } catch { /* storage quota exceeded — non-fatal */ }
      setStates(data.items as ParkingStateSnapshot[]);
      setPage(data.page.toString());
      setTotalPages(data.pages.toString());
      setTotalUpdates(data.total.toString());
      // Scroll back to the first row of the new page
      listRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    } catch {
      setError("Failed to fetch page. Is the backend running?");
    } finally {
      setPaginationLoading(false);
    }
  }

  // ── State click ────────────────────────────────────────────────────────────
  function handleStateClick(state: ParkingStateSnapshot) {
    try {
      sessionStorage.setItem(STATE_SESSION_KEY, JSON.stringify(state));
    } catch { /* quota exceeded — non-fatal; state page will fall back to fetch */ }
    const params = new URLSearchParams({
      datetime: state.pi_timestamp,
      lotId,
      lotName,
    });
    router.push(`/pastQueries/state?${params.toString()}`);
  }

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Card title="Past States" className="min-w-1/3">
      <div className="flex flex-col w-full">

        {/* ── Date range header ─────────────────────────────────────────── */}
        <div className="-translate-y-4">
          <p className="text-center text-primary text-base xl:text-xl">
            {formatDate(fromDatetime)}&nbsp;&ndash;&nbsp;{formatDate(toDatetime)}
          </p>
          <div className="w-full h-1 bg-primary-light rounded-xl" />
        </div>

        {/* ── Initial loading spinner ───────────────────────────────────── */}
        {loading && (
          <div className="flex justify-center py-8" role="status" aria-label="Loading states…">
            <Loader2 className="size-8 animate-spin" />
          </div>
        )}

        {/* ── Error ─────────────────────────────────────────────────────── */}
        {!loading && error && (
          <p role="alert" className="text-sm text-center text-red-600 py-4">
            {error}
          </p>
        )}

        {/* ── Empty state ───────────────────────────────────────────────── */}
        {!loading && !error && states?.length === 0 && (
          <p className="text-base text-center py-4 text-primary">
            No records found for this date range.
          </p>
        )}

        {/* ── Scrollable states list ────────────────────────────────────── */}
        {!loading && !error && states && states.length > 0 && (
          <div
            ref={listRef}
            className="flex flex-col max-h-[40vh] overflow-y-auto -translate-y-4
              [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]"
          >
            {states.map((state, i) => (
              <div
                key={`${state.pi_timestamp}-${i}`}
                role="button"
                tabIndex={0}
                onClick={() => handleStateClick(state)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") handleStateClick(state);
                }}
                className={[
                  "flex justify-between items-center",
                  "cursor-pointer select-none",
                  "px-2 py-2 rounded",
                  "hover:bg-primary-light/20 active:bg-primary-light/40",
                  "transition-colors duration-100",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
                ].join(" ")}
              >
                <span className="text-base xl:text-lg text-secondary-dark tabular-nums">
                  {formatDateTime(state.pi_timestamp)}
                </span>
                <span className={`text-base xl:text-lg ${state.free_spots === 0 ? "text-occupied" : "text-secondary-dark"} tabular-nums`}>
                  {state.free_spots} free spot{state.free_spots !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}

        <div className="w-full h-1 bg-primary-light rounded-xl -translate-y-4" />
        {!loading && !error && states && states.length > 0 && (
          <div className="flex flex-col justify-baseline items-center">
          <div className="flex items-center justify-center gap-4 -translate-y-4 py-1.5">
            <button
              type="button"
              onClick={() => fetchPage(currentPage - 1)}
              disabled={!canGoPrev}
              aria-label="Previous page"
              className="cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
                transition-opacity duration-100"
            >
              <ChevronLeft className="size-5 xl:size-6 text-primary" />
            </button>

            {/* Counter: shows a micro-spinner next to the number while paginating */}
            <span
              className="flex items-center gap-1.5 text-sm xl:text-base text-secondary-dark
                tabular-nums select-none min-w-[5rem] justify-center"
            >
              {paginationLoading && (
                <Loader2 className="size-3.5 animate-spin shrink-0" />
              )}
              {!paginationLoading ? page : ''}&nbsp;/&nbsp;{totalPages ?? "…"}
            </span>

            <button
              type="button"
              onClick={() => fetchPage(currentPage + 1)}
              disabled={!canGoNext}
              aria-label="Next page"
              className="cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed
                transition-opacity duration-100"
            >
              <ChevronRight className="size-5 xl:size-6 text-primary" />
            </button>
            
          </div>
          {!paginationLoading && <span className="text-sm xl:text-base text-secondary-dark text-center">
              showing {(parseInt(page)-1)*20}-{parseInt(page)*20-1} of {totalUpdates}
            </span>}
          </div>
        )}

      </div>
    </Card>
  );
}