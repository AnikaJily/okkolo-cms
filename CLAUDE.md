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
| `api::direction.direction` | Направления | Карточки разделов главной (Кофейня, Мастерские, Шоурум, Мероприятия). | `title`(req), `description`, `href` (string, опц.), `image`. |
| `api::event.event` | Мероприятия | Список ивентов для `/events`. | `title`(req), `slug`(uid из title), `date`, `description`, `photo`, `gallery`(multi), `isPaid`(default false), `price`, `paymentUrl`, `type` enum (`музыка`, `мастер-класс`, `лекция`, `стенд-ап`), `spotsTotal`, `spotsTaken`. |
| `api::event-registration.event-registration` | Регистрация на мероприятия | Заявки от посетителей. | `eventTitle`, `name`(req), `phone`(req), `email`, `comment`, `eventId`, `paymentStatus` enum (`pending`, `not_required`, `paid`). |
| `api::order.order` | Заказ | Чеки шоурума. | `customerName`(req), `phone`(req), `email`, `totalPrice`, `items`(json), `orderStatus` enum (`pending`,`completed`), `fulfillmentType` enum (`pickup`,`delivery`), `city`, `address`, `deliveryComment`. |
| `api::product.product` | Товары | Каталог шоурума. | `title`(req), `price`, `category` enum (`ceramics`,`clothing`,`jewelry`,`textile`), `image`(req, single), `gallery`(multi), `cartUrl`, `description`, `isAvailable` (default true). |
| `api::showroom.showroom` | Шоурум | Сейчас singleton-подобная коллекция с одним полем `heroImage`. Используется как источник hero-картинки страницы `/showroom`. |
| `api::cafe-menu-page.cafe-menu-page` | Меню кофейни — постеры | **Single Type.** Фотографии печатных меню (основное и сезонное) и общая сноска под меню. Поля: `mainPosterImage`+`mainPosterAlt`, `summerPosterImage`+`summerPosterAlt`, `footnote`. |
| `api::menu-item.menu-item` | Позиции меню кофейни | Список напитков/топингов. Поля: `name`(req), `volume`, `price`(req, строкой), `note`, `category` enum (`coffee`/`tea`/`signature`/`topping`/`cold`/`lemonade`), `season` enum (`main`/`summer`/`winter`, default `main`), `order` (int, default 0), `isAvailable` (default true). |
| `api::monthly-report.monthly-report` | Ежемесячные отчёты | Поля: `month` integer 1–12 (req), `year` (req), `pdf`(req, files), `summary` (опц.). |
| `api::annual-report.annual-report` | Годовые отчёты | Поля: `year`(req), `kind` enum (`content`/`finance`/`nko-activity`/`spending`)(req), `pdf`(req, files), `note` (опц.). |
| `api::legal-document.legal-document` | Документы фонда | Учредительные/реквизиты/политика. Поля: `title`(req), `category` enum (`requisites`/`foundation`/`privacy`)(req), `pdf`(req, files), `order` (int). |

Фронт (`okkolo/src/lib/strapi.ts`) обращается одновременно к `/api/showrooms` (коллекция) **и** к `/api/showroom` (single type) — фоллбэк на случай, если шоурум переведут в Single Type. Сейчас в CMS он коллекция.

### Bootstrap — public permissions

`src/index.ts` при старте Strapi создаёт permission'ы для роли `public`:

- `PUBLIC_READ_UIDS` — `direction`, `event`, `product`, `showroom`, `cafe-menu-page`, `menu-item`, `monthly-report`, `annual-report`, `legal-document` → `find` + `findOne` для всех.
- `PUBLIC_CREATE_UIDS` — `event-registration`, `order` → POST с лендинга разрешён.

Логика идемпотентная: перед `create` проверяет существование permission'а — повторный bootstrap не дублирует записи. Если поднимаешь свежий инстанс — все нужные доступы выставит сам bootstrap; админка не требуется.

### Middleware и CORS

`config/middlewares.ts` — стандартный набор Strapi + кастомный `strapi::cors` с origin-листом из `CORS_ORIGIN`. Методы и хедеры открыты широко (`*`). Logger, security, body, session — дефолт.

## Связь с фронтом

Лендинг ходит сюда напрямую через `fetch` без SDK:

- `GET /api/directions?populate=image`
- `GET /api/events?populate[photo]=true&populate[gallery]=true&sort=date:asc`
- `GET /api/products?populate[image]=true&populate[gallery]=true&sort=title:asc&filters[isAvailable][$eq]=true`
- `GET /api/showrooms?populate=heroImage` (с фоллбэком на `GET /api/showroom?populate=hero`)
- `GET /api/cafe-menu-page?populate=*` (Single Type — фото меню и сноска)
- `GET /api/menu-items?filters[isAvailable][$eq]=true&sort=order:asc` (отфильтровать по `season` и/или `category` на стороне фронта)
- `GET /api/monthly-reports?populate=pdf&sort[0]=year:desc&sort[1]=month:desc`
- `GET /api/annual-reports?populate=pdf&sort[0]=year:desc`
- `GET /api/legal-documents?populate=pdf&sort=order:asc`
- `POST /api/event-registrations` (тело: `{ data: { eventTitle, name, phone, email?, comment?, eventId, paymentStatus } }`)
- `POST /api/orders` (тело: `{ data: { customerName, phone, email?, totalPrice, items: [...], orderStatus, fulfillmentType, city?, address?, deliveryComment? } }`)

Базовый URL у фронта — `VITE_STRAPI_URL` (по умолчанию `http://localhost:1337`). При полном падении CMS фронт молча фоллбэчит на моки из `okkolo/src/data/*` — поэтому ошибки 4xx/5xx в проде **не видны пользователю**, проверяй Network/логи.

## Подводные камни

- **Миграция полей `event.Price → price` и `event-registration.paymentStatus`** уже сделана в схемах. На локалке (SQLite) данные после первого `npm run develop` пересоздадутся (если SEED_FORCE=true) или просто старые столбцы исчезнут. **Перед деплоем на прод** — обязательно `pg_dump` (см. README.md → «Бэкап Postgres»). После деплоя `event.Price` исчезает из БД, заявки с `paymentStatus = ' not_required'` (с пробелом) станут невалидными — их можно либо удалить, либо обновить SQL-апдейтом.
- **Frontend ещё не переключён на новые поля.** `okkolo/src/lib/strapi.ts` сейчас читает `Price` (через `StrapiEventItem`), а у `event-registration` шлёт `paymentStatus: 'not_required'` (это уже совпадает с новым enum). При первом релизе CMS сразу обновить фронт: `Price` → `price`, добавить опору на `slug`/`gallery`/`isAvailable`, использовать `direction.href` напрямую.
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
