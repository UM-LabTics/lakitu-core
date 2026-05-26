"use client";

import { signup } from "@/lib/api/auth";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";

export default function SignupForm() {
  return (
    <form action={signup} className="max-w-md mx-auto mt-10">
      <Card title="Sign up" >
        <Input name="name" variant="text" placeholder="Name" />
        <Input name="email" variant="text" placeholder="Email" />
        <Input name="password" variant="password" placeholder="Password" />
        <Button type="submit">Sign up</Button>
      </Card>
    </form>
  );
}