import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createInventoryLevelsWorkflow,
  createProductsWorkflow,
  updateProductsWorkflow,
} from "@medusajs/medusa/core-flows"

const BASE = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:8000"
const asset = (...files: string[]) =>
  files.map((file) => ({ url: `${BASE}/catalog/${file}` }))

const usdEur = (usd: number, eur: number) => [
  { amount: eur, currency_code: "eur" },
  { amount: usd, currency_code: "usd" },
]

const IMAGE_MAP: Record<string, string[]> = {
  "pack-inicio-keiko": ["pack.jpg"],
  "men-pieza": ["men-1.jpg", "men-2.jpg", "men-3.jpg"],
  "kote-par": ["kote-1.jpg", "kote-2.jpg", "kote-3.jpg"],
  "do-pieza": ["do-1.jpg", "do-2.jpg"],
  "tare-pieza": ["tare-1.jpg", "tare-2.jpg", "tare-3.jpg"],
  "shinai-madake": ["shinai-set.jpg"],
  "shinai-dobari": [
    "shinai-dobari-1.jpg",
    "shinai-dobari-2.jpg",
    "shinai-dobari-3.jpg",
    "shinai-dobari-4.jpg",
  ],
  "kendogi-hanabishi": ["kendogi-1.jpg", "kendogi-2.jpg", "kendogi-3.jpg"],
  "hakama-cho": ["hakama-1.jpg", "hakama-2.jpg", "hakama-3.jpg"],
  "gi-set-keiko": ["gi-set-1.jpg", "gi-set-2.jpg", "gi-set-3.jpg"],
  "mochila-bogu-budo-wing": [
    "bogu-bag-1.jpg",
    "bogu-bag-2.jpg",
    "bogu-bag-3.jpg",
  ],
  "bolsa-shinai-kanmuri": [
    "shinai-bag-1.jpg",
    "shinai-bag-2.jpg",
    "shinai-bag-3.jpg",
  ],
  "tenugui-dojo": ["tenugui-1.webp", "tenugui-2.webp", "tenugui-3.webp"],
  "tsubadome-inden": ["tsuba-tsubadome-1.jpg", "tsuba-tsubadome-2.jpg"],
}

const REMOVE_HANDLES = ["set-bogu-ichi", "set-bogu-jissen"]

export default async function syncCatalogImages({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)

  const { data: products } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "title", "status"],
  })

  const byHandle = new Map(products.map((p) => [p.handle, p]))

  logger.info("Removing products without catalog photos...")
  const toDelete = REMOVE_HANDLES.map((handle) => byHandle.get(handle)?.id).filter(
    Boolean
  ) as string[]
  if (toDelete.length) {
    await productModule.deleteProducts(toDelete)
  }

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const salesChannel = salesChannels[0]
  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]
  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  })
  const stockLocation = stockLocations[0]
  const { data: categories } = await query.graph({
    entity: "product_category",
    fields: ["id", "handle"],
  })
  const { data: collections } = await query.graph({
    entity: "product_collection",
    fields: ["id", "handle"],
  })
  const cat = (handle: string) =>
    categories.find((c) => c.handle === handle)?.id
  const col = (handle: string) =>
    collections.find((c) => c.handle === handle)?.id
  const channel = [{ id: salesChannel.id }]

  const missing = ["do-pieza", "tare-pieza", "gi-set-keiko"].filter(
    (handle) => !byHandle.has(handle)
  )

  if (missing.length && salesChannel && shippingProfile) {
    logger.info(`Creating products for leftover image groups: ${missing.join(", ")}`)
    const toCreate = []
    if (missing.includes("do-pieza")) {
      toCreate.push({
        title: "Do — pieza suelta",
        handle: "do-pieza",
        description:
          "Do de recambio. Cuerpo de bambú lacado, himo incluidos. Para renovar el set sin comprar el bogu completo.",
        status: ProductStatus.PUBLISHED,
        weight: 1100,
        shipping_profile_id: shippingProfile.id,
        category_ids: [cat("bogu")].filter(Boolean) as string[],
        collection_id: col("keiko-diario"),
        images: asset(...IMAGE_MAP["do-pieza"]),
        options: [{ title: "Talla", values: ["A", "B", "C", "L"] }],
        variants: ["A", "B", "C", "L"].map((size) => ({
          title: size,
          sku: `DO-${size}`,
          options: { Talla: size },
          prices: usdEur(120, 112),
        })),
        sales_channels: channel,
      })
    }
    if (missing.includes("tare-pieza")) {
      toCreate.push({
        title: "Tare — pieza suelta",
        handle: "tare-pieza",
        description:
          "Tare de recambio. Cinco paneles, himo de algodón. Protege cadera y ingle en keiko diario.",
        status: ProductStatus.PUBLISHED,
        weight: 900,
        shipping_profile_id: shippingProfile.id,
        category_ids: [cat("bogu")].filter(Boolean) as string[],
        collection_id: col("keiko-diario"),
        images: asset(...IMAGE_MAP["tare-pieza"]),
        options: [{ title: "Talla", values: ["A", "B", "C", "L"] }],
        variants: ["A", "B", "C", "L"].map((size) => ({
          title: size,
          sku: `TARE-${size}`,
          options: { Talla: size },
          prices: usdEur(110, 102),
        })),
        sales_channels: channel,
      })
    }
    if (missing.includes("gi-set-keiko")) {
      toCreate.push({
        title: "Set gi — kendogi y hakama",
        handle: "gi-set-keiko",
        description:
          "Kendogi y hakama a juego, jersey índigo. El uniforme completo para el primer keiko o para reemplazar el set de algodón.",
        status: ProductStatus.PUBLISHED,
        weight: 1100,
        shipping_profile_id: shippingProfile.id,
        category_ids: [cat("uniformes"), cat("packs-de-inicio")].filter(
          Boolean
        ) as string[],
        collection_id: col("inicio-en-el-dojo"),
        images: asset(...IMAGE_MAP["gi-set-keiko"]),
        options: [{ title: "Talla", values: ["1", "2", "3", "4", "5"] }],
        variants: ["1", "2", "3", "4", "5"].map((size) => ({
          title: `Talla ${size}`,
          sku: `GISET-${size}`,
          options: { Talla: size },
          prices: usdEur(88, 82),
        })),
        sales_channels: channel,
      })
    }

    await createProductsWorkflow(container).run({
      input: { products: toCreate },
    })

    if (stockLocation) {
      const { data: inventoryItems } = await query.graph({
        entity: "inventory_item",
        fields: ["id"],
      })
      const { data: existingLevels } = await query.graph({
        entity: "inventory_level",
        fields: ["inventory_item_id", "location_id"],
      })
      const stocked = new Set(
        existingLevels.map((l) => `${l.inventory_item_id}:${l.location_id}`)
      )
      const missingLevels = inventoryItems
        .filter((item) => !stocked.has(`${item.id}:${stockLocation.id}`))
        .map((item) => ({
          location_id: stockLocation.id,
          stocked_quantity: 80,
          inventory_item_id: item.id,
        }))
      if (missingLevels.length) {
        await createInventoryLevelsWorkflow(container).run({
          input: { inventory_levels: missingLevels },
        })
      }
    }
  }

  const { data: refreshed } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
  })

  logger.info("Assigning catalog photos to products...")
  for (const product of refreshed) {
    const files = IMAGE_MAP[product.handle]
    if (!files) {
      continue
    }
    const images = asset(...files)
    await updateProductsWorkflow(container).run({
      input: {
        products: [
          {
            id: product.id,
            thumbnail: images[0].url,
            images,
          },
        ],
      },
    })
    logger.info(`  ${product.handle}: ${files.length} photo(s)`)
  }

  logger.info("Catalog photos synced.")
}
