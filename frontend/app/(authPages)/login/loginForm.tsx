"use client";

import { useActionState } from "react";
import { login } from "@/lib/api/auth";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, null);

  return (
    <div className="w-full flex flex-1 items-baseline justify-center">
      <form action={formAction} className="w-2/3 h-2/3 min-h-108">
        <Card title="Log in" className="w-full">
          <div className="flex flex-col items-center gap-4 w-full">
            <div className="flex flex-col items-center gap-4 w-full">
              <Input name="email" variant="text" placeholder="Email" className="w-9/10" />
              <Input name="password" variant="password" placeholder="Password" className="w-9/10" />
            </div>
            <div className="flex-1" >
              {state && !state.success && (
                <p role="alert" className="text-red-800 text-sm lg:text-base xl:text-lg text-center">
                  {state.error}
                </p>
              )}
            </div >

            <Button type="submit" width="90%" disabled={isPending}>
              {isPending ? "Logging in..." : "Log in"}
            </Button>
            <div className="flex flex-col items-center">
              <span className="w-full text-center">Do not have an account yet?</span>
              <Button
                type="button"
                variant="text"
                className="w-fit"
                onClick={() => (window.location.href = "/signup")}
              >
                Sign up
              </Button>
            </div>
          </div>
        </Card>
      </form>
    </div>
  );
}