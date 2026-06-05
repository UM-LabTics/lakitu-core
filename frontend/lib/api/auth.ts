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

export type ActionResult =
  | { success: true }
  | { success: false; error: string };

export async function login(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
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
    return { success: false, error: "Could not reach the server. Please try again." };
  }

  if (!response.ok) {
    const errorData = await response.json();
    return { success: false, error: `${errorData.detail}. Please try again.` };
  }

  const data = await response.json();
  (await cookies()).set("session_token", data.token, {
    httpOnly: true,
    secure: process.env.ENVIRONMENT === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/home");
}


export async function signup(
  _prevState: ActionResult | null,
  formData: FormData
): Promise<ActionResult> {
  const email = formData.get("email") as string;
  const password = formData.get("password") as string;
  const confirmPassword = formData.get("confirmPassword") as string;
  const name = formData.get("name") as string;

  if (password !== confirmPassword) {
    return { success: false, error: "Passwords do not match." };
  }

  const passwordErrors = [];
  if (password.length < 8) {
    passwordErrors.push("8 characters");
  }
  if (!/\d/.test(password) || !/[a-zA-Z]/.test(password)) {
    passwordErrors.push("one number and one letter");
  }

  if (passwordErrors.length > 0) {
    return { success: false, error: `Password must contain at least ${passwordErrors.join(", ")}.` };
  }


  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/signup`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, name }),
    });
  } catch {
    return { success: false, error: "Could not reach the server. Please try again." };
  }

  if (!response.ok) {
    const errorData = await response.json();
    return { success: false, error: `${errorData.detail}. Please try again.` };
  }

  const data = await response.json();
  (await cookies()).set("session_token", data.token, {
    httpOnly: true,
    secure: process.env.ENVIRONMENT === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });

  redirect("/liveFeed");
}

export async function logout() {
  (await cookies()).delete('session_token');
  redirect('/login');
}


export async function authenticatedFetch(url: string, options: RequestInit = {}) {
  const token = (await cookies()).get('session_token')?.value;

  return fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });
}
