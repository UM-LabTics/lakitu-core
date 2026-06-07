"use client";
import Button from "@/components/Button";
import AdminButton from "@/components/AdminButton";

export default function HomePage() {
  return (
    <div className="flex flex-col items-center justify-between h-1/2 pt-12 gap-8">
        <Button onClick={() => (window.location.href = "/liveFeed")}>
            View Live Feed
        </Button>
        <Button onClick={() => (window.location.href = "/pastQueries")}>
            Search Past Records
        </Button>
        <AdminButton onClick={() => (window.location.href = "/stats")}>
            View Statistics
        </AdminButton>
        <div className="h-full" />
    </div>
  );
}