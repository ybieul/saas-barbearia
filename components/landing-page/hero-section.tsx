"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import Image from "next/image";

interface HeroSectionProps {
  className?: string;
}

export default function HeroSection({ className }: HeroSectionProps) {
  return (
    <section id="sobre" className={cn("relative overflow-hidden pt-28 md:pt-32 pb-16 scroll-mt-24", className)}>
      {/* Aura radial ao fundo */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10 flex items-center justify-center"
      >
        <div className="h-[600px] w-[600px] md:h-[900px] md:w-[900px] rounded-full bg-primary/20 blur-[120px]" />
      </div>

      <div className="container mx-auto px-4">
        <div className="mx-auto max-w-4xl text-center">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="font-lufga text-4xl sm:text-5xl md:text-6xl/tight font-extrabold tracking-tight"
          >
            Agendamento e gestão para barbeiros de sucesso.
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="mt-5 text-lg md:text-xl text-muted-foreground"
          >
            A TymerBook é o sistema simples e intuitivo que te ajuda em cada etapa, desde o agendamento do cliente até a gestão completa do seu negócio.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="mt-8 flex justify-center"
          >
            <a href="#pricing" className="inline-block">
              <Button size="lg" className="rounded-full bg-gradient-to-r from-primary to-primary/70 hover:from-primary/90 hover:to-primary/75">
                Adquirir agora
              </Button>
            </a>
          </motion.div>
        </div>

        {/* Mock do dashboard "flutuando" */}
        <div className="relative mx-auto mt-12 max-w-5xl">
          {/* brilho sutil por trás da imagem */}
          <div className="absolute inset-0 -z-10 rounded-[2rem] bg-primary/15 blur-3xl" />

          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="rounded-[1.25rem] border border-border/50 shadow-2xl shadow-black/40 ring-1 ring-black/10 overflow-hidden"
          >
            <Image
              src="/placeholder.jpg"
              alt="Dashboard TymerBook"
              width={1920}
              height={1080}
              priority
              className="w-full h-auto object-cover"
            />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
