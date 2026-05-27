# Окколо — CMS

Strapi 5 для проекта «Окколо». Отдаёт контент и принимает заявки для лендинга [`okkolo`](https://github.com/AnikaJily/okkolo).

- **Прод API:** http://158.160.128.16/api/...
- **Админка:** http://158.160.128.16/admin
- **CI/CD:** push в ветку `production` → автодеплой через GitHub Actions.

## Команды

```bash
npm install
npm run develop   # = npm run dev — Strapi с автоперезагрузкой, http://localhost:1337/admin
npm run build     # собрать админ-панель в dist/build
npm run start     # запустить без autoReload (так пускается на сервере под pm2)
npm run console   # REPL внутри strapi
npm run upgrade   # bump strapi-зависимостей через @strapi/upgrade
```

Node 20–24, npm ≥ 6. Локально проверено на macOS arm64.

## Окружение

- **Локально — SQLite** (`.tmp/data.db`). В `.gitignore` — данные у каждого свои.
- **Прод — PostgreSQL 16** на том же VPS (`okkolo_cms` / юзер `okkolo`).

Минимальный локальный `.env`:

```bash
HOST=0.0.0.0
PORT=1337

APP_KEYS=any1,any2
API_TOKEN_SALT=any
ADMIN_JWT_SECRET=any
TRANSFER_TOKEN_SALT=any
JWT_SECRET=any
ENCRYPTION_KEY=any

CORS_ORIGIN=http://localhost:5173,http://localhost:5180

DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
```

Полный шаблон с Postgres-вариантом — в `.env.example`.

### Ключевые переменные

| Переменная | Где | Назначение |
|---|---|---|
| `HOST`, `PORT` | `config/server.ts` | Адрес слушателя. На сервере `127.0.0.1:1337` (наружу — только через nginx). |
| `PUBLIC_URL`, `IS_PROXIED` | `config/server.ts` | Для корректных абсолютных URL за reverse-прокси. |
| `APP_KEYS`, `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | `config/admin.ts` + users-permissions | Секреты Strapi. На сервере — в `~/apps/cms/.env` с `chmod 600`. |
| `CORS_ORIGIN` | `config/middlewares.ts` | Список origin'ов через запятую. На прод-боксе сейчас разрешён `http://158.160.128.16`. |
| `DATABASE_CLIENT` + `DATABASE_*` | `config/database.ts` | `sqlite` локально, `postgres` на сервере. |

## Архитектура

```
config/        # admin / api / database / middlewares / plugins / server (.ts)
src/
  api/<uid>/   # 6 коллекций (см. ниже), каждая = schema + controller + route + service
  index.ts     # bootstrap hook — выставляет public permissions
  extensions/  # пусто, плейсхолдер
public/uploads # media (в .gitignore, бэкапить отдельно)
database/migrations/  # пусто
types/generated/      # авто-генерация Strapi (.d.ts) — пересоздаётся на каждый build
```

### Content-types

Все `draftAndPublish: true`, controller/route/service — дефолтные `factories.createCore*` (никакой кастомной логики, чистый REST `/api/<plural>`).

| UID | displayName | Поля |
|---|---|---|
| `api::direction.direction` | Направления | `title`, `description`, `image` |
| `api::event.event` | Мероприятия | `title`, `date`, `description`, `photo`, `isPaid`, `Price` (⚠ заглавная), `paymentUrl`, `type` enum (`музыка`/`мастер-класс`/`лекция`/`стенд-ап`), `spotsTotal`, `spotsTaken` |
| `api::event-registration.event-registration` | Регистрации | `eventTitle`, `name`*, `phone`*, `email`, `comment`, `eventId`, `paymentStatus` enum (`pending` / ⚠ `" not_required"` с пробелом) |
| `api::order.order` | Заказы | `customerName`*, `phone`*, `email`, `totalPrice`, `items`(json), `orderStatus` enum, `fulfillmentType` enum (`pickup`/`delivery`), `city`, `address`, `deliveryComment` |
| `api::product.product` | Товары | `title`, `price`, `category` enum (`ceramics`/`clothing`/`jewelry`/`textile`), `image`*, `gallery`, `cartUrl`, `description` |
| `api::showroom.showroom` | Шоурум | `heroImage` (источник hero-картинки страницы `/showroom`) |

`*` — required.

### Bootstrap public permissions

`src/index.ts` при старте Strapi выставляет permission'ы для роли `public` (идемпотентно, проверкой существования):

- `PUBLIC_READ_UIDS = ['api::direction.direction']` → `find` + `findOne`.
- `PUBLIC_CREATE_UIDS` пуст (закомментированы `event-registration.create` и `order.create`).

**Известная проблема:** `events`, `products`, `showroom` сейчас 403 — public read не выставлен ни в коде, ни (на свежем инстансе) в админке. Чинить одним из двух:

- (a) Settings → Roles → Public → проставить find/findOne в админке.
- (b) Добавить UID в `PUBLIC_READ_UIDS` и закоммитить — bootstrap проставит на следующем деплое.

## Связь с фронтом

Лендинг `okkolo` ходит через `fetch` напрямую:

- `GET /api/directions?populate=image`
- `GET /api/events?populate=photo&sort=date:asc`
- `GET /api/products?populate[image]=true&populate[gallery]=true&sort=title:asc`
- `GET /api/showrooms?populate=heroImage`
- `POST /api/event-registrations` (`{ data: { eventTitle, name, phone, email?, comment?, eventId, paymentStatus } }`)
- `POST /api/orders` (`{ data: { customerName, phone, email?, totalPrice, items, orderStatus, fulfillmentType, city?, address?, deliveryComment? } }`)

Базовый URL у фронта — `VITE_STRAPI_URL`.

## Известные расхождения схемы и кода фронта

- **`event.Price` с заглавной P** — фронт читает `price`. Цена платных ивентов сейчас не доходит. Фикс: переименовать через Content-Type Builder в админке.
- **`event-registration.paymentStatus` enum: `" not_required"`** с ведущим пробелом. Фронт шлёт `'not_required'` без пробела → сохраняется `null`. Фикс: убрать пробел в админке.
- **`Direction.href` нет в схеме**, но фронт его читает. Сейчас работает за счёт автоопределения по заголовку (`isShowroomDirection`, `isEventsDirection`, …). Если хочется ручного управления — добавить string-атрибут `href`.

## CI/CD

### Архитектура

```
push в production
       │
       ▼
┌──────────────────────────────────────┐
│  GitHub Actions (ubuntu-latest)      │
│                                      │
│  1. checkout                         │
│  2. webfactory/ssh-agent             │
│  3. ssh-keyscan → known_hosts        │
│  4. rsync исходники (без .env,       │
│     node_modules, .tmp, dist,        │
│     public/uploads, .strapi, .git)   │
│  5. ssh: npm ci && npm run build &&  │
│     pm2 restart okkolo-cms           │
│     --update-env && pm2 save         │
└──────────────┬───────────────────────┘
               │ ssh (port 22)
               ▼
┌──────────────────────────────────────┐
│  VPS 158.160.128.16                  │
│  /home/nastyasep2004/apps/cms/       │
│  ← pm2 → Strapi 127.0.0.1:1337       │
│  ← Postgres 127.0.0.1:5432           │
│  ← nginx /admin /api /uploads        │
└──────────────────────────────────────┘
```

### Workflow

`.github/workflows/deploy.yml`. Триггеры:

- `push` в ветку `production`.
- Ручной `workflow_dispatch`.

Concurrency-группа `deploy-okkolo-cms` с `cancel-in-progress: false`.

Сборка идёт **на самом сервере** (`npm ci` + `npm run build`) — Strapi пересобирает админку под текущие node_modules, тащить их через rsync (>500 MB) бессмысленно.

Длительность типичного деплоя — ~2–3 мин (узкое место — `npm ci` Strapi + сборка админки).

### Почему rsync, а не git pull

`~/apps/cms` на сервере **не git-репа** (код туда был залит rsync'ом изначально). Симметрия с фронтом: оба workflow используют один и тот же подход (rsync sources → выполнить локально на сервере). Плюс: не нужен GitHub deploy key на сервере для git fetch.

### GitHub Secrets

В `Settings → Secrets and variables → Actions`:

| Имя | Значение |
|---|---|
| `SSH_PRIVATE_KEY` | Приватный ключ ed25519 `gha-deploy-okkolo` (целиком, с BEGIN/END) |
| `SSH_HOST` | `158.160.128.16` |
| `SSH_USER` | `nastyasep2004` |

Тот же ключ используется в репе `okkolo` для деплоя фронта — публичная часть в `~/.ssh/authorized_keys` у `nastyasep2004`.

### Как делать релиз

```bash
# 1. Влить изменения в production
git checkout production
git merge --ff-only vankrav   # или PR на GitHub
git push origin production    # → запускает деплой

# 2. Смотреть прогресс
gh run watch -R AnikaJily/okkolo-cms
```

### Что rsync исключает (и почему важно)

| Путь | Почему исключён |
|---|---|
| `node_modules` | Большой, ставится через `npm ci` на сервере под Linux |
| `.env` | Содержит прод-секреты (`DATABASE_PASSWORD`, `APP_KEYS` и т.д.) |
| `.tmp` | Локальная SQLite БД разработчика |
| `.strapi`, `.strapi-updater.json`, `.cache` | Кеш Strapi |
| `dist`, `build` | Артефакты сборки |
| `public/uploads` | Загруженные через админку медиа — переносятся отдельно |
| `.git`, `.github` | Не нужны на сервере |

Флаг `--delete` синхронизирует *исходники* — удаляет на сервере те tracked файлы, которых нет локально (например, удалённый content-type). Исключённые пути это не затрагивает.

### Откат

```bash
git checkout production
git revert HEAD
git push origin production
```

⚠ При revert content-type'а (удалении папки `src/api/<uid>/`) Strapi **не уберёт** связанные таблицы Postgres автоматически — таблицы надо чистить вручную или через миграцию. Для безопасности перед revert смотри [бэкап БД](#бэкап-postgres).

### Бэкап Postgres

Перед потенциально опасными изменениями (миграция схемы, удаление content-type):

```bash
ssh nastyasep2004@158.160.128.16 "PGPASSWORD='<пароль>' pg_dump -h 127.0.0.1 -U okkolo okkolo_cms | gzip > ~/backup-okkolo-\$(date +%F).sql.gz"
```

Восстановление:

```bash
ssh nastyasep2004@158.160.128.16 "gunzip -c ~/backup-okkolo-YYYY-MM-DD.sql.gz | PGPASSWORD='<пароль>' psql -h 127.0.0.1 -U okkolo okkolo_cms"
```

(Пароль — в `~/apps/cms/.env` на сервере.)

### Бэкап media

```bash
ssh nastyasep2004@158.160.128.16 "tar czf ~/backup-uploads-\$(date +%F).tar.gz -C ~/apps/cms public/uploads"
```

### Ротация SSH-ключа

См. соответствующий раздел в README фронт-репы — процедура общая, ключ один на оба пайплайна.

### Защита ветки production

Сейчас не настроена. Рекомендуется в `Settings → Branches → Add rule`:

- Branch name pattern: `production`.
- Require a pull request before merging.

## Деплой сервера (общая раскладка)

Подробный плейбук — `DEPLOY.md` во фронт-репе ([`okkolo/DEPLOY.md`](https://github.com/AnikaJily/okkolo/blob/production/DEPLOY.md)). Там же — nginx-конфиг, pm2, Postgres, fail2ban, swap.

Кратко:
- Ubuntu 24.04, юзер `nastyasep2004`, NOPASSWD sudo.
- Strapi в `~/apps/cms`, запущен `pm2` под именем `okkolo-cms`, слушает `127.0.0.1:1337`.
- nginx проксирует `/admin`, `/api`, `/uploads`, `/content-manager`, `/upload`, `/i18n`, `/users-permissions`, `/email`, `/users`, `/auth`, `/_health` → `:1337`.
- Логи pm2: `~/.pm2/logs/okkolo-cms-{out,error}.log`.

## Ветки

- `main` — снапшот предыдущей версии.
- `vankrav` — рабочая ветка разработки.
- `production` — то, что сейчас в проде. Push сюда триггерит деплой.

## Что не делать без явного запроса

- Не переводить локалку на Postgres «для единообразия».
- Не накатывать миграции Strapi `--force` на прод без `pg_dump`.
- Не править `types/generated/*` руками — это артефакт.
- Не пушить напрямую в `production` без ревью.
- Не коммитить `.env`.

Подробнее по архитектуре и инвариантам — [`CLAUDE.md`](./CLAUDE.md).
