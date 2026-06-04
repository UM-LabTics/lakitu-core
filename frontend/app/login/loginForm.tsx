"use client";

import { login } from "@/lib/api/auth";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";

export default function LoginForm() {
  return (
    <div className="w-full flex flex-1 items-baseline justify-center">
      <form action={login} className="w-2/3 h-2/3 min-h-108">
        <Card title="Log in" className="w-full" >
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex flex-col items-center gap-4 w-full mb-8">
              <Input name="email" variant="text" placeholder="Email" className="w-9/10" />
              <Input name="password" variant="password" placeholder="Password" className="w-9/10" />
            </div>


            <Button type="submit" width="90%">Log in</Button>
            <div className="flex flex-col items-center mt-4">
              <span className="w-full text-center">Do not have an account yet?</span>
              <Button type="button" variant="text" className="w-fit" onClick={() => window.location.href = "/signup"}>Sign up</Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}