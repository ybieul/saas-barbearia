"use client";

import { SectionLayout } from "@/components/ui/section-layout";
import { Quote } from "lucide-react";

const TESTIMONIALS = [
	{ text: "Minha agenda vivia um caos e agora eu tenho tempo até pra respirar. Recomendo demais!", name: "Daniel Melo Barbershop", role: "Barbeiro" },
	{ text: "A rapaziada aqui da barbearia se amarrou! O sistema é bem completo", name: "Alex Tavares", role: "Barbeiro" },
	{ text: "Resolvi o problema das faltas dos clientes com o sistema de vcs, agradeço dms", name: "Luis Barber", role: "Barbeiro" },
	{ text: "Tooop demais o sistema!!! Eu e meu sócio gostamos do visual e da facilidade de usar!", name: "Jonas Barbershop", role: "Barbeiro" },
	{ text: "Aqui na barbearia só usamos essa plataforma da Tymerbook há um bom tempo, top", name: "Samuel Silva Barber", role: "Barbeiro" },
	{ text: "Boa demais! Superou todos os outros sistemas que testamos", name: "Marco Sylas", role: "Barbeiro" },
];

export default function TestimonialsSection() {
	return (
		<SectionLayout>
			<div id="depoimentos" className="sr-only" aria-hidden="true" />
			<div className="grid gap-8 md:grid-cols-2 md:items-center">
				<h2 className="text-3xl md:text-4xl font-bold">Aprovado por barbeiros e donos de barbearia</h2>
				<p className="text-muted-foreground">Todos confiam na TymerBook para organizar a agenda, reduzir o estresse e tomar decisões mais inteligentes, tudo em um único sistema.</p>
			</div>

			<div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
				{TESTIMONIALS.map((t, i) => (
					<article key={i} className="relative rounded-2xl border border-border/60 bg-card p-6">
						<Quote className="absolute -top-4 left-4 h-12 w-12 text-primary/30" />
						<p className="mt-6 text-sm text-foreground/90">“{t.text}”</p>
						<div className="mt-4">
							<p className="text-sm font-semibold">{t.name}</p>
							<p className="text-xs text-muted-foreground">{t.role}</p>
						</div>
					</article>
				))}
			</div>
		</SectionLayout>
	);
}

