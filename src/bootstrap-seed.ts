import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { Core } from '@strapi/strapi';

type ProductCategory = 'ceramics' | 'clothing' | 'jewelry' | 'textile';
type EventType = 'музыка' | 'мастер-класс' | 'лекция' | 'стенд-ап';

interface DirectionSeed {
  title: string;
  description: string;
  picsumSeed: string;
}

interface EventSeed {
  title: string;
  date: string;
  description: string;
  isPaid: boolean;
  Price: number | null;
  paymentUrl: string | null;
  type: EventType;
  spotsTotal: number;
  spotsTaken: number;
  picsumSeed: string;
}

interface ProductSeed {
  title: string;
  price: number;
  category: ProductCategory;
  description: string;
  cartUrl: string | null;
  picsumSeed: string;
}

const DIRECTIONS: DirectionSeed[] = [
  {
    title: 'Кофейня',
    description: 'Вкусный кофе, сезонные сладости и спокойное место, где можно встретиться или поработать.',
    picsumSeed: 'okkolo-cafe',
  },
  {
    title: 'Мастерские',
    description:
      'Живые студии и курсы: керамика, текстиль, ювелирка и графика — рядом с кофейней, в спокойном темпе и с наставниками.',
    picsumSeed: 'okkolo-workshops',
  },
  {
    title: 'Шоурум',
    description: 'Изделия мастерских и небольшие тиражи от местных авторов: керамика, текстиль, украшения и одежда.',
    picsumSeed: 'okkolo-showroom',
  },
  {
    title: 'События',
    description: 'Концерты, мастер-классы и лекции в дружелюбной атмосфере — для всех, кто рядом.',
    picsumSeed: 'okkolo-events',
  },
  {
    title: 'Гончарная студия «На кругу»',
    description: 'Керамика для города: спокойный круг, руки в глине и понятный путь от комка до застеклованной чашки.',
    picsumSeed: 'okkolo-pottery',
  },
  {
    title: 'Текстильная мастерская «Узел»',
    description: 'Ткачество на раме, батик и аккуратный шов — чтобы дом стал чуть теплее на ощупь.',
    picsumSeed: 'okkolo-textile',
  },
  {
    title: 'Ювелирная лаборатория «Застёжка»',
    description: 'Литьё из воска, пайка и аккуратная полировка — небольшие изделия с характером.',
    picsumSeed: 'okkolo-jewelry',
  },
  {
    title: 'Студия печати «Лист»',
    description: 'Линогравюра и монотипия: быстрый результат, понятная техника и аккуратная типографика.',
    picsumSeed: 'okkolo-print',
  },
];

function daysFromNow(days: number, hours = 19, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

const EVENTS: EventSeed[] = [
  {
    title: 'Вечер живого джаза',
    date: daysFromNow(3, 19, 0),
    description:
      'Тёплый вечер с трио музыкантов из Краснодара: стандарты Эллингтона и пара современных номеров. Бар работает весь вечер.',
    isPaid: false,
    Price: null,
    paymentUrl: null,
    type: 'музыка',
    spotsTotal: 40,
    spotsTaken: 12,
    picsumSeed: 'event-jazz',
  },
  {
    title: 'Мастер-класс по керамике для начинающих',
    date: daysFromNow(5, 14, 0),
    description:
      'Двухчасовая встреча: центрируем глину на круге, делаем простую пиалу или кружку. Подходит для тех, кто впервые садится за круг.',
    isPaid: true,
    Price: 2400,
    paymentUrl: null,
    type: 'мастер-класс',
    spotsTotal: 7,
    spotsTaken: 4,
    picsumSeed: 'event-ceramics',
  },
  {
    title: 'Книжный клуб: «Маленький принц»',
    date: daysFromNow(7, 18, 30),
    description:
      'Встреча книжного клуба «Окколо»: разбираем главы, делимся впечатлениями, пьём чай. Можно прийти даже если перечитали по диагонали.',
    isPaid: false,
    Price: null,
    paymentUrl: null,
    type: 'лекция',
    spotsTotal: 25,
    spotsTaken: 8,
    picsumSeed: 'event-book',
  },
  {
    title: 'Стенд-ап вечер: открытый микрофон',
    date: daysFromNow(10, 20, 0),
    description:
      'Открытый микрофон для местных комиков. 8 выступающих, по 7 минут. Если хотите выйти — напишите нам заранее.',
    isPaid: true,
    Price: 500,
    paymentUrl: null,
    type: 'стенд-ап',
    spotsTotal: 50,
    spotsTaken: 22,
    picsumSeed: 'event-standup',
  },
  {
    title: 'Лекция: «Зачем городу инклюзивные пространства»',
    date: daysFromNow(12, 19, 30),
    description:
      'Разговор с проектировщицей доступных сред: что такое универсальный дизайн, как работают инклюзивные кафе и почему это выгодно бизнесу.',
    isPaid: false,
    Price: null,
    paymentUrl: null,
    type: 'лекция',
    spotsTotal: 35,
    spotsTaken: 14,
    picsumSeed: 'event-lecture',
  },
  {
    title: 'Воркшоп по линогравюре',
    date: daysFromNow(15, 17, 0),
    description:
      'Два часа практики: эскиз → перенос на линолеум → пробный оттиск. Уносите серию открыток собственной печати.',
    isPaid: true,
    Price: 1900,
    paymentUrl: null,
    type: 'мастер-класс',
    spotsTotal: 10,
    spotsTaken: 3,
    picsumSeed: 'event-lino',
  },
  {
    title: 'Акустический вечер: песни под гитару',
    date: daysFromNow(18, 19, 0),
    description:
      'Дуэт гитаристов, кавер-программа и пара авторских песен. Свет приглушённый, можно сидеть на подушках.',
    isPaid: false,
    Price: null,
    paymentUrl: null,
    type: 'музыка',
    spotsTotal: 40,
    spotsTaken: 17,
    picsumSeed: 'event-acoustic',
  },
  {
    title: 'Мастер-класс по текстильной аппликации',
    date: daysFromNow(22, 12, 0),
    description:
      'Делаем небольшое настенное панно из лоскутов: подбор палитры, раскладка, шов через край. Материалы включены.',
    isPaid: true,
    Price: 1600,
    paymentUrl: null,
    type: 'мастер-класс',
    spotsTotal: 8,
    spotsTaken: 5,
    picsumSeed: 'event-applique',
  },
];

const PRODUCTS: ProductSeed[] = [
  {
    title: 'Бусы «Долматинец»',
    price: 2100,
    category: 'jewelry',
    description: 'Бусы из натурального камня в спокойной серо-чёрной гамме. Универсальная длина — подходят на каждый день.',
    cartUrl: null,
    picsumSeed: 'p-beads-dalmatian',
  },
  {
    title: 'Ваза ручной работы',
    price: 3200,
    category: 'ceramics',
    description: 'Керамическая ваза с мягкой матовой глазурью. Каждое изделие чуть отличается по оттенку — это часть ручной работы.',
    cartUrl: null,
    picsumSeed: 'p-vase',
  },
  {
    title: 'Льняная салфетка',
    price: 890,
    category: 'textile',
    description: 'Салфетка из натурального льна с обработанным краем. Хорошо переносит стирку и со временем становится мягче.',
    cartUrl: null,
    picsumSeed: 'p-napkin',
  },
  {
    title: 'Сумка-шопер из хлопка',
    price: 1500,
    category: 'clothing',
    description: 'Плотный хлопковый шопер с длинными ручками. Выдерживает книги, ноутбук и пару продуктов из магазина.',
    cartUrl: null,
    picsumSeed: 'p-tote',
  },
  {
    title: 'Кружка «Окколо»',
    price: 1200,
    category: 'ceramics',
    description: 'Керамическая кружка на 300 мл с фирменной маркировкой на поддоне. Удобно ложится в руку.',
    cartUrl: null,
    picsumSeed: 'p-cup',
  },
  {
    title: 'Браслет «Жемчуг»',
    price: 1800,
    category: 'jewelry',
    description: 'Тонкий браслет с пресноводным жемчугом и латунной фурнитурой. Регулируемая длина.',
    cartUrl: null,
    picsumSeed: 'p-bracelet',
  },
  {
    title: 'Дорожка на стол',
    price: 2400,
    category: 'textile',
    description: 'Тканая дорожка длиной 140 см в нейтральной палитре. Подходит и под праздничную сервировку, и для повседневного стола.',
    cartUrl: null,
    picsumSeed: 'p-runner',
  },
  {
    title: 'Рубашка льняная',
    price: 4500,
    category: 'clothing',
    description: 'Свободного кроя, без подкладки. Лён мягко мнётся и держит форму. Размеры S–XL.',
    cartUrl: null,
    picsumSeed: 'p-shirt',
  },
  {
    title: 'Набор мисок',
    price: 2800,
    category: 'ceramics',
    description: 'Три миски разного диаметра в одной палитре. Подходят для духовки и микроволновки.',
    cartUrl: null,
    picsumSeed: 'p-bowls',
  },
  {
    title: 'Серьги «Солнце»',
    price: 1650,
    category: 'jewelry',
    description: 'Латунные серьги с лёгкой полировкой. Дужка из медицинской стали — комфортно носить целый день.',
    cartUrl: null,
    picsumSeed: 'p-earrings',
  },
  {
    title: 'Шарф шерстяной',
    price: 2200,
    category: 'textile',
    description: 'Тонкая шерсть мериноса, мягкая бахрома по краям. Размер 30×180 см.',
    cartUrl: null,
    picsumSeed: 'p-scarf',
  },
  {
    title: 'Тарелка десертная',
    price: 1400,
    category: 'ceramics',
    description: 'Плоская керамическая тарелка диаметром 18 см с лёгкой деформацией края.',
    cartUrl: null,
    picsumSeed: 'p-plate',
  },
  {
    title: 'Колье на цепочке',
    price: 2400,
    category: 'jewelry',
    description: 'Тонкая цепочка с подвеской из латуни, длина 50 см. Подходит под лёгкие футболки и водолазки.',
    cartUrl: null,
    picsumSeed: 'p-necklace',
  },
  {
    title: 'Платок шёлковый',
    price: 3100,
    category: 'textile',
    description: 'Натуральный шёлк, ручная роспись горячим батиком. Каждый платок уникален.',
    cartUrl: null,
    picsumSeed: 'p-silk',
  },
  {
    title: 'Худи унисекс',
    price: 5200,
    category: 'clothing',
    description: 'Плотный хлопковый футер, прямой крой, карман-кенгуру. Печать «Окколо» на спине.',
    cartUrl: null,
    picsumSeed: 'p-hoodie',
  },
  {
    title: 'Подсвечник',
    price: 1600,
    category: 'ceramics',
    description: 'Керамический подсвечник для одной свечи-таблетки. Глазурь матовая, под цвет стола.',
    cartUrl: null,
    picsumSeed: 'p-candle',
  },
];

async function fetchImageToTmp(seedKey: string, width = 1200, height = 900): Promise<string | null> {
  try {
    const url = `https://picsum.photos/seed/${encodeURIComponent(seedKey)}/${width}/${height}`;
    const res = await fetch(url, { redirect: 'follow' });
    if (!res.ok) return null;
    const buf = Buffer.from(await res.arrayBuffer());
    const filepath = path.join(os.tmpdir(), `seed-${seedKey}-${Date.now()}.jpg`);
    await fs.promises.writeFile(filepath, buf);
    return filepath;
  } catch {
    return null;
  }
}

async function uploadImage(
  strapi: Core.Strapi,
  filepath: string,
  displayName: string,
): Promise<number | null> {
  try {
    const stat = await fs.promises.stat(filepath);
    const uploaded = await strapi
      .plugin('upload')
      .service('upload')
      .upload({
        data: { fileInfo: { name: displayName, alternativeText: displayName } },
        files: {
          filepath,
          originalFilename: path.basename(filepath),
          mimetype: 'image/jpeg',
          size: stat.size,
        },
      });
    const file = Array.isArray(uploaded) ? uploaded[0] : uploaded;
    return file?.id ?? null;
  } catch (err) {
    strapi.log.warn(`seed: upload failed for ${displayName}: ${(err as Error).message}`);
    return null;
  } finally {
    fs.promises.unlink(filepath).catch(() => {});
  }
}

async function getImageMediaId(
  strapi: Core.Strapi,
  seedKey: string,
  displayName: string,
): Promise<number | null> {
  const tmp = await fetchImageToTmp(seedKey);
  if (!tmp) return null;
  return uploadImage(strapi, tmp, displayName);
}

async function seedDirections(strapi: Core.Strapi) {
  const existing = await strapi.entityService.count('api::direction.direction', {});
  if (existing > 0) {
    strapi.log.info(`seed: directions already populated (${existing}), skip`);
    return;
  }
  for (const item of DIRECTIONS) {
    const imageId = await getImageMediaId(strapi, item.picsumSeed, item.title);
    await strapi.entityService.create('api::direction.direction', {
      data: {
        title: item.title,
        description: item.description,
        image: imageId ?? undefined,
        publishedAt: new Date(),
      },
    });
    strapi.log.info(`seed: direction "${item.title}" created`);
  }
}

async function seedEvents(strapi: Core.Strapi) {
  const existing = await strapi.entityService.count('api::event.event', {});
  if (existing > 0) {
    strapi.log.info(`seed: events already populated (${existing}), skip`);
    return;
  }
  for (const item of EVENTS) {
    const imageId = await getImageMediaId(strapi, item.picsumSeed, item.title);
    await strapi.entityService.create('api::event.event', {
      data: {
        title: item.title,
        date: item.date,
        description: item.description,
        photo: imageId ?? undefined,
        isPaid: item.isPaid,
        Price: item.Price ?? undefined,
        paymentUrl: item.paymentUrl ?? undefined,
        type: item.type,
        spotsTotal: item.spotsTotal,
        spotsTaken: item.spotsTaken,
        publishedAt: new Date(),
      },
    });
    strapi.log.info(`seed: event "${item.title}" created`);
  }
}

async function seedProducts(strapi: Core.Strapi) {
  const existing = await strapi.entityService.count('api::product.product', {});
  if (existing > 0) {
    strapi.log.info(`seed: products already populated (${existing}), skip`);
    return;
  }
  for (const item of PRODUCTS) {
    const imageId = await getImageMediaId(strapi, item.picsumSeed, item.title);
    if (!imageId) {
      strapi.log.warn(`seed: product "${item.title}" skipped — no image (image is required)`);
      continue;
    }
    await strapi.entityService.create('api::product.product', {
      data: {
        title: item.title,
        price: item.price,
        category: item.category,
        description: item.description,
        cartUrl: item.cartUrl ?? undefined,
        image: imageId,
        publishedAt: new Date(),
      },
    });
    strapi.log.info(`seed: product "${item.title}" created`);
  }
}

async function seedShowroom(strapi: Core.Strapi) {
  const existing = await strapi.entityService.count('api::showroom.showroom', {});
  if (existing > 0) {
    strapi.log.info(`seed: showroom already populated (${existing}), skip`);
    return;
  }
  const imageId = await getImageMediaId(strapi, 'okkolo-showroom-hero', 'Шоурум Окколо');
  await strapi.entityService.create('api::showroom.showroom', {
    data: {
      heroImage: imageId ?? undefined,
      publishedAt: new Date(),
    },
  });
  strapi.log.info('seed: showroom entry created');
}

export async function runBootstrapSeed(strapi: Core.Strapi) {
  await seedDirections(strapi);
  await seedEvents(strapi);
  await seedProducts(strapi);
  await seedShowroom(strapi);
}
