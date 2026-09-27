import { Metadata } from "next"

import FeaturedProducts from "@modules/home/components/featured-products"
import Hero from "@modules/home/components/hero"
import CategoryGrid from "@modules/home/components/category-grid"
import { listCollections } from "@lib/data/collections"
import { listCategories } from "@lib/data/categories"
import { getRegion } from "@lib/data/regions"
import { STORE_DESCRIPTION, STORE_NAME } from "@lib/store"

export const dynamic = "force-dynamic"
export const revalidate = 0

export const metadata: Metadata = {
  title: `${STORE_NAME} · implementos de kendo`,
  description: STORE_DESCRIPTION,
}

export default async function Home(props: {
  params: Promise<{ countryCode: string }>
}) {
  const params = await props.params

  const { countryCode } = params

  const [region, collectionsResult, categories] = await Promise.all([
    getRegion(countryCode),
    listCollections({
      fields: "id, handle, title",
    }),
    listCategories(),
  ])

  const collections = collectionsResult?.collections

  if (!region) {
    return null
  }

  return (
    <>
      <Hero />
      <CategoryGrid categories={categories || []} />
      {collections && collections.length > 0 && (
        <div className="py-4 bg-keiko-paper">
          <ul className="flex flex-col">
            <FeaturedProducts collections={collections} region={region} />
          </ul>
        </div>
      )}
    </>
  )
}
