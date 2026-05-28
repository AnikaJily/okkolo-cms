# CLAUDE.md

Бэкенд проекта «Окколо» — Strapi 5 CMS, отвечает за контент и приём заявок для лендинга [`okkolo`](../okkolo). Этот файл — навигация для Claude Code по особенностям именно CMS-репы.

## Команды

```bash
npm install
npm run develop   # = npm run dev — Strapi с автоперезагрузкой, http://localhost:1337/admin
npm run build     # собрать админ-панель в dist/build
npm run start     # запустить без autoReload (так пускается на сервере под pm2)
npm run console   # REPL внутри strapi (стрелять в strapi.entityService и т.п.)
npm run upgrade   # bump strapi-зависимостей через @strapi/upgrade
```

Тестов и линтера нет. Тип-чек в `tsconfig.json` намеренно лояльный (`strict: false`) — Strapi сам генерит `types/generated/{contentTypes,components}.d.ts` после `develop`/`build`, эти файлы пересоздаются и в гит коммитятся (так удобнее, чем перегенеривать руками).

## Окружение

- Node 20–24 (см. `engines` в `package.json`), npm ≥ 6. Локально проверено на macOS arm64, в `optionalDependencies` стоит `@esbuild/darwin-arm64`.
- **Локальная БД — SQLite** (`.tmp/data.db`, см. реальный `.env`). Это в `.gitignore` — значит данные локалки у каждого свои; продовый дамп не возим, моки наливаем руками через админку.
- **Прод — PostgreSQL 16** на том же VPS (см. `DEPLOY.md` в репе `okkolo`). Переключение через `DATABASE_CLIENT=postgres` + `DATABASE_URL` (или `DATABASE_HOST/PORT/NAME/USERNAME/PASSWORD`).
- `.env.example` отражает прод-вариант (postgres + secrets-плейсхолдеры). При первом старте локально достаточно скопировать его в `.env`, поменять `DATABASE_CLIENT=sqlite` и `DATABASE_FILENAME=.tmp/data.db`, остальные секреты заполнить любыми строками (это пойдёт в `APP_KEYS`, `JWT_SECRET`, `ENCRYPTION_KEY` и т.д.).

### Ключевые env-переменные

| Переменная | Где используется | Назначение |
|---|---|---|
| `HOST`, `PORT` | `config/server.ts` | Адрес слушателя. На сервере `127.0.0.1:1337` (наружу торчит nginx). |
| `PUBLIC_URL`, `IS_PROXIED` | `config/server.ts` | Чтобы Strapi за nginx правильно строил абсолютные URL. На локалке оба не нужны. |
| `APP_KEYS` | server.app.keys | Список ключей через запятую. |
| `ADMIN_JWT_SECRET`, `API_TOKEN_SALT`, `TRANSFER_TOKEN_SALT`, `JWT_SECRET`, `ENCRYPTION_KEY` | `config/admin.ts`, users-permissions | Секреты Strapi. Не светить, не коммитить. |
| `CORS_ORIGIN` | `config/middlewares.ts` | Список разрешённых origin через запятую. По умолчанию: `localhost:5173`, `localhost:5180`, `okkolo.vercel.app`. **На прод-боксе сейчас разрешён только `http://158.160.128.16`** — добавление домена потребует правки этого значения и `pm2 restart`. |
| `DATABASE_CLIENT` + `DATABASE_*` | `config/database.ts` | `sqlite` локально, `postgres` на сервере. Параметры пула — `DATABASE_POOL_MIN/MAX`. |

## Архитектура

Один монолит — стандартный layout Strapi 5:

```
config/        # admin / api / database / middlewares / plugins / server (.ts)
src/
  api/<uid>/   # 6 коллекций (см. ниже), каждая = schema + controller + route + service
  index.ts     # bootstrap hook (см. ниже)
  extensions/  # пусто, плейсхолдер
public/uploads # media (в .gitignore, бэкапить отдельно)
database/migrations/  # пусто, миграции пока не используем
types/generated/      # авто-генеренные .d.ts (контент-типы и компоненты)
```

### Content-types

Все коллекции — `draftAndPublish: true`, controller/route/service сгенерены дефолтными фабриками (`factories.createCoreController/Router/Service`) — никакой кастомной логики, всё на стандартных REST-эндпоинтах `/api/<plural>` (GET list, GET `/:id`, POST, PUT, DELETE).

| UID | displayName | Кратко | Спец. поля |
|---|---|---|---|
| `api::direction.direction` | Направления | Карточки разделов главной (Кофейня, Мастерские, Шоурум, Мероприятия). | `title`, `description`, `image` (single media). **Поля `href` в схеме нет**, но фронт его читает (см. ниже). |
| `api::event.event` | Мероприятия | Список ивентов для `/events`. | `title`, `date`, `description`, `photo`, `isPaid`, **`Price` (с заглавной P)**, `paymentUrl`, `type` enum (`музыка`, `мастер-класс`, `лекция`, `стенд-ап`), `spotsTotal`, `spotsTaken`. |
| `api::event-registration.event-registration` | Регистрация на мероприятия | Заявки от посетителей. | `eventTitle`, `name`(req), `phone`(req), `email`, `comment`, `eventId`, `paymentStatus` enum (`pending`, **`" not_required"` с ведущим пробелом!**). |
| `api::order.order` | Заказ | Чеки шоурума. | `customerName`(req), `phone`(req), `email`, `totalPrice`, `items`(json), `orderStatus` enum (`pending`,`completed`), `fulfillmentType` enum (`pickup`,`delivery`), `city`, `address`, `deliveryComment`. |
| `api::product.product` | Товары | Каталог шоурума. | `title`, `price`, `category` enum (`ceramics`,`clothing`,`jewelry`,`textile`), `image`(req, single), `gallery`(multi), `cartUrl`, `description`. |
| `api::showroom.showroom` | Шоурум | Сейчас singleton-подобная коллекция с одним полем `heroImage`. Используется как источник hero-картинки страницы `/showroom`. |

Фронт (`okkolo/src/lib/strapi.ts`) обращается одновременно к `/api/showrooms` (коллекция) **и** к `/api/showroom` (single type) — фоллбэк на случай, если шоурум переведут в Single Type. Сейчас в CMS он коллекция.

### Bootstrap — public permissions

`src/index.ts` при старте Strapi создаёт permission'ы для роли `public`:

- `PUBLIC_READ_UIDS = ['api::direction.direction']` → публично доступны `find` и `findOne`.
- `PUBLIC_CREATE_UIDS` пуст (строки про `event-registration.create` и `order.create` закомментированы) → **POST на эти эндпоинты пока требует авторизации**. Если фронт начнёт получать 403 на регистрациях/заказах — раскомментировать UID-ы и перезапустить (`pm2 restart okkolo-cms --update-env`).

Логика идемпотентная: перед `create` проверяет существование permission'а — повторный bootstrap не дублирует записи. Любые остальные публичные доступы (на events, products, showroom) сейчас выставлены **вручную через админку** — в коде их нет. Если разворачиваешь свежий инстанс — повторить через UI или дописать UID в `PUBLIC_READ_UIDS`.

### Middleware и CORS

`config/middlewares.ts` — стандартный набор Strapi + кастомный `strapi::cors` с origin-листом из `CORS_ORIGIN`. Методы и хедеры открыты широко (`*`). Logger, security, body, session — дефолт.

## Связь с фронтом

Лендинг ходит сюда напрямую через `fetch` без SDK:

- `GET /api/directions?populate=image`
- `GET /api/events?populate=photo&sort=date:asc`
- `GET /api/products?populate[image]=true&populate[gallery]=true&sort=title:asc`
- `GET /api/showrooms?populate=heroImage` (с фоллбэком на `GET /api/showroom?populate=hero`)
- `POST /api/event-registrations` (тело: `{ data: { eventTitle, name, phone, email?, comment?, eventId, paymentStatus } }`)
- `POST /api/orders` (тело: `{ data: { customerName, phone, email?, totalPrice, items: [...], orderStatus, fulfillmentType, city?, address?, deliveryComment? } }`)

Базовый URL у фронта — `VITE_STRAPI_URL` (по умолчанию `http://localhost:1337`). При полном падении CMS фронт молча фоллбэчит на моки из `okkolo/src/data/*` — поэтому ошибки 4xx/5xx в проде **не видны пользователю**, проверяй Network/логи.

## Подводные камни

- **`event.Price` с заглавной буквы** — в схеме `"Price"`, а фронт читает `price` (строчная). Сейчас фронт берёт цену из своего поля и одно из них рассинхронено: при правке любой стороны проверь обе. Корректнее переименовать атрибут в `price` (миграция Strapi через UI) и обновить `StrapiEventItem`.
- **`event-registration.paymentStatus` enum содержит `" not_required"` с ведущим пробелом.** Это не опечатка в этом файле — это реально в `schema.json`. Фронт же шлёт `'not_required'` без пробела (см. `EventRegistrationInput`). До фикса значения не совпадут — заявки сохранятся с `paymentStatus = null`. Чинить через админку → Content-Type Builder → удалить пробел в enum.
- **Direction.href не существует в схеме**, хотя `okkolo/src/lib/strapi.ts` его читает и `okkolo/src/lib/directions.ts::resolveDirectionHref` пытается на него опереться. Сейчас работает за счёт того, что для известных направлений href вычисляется из заголовка (`isShowroomDirection`, `isEventsDirection` и т.д.). Если хочется ручного управления — добавить string-атрибут `href` в Direction.
- **Permissions для `events`/`products`/`showroom`/`POST regs/orders` не в коде.** Свежий инстанс по умолчанию вернёт 403 на эти ручки. Либо включи их в админке (Settings → Roles → Public), либо допиши UID-ы в `src/index.ts`. Через UI — быстрее, через код — воспроизводимо.
- **`public/uploads` в `.gitignore`.** Аплоады локалки и прода не пересекаются. Перенос медиа = ручной rsync `~/apps/cms/public/uploads` или дамп через Strapi Transfer.
- **`types/generated/`** регенерится при каждом `develop`/`build`. Если git показывает диффы в этих файлах после старта — это норма; не правь руками, правь схемы.

## Деплой

Подробный плейбук — в `okkolo/DEPLOY.md` (там и сервер, и nginx, и pm2, и Postgres). Кратко:

- Сервер: Ubuntu 24.04, `158.160.128.16`, пользователь `nastyasep2004`.
- Strapi живёт в `~/apps/cms`, запущен `pm2` под именем `okkolo-cms`, слушает `127.0.0.1:1337`.
- За ним nginx: `/admin`, `/api`, `/uploads`, `/content-manager`, `/upload`, `/i18n`, `/users-permissions`, `/email`, `/users`, `/auth`, `/_health` → проксируются на 1337.
- БД — локальный Postgres 16 (`okkolo_cms` / `okkolo`).
- Деплой кода: `git pull` → `npm ci` → `npm run build` → `pm2 restart okkolo-cms --update-env`.
- После правок `.env` или `config/` обязательно `--update-env`, иначе старые значения останутся в памяти процесса.

## Что не делать без явного запроса

- Не переводить локалку на Postgres «для единообразия» — потеряем удобство одноразовой SQLite.
- Не накатывать миграции Strapi `--force` на прод — сначала бэкап `pg_dump` (см. `DEPLOY.md`).
- Не править `types/generated/*` руками — это артефакт.
- Не выкатывать новые public permissions в обход `src/index.ts` без того, чтобы продублировать их там же — иначе при переезде/пересоздании ролей они потеряются.
