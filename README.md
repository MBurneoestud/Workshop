# Keikogu

Tienda de implementos de kendo (Medusa JS v2 + Next.js). Catálogo propio, región **Ecuador (USD, `/ec`)** con envío, y región **Europa (EUR, `/dk`)** vigente.

Postgres en Supabase **Session pooler, puerto 5432**. Sin Redis: no declares `REDIS_URL`. El storefront no usa Supabase Auth, RLS ni `supabase-js`.

## Requisitos

- Node.js **22** (no 23)
- [pnpm](https://pnpm.io/) 10+
- Proyecto PostgreSQL en Supabase (Session mode / 5432)

Trabaja siempre dentro de este directorio (`store`). Un `pnpm dev` en la carpeta padre no arranca Medusa.

## Arranque

1. Instala dependencias:

```bash
pnpm install
```

2. Variables de entorno:

```bash
cp apps/backend/.env.example apps/backend/.env
cp apps/storefront/.env.example apps/storefront/.env.local
```

3. En `apps/backend/.env` pon el Session pooler (usuario `postgres.PROJECT_REF`, host `*.pooler.supabase.com`, **puerto 5432**) y `?sslmode=no-verify`. **No agregues `REDIS_URL`.**

4. Migraciones (primera vez o cuando cambie el esquema):

```bash
cd apps/backend
pnpm medusa db:migrate
```

5. Usuario admin (sáltalo si ya existe):

```bash
pnpm medusa user -e admin@medusajs.com -p supersecret
```

6. Catálogo kendo y fotos (solo si la base está vacía):

```bash
pnpm medusa exec ./src/scripts/seed-kendo.ts
pnpm medusa exec ./src/scripts/sync-catalog-images.ts
cd ../..
```

7. Publishable key: arranca el backend, entra a [http://localhost:9000/app](http://localhost:9000/app) (`admin@medusajs.com` / `supersecret`), **Settings → Publishable API Key**, y pégala en `apps/storefront/.env.local` como `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY`.

8. Desde la raíz de `store`, backend (9000) y storefront (8000):

```bash
pnpm dev
```

- Storefront Ecuador (USD): [http://localhost:8000/ec](http://localhost:8000/ec)
- Storefront Dinamarca (EUR): [http://localhost:8000/dk](http://localhost:8000/dk)
- Admin: [http://localhost:9000/app](http://localhost:9000/app)

Si el middleware del storefront no alcanza el backend en Windows, el código ya reescribe `localhost` a `127.0.0.1` en Edge. El navegador sigue usando `http://localhost:9000`.

## Configuración

| Variable | Dónde | Notas |
| --- | --- | --- |
| `DATABASE_URL` | backend `.env` | Session pooler **5432** + `sslmode=no-verify` |
| `REDIS_URL` | — | No existe a propósito |
| `STORE_CORS` / `AUTH_CORS` | backend `.env` | Incluye `http://localhost:8000` |
| `NEXT_PUBLIC_DEFAULT_REGION` | storefront `.env.local` | `ec` |
| `NEXT_PUBLIC_MEDUSA_BACKEND_URL` | storefront `.env.local` | `http://localhost:9000` |

`medusa-config.ts` usa `rejectUnauthorized: false` para TLS hacia el pooler.

## Productos y checkout

Los productos son de kendo (bogu, shinai, uniformes, bolsos, accesorios, packs). Precios en dólares en `/ec` y en euros en `/dk`. Hay opción **Envío estándar Ecuador** además de Standard/Express.

El checkout del storefront crea la orden en Postgres (tabla `"order"`).
