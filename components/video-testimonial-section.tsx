"use client";

import { SectionLayout } from "@/components/ui/section-layout";

interface VideoTestimonialSectionProps {
  src?: string;
  poster?: string;
}

export default function VideoTestimonialSection({ src = "/video.mp4", poster = "/placeholder.jpg" }: VideoTestimonialSectionProps) {
  return (
    <SectionLayout>
      <div className="grid gap-8 md:grid-cols-2 md:items-center">
        <div className="relative aspect-video w-full overflow-hidden rounded-xl border border-border/60 bg-black">
          <video
            className="h-full w-full"
            controls
            poster={poster}
            // @ts-expect-error allow inline prop for demo/autoplay muted
            playsInline
          >
            <source src={src} type="video/mp4" />
            Seu navegador não suporta o vídeo HTML5.
          </video>
        </div>

        <div>
          <h3 className="text-2xl md:text-3xl font-bold">Depoimento em vídeo</h3>
          <p className="mt-3 text-muted-foreground">
            Assista ao depoimento de quem usa a TymerBook no dia a dia e veja como as ferramentas ajudaram a
            organizar a agenda, reduzir faltas e profissionalizar o atendimento.
          </p>
        </div>
      </div>
    </SectionLayout>
  );
}
