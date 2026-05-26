"use client";

import { signup } from "@/lib/api/auth";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";

export default function SignupForm() {
  return (
    <form action={signup} className="mx-auto mt-10">
      <Card title="Sign up" className="w-2xl">
        <div className="flex flex-col items-center gap-4 w-full">
          <div className="flex flex-col items-center gap-4 w-full mb-8">
            <Input name="name" variant="text" placeholder="Name" className="w-3/4" />
            <Input name="email" variant="text" placeholder="Email" className="w-3/4" />
            <Input name="password" variant="password" placeholder="Password" className="w-3/4" />
          </div>
          <Button type="submit" width="75%">Sign up</Button>
          <div className="flex flex-col items-center mt-4">
            <span className="w-full text-center">Already have an account?</span>
            <Button type="button" variant="text" className="w-fit" onClick={() => window.location.href = "/login"}>Log in</Button>
          </div>
        </div>
      </Card>
    </form>
  );
}