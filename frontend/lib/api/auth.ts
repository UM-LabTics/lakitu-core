const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

export interface AuthResponse {
  token: string;
  user: {
    id: number;
    email: string;
  };
}

export async function login(
  email: string,
  password: string,
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return response.json();
}

export async function signup(
  email: string,
  password: string,
  name: string,
): Promise<AuthResponse> {
  const response = await fetch(`${API_URL}/api/signup`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password, name }),
  });
  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return response.json();
}