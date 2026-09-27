import { listCategories } from "@lib/data/categories";
import { listCollections } from "@lib/data/collections";
import { STORE_NAME } from "@lib/store";
import { Text, clx } from "@modules/common/components/ui";

import LocalizedClientLink from "@modules/common/components/localized-client-link";

export default async function Footer() {
  const { collections } = await listCollections({
    fields: "*products",
  });
  const productCategories = await listCategories();

  return (
    <footer className="border-t border-keiko-ink/15 w-full bg-keiko-ink text-keiko-paper">
      <div className="content-container flex flex-col w-full">
        <div className="flex flex-col gap-y-10 xsmall:flex-row items-start justify-between py-20">
          <div className="max-w-sm">
            <LocalizedClientLink
              href="/"
              className="font-display text-2xl tracking-[0.22em] uppercase"
            >
              {STORE_NAME}
            </LocalizedClientLink>
            <p className="mt-4 text-sm text-keiko-paper/70 leading-relaxed">
              Tienda de implementos de kendo. Bogu, shinai, uniformes y
              accesorios para keiko y shiai. No vendemos otras artes marciales.
            </p>
          </div>
          <div className="text-small-regular gap-10 md:gap-x-16 grid grid-cols-2 sm:grid-cols-3">
            {productCategories && productCategories?.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus tracking-widest uppercase text-keiko-seal">
                  Categorías
                </span>
                <ul
                  className="grid grid-cols-1 gap-2"
                  data-testid="footer-categories"
                >
                  {productCategories?.slice(0, 8).map((c) => {
                    if (c.parent_category || c.is_active === false) {
                      return;
                    }

                    return (
                      <li
                        className="flex flex-col gap-2 text-keiko-paper/70 txt-small"
                        key={c.id}
                      >
                        <LocalizedClientLink
                          className="hover:text-keiko-paper"
                          href={`/categories/${c.handle}`}
                          data-testid="category-link"
                        >
                          {c.name}
                        </LocalizedClientLink>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {collections && collections.length > 0 && (
              <div className="flex flex-col gap-y-2">
                <span className="txt-small-plus tracking-widest uppercase text-keiko-seal">
                  Colecciones
                </span>
                <ul
                  className={clx(
                    "grid grid-cols-1 gap-2 text-keiko-paper/70 txt-small"
                  )}
                >
                  {collections?.slice(0, 6).map((c) => (
                    <li key={c.id}>
                      <LocalizedClientLink
                        className="hover:text-keiko-paper"
                        href={`/collections/${c.handle}`}
                      >
                        {c.title}
                      </LocalizedClientLink>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            <div className="flex flex-col gap-y-2">
              <span className="txt-small-plus tracking-widest uppercase text-keiko-seal">
                Dojo
              </span>
              <ul className="grid grid-cols-1 gap-y-2 text-keiko-paper/70 txt-small">
                <li>
                  <LocalizedClientLink
                    href="/store"
                    className="hover:text-keiko-paper"
                  >
                    Catálogo
                  </LocalizedClientLink>
                </li>
                <li>
                  <LocalizedClientLink
                    href="/account"
                    className="hover:text-keiko-paper"
                  >
                    Cuenta
                  </LocalizedClientLink>
                </li>
                <li>
                  <span>Quito, Ecuador</span>
                </li>
              </ul>
            </div>
          </div>
        </div>
        <div className="flex w-full mb-10 justify-between text-keiko-paper/50">
          <Text className="txt-compact-small">
            © {new Date().getFullYear()} {STORE_NAME}. Solo kendo.
          </Text>
        </div>
      </div>
    </footer>
  );
}
