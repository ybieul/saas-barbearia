"use client";

import { SectionLayout } from "@/components/ui/section-layout";
import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, X } from "lucide-react";

// Links diretos de checkout (Kirvano) - substitua pelos definitivos
const CHECKOUT_LINKS = {
	BASIC: {
		monthly: "https://app.kirvano.com/checkout/tymerbook/basic-monthly",
		annual: "https://app.kirvano.com/checkout/tymerbook/basic-annual",
	},
	PREMIUM: {
		monthly: "https://app.kirvano.com/checkout/tymerbook/premium-monthly",
		annual: "https://app.kirvano.com/checkout/tymerbook/premium-annual",
	},
	ULTRA: {
		monthly: "https://app.kirvano.com/checkout/tymerbook/ultra-monthly",
		annual: "https://app.kirvano.com/checkout/tymerbook/ultra-annual",
	},
} as const;

type Cycle = "monthly" | "annual";
type PlanKey = keyof typeof CHECKOUT_LINKS;

export default function PricingSection() {
	const [cycle, setCycle] = useState<Cycle>("monthly");

	const plans = useMemo(
		() => [
			{
				key: "BASIC" as const,
				name: "Basico",
				highlight: false,
				tagline: "Até 1 Profissional",
				price: { monthly: "R$ 79,90", annual: "R$ 59,90" },
				features: [
					{ text: "Clientes ilimitados", ok: true },
					{ text: "Agendamentos ilimitados", ok: true },
					{ text: "Serviços ilimitados", ok: true },
					{ text: "Integração com WhatsApp", ok: true },
					{ text: "Relatórios personalizados", ok: true },
					{ text: "Relatórios de desempenho por barbeiro", ok: false },
					{ text: "Suporte ao cliente", ok: true },
				],
			},
			{
				key: "PREMIUM" as const,
				name: "Premium",
				highlight: true,
				tagline: "Até 3 Profissionais",
				price: { monthly: "R$ 129,90", annual: "R$ 97,90" },
				features: [
					{ text: "Clientes ilimitados", ok: true },
					{ text: "Agendamentos ilimitados", ok: true },
					{ text: "Serviços ilimitados", ok: true },
					{ text: "Integração com WhatsApp", ok: true },
					{ text: "Relatórios personalizados", ok: true },
					{ text: "Relatórios de desempenho por barbeiro", ok: true },
					{ text: "Suporte ao cliente", ok: true },
				],
			},
			{
				key: "ULTRA" as const,
				name: "Ultra",
				highlight: false,
				tagline: "Profissionais ilimitados",
				price: { monthly: "R$ 249,90", annual: "R$ 187,90" },
				features: [
					{ text: "Clientes ilimitados", ok: true },
					{ text: "Agendamentos ilimitados", ok: true },
					{ text: "Serviços ilimitados", ok: true },
					{ text: "Integração com WhatsApp", ok: true },
					{ text: "Relatórios personalizados", ok: true },
					{ text: "Relatórios de desempenho por barbeiro", ok: true },
					{ text: "Suporte prioritário", ok: true },
				],
			},
		],
		[]
	);

	return (
		<SectionLayout>
			<div id="pricing" className="mx-auto max-w-3xl text-center">
				<h2 className="text-3xl md:text-4xl font-bold">Escolha o plano perfeito para o seu negócio.</h2>
				<p className="mt-3 text-muted-foreground">Escolha o plano ideal para o momento do seu negócio. Desde planos mensais a planos anuais.</p>
			</div>

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

			<div className="mt-8 grid gap-6 md:grid-cols-3">
				{plans.map((p) => {
					const href = CHECKOUT_LINKS[p.key as PlanKey][cycle];
					return (
						<div
							key={p.key}
							className={`relative rounded-2xl border bg-card p-6 ${
								p.highlight ? "border-primary/80 shadow-[0_0_40px_-12px_rgba(71,0,255,0.5)]" : "border-border/60"
							}`}
						>
							{p.highlight && (
								<Badge className="absolute -top-3 right-4 bg-yellow-400 text-black hover:bg-yellow-400/90">Mais Popular</Badge>
							)}

							<div className="mb-4">
								<h3 className="text-2xl font-semibold">{p.name}</h3>
								<p className="text-sm text-muted-foreground">{p.tagline}</p>
							</div>

							<div className="mb-6 text-3xl font-bold">{p.price[cycle]}</div>

							<ul className="space-y-2 text-sm">
								{p.features.map((f, i) => (
									<li key={i} className="flex items-start gap-2">
										{f.ok ? <Check className="h-4 w-4 text-primary mt-0.5" /> : <X className="h-4 w-4 text-muted-foreground mt-0.5" />}
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

