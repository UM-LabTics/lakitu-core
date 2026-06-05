"use client";
import Button from "@/components/Button";
import AdminButton from "@/components/AdminButton";

export default function HomePage() {
    const isAdmin = true;
  return (
    <div className="flex flex-col items-center justify-between h-1/2 pt-12">
        <Button onClick={() => (window.location.href = "/liveFeed")}>
            View Live Feed
        </Button>
        <Button onClick={() => (window.location.href = "/pastQueries")}>
            Search Past Records
        </Button>
        <div className={isAdmin ? "block":"hidden"}>
            <AdminButton onClick={() => (window.location.href = "/stats")}>
                View Statistics
            </AdminButton>
        </div>
        <div className={isAdmin ? "hidden":"block h-12"} />
    </div>
  );
}