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
  const url = `${API_URL}/api/login?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return response.json();
}

export async function signup(
  email: string,
  password: string,
  name: string,
): Promise<AuthResponse> {
  const url = `${API_URL}/api/signup?email=${encodeURIComponent(email)}&password=${encodeURIComponent(password)}&name=${encodeURIComponent(name)}`;
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Error: ${response.status}`);
  return response.json();
}