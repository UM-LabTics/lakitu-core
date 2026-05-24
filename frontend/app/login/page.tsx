"use client";

import { useState } from "react";
import { login } from "@/lib/api/auth";
import Input from "@/components/Input";

export default function LoginPage() {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleLogin() {
    if (!email || !password) {
      setError("Por favor completá todos los campos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await login(email, password);
      // Por ahora solo logueamos — Nacho agregará el guardado del token
      console.log("Login exitoso:", data);
      alert(`Bienvenido! Token: ${data.token}`);
    } catch (err) {
      setError("Credenciales incorrectas o error del servidor.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Iniciar Sesión</h1>

      <div>
        <p>Email:</p>
        <Input
          variant="text"
          placeholder="email@ejemplo.com"
          value={email}
          onChange={(value) => setEmail(value)}
        />
      </div>

      <div>
        <p>Contraseña:</p>
        <Input
          variant="password"
          placeholder="Contraseña"
          value={password}
          onChange={(value) => setPassword(value)}
        />
      </div>

      {error && <p style={{ color: "red" }}>{error}</p>}

      <button onClick={handleLogin} disabled={loading}>
        {loading ? "Cargando..." : "Iniciar Sesión"}
      </button>

      <p>
        ¿No tenés cuenta? <a href="/signup">Registrate</a>
      </p>
    </div>
  );
}