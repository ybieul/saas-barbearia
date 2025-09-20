"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { cn } from "@/lib/utils";

interface ThreeStepsSectionProps {
  className?: string;
}

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const item = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function ThreeStepsSection({ className }: ThreeStepsSectionProps) {
  const steps = [
    {
      badge: "Passo 1",
      title: "Passo 1 - Cadastre sua barbearia",
      desc:
        "Crie seu perfil e personalize-o com sua barbearia, serviços, horários de funcionamento e equipe. Tenha sua barbearia online e pronta para agendar.",
    },
    {
      badge: "Passo 2",
      title: "Passo 2 - Conecte com seus clientes",
      desc:
        "Seus clientes podem agendar online de forma fácil e rápida pelo link exclusivo da sua barbearia. Tudo com a sua marca e com bastante profissionalismo.",
    },
    {
      badge: "Passo 3",
      title: "Passo 3 - Gerencie seu negócio",
      desc:
        "Tenha a visão completa da sua agenda, clientes, financeiro e equipe, tudo de forma automatizada e intuitiva. Foque no que importa e deixe a gestão com o TymerBook!",
    },
  ];

  return (
    <section className={cn("py-16 md:py-20", className)}>
      <div className="container mx-auto px-4">
        <motion.div
          variants={container}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="grid gap-6 md:gap-8 md:grid-cols-3"
        >
          {steps.map((s, i) => (
            <motion.article
              key={i}
              variants={item}
              className="rounded-2xl border border-border/60 bg-card/70 p-4 sm:p-6 shadow-lg shadow-black/20 backdrop-blur-sm"
            >
              <div className="relative aspect-[4/5] w-full overflow-hidden rounded-xl bg-muted/30">
                <Image
                  src="/placeholder.jpg"
                  alt={`Ilustração do ${s.badge}`}
                  fill
                  className="object-cover"
                />
              </div>

              <div className="mt-4">
                <span className="inline-flex items-center rounded-full bg-primary/15 text-primary px-3 py-1 text-xs font-medium">
                  {s.badge}
                </span>
                <h3 className="mt-3 text-lg sm:text-xl font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            </motion.article>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
