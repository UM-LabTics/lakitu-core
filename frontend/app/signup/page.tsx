"use client";

import { useState } from "react";
import { signup } from "@/lib/api/auth";
import Input from "@/components/Input";

export default function SignupPage() {
  const [name, setName]         = useState("");
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState<string | null>(null);
  const [loading, setLoading]   = useState(false);

  async function handleSignup() {
    if (!name || !email || !password) {
      setError("Por favor completá todos los campos.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await signup(email, password, name);
      // Por ahora solo logueamos — Nacho agregará el guardado del token
      console.log("Signup exitoso:", data);
      alert(`Cuenta creada! Token: ${data.token}`);
    } catch (err) {
      setError("Error al crear la cuenta. El email puede estar en uso.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1>Crear Cuenta</h1>

      <div>
        <p>Nombre:</p>
        <Input
          variant="text"
          placeholder="Tu nombre"
          value={name}
          onChange={(value) => setName(value)}
        />
      </div>

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

      <button onClick={handleSignup} disabled={loading}>
        {loading ? "Cargando..." : "Crear Cuenta"}
      </button>

      <p>
        ¿Ya tenés cuenta? <a href="/login">Iniciá sesión</a>
      </p>
    </div>
  );
}
