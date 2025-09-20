"use client";

import { SectionLayout } from "@/components/ui/section-layout";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

const CHECKOUT_LINKS = {
  BASIC: {
    monthly: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_BASIC_MONTHLY || "#",
    annual: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_BASIC_ANNUAL || "#",
  },
  PREMIUM: {
    monthly: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_PREMIUM_MONTHLY || "#",
    annual: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_PREMIUM_ANNUAL || "#",
  },
  ULTRA: {
    monthly: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_ULTRA_MONTHLY || "#",
    annual: process.env.NEXT_PUBLIC_KIRVANO_CHECKOUT_ULTRA_ANNUAL || "#",
  },
} as const;

type Cycle = "monthly" | "annual";

export default function PricingSection() {
  const [cycle, setCycle] = useState<Cycle>("monthly");

  const plans = useMemo(
    () => ([
      {
        key: "BASIC" as const,
        name: "Básico",
        highlight: false,
        tagline: "Ideal para começar",
        price: { monthly: "R$ 29/mês", annual: "R$ 24/mês" },
        features: [
          { text: "Agendamento online 24/7", ok: true },
          { text: "Lembretes via WhatsApp", ok: true },
          { text: "Gestão de clientes (CRM)", ok: true },
          { text: "Relatórios essenciais", ok: true },
          { text: "Profissionais ilimitados", ok: false },
        ],
      },
      {
        key: "PREMIUM" as const,
        name: "Premium",
        highlight: true,
        tagline: "Para equipes em crescimento",
        price: { monthly: "R$ 59/mês", annual: "R$ 49/mês" },
        features: [
          { text: "Tudo do Básico", ok: true },
          { text: "Agenda por profissional", ok: true },
          { text: "Bloqueios e intervalos", ok: true },
          { text: "Relatórios avançados", ok: true },
          { text: "Suporte prioritário", ok: true },
        ],
      },
      {
        key: "ULTRA" as const,
        name: "Ultra",
        highlight: false,
        tagline: "Para barbearias sem limites",
        price: { monthly: "R$ 99/mês", annual: "R$ 79/mês" },
        features: [
          { text: "Tudo do Premium", ok: true },
          { text: "Profissionais ilimitados", ok: true },
          { text: "Upsell inteligente", ok: true },
          { text: "Recursos ilimitados", ok: true },
          { text: "Consultoria dedicada", ok: true },
        ],
      },
    ]),
    []
  );

  return (
    <SectionLayout>
      <div className="mx-auto max-w-3xl text-center">
        <h2 className="text-3xl md:text-4xl font-bold">Planos e Preços</h2>
        <p className="mt-3 text-muted-foreground">Escolha o plano ideal para o seu momento</p>
      </div>

      {/* Toggle Mensal/Anual */}
      <div className="mt-6 flex justify-center">
        <div className="inline-flex items-center rounded-full border border-border bg-background p-1 text-sm">
          {["monthly", "annual"].map((c) => (
            <button
              key={c}
              onClick={() => setCycle(c as Cycle)}
              className={`px-4 py-2 rounded-full transition-colors ${
                cycle === c ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              aria-pressed={cycle === c}
            >
              {c === "monthly" ? "Mensal" : "Anual"}
            </button>
          ))}
        </div>
      </div>

      {/* Cards */}
      <div className="mt-8 grid gap-6 md:grid-cols-3">
        {plans.map((p) => {
          const href = CHECKOUT_LINKS[p.key][cycle];
          return (
            <div
              key={p.key}
              className={`relative rounded-2xl border bg-card p-6 ${
                p.highlight
                  ? "border-primary/80 shadow-[0_0_40px_-12px_rgba(71,0,255,0.5)]"
                  : "border-border/60"
              }`}
            >
              {p.highlight && (
                <Badge className="absolute -top-3 right-4 bg-yellow-400 text-black hover:bg-yellow-400/90">
                  Mais Popular
                </Badge>
              )}

              <div className="mb-4">
                <h3 className="text-2xl font-semibold">{p.name}</h3>
                <p className="text-sm text-muted-foreground">{p.tagline}</p>
              </div>

              <div className="mb-6 text-3xl font-bold">{p.price[cycle]}</div>

              <ul className="space-y-2 text-sm">
                {p.features.map((f, i) => (
                  <li key={i} className="flex items-start gap-2">
                    {f.ok ? (
                      <Check className="h-4 w-4 text-primary mt-0.5" />
                    ) : (
                      <X className="h-4 w-4 text-muted-foreground mt-0.5" />
                    )}
                    <span className={f.ok ? "" : "text-muted-foreground"}>{f.text}</span>
                  </li>
                ))}
              </ul>

              <div className="mt-6">
                <a href={href} target="_blank" rel="noopener noreferrer" className="block">
                  <Button className="w-full rounded-full">Adquirir agora</Button>
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </SectionLayout>
  );
}
