"use client";

import { useActionState } from "react";
import { signup } from "@/lib/api/auth";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";

export default function SignupForm() {
  const [state, formAction, isPending] = useActionState(signup, null);

  return (
    <div className="w-full h-full flex items-baseline justify-center">
      <form action={formAction} className="w-2/3 h-5/6 min-h-110">
        <Card title="Sign up" className="w-full h-full">
          <div className="flex flex-col items-center justify-baseline gap-4 xl:pt-8 xl:gap-8 w-full h-full">

            <div className="flex items-center justify-center gap-4 w-19/20 md:w-7/8">
              <Input name="email" variant="text" placeholder="Email" className="flex-1" />
              <Input name="name" variant="text" placeholder="Username" className="flex-1" />
            </div>
            <div className="flex items-center justify-center gap-4 w-19/20 md:w-7/8">
              <Input name="password" variant="password" placeholder="Password" className="flex-1" />
              <Input name="confirmPassword" variant="password" placeholder="Confirm Password" className="flex-1" />
            </div>

            {state && !state.success && (
              <p role="alert" className="text-red-800 text-sm lg:text-base xl:text-lg text-center">
                {state.error}
              </p>
            )}

            <div className="flex-1" />

            <Button type="submit" width="40%" disabled={isPending}>
              {isPending ? "Signing up..." : "Sign up"}
            </Button>
            <div className="flex flex-col items-center">
              <span className="w-full text-center">Already have an account?</span>
              <Button
                type="button"
                variant="text"
                className="w-fit"
                onClick={() => (window.location.href = "/login")}
              >
                Log in
              </Button>
            </div>

          </div>
        </Card>
      </form>
    </div>
  );
}