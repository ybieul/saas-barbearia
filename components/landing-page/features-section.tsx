"use client";

import { motion } from "framer-motion";
import { SectionLayout } from "@/components/ui/section-layout";
import { cn } from "@/lib/utils";
import { CalendarDays, Users2, Briefcase, CalendarCheck2, Lock, ShieldCheck } from "lucide-react";

const container = {
	hidden: { opacity: 0 },
	show: {
		opacity: 1,
		transition: { staggerChildren: 0.12 },
	},
};

const item = {
	hidden: { opacity: 0, y: 18 },
	show: { opacity: 1, y: 0 },
};

const FEATURES = [
	{ icon: CalendarDays, title: "Sincronização de Agenda", desc: "Conecte e organize todas as suas agendas em um só lugar. Múltiplos barbeiros, serviços e horários." },
	{ icon: Users2, title: "Gestão de Clientes", desc: "Tenha um histórico completo de cada cliente, serviços favoritos, datas de aniversário e anotações importantes." },
	{ icon: Briefcase, title: "Serviços Personalizados", desc: "Crie e organize sua lista de serviços e adicione categorias para um agendamento rápido e intuitivo." },
	{ icon: CalendarCheck2, title: "Relatórios detalhados", desc: "Veja o faturamento, os serviços mais vendidos e o desempenho de cada barbeiro." },
	{ icon: ShieldCheck, title: "Seguro e Privado", desc: "Seus dados e os dados dos seus clientes estão protegidos com criptografia" },
	{ icon: Lock, title: "Limites de Agendamento", desc: "Defina o tempo de cada serviço e o número de agendamentos por dia. Você no controle." },
];

function FeatureCard({ icon: Icon, title, desc }: any) {
	return (
		<motion.article
			variants={item}
			className={cn(
				"group relative rounded-2xl border bg-card p-6 shadow-sm transition-colors",
				"border-border/60",
				"before:absolute before:inset-0 before:rounded-2xl before:p-[1px] before:opacity-0 before:transition-opacity before:duration-300",
				"before:[background:linear-gradient(120deg,theme(colors.primary)_0%,theme(colors.primary/60)_50%,rgba(255,255,255,0)_100%)]",
				"hover:before:opacity-100"
			)}
		>
			<div className="relative h-full rounded-[1rem] bg-card p-0.5">
				<div className="rounded-xl p-0.5">
					<div className="flex h-full flex-col">
						<div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-lg bg-primary/15">
							<Icon className="h-6 w-6 text-primary" />
						</div>
						<h3 className="text-lg font-semibold">{title}</h3>
						<p className="mt-2 text-sm text-muted-foreground">{desc}</p>
					</div>
				</div>
			</div>
		</motion.article>
	);
}

export default function FeaturesSection() {
	return (
		<SectionLayout>
			<div className="mx-auto mb-10 max-w-3xl text-center">
				<h2 className="text-3xl md:text-4xl font-bold">Funcionalidades que transformam sua barbearia</h2>
			</div>

			<motion.div
				variants={container}
				initial="hidden"
				whileInView="show"
				viewport={{ once: true, amount: 0.2 }}
				className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3"
			>
				{FEATURES.map((f, i) => (
					<FeatureCard key={i} {...f} />
				))}
			</motion.div>
		</SectionLayout>
	);
}

