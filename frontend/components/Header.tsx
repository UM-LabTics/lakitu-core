"use client";

import Image from "next/image";
import Button from "@/components/Button";
import { logout } from "@/lib/api/auth";
import Link from "next/link";


export default function Header() {
  return (
      <header className="h-1/4 overflow-clip w-full absolute flex top-0 items-center justify-between pt-12 px-2 md:px-8 lg:px-32">

        <Button variant="text" className="text-xl lg:text-3xl" onClick={() => window.history.back()}>
            &lt; Back
        </Button>

        <div className="relative h-[200%] w-1/3 -translate-y-1/8">
            <Link href="/home">
                <Image src="/imagotipo_animado.svg" alt="Logo" fill={true} />
            </Link>
        </div>

        <Button variant="text" className="text-xl lg:text-3xl" onClick={logout}>
            Logout
        </Button>

      </header>
  );
}