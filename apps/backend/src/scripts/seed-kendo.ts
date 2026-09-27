import { ExecArgs } from "@medusajs/framework/types"
import {
  ContainerRegistrationKeys,
  Modules,
  ProductStatus,
} from "@medusajs/framework/utils"
import {
  createCollectionsWorkflow,
  createInventoryLevelsWorkflow,
  createProductCategoriesWorkflow,
  createProductsWorkflow,
  createRegionsWorkflow,
  createShippingOptionsWorkflow,
  createTaxRegionsWorkflow,
} from "@medusajs/medusa/core-flows"

const usdEur = (usd: number, eur: number) => [
  { amount: eur, currency_code: "eur" },
  { amount: usd, currency_code: "usd" },
]

const IMG = {
  bogu: "https://images.unsplash.com/photo-1528164344705-47542687000d?auto=format&fit=crop&w=1400&q=80",
  shinai:
    "https://images.unsplash.com/photo-1448375240586-882707db888b?auto=format&fit=crop&w=1400&q=80",
  gi: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?auto=format&fit=crop&w=1400&q=80",
  bag: "https://images.unsplash.com/photo-1547949003-9792a18a2601?auto=format&fit=crop&w=1400&q=80",
  wood: "https://images.unsplash.com/photo-1452860606245-08befc0ff44b?auto=format&fit=crop&w=1400&q=80",
  cloth:
    "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1400&q=80",
}

export default async function seedKendo({ container }: ExecArgs) {
  const logger = container.resolve(ContainerRegistrationKeys.LOGGER)
  const query = container.resolve(ContainerRegistrationKeys.QUERY)
  const productModule = container.resolve(Modules.PRODUCT)
  const storeModule = container.resolve(Modules.STORE)
  const fulfillmentModule = container.resolve(Modules.FULFILLMENT)

  logger.info("Keikogu: updating store name...")
  const { data: stores } = await query.graph({
    entity: "store",
    fields: ["id", "name", "supported_currencies.*", "default_sales_channel_id"],
  })
  const store = stores[0]
  if (store?.id) {
    await storeModule.updateStores(store.id, { name: "Keikogu" })
  }

  const { data: salesChannels } = await query.graph({
    entity: "sales_channel",
    fields: ["id", "name"],
  })
  const salesChannel =
    salesChannels.find((c) => c.name === "Default Sales Channel") ||
    salesChannels[0]
  if (!salesChannel) {
    throw new Error("No sales channel found")
  }

  const { data: shippingProfiles } = await query.graph({
    entity: "shipping_profile",
    fields: ["id"],
  })
  const shippingProfile = shippingProfiles[0]
  if (!shippingProfile) {
    throw new Error("No shipping profile found")
  }

  const { data: stockLocations } = await query.graph({
    entity: "stock_location",
    fields: ["id", "name"],
  })
  const stockLocation = stockLocations[0]
  if (!stockLocation) {
    throw new Error("No stock location found")
  }

  logger.info("Keikogu: hiding demo apparel...")
  const { data: demoProducts } = await query.graph({
    entity: "product",
    fields: ["id", "handle", "status"],
    filters: {
      handle: ["t-shirt", "sweatshirt", "sweatpants", "shorts"],
    },
  })
  for (const product of demoProducts) {
    await productModule.updateProducts(product.id, {
      status: ProductStatus.DRAFT,
    })
  }

  const { data: demoCategories } = await query.graph({
    entity: "product_category",
    fields: ["id", "name", "handle", "is_active"],
  })
  for (const category of demoCategories) {
    if (["shirts", "sweatshirts", "pants", "merch"].includes(category.handle)) {
      await productModule.updateProductCategories(category.id, {
        is_active: false,
      })
    }
  }

  logger.info("Keikogu: ensuring Ecuador region...")
  const { data: regions } = await query.graph({
    entity: "region",
    fields: ["id", "name", "currency_code", "countries.iso_2"],
  })
  let ecuadorRegion = regions.find((r) =>
    r.countries?.some((c: { iso_2?: string }) => c.iso_2 === "ec")
  )
  if (!ecuadorRegion) {
    const { result } = await createRegionsWorkflow(container).run({
      input: {
        regions: [
          {
            name: "Ecuador",
            currency_code: "usd",
            countries: ["ec"],
            payment_providers: ["pp_system_default"],
          },
        ],
      },
    })
    ecuadorRegion = result[0]
    await createTaxRegionsWorkflow(container).run({
      input: [
        {
          country_code: "ec",
          provider_id: "tp_system",
        },
      ],
    })
  }

  const { data: fulfillmentSets } = await query.graph({
    entity: "fulfillment_set",
    fields: ["id", "name", "service_zones.id", "service_zones.name"],
  })
  const fulfillmentSet = fulfillmentSets[0]
  if (fulfillmentSet && ecuadorRegion) {
    const hasAndean = fulfillmentSet.service_zones?.some(
      (z: { name?: string }) => z.name === "Andean"
    )
    if (!hasAndean) {
      const zones = await fulfillmentModule.createServiceZones({
        name: "Andean",
        fulfillment_set_id: fulfillmentSet.id,
        geo_zones: [{ type: "country", country_code: "ec" }],
      })
      const zone = Array.isArray(zones) ? zones[0] : zones
      await createShippingOptionsWorkflow(container).run({
        input: [
          {
            name: "Envío estándar Ecuador",
            price_type: "flat",
            provider_id: "manual_manual",
            service_zone_id: zone.id,
            shipping_profile_id: shippingProfile.id,
            type: {
              label: "Estándar",
              description: "5-10 días hábiles.",
              code: "standard_ec",
            },
            prices: [
              { currency_code: "usd", amount: 18 },
              { currency_code: "eur", amount: 18 },
              { region_id: ecuadorRegion.id, amount: 18 },
            ],
            rules: [
              {
                attribute: "enabled_in_store",
                value: "true",
                operator: "eq",
              },
              {
                attribute: "is_return",
                value: "false",
                operator: "eq",
              },
            ],
          },
        ],
      })
    }
  }

  const { data: existingKendo } = await query.graph({
    entity: "product",
    fields: ["id", "handle"],
    filters: { handle: "pack-inicio-keiko" },
  })
  if (existingKendo.length) {
    logger.info("Keikogu catalog already present. Skipping product create.")
    return
  }

  logger.info("Keikogu: creating categories...")
  const { result: categories } = await createProductCategoriesWorkflow(
    container
  ).run({
    input: {
      product_categories: [
        { name: "Bogu", handle: "bogu", is_active: true },
        { name: "Shinai", handle: "shinai", is_active: true },
        { name: "Uniformes", handle: "uniformes", is_active: true },
        { name: "Bolsos", handle: "bolsos", is_active: true },
        { name: "Accesorios", handle: "accesorios", is_active: true },
        { name: "Packs de inicio", handle: "packs-de-inicio", is_active: true },
      ],
    },
  })
  const cat = (handle: string) =>
    categories.find((c) => c.handle === handle)!.id

  logger.info("Keikogu: creating collections...")
  const { result: collections } = await createCollectionsWorkflow(container).run(
    {
      input: {
        collections: [
          {
            title: "Inicio en el dojo",
            handle: "inicio-en-el-dojo",
          },
          {
            title: "Keiko diario",
            handle: "keiko-diario",
          },
          {
            title: "Shiai",
            handle: "shiai",
          },
        ],
      },
    }
  )
  const col = (handle: string) =>
    collections.find((c) => c.handle === handle)!.id

  const channel = [{ id: salesChannel.id }]

  logger.info("Keikogu: creating products...")
  await createProductsWorkflow(container).run({
    input: {
      products: [
        {
          title: "Pack de inicio Keiko",
          handle: "pack-inicio-keiko",
          description:
            "Todo lo necesario para el primer mes en el dojo: shinai 39, tsuba, tsubadome, kendogi y hakama jersey, y tenugui. Pensado para principiantes en Ecuador.",
          status: ProductStatus.PUBLISHED,
          weight: 2200,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("packs-de-inicio"), cat("uniformes")],
          collection_id: col("inicio-en-el-dojo"),
          images: [{ url: IMG.cloth }, { url: IMG.shinai }],
          options: [{ title: "Talla", values: ["1", "2", "3", "4", "5"] }],
          variants: ["1", "2", "3", "4", "5"].map((size) => ({
            title: `Talla ${size}`,
            sku: `PACK-KEIKO-${size}`,
            options: { Talla: size },
            prices: usdEur(153, 145),
          })),
          sales_channels: channel,
        },
        {
          title: "Set bogu Ichi — práctica",
          handle: "set-bogu-ichi",
          description:
            "Men, kote, do y tare de entrada. Cosido a máquina, listo para keiko diario. Equivalente a una línea de acceso: protección sólida sin peso de competencia.",
          status: ProductStatus.PUBLISHED,
          weight: 4500,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("bogu")],
          collection_id: col("keiko-diario"),
          images: [{ url: IMG.bogu }, { url: IMG.wood }],
          options: [{ title: "Talla", values: ["Junior", "A", "B", "C", "L"] }],
          variants: ["Junior", "A", "B", "C", "L"].map((size) => ({
            title: size,
            sku: `BOGU-ICHI-${size.toUpperCase()}`,
            options: { Talla: size },
            prices: usdEur(279, 259),
          })),
          sales_channels: channel,
        },
        {
          title: "Set bogu Jissen — competencia",
          handle: "set-bogu-jissen",
          description:
            "Bogu de shiai: men más ligero, kote de respuesta rápida y tare reforzado. Para gradaciones y torneo. Postventa de piezas sueltas disponible.",
          status: ProductStatus.PUBLISHED,
          weight: 4200,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("bogu")],
          collection_id: col("shiai"),
          images: [{ url: IMG.bogu }],
          options: [{ title: "Talla", values: ["A", "B", "C", "L"] }],
          variants: ["A", "B", "C", "L"].map((size) => ({
            title: size,
            sku: `BOGU-JISSEN-${size}`,
            options: { Talla: size },
            prices: usdEur(490, 455),
          })),
          sales_channels: channel,
        },
        {
          title: "Men — pieza suelta",
          handle: "men-pieza",
          description:
            "Men de recambio. Aro de titanio, mendare de 4 mm, himo incluidos. Para renovar el set sin comprar el bogu completo.",
          status: ProductStatus.PUBLISHED,
          weight: 1400,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("bogu")],
          collection_id: col("keiko-diario"),
          images: [{ url: IMG.bogu }],
          options: [{ title: "Talla", values: ["A", "B", "C", "L"] }],
          variants: ["A", "B", "C", "L"].map((size) => ({
            title: size,
            sku: `MEN-${size}`,
            options: { Talla: size },
            prices: usdEur(180, 168),
          })),
          sales_channels: channel,
        },
        {
          title: "Kote — par",
          handle: "kote-par",
          description:
            "Par de kote. Palma de deerskin, dorso acolchado. Talla por palma, no por men.",
          status: ProductStatus.PUBLISHED,
          weight: 700,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("bogu")],
          collection_id: col("keiko-diario"),
          images: [{ url: IMG.wood }],
          options: [{ title: "Talla", values: ["S", "M", "L"] }],
          variants: ["S", "M", "L"].map((size) => ({
            title: size,
            sku: `KOTE-${size}`,
            options: { Talla: size },
            prices: usdEur(95, 89),
          })),
          sales_channels: channel,
        },
        {
          title: "Shinai madake  — práctica",
          handle: "shinai-madake",
          description:
            "Shinai de madake para keiko y shiai escolar. Take, tsuka, tsuba de plástico y tsubadome. Elige largo 37, 38 o 39.",
          status: ProductStatus.PUBLISHED,
          weight: 520,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("shinai")],
          collection_id: col("inicio-en-el-dojo"),
          images: [{ url: IMG.shinai }],
          options: [{ title: "Largo", values: ["37", "38", "39"] }],
          variants: ["37", "38", "39"].map((size) => ({
            title: `${size} sun`,
            sku: `SHINAI-MDK-${size}`,
            options: { Largo: size },
            prices: usdEur(28, 26),
          })),
          sales_channels: channel,
        },
        {
          title: "Shinai dobari — competencia",
          handle: "shinai-dobari",
          description:
            "Dobari de madake premium. Centro de gravedad adelantado, para men y kote rápidos en shiai.",
          status: ProductStatus.PUBLISHED,
          weight: 510,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("shinai")],
          collection_id: col("shiai"),
          images: [{ url: IMG.shinai }, { url: IMG.wood }],
          options: [{ title: "Largo", values: ["38", "39"] }],
          variants: ["38", "39"].map((size) => ({
            title: `${size} sun`,
            sku: `SHINAI-DBR-${size}`,
            options: { Largo: size },
            prices: usdEur(42, 39),
          })),
          sales_channels: channel,
        },
        {
          title: "Kendogi jersey Hanabishi",
          handle: "kendogi-hanabishi",
          description:
            "Kendogi de jersey ligero, secado rápido. Corte clásico, color índigo. Para keiko en clima cálido.",
          status: ProductStatus.PUBLISHED,
          weight: 480,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("uniformes")],
          collection_id: col("keiko-diario"),
          images: [{ url: IMG.gi }],
          options: [{ title: "Talla", values: ["1", "2", "3", "4", "5"] }],
          variants: ["1", "2", "3", "4", "5"].map((size) => ({
            title: `Talla ${size}`,
            sku: `GI-HANA-${size}`,
            options: { Talla: size },
            prices: usdEur(44, 41),
          })),
          sales_channels: channel,
        },
        {
          title: "Hakama jersey Cho",
          handle: "hakama-cho",
          description:
            "Hakama de jersey, siete pliegues, índigo. Menos peso que el algodón teñido, mismo corte de shiai escolar.",
          status: ProductStatus.PUBLISHED,
          weight: 620,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("uniformes")],
          collection_id: col("keiko-diario"),
          images: [{ url: IMG.gi }, { url: IMG.cloth }],
          options: [{ title: "Talla", values: ["23", "24", "25", "26", "27", "28"] }],
          variants: ["23", "24", "25", "26", "27", "28"].map((size) => ({
            title: size,
            sku: `HAKAMA-CHO-${size}`,
            options: { Talla: size },
            prices: usdEur(49, 46),
          })),
          sales_channels: channel,
        },
        {
          title: "Mochila bogu Budo Wing",
          handle: "mochila-bogu-budo-wing",
          description:
            "Mochila rígida para men, do, kote y tare. Compartimento inferior ventilado y correas para shinai.",
          status: ProductStatus.PUBLISHED,
          weight: 1600,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("bolsos")],
          collection_id: col("keiko-diario"),
          images: [{ url: IMG.bag }],
          options: [{ title: "Color", values: ["Índigo", "Negro"] }],
          variants: [
            {
              title: "Índigo",
              sku: "BAG-WING-INDIGO",
              options: { Color: "Índigo" },
              prices: usdEur(70, 65),
            },
            {
              title: "Negro",
              sku: "BAG-WING-BLACK",
              options: { Color: "Negro" },
              prices: usdEur(70, 65),
            },
          ],
          sales_channels: channel,
        },
        {
          title: "Bolsa shinai Kanmuri",
          handle: "bolsa-shinai-kanmuri",
          description:
            "Bolsa para 3 shinai, lona encerada, correa de hombro. Bolsillo para tsuba y tenugui.",
          status: ProductStatus.PUBLISHED,
          weight: 380,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("bolsos")],
          collection_id: col("inicio-en-el-dojo"),
          images: [{ url: IMG.bag }, { url: IMG.shinai }],
          options: [{ title: "Color", values: ["Índigo", "Natural"] }],
          variants: [
            {
              title: "Índigo",
              sku: "BAG-KAN-INDIGO",
              options: { Color: "Índigo" },
              prices: usdEur(87, 81),
            },
            {
              title: "Natural",
              sku: "BAG-KAN-NAT",
              options: { Color: "Natural" },
              prices: usdEur(87, 81),
            },
          ],
          sales_channels: channel,
        },
        {
          title: "Tsubadome Inden",
          handle: "tsubadome-inden",
          description:
            "Tsubadome de cuero inden. Fija la tsuba sin marcar el take. Recambio de alto uso.",
          status: ProductStatus.PUBLISHED,
          weight: 20,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("accesorios")],
          collection_id: col("inicio-en-el-dojo"),
          images: [{ url: IMG.wood }],
          options: [{ title: "Color", values: ["Negro", "Rojo"] }],
          variants: [
            {
              title: "Negro",
              sku: "TSUBA-IND-BK",
              options: { Color: "Negro" },
              prices: usdEur(11, 10),
            },
            {
              title: "Rojo",
              sku: "TSUBA-IND-RD",
              options: { Color: "Rojo" },
              prices: usdEur(11, 10),
            },
          ],
          sales_channels: channel,
        },
        {
          title: "Tenugui dojo",
          handle: "tenugui-dojo",
          description:
            "Tenugui de algodón para el men. Absorbente, se anuda al kensen del shinai cuando no se usa.",
          status: ProductStatus.PUBLISHED,
          weight: 40,
          shipping_profile_id: shippingProfile.id,
          category_ids: [cat("accesorios")],
          collection_id: col("inicio-en-el-dojo"),
          images: [{ url: IMG.cloth }],
          options: [{ title: "Motivo", values: ["Mitsudomoe", "Keiko"] }],
          variants: [
            {
              title: "Mitsudomoe",
              sku: "TENUGUI-MITSU",
              options: { Motivo: "Mitsudomoe" },
              prices: usdEur(14, 13),
            },
            {
              title: "Keiko",
              sku: "TENUGUI-KEIKO",
              options: { Motivo: "Keiko" },
              prices: usdEur(14, 13),
            },
          ],
          sales_channels: channel,
        },
      ],
    },
  })

  logger.info("Keikogu: stocking inventory...")
  const { data: inventoryItems } = await query.graph({
    entity: "inventory_item",
    fields: ["id"],
  })
  const { data: existingLevels } = await query.graph({
    entity: "inventory_level",
    fields: ["id", "inventory_item_id", "location_id"],
  })
  const stocked = new Set(
    existingLevels.map((l) => `${l.inventory_item_id}:${l.location_id}`)
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

  logger.info("Keikogu catalog seeded.")
}
