"use client";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Image from "next/image";
import { useRouter } from "next/navigation";

export default function NotFound() {
    const router = useRouter()
    return (
        <div className="flex items-center justify-center h-full">
            <div className="h-full w-1/3">
                <Image src={"/not_found.svg"} width={500} height={500} className="h-full w-auto" alt="sad lakitu"/>
            </div>
            <Card title="Oops! Page not found" className="w-1/2 h-1/2">
                <p className="text-center lg:text-lg xl:text-xl">
                    It seems Lakitu got lost, would you bring him home?
                </p>
                <div className="flex flex-col h-full w-full p-4 items-center justify-end">
                    <Button width="100%" onClick={()=>router.push("/home")}>
                        Go Home
                    </Button>
                </div>
            </Card>
        </div>
    );
}