import { Suspense } from "react"

import { listLocales } from "@lib/data/locales"
import { getLocale } from "@lib/data/locale-actions"
import { listRegions } from "@lib/data/regions"
import { listCategories } from "@lib/data/categories"
import { STORE_NAME, cartNavLabel } from "@lib/store"
import { StoreRegion } from "@medusajs/types"
import LocalizedClientLink from "@modules/common/components/localized-client-link"
import CartButton from "@modules/layout/components/cart-button"
import SideMenu from "@modules/layout/components/side-menu"

export default async function Nav() {
  const [regions, locales, currentLocale, categories] = await Promise.all([
    listRegions().then((regions: StoreRegion[]) => regions),
    listLocales(),
    getLocale(),
    listCategories(),
  ])

  const roots = (categories || []).filter(
    (c) => !c.parent_category && c.is_active !== false
  )

  return (
    <div className="sticky top-0 inset-x-0 z-50 group">
      <div className="bg-keiko-ink text-keiko-paper text-[11px] tracking-[0.18em] uppercase text-center py-1.5">
        Solo kendo · envíos a Ecuador
      </div>
      <header className="relative h-16 mx-auto border-b duration-200 bg-keiko-paper border-keiko-ink/15">
        <nav className="content-container txt-xsmall-plus text-keiko-ink/80 flex items-center justify-between w-full h-full text-small-regular">
          <div className="flex-1 basis-0 h-full flex items-center gap-8">
            <div className="h-full">
              <SideMenu
                regions={regions}
                locales={locales}
                currentLocale={currentLocale}
              />
            </div>
            <div className="hidden small:flex items-center gap-5 h-full">
              {roots.slice(0, 6).map((category) => (
                <LocalizedClientLink
                  key={category.id}
                  href={`/categories/${category.handle}`}
                  className="hover:text-keiko-seal uppercase tracking-wide text-[11px]"
                >
                  {category.name}
                </LocalizedClientLink>
              ))}
            </div>
          </div>

          <div className="flex items-center h-full">
            <LocalizedClientLink
              href="/"
              className="font-display text-xl tracking-[0.2em] uppercase text-keiko-ink"
              data-testid="nav-store-link"
            >
              {STORE_NAME}
            </LocalizedClientLink>
          </div>

          <div className="flex items-center gap-x-6 h-full flex-1 basis-0 justify-end">
            <div className="hidden small:flex items-center gap-x-6 h-full">
              <LocalizedClientLink
                className="hover:text-keiko-seal uppercase tracking-wide text-[11px]"
                href="/account"
                data-testid="nav-account-link"
              >
                Cuenta
              </LocalizedClientLink>
            </div>
            <Suspense
              fallback={
                <LocalizedClientLink
                  className="hover:text-keiko-seal uppercase tracking-wide text-[11px] h-full flex items-center"
                  href="/cart"
                  data-testid="nav-cart-link"
                >
                  {cartNavLabel(0)}
                </LocalizedClientLink>
              }
            >
              <CartButton />
            </Suspense>
          </div>
        </nav>
      </header>
    </div>
  )
}
