"use client";

import { useState } from "react";
import { Camera, Pencil, Trash2, Plus } from "lucide-react";
import Button from "@/components/Button";
import AdminButton from "@/components/AdminButton";
import IconButton from "@/components/IconButton";
import Select from "@/components/Select";
import Input from "@/components/Input";
import Card from "@/components/Card";
import Selectable from "@/components/Selectable";

// ─── helpers ──────────────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-center gap-4">
        <h2 className="text-primary whitespace-nowrap">{title}</h2>
        <div className="w-full h-px bg-primary-light/30" />
      </div>
      {children}
    </section>
  );
}

function Row({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-4">{children}</div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm text-primary-light/60 mt-1">{children}</p>
  );
}

// ─── page ─────────────────────────────────────────────────────────────────────

export default function StylesheetPage() {
  // Estado de Selectable
  const [sel1, setSel1] = useState(true);
  const [sel2, setSel2] = useState(false);
  const [multiSel, setMultiSel] = useState<Record<string, boolean>>({
    breakfast: true,
    lunch: false,
    dinner: true,
    snack: false,
  });

  const toggleMulti = (key: string) =>
    setMultiSel((prev) => ({ ...prev, [key]: !prev[key] }));

  return (
    <main className="bg-background min-h-screen px-8 py-12">
      <div className="max-w-5xl mx-auto flex flex-col gap-14">

        {/* Encabezado */}
        <div>
          <h1 className="text-primary">Hoja de estilos de componentes</h1>
          <p className="text-primary-light/70 mt-1">
            Todos los componentes de UI en cada variante y estado.
          </p>
        </div>

        {/* ── TIPOGRAFÍA ──────────────────────────────────────────── */}
        <Section title="Tipografía">
          <h1>H1 — Fredoka Bold</h1>
          <h2>H2 — Fredoka Semibold</h2>
          <h3>H3 — Fredoka Semibold</h3>
          <p>
            Texto principal — peso regular, color primary light. Fredoka mantiene
            un tono amigable sin sacrificar la legibilidad.
          </p>
          <p className="text-black/50 text-sm">
            Pequeño / tenue — negro con 50% de opacidad, usado en inputs y ayudas.
          </p>
        </Section>

        {/* ── COLORES ──────────────────────────────────────────────── */}
        <Section title="Paleta de colores">
          <div className="flex flex-wrap gap-3">
            {[
              { name: "primary",            bg: "bg-primary",            text: "text-white" },
              { name: "primary-light",      bg: "bg-primary-light",      text: "text-white" },
              { name: "primary-super-light",bg: "bg-primary-super-light",text: "text-primary" },
              { name: "secondary",          bg: "bg-secondary",          text: "text-primary" },
              { name: "secondary-light",    bg: "bg-secondary-light",    text: "text-primary" },
              { name: "secondary-dark",     bg: "bg-secondary-dark",     text: "text-white" },
              { name: "crema",              bg: "bg-crema",              text: "text-primary" },
              { name: "background",         bg: "bg-background", text: "text-primary" },
              { name: "occupied",           bg: "bg-occupied",           text: "text-white" },
              { name: "on-occupied",        bg: "bg-on-occupied",        text: "text-primary" },
              { name: "mid-range-yellow",   bg: "bg-mid-range-yellow",   text: "text-primary" },
            ].map(({ name, bg, text }) => (
              <div
                key={name}
                className={`${bg} ${text} px-4 py-3 text-sm font-medium justify-center flex items-center`}
                style={{ borderRadius: "var(--radius-md)", minWidth: 140, boxShadow: "0px 2px 5px 2px rgba(0, 0, 0, 0.25)" }}
              >
                {name}
              </div>
            ))}
          </div>
        </Section>

        {/* ── BOTONES ─────────────────────────────────────────────── */}
        <Section title="Button">
          <Row>
            <div>
              <Button>Default</Button>
              <Label>Predeterminado</Label>
            </div>
            <div>
              <Button disabled>Disabled</Button>
              <Label>disabled</Label>
            </div>
            <div>
              <Button width="150px">Cortito</Button>
              <Label>Ancho personalizado</Label>
            </div>
            <div>
              <Button variant="text">Text</Button>
              <Label>variant=&quot;text&quot;</Label>
            </div>
          </Row>
        </Section>

        <Section title="Admin Button">
          <Row>
            <div>
              <AdminButton>Admin Action</AdminButton>
              <Label>Predeterminado</Label>
            </div>
            <div>
              <AdminButton disabled>Disabled</AdminButton>
              <Label>disabled</Label>
            </div>
            <div>
              <AdminButton width="150px">Cortito</AdminButton>
              <Label>Ancho personalizado</Label>
            </div>
          </Row>
        </Section>

        {/* ── BOTONES CON ÍCONO ───────────────────────────────────── */}
        <Section title="Icon Button">
          <Row>
            <div>
              <IconButton icon={<Camera size={60} />} aria-label="Camera" />
              <Label>Cámara</Label>
            </div>
            <div>
              <IconButton icon={<Camera size={30} />} aria-label="Camera large" size={64} />
              <Label>Pequeño (64px)</Label>
            </div>
            <div>
              <IconButton icon={<Camera size={60} />} aria-label="Disabled" disabled />
              <Label>disabled</Label>
            </div>
          </Row>
        </Section>

        {/* ── SELECTABLE ──────────────────────────────────────────── */}
        <Section title="Selectable">
          <Row>
            <div className="w-48">
              <Selectable selected={false}>Sin seleccionar</Selectable>
              <Label>Estado sin seleccionar</Label>
            </div>
            <div className="w-48">
              <Selectable selected>Seleccionado</Selectable>
              <Label>Estado seleccionado</Label>
            </div>
          </Row>

          <div>
            <p className="text-sm font-semibold text-primary-light mb-2">
              Ejemplo de toggle
            </p>
            <Row>
              <div className="w-40">
                <Selectable selected={sel1} onClick={() => setSel1((v) => !v)}>
                  Opción A
                </Selectable>
              </div>
              <div className="w-100">
                <Selectable selected={sel2} onClick={() => setSel2((v) => !v)}>
                  {sel2 ? "✓ Opción B seleccionado" : "Opción B sin seleccionar"}
                </Selectable>
              </div>
            </Row>
          </div>

          <div>
            <p className="text-sm font-semibold text-primary-light mb-2">
              Grupo multiselección
            </p>
            <div className="flex flex-wrap gap-3">
              {Object.entries(multiSel).map(([key, active]) => (
                <Selectable
                  key={key}
                  selected={active}
                  onClick={() => toggleMulti(key)}
                  className="w-32 capitalize"
                >
                  {active ? `✓ ${key}` : `✗ ${key}`}
                </Selectable>
              ))}
            </div>
          </div>
        </Section>

        {/* ── INPUTS ──────────────────────────────────────────────── */}
        <Section title="Input">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <Input variant="text" placeholder="Texto de entrada" />
              <Label>variant=&quot;text&quot;</Label>
            </div>
            <div>
              <Input variant="password" placeholder="Contraseña" />
              <Label>variant=&quot;password&quot; — eye toggle</Label>
            </div>
            <div>
              <Input variant="date" />
              <Label>variant=&quot;date&quot;</Label>
            </div>
            <div>
              <Input variant="time" />
              <Label>variant=&quot;time&quot;</Label>
            </div>
            <div>
              <Input variant="text" placeholder="disabled" disabled />
              <Label>disabled</Label>
            </div>
          </div>
        </Section>

        {/* ── SELECT ──────────────────────────────────────────────── */}
        <Section title="Select">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div>
              <Select
                placeholder="Elegir una fruta"
                options={[
                  { label: "Apple",  value: "apple"  },
                  { label: "Banana", value: "banana" },
                  { label: "Cherry", value: "cherry" },
                ]}
              />
              <Label>Predeterminado</Label>
            </div>
            <div>
              <Select
                placeholder="disabled"
                options={[]}
                disabled
              />
              <Label>disabled</Label>
            </div>
          </div>
        </Section>

        {/* ── CARDS ───────────────────────────────────────────────── */}
        <Section title="Card">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div>
              <Card title="Default Card" variant="default">
                <p className="text-primary-light text-sm">
                  Fondo crema con sombra suave. Ideal para bloques de contenido.
                </p>
              </Card>
              <Label>variant=&quot;default&quot;</Label>
            </div>
            <div>
              <Card title="Light Card" variant="light">
                <p className="text-primary-light text-sm">
                  Fondo primary super light con borde primary light.
                </p>
              </Card>
              <Label>variant=&quot;light&quot;</Label>
            </div>
            <div>
              <Card title="Dark Card" variant="dark">
                <p className="text-primary-super-light text-sm">
                  Fondo primary light con texto y borde super light.
                </p>
              </Card>
              <Label>variant=&quot;dark&quot;</Label>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <Card variant="default">
                <p className="text-primary-light text-sm">Card sin título.</p>
              </Card>
              <Label>Sin título</Label>
            </div>
            <div>
              <Card title="With Actions" variant="light">
                <p className="text-primary-light text-sm mb-4">
                  Los Cards pueden contener cualquier componente.
                </p>
                <div className="flex gap-5">
                  <Button className="flex-1">Save</Button>
                  <AdminButton className="flex-1">Cancel</AdminButton>
                </div>
              </Card>
              <Label>Card con botones anidados</Label>
            </div>
          </div>
        </Section>

        {/* ── EJEMPLO DE FORMULARIO ───────────────────────────────── */}
        <Section title="Ejemplo compuesto — Form dentro de un Card">
          <div className="max-w-sm">
            <Card title="New Booking">
              <div className="flex flex-col gap-3">
                <Input variant="text" placeholder="Nombre completo" />
                <Input variant="date" />
                <Input variant="time" />
                <Select
                  placeholder="Seleccionar habitación"
                  options={[
                    { label: "Room A", value: "a" },
                    { label: "Room B", value: "b" },
                    { label: "Room C", value: "c" },
                  ]}
                />
                <div className="flex gap-4 pt-2">
                  <Button className="flex-1">Confirmar</Button>
                  <Button variant="text" className="flex-1">Cancelar</Button>
                </div>
              </div>
            </Card>
          </div>
        </Section>

      </div>
    </main>
  );
}