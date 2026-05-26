"use client";

import { login } from "@/lib/api/auth";
import Button from "@/components/Button";
import Card from "@/components/Card";
import Input from "@/components/Input";

export default function LoginForm() {
  return (
    <form action={login} className="max-w-md mx-auto mt-10">
      <Card title="Log in" >
        <Input name="email" variant="text" placeholder="Email" />
        <Input name="password" variant="password" placeholder="Password" />
        <Button type="submit">Log in</Button>
      </Card>
    </form>
  );
}