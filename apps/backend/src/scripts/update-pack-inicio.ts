import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

const DESCRIPTION =
  "Kit completo para empezar a entrenar: bogu entero (men, do, tare y kote), shinai, tenugui, tsuba y tsubadome, bolsa para shinai, bolsa para bogu, y uniforme (kendogi y hakama). Un solo pedido para el primer keiko en el dojo."

const PRICES = [
  { amount: 689, currency_code: "eur" },
  { amount: 729, currency_code: "usd" },
]

export default async function updatePackInicio({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "variants.id"],
    filters: { handle: "pack-inicio-keiko" },
  })

  const product = products[0]
  if (!product) {
    throw new Error("pack-inicio-keiko not found")
  }

  await updateProductsWorkflow(container).run({
    input: {
      products: [
        {
          id: product.id,
          description: DESCRIPTION,
          weight: 7800,
        },
      ],
    },
  })

  const variantIds = (product.variants || []).map((variant) => variant.id)
  if (variantIds.length) {
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: variantIds.map((id) => ({
          id,
          prices: PRICES,
        })),
      },
    })
  }

  logger.info(
    `Updated pack-inicio-keiko: ${variantIds.length} variant(s) → $729 / €689`
  )
}
