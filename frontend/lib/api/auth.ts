"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

const API_URL = process.env.BACKEND_INTERNAL_URL ?? "http://backend:8000";

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
  };
}

export async function login(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
  } catch {
    throw new Error("500 Internal Server Error: Could not reach the server.");
  }

  if (!response.ok) throw new Error(`Error: ${response.status}`);
  const data = await response.json();
  (await cookies()).set("session_token", data.token, {
    httpOnly: true,
    secure: process.env.ENVIRONMENT === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  console.log("Login successful, token stored in cookie:", data.token);
  redirect("/liveFeed");
}

export async function signup(formData: FormData): Promise<void> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const name = formData.get("name") as string;

  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
  } catch {
    throw new Error("500 Internal Server Error: Could not reach the server.");
  }

  if (!response.ok) throw new Error(`Error: ${response.status}`);
  const data = await response.json();
  (await cookies()).set("session_token", data.token, {
    httpOnly: true,
    secure: process.env.ENVIRONMENT === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  console.log("Signup successful, token stored in cookie:", data.token);
  redirect("/liveFeed");
}

export async function logout() {
  (await cookies()).delete('session_token');
  redirect('/login');
}