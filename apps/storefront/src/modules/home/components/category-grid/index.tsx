import { HttpTypes } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"

const COPY: Record<string, string> = {
  bogu: "Sets y piezas: men, kote, do, tare.",
  shinai: "Madake de práctica y dobari de shiai.",
  uniformes: "Kendogi y hakama, jersey e índigo.",
  bolsos: "Mochilas de bogu y fundas de shinai.",
  accesorios: "Tsuba, tsubadome, tenugui, himo.",
  "packs-de-inicio": "El primer mes en el dojo, en un solo pedido.",
}

export default function CategoryGrid({
  categories,
}: {
  categories: HttpTypes.StoreProductCategory[]
}) {
  const roots = categories.filter(
    (c) => !c.parent_category && c.is_active !== false
  )

  if (!roots.length) {
    return null
  }

  return (
    <section className="content-container py-16 small:py-24">
      <p className="font-display text-keiko-seal tracking-[0.28em] text-xs uppercase mb-3">
        Taxonomía de dojo
      </p>
      <h2 className="font-display text-3xl small:text-4xl text-keiko-ink mb-10">
        Elige por pieza, no por moda
      </h2>
      <ul className="grid grid-cols-1 small:grid-cols-3 gap-px bg-keiko-ink/15 border border-keiko-ink/15">
        {roots.map((category) => (
          <li key={category.id} className="bg-keiko-paper">
            <LocalizedClientLink
              href={`/categories/${category.handle}`}
              className="flex flex-col justify-between min-h-[180px] p-6 hover:bg-keiko-ink hover:text-keiko-paper transition-colors duration-200 group"
            >
              <span className="font-display text-2xl">{category.name}</span>
              <span className="text-sm text-keiko-ink/70 group-hover:text-keiko-paper/80 mt-6">
                {COPY[category.handle || ""] || "Ver productos"}
              </span>
            </LocalizedClientLink>
          </li>
        ))}
      </ul>
    </section>
  )
}
