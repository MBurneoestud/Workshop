import { ExecArgs } from "@medusajs/framework/types"
import { ContainerRegistrationKeys } from "@medusajs/framework/utils"
import {
  createAndLinkProductOptionsToProductWorkflow,
  createInventoryLevelsWorkflow,
  createProductVariantsWorkflow,
  deleteProductVariantsWorkflow,
  deleteReservationsWorkflow,
  updateProductOptionsWorkflow,
} from "@medusajs/medusa/core-flows"

const TALLAS = ["S", "M", "L", "XL"]

const PRICE_FALLBACK: Record<string, { amount: number; currency_code: string }[]> = {
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
  "kendogi-hanabishi": [
    { amount: 41, currency_code: "eur" },
    { amount: 44, currency_code: "usd" },
  ],
  "hakama-cho": [
    { amount: 46, currency_code: "eur" },
    { amount: 49, currency_code: "usd" },
  ],
  "do-pieza": [
    { amount: 112, currency_code: "eur" },
    { amount: 120, currency_code: "usd" },
  ],
  "tare-pieza": [
    { amount: 102, currency_code: "eur" },
    { amount: 110, currency_code: "usd" },
  ],
  "gi-set-keiko": [
    { amount: 82, currency_code: "eur" },
    { amount: 88, currency_code: "usd" },
  ],
}

type OptionValue = { id?: string; value?: string }
type ProductOption = {
  id: string
  title?: string
  values?: OptionValue[]
}

function cartesian(
  groups: { title: string; values: string[] }[]
): Record<string, string>[] {
  return groups.reduce<Record<string, string>[]>(
    (acc, group) =>
      acc.flatMap((row) =>
        group.values.map((value) => ({ ...row, [group.title]: value }))
      ),
    [{}]
  )
}

function skuPrefix(sku: string | null | undefined, handle: string) {
  if (sku && sku.includes("-")) {
    return sku.replace(/-[^-]+$/, "")
  }
  return handle.replace(/-/g, "").toUpperCase()
}

export default async function replaceTallaSizes({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)

  const loadProducts = async () => {
    const { data } = await query.graph({
      entity: "product",
      fields: [
        "id",
        "handle",
        "title",
        "options.id",
        "options.title",
        "options.values.id",
        "options.values.value",
        "variants.id",
        "variants.title",
        "variants.sku",
        "variants.manage_inventory",
        "variants.inventory_items.inventory_item_id",
        "variants.price_set.prices.amount",
        "variants.price_set.prices.currency_code",
      ],
    })
    return data.filter((product) =>
      (product.options as ProductOption[] | undefined)?.some(
        (option) => option.title?.toLowerCase() === "talla"
      )
    )
  }

  let targets = await loadProducts()
  if (!targets.length) {
    logger.info("No products with option Talla.")
    return
  }

  const snapshots = new Map(
    targets.map((product) => {
      const sample = product.variants?.[0]
      const prices =
        sample?.price_set?.prices?.map((price) => ({
          amount: Number(price.amount),
          currency_code: String(price.currency_code),
        })) || PRICE_FALLBACK[product.handle] || []
      const extraOptions = ((product.options || []) as ProductOption[])
        .filter((option) => option.title?.toLowerCase() !== "talla")
        .map((option) => ({
          title: option.title || "Option",
          values: (option.values || [])
            .map((value) => value.value)
            .filter((value): value is string => Boolean(value)),
        }))
      return [
        product.id,
        {
          handle: product.handle,
          skuPrefix: skuPrefix(sample?.sku, product.handle),
          manageInventory: sample?.manage_inventory ?? true,
          prices,
          extraOptions,
        },
      ] as const
    })
  )

  const { data: reservations } = await query.graph({
    entity: "reservation",
    fields: ["id", "inventory_item_id"],
  })

  logger.info("Pass 1: delete existing Talla variants...")
  for (const product of targets) {
    const variants = product.variants || []
    if (!variants.length) {
      continue
    }
    const inventoryItemIds = [
      ...new Set(
        variants.flatMap(
          (variant) =>
            variant.inventory_items?.map(
              (item: { inventory_item_id?: string }) => item.inventory_item_id
            ) || []
        ).filter(Boolean) as string[]
      ),
    ]
    const blocking = reservations.filter((reservation) =>
      inventoryItemIds.includes(reservation.inventory_item_id)
    )
    if (blocking.length) {
      await deleteReservationsWorkflow(container).run({
        input: { ids: blocking.map((reservation) => reservation.id) },
      })
    }
    logger.info(`  deleting ${variants.length} variant(s) on ${product.handle}`)
    await deleteProductVariantsWorkflow(container).run({
      input: { ids: variants.map((variant) => variant.id) },
    })
  }

  targets = await loadProducts()
  const tallaOptions = new Map<string, ProductOption>()
  for (const product of targets) {
    const talla = ((product.options || []) as ProductOption[]).find(
      (option) => option.title?.toLowerCase() === "talla"
    )
    if (talla) {
      tallaOptions.set(talla.id, talla)
    }
  }

  logger.info("Pass 2: set Talla values to S, M, L, XL...")
  const [primary, ...duplicates] = [...tallaOptions.values()]
  if (!primary) {
    throw new Error("Talla option disappeared after deleting variants")
  }

  for (const extra of duplicates) {
    for (const product of targets) {
      const has = ((product.options || []) as ProductOption[]).some(
        (option) => option.id === extra.id
      )
      if (!has) {
        continue
      }
      await createAndLinkProductOptionsToProductWorkflow(container).run({
        input: {
          product_id: product.id,
          remove: [extra.id],
          add: [
            {
              id: primary.id,
              value_ids: (primary.values || [])
                .map((value) => value.id)
                .filter((id): id is string => Boolean(id)),
            },
          ],
        },
      })
    }
  }

  await updateProductOptionsWorkflow(container).run({
    input: {
      selector: { id: primary.id },
      update: { values: [...TALLAS] },
    },
  })

  targets = await loadProducts()

  logger.info("Pass 3: create S/M/L/XL variants...")
  for (const product of targets) {
    const snap = snapshots.get(product.id)
    if (!snap?.prices.length) {
      logger.warn(`  skip ${product.handle}: no prices`)
      continue
    }
    if (product.variants?.length) {
      logger.info(`  skip ${product.handle}: already has variants`)
      continue
    }

    const optionGroups = [
      { title: "Talla", values: [...TALLAS] },
      ...snap.extraOptions,
    ]
    const combos = cartesian(optionGroups)

    logger.info(`  ${product.handle}: ${combos.length} variant(s)`)
    await createProductVariantsWorkflow(container).run({
      input: {
        product_variants: combos.map((combo) => {
          const size = combo.Talla || Object.values(combo).join("-")
          return {
            product_id: product.id,
            title:
              Object.keys(combo).length === 1
                ? size
                : Object.values(combo).join(" / "),
            sku: `${snap.skuPrefix}-${Object.values(combo).join("-")}`,
            manage_inventory: snap.manageInventory,
            options: combo,
            prices: snap.prices,
          }
        }),
      },
    })
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id"],
  })
  const stockLocation = stockLocations[0]
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
      existingLevels.map((level) => `${level.inventory_item_id}:${level.location_id}`)
    )
    const missing = inventoryItems
      .filter((item) => !stocked.has(`${item.id}:${stockLocation.id}`))
      .map((item) => ({
        location_id: stockLocation.id,
        stocked_quantity: 80,
        inventory_item_id: item.id,
      }))
    if (missing.length) {
      await createInventoryLevelsWorkflow(container).run({
        input: { inventory_levels: missing },
      })
    }
  }

  logger.info("Talla values are now S, M, L, XL.")
}
