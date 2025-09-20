"use client";

import { SectionLayout } from "@/components/ui/section-layout";
import { XCircle, CheckCircle2 } from "lucide-react";

const DORES = [
  "Agendas de papel",
  "Gestão amadora",
  "Faltas constantes de clientes",
  "Falta de gestão financeira",
  "Suporte lento e genérico",
];

const SOLUCOES = [
  "Painel inteligente",
  "Gestão de clientes e reativação",
  "Comunicação direta via WhatsApp",
  "Relatórios e finanças",
  "Suporte prioritário e rápido",
];

export default function ComparisonSection() {
  return (
    <SectionLayout>
      <div className="mx-auto max-w-3xl text-center mb-10">
        <p className="text-sm text-muted-foreground">• Por que a TymerBook?</p>
        <h2 className="mt-2 text-3xl md:text-4xl font-bold">Existe uma forma mais inteligente de gerenciar sua barbearia.</h2>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Coluna 1 - Outras ferramentas */}
        <div className="rounded-2xl border border-border/60 bg-card p-6">
          <h3 className="text-lg font-semibold mb-4">Outras ferramentas e métodos</h3>
          <ul className="space-y-3 text-sm">
            {DORES.map((t, i) => (
              <li key={i} className="flex items-start gap-3">
                <XCircle className="h-5 w-5 text-red-500 mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Coluna 2 - TymerBook */}
        <div className="rounded-2xl border-2 border-primary bg-card p-6 shadow-[0_0_30px_-12px_rgba(71,0,255,0.5)]">
          <div className="flex items-center gap-2 mb-2">
            <span className="inline-block h-2 w-2 rounded-full bg-primary" />
            <h3 className="text-lg font-semibold">TymerBook</h3>
          </div>
          <ul className="space-y-3 text-sm">
            {SOLUCOES.map((t, i) => (
              <li key={i} className="flex items-start gap-3">
                <CheckCircle2 className="h-5 w-5 text-primary mt-0.5" />
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </SectionLayout>
  );
}
