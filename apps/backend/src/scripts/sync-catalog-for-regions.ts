import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys, Modules } from "@medusajs/framework/utils"
import {
  updateProductsWorkflow,
  updateProductVariantsWorkflow,
} from "@medusajs/medusa/core-flows"

const PACK_DESCRIPTION =
  "Kit completo para empezar a entrenar: bogu entero (men, do, tare y kote), shinai, tenugui, tsuba y tsubadome, bolsa para shinai, bolsa para bogu, y uniforme (kendogi y hakama). Un solo pedido para el primer keiko en el dojo."

/** Same amounts for every region: USD for Ecuador, EUR for Europe (dk). */
const PRICES_BY_HANDLE: Record<
  string,
  { amount: number; currency_code: string }[]
> = {
  "pack-inicio-keiko": [
    { amount: 689, currency_code: "eur" },
    { amount: 729, currency_code: "usd" },
  ],
  "men-pieza": [
    { amount: 168, currency_code: "eur" },
    { amount: 180, currency_code: "usd" },
  ],
  "kote-par": [
    { amount: 89, currency_code: "eur" },
    { amount: 95, currency_code: "usd" },
  ],
  "do-pieza": [
    { amount: 112, currency_code: "eur" },
    { amount: 120, currency_code: "usd" },
  ],
  "tare-pieza": [
    { amount: 102, currency_code: "eur" },
    { amount: 110, currency_code: "usd" },
  ],
  "kendogi-hanabishi": [
    { amount: 41, currency_code: "eur" },
    { amount: 44, currency_code: "usd" },
  ],
  "hakama-cho": [
    { amount: 46, currency_code: "eur" },
    { amount: 49, currency_code: "usd" },
  ],
  "gi-set-keiko": [
    { amount: 82, currency_code: "eur" },
    { amount: 88, currency_code: "usd" },
  ],
  "shinai-madake": [
    { amount: 26, currency_code: "eur" },
    { amount: 28, currency_code: "usd" },
  ],
  "shinai-dobari": [
    { amount: 39, currency_code: "eur" },
    { amount: 42, currency_code: "usd" },
  ],
  "mochila-bogu-budo-wing": [
    { amount: 65, currency_code: "eur" },
    { amount: 70, currency_code: "usd" },
  ],
  "bolsa-shinai-kanmuri": [
    { amount: 81, currency_code: "eur" },
    { amount: 87, currency_code: "usd" },
  ],
  "tsubadome-inden": [
    { amount: 10, currency_code: "eur" },
    { amount: 11, currency_code: "usd" },
  ],
  "tenugui-dojo": [
    { amount: 13, currency_code: "eur" },
    { amount: 14, currency_code: "usd" },
  ],
}

export default async function syncCatalogForRegions({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const storeModule = container.resolve(Modules.STORE)

  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "supported_currencies.*"],
  })
  const store = stores[0]
  if (store?.id) {
    const codes = new Set(
      (store.supported_currencies || []).map((c: { currency_code?: string }) =>
        c.currency_code?.toLowerCase()
      )
    )
    if (!codes.has("usd") || !codes.has("eur")) {
      await storeModule.updateStores(store.id, {
        supported_currencies: [
          { currency_code: "usd", is_default: true },
          { currency_code: "eur" },
        ],
      })
      logger.info("Store currencies: usd + eur")
    }
  }

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "description", "variants.id"],
  })

  const pack = products.find((p) => p.handle === "pack-inicio-keiko")
  if (pack && pack.description !== PACK_DESCRIPTION) {
    await updateProductsWorkflow(container).run({
      input: {
        products: [{ id: pack.id, description: PACK_DESCRIPTION, weight: 7800 }],
      },
    })
    logger.info("Pack description synced (shared by ec and dk)")
  }

  for (const product of products) {
    const prices = PRICES_BY_HANDLE[product.handle]
    const variantIds = (product.variants || []).map((v) => v.id)
    if (!prices || !variantIds.length) {
      continue
    }
    await updateProductVariantsWorkflow(container).run({
      input: {
        product_variants: variantIds.map((id) => ({ id, prices })),
      },
    })
    logger.info(
      `  ${product.handle}: ${variantIds.length} variant(s) usd+eur`
    )
  }

  logger.info("Catalog prices and copy apply to Ecuador (USD) and Europe/dk (EUR).")
}
