import { Github } from "@medusajs/icons"
import { Button, Heading } from "@modules/common/components/ui"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const Hero = () => {
  return (
    <div className="relative w-full min-h-[78vh] overflow-hidden border-b border-keiko-ink/20">
      <div
        className="absolute inset-0 bg-cover bg-center scale-105"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=2000&q=80')",
        }}
        aria-hidden
      />
      <div className="absolute inset-0 bg-keiko-ink/72" aria-hidden />
      <div
        className="absolute inset-0 opacity-30 mix-blend-overlay pointer-events-none"
        style={{
          backgroundImage:
            "url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='160' height='160'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.8' numOctaves='4' stitchTiles='stitch'/></filter><rect width='100%' height='100%' filter='url(%23n)' opacity='0.55'/></svg>\")",
        }}
        aria-hidden
      />

      <div className="relative z-10 content-container flex flex-col justify-end small:justify-center min-h-[78vh] py-16 small:py-24">
        <p className="font-display text-keiko-seal tracking-[0.35em] text-xs uppercase mb-6">
          Ecuador · Kendo only
        </p>
        <Heading
          level="h1"
          className="font-display text-4xl small:text-6xl text-keiko-paper font-medium max-w-3xl leading-[1.1]"
        >
          Implementos para el keiko, no para el escaparate.
        </Heading>
        <Heading
          level="h2"
          className="mt-5 max-w-xl text-base small:text-lg text-keiko-paper/80 font-normal leading-relaxed"
        >
          Bogu, shinai, kendogi y hakama. Piezas sueltas, packs de inicio y
          postventa. Nada de karate, nada de aikido: solo kendo.
        </Heading>
        <div className="mt-10 flex flex-wrap gap-3">
          <LocalizedClientLink href="/categories/packs-de-inicio">
            <Button className="bg-keiko-seal text-keiko-paper border-keiko-seal hover:bg-keiko-paper hover:text-keiko-ink rounded-none px-6">
              Pack de inicio
            </Button>
          </LocalizedClientLink>
          <LocalizedClientLink href="/categories/bogu">
            <Button
              variant="secondary"
              className="rounded-none border-keiko-paper text-keiko-paper bg-transparent hover:bg-keiko-paper hover:text-keiko-ink px-6"
            >
              Ver bogu
            </Button>
          </LocalizedClientLink>
        </div>
      </div>
    </div>
  )
}

export default Hero
