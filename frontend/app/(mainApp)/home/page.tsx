"use client";
import Button from "@/components/Button";
import AdminButton from "@/components/AdminButton";
import { useRouter } from "next/navigation";

export default function HomePage() {
    const router = useRouter();    
    return (
        <div className="flex flex-col items-center justify-between h-1/2 pt-12 gap-8">
            <Button onClick={() => (router.push("/liveFeed"))}>
                View Live Feed
            </Button>
            <Button onClick={() => (router.push("/pastQueries"))}>
                Search Past Records
            </Button>
            <AdminButton onClick={() => (router.push("/stats"))}>
                View Statistics
            </AdminButton>
            <div className="h-full" />
        </div>
    );
}