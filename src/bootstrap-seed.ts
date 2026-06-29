import path from 'node:path';
import os from 'node:os';
import fs from 'node:fs';
import type { Core } from '@strapi/strapi';
import {
  ensureMediaFolders,
  MEDIA_FOLDER_NAMES,
  mediaFolderId,
  productCategoryToFolder,
  type MediaFolderName,
} from './media-folders';

type ProductCategory = 'ceramics' | 'clothing' | 'jewelry' | 'textile';
type EventType = 'музыка' | 'мастер-класс' | 'лекция' | 'стенд-ап';

interface DirectionSeed {
  title: string;
  description: string;
  keywords: string;
  lock: number;
}

interface EventSeed {
  title: string;
  date: string;
  description: string;
  isPaid: boolean;
  price: number | null;
  paymentUrl: string | null;
  type: EventType;
  spotsTotal: number;
  spotsTaken: number;
  keywords: string;
  lock: number;
}

interface ProductSeed {
  title: string;
  price: number;
  category: ProductCategory;
  description: string;
  cartUrl: string | null;
  keywords: string;
  lock: number;
}

type MenuCategory = 'coffee' | 'tea' | 'signature' | 'topping' | 'cold' | 'lemonade';
type MenuSeason = 'main' | 'summer' | 'winter';

interface MenuItemSeed {
  name: string;
  volume?: string;
  price: string;
  note?: string;
  category: MenuCategory;
  season: MenuSeason;
}

const DIRECTIONS: DirectionSeed[] = [
  { title: 'Кофейня', description: 'Вкусный кофе, сезонные сладости и спокойное место, где можно встретиться или поработать.', keywords: 'cafe,coffee', lock: 1001 },
  { title: 'Мастерские', description: 'Живые студии и курсы: керамика, текстиль, ювелирка и графика — рядом с кофейней, в спокойном темпе и с наставниками.', keywords: 'workshop,craft', lock: 1002 },
  { title: 'Шоурум', description: 'Изделия мастерских и небольшие тиражи от местных авторов: керамика, текстиль, украшения и одежда.', keywords: 'showroom,interior', lock: 1003 },
  { title: 'События', description: 'Концерты, мастер-классы и лекции в дружелюбной атмосфере — для всех, кто рядом.', keywords: 'event,concert', lock: 1004 },
];

function dayAt(daysFromNow: number, hours: number, minutes = 0): string {
  const d = new Date();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(hours, minutes, 0, 0);
  return d.toISOString();
}

// 10 дней, по 2-4 события на день, разные типы и темы
const EVENTS: EventSeed[] = [
  // День 1
  { title: 'Вечер живого джаза',                       date: dayAt(1, 19, 0),  description: 'Тёплый вечер с трио из Краснодара: стандарты Эллингтона и пара современных номеров. Бар работает весь вечер.', isPaid: false, price: null, paymentUrl: null, type: 'музыка',       spotsTotal: 40, spotsTaken: 12, keywords: 'jazz,concert',     lock: 2001 },
  { title: 'Утренний фриланс-завтрак',                 date: dayAt(1, 9, 30),  description: 'Открытое утро для тех, кто работает из кафе: розетки, тихий стол и кофе по специальной цене.',                isPaid: false, price: null, paymentUrl: null, type: 'лекция',       spotsTotal: 20, spotsTaken: 7,  keywords: 'coffee,laptop',    lock: 2002 },

  // День 2
  { title: 'Мастер-класс: первая кружка на гончарном круге', date: dayAt(2, 14, 0), description: 'Двухчасовая встреча: центрируем глину, лепим простую кружку. Подходит тем, кто впервые садится за круг.', isPaid: true, price: 2400, paymentUrl: null, type: 'мастер-класс', spotsTotal: 7,  spotsTaken: 4,  keywords: 'pottery,clay',   lock: 2003 },
  { title: 'Лекция: история инклюзивных пространств',  date: dayAt(2, 19, 30), description: 'Куратор «Окколо» рассказывает, как устроены инклюзивные кафе и почему это становится новой нормой.',          isPaid: false, price: null, paymentUrl: null, type: 'лекция',       spotsTotal: 35, spotsTaken: 18, keywords: 'lecture,books',   lock: 2004 },
  { title: 'Стенд-ап вечер: открытый микрофон',        date: dayAt(2, 21, 0),  description: 'Открытый микрофон для местных комиков. 8 выступающих по 7 минут. Хотите выйти — напишите заранее.',           isPaid: true,  price: 500,  paymentUrl: null, type: 'стенд-ап',     spotsTotal: 50, spotsTaken: 22, keywords: 'standup,microphone', lock: 2005 },

  // День 3
  { title: 'Книжный клуб: «Маленький принц»',          date: dayAt(3, 18, 30), description: 'Разбираем главы, делимся впечатлениями, пьём чай. Можно прийти даже если перечитали по диагонали.',           isPaid: false, price: null, paymentUrl: null, type: 'лекция',       spotsTotal: 25, spotsTaken: 8,  keywords: 'book,reading',     lock: 2006 },
  { title: 'Воркшоп по линогравюре',                   date: dayAt(3, 17, 0),  description: 'Два часа практики: эскиз → перенос на линолеум → пробный оттиск. Уносите серию открыток собственной печати.', isPaid: true,  price: 1900, paymentUrl: null, type: 'мастер-класс', spotsTotal: 10, spotsTaken: 3,  keywords: 'print,linocut',    lock: 2007 },

  // День 4
  { title: 'Акустический вечер: песни под гитару',     date: dayAt(4, 19, 0),  description: 'Дуэт гитаристов, кавер-программа и пара авторских песен. Свет приглушённый, можно сидеть на подушках.',     isPaid: false, price: null, paymentUrl: null, type: 'музыка',       spotsTotal: 40, spotsTaken: 17, keywords: 'guitar,acoustic',  lock: 2008 },
  { title: 'Мастер-класс: текстильная аппликация',     date: dayAt(4, 12, 0),  description: 'Делаем небольшое настенное панно из лоскутов: подбор палитры, раскладка, шов через край. Материалы включены.', isPaid: true, price: 1600, paymentUrl: null, type: 'мастер-класс', spotsTotal: 8,  spotsTaken: 5,  keywords: 'fabric,sewing',  lock: 2009 },
  { title: 'Лекция: «Цвет в интерьере»',               date: dayAt(4, 19, 30), description: 'Дизайнер-колорист объясняет, как работает цвет в маленькой квартире и какие сочетания не утомляют глаз.',      isPaid: false, price: null, paymentUrl: null, type: 'лекция',       spotsTotal: 30, spotsTaken: 11, keywords: 'color,interior',   lock: 2010 },

  // День 5
  { title: 'Стенд-ап: премьерная программа гостя',      date: dayAt(5, 20, 0),  description: 'Гастролирующий комик из Москвы привозит первый прогон новой программы. Билеты ограничены.',                   isPaid: true,  price: 1200, paymentUrl: null, type: 'стенд-ап',     spotsTotal: 60, spotsTaken: 41, keywords: 'comedy,standup',   lock: 2011 },
  { title: 'Мастер-класс по ювелирному литью',         date: dayAt(5, 16, 0),  description: 'Делаем восковую модель и отливаем латунный кулон. Финишинг и подгонка — на месте.',                            isPaid: true,  price: 3200, paymentUrl: null, type: 'мастер-класс', spotsTotal: 5,  spotsTaken: 2,  keywords: 'jewelry,silver',   lock: 2012 },

  // День 6
  { title: 'Концерт: фолк-квартет «Стрепет»',          date: dayAt(6, 19, 30), description: 'Краснодарский фолк-квартет: голос, гитара, гадулка и перкуссия. Большая программа на полтора часа.',           isPaid: true,  price: 800,  paymentUrl: null, type: 'музыка',       spotsTotal: 50, spotsTaken: 29, keywords: 'folk,band',        lock: 2013 },
  { title: 'Книжный клуб: «Шум времени»',              date: dayAt(6, 18, 0),  description: 'Обсуждаем роман Барнса о Шостаковиче и эпохе. Без подготовки тоже можно — у нас есть краткое содержание.',     isPaid: false, price: null, paymentUrl: null, type: 'лекция',       spotsTotal: 20, spotsTaken: 9,  keywords: 'book,literature',  lock: 2014 },
  { title: 'Воркшоп: блокнот ручного переплёта',       date: dayAt(6, 13, 0),  description: 'Сшиваем А5-блокнот на нитку и делаем мягкую обложку из крафта. Уносите 80 страниц своих будущих записей.',     isPaid: true,  price: 1400, paymentUrl: null, type: 'мастер-класс', spotsTotal: 10, spotsTaken: 6,  keywords: 'book,binding',     lock: 2015 },

  // День 7
  { title: 'Лекция: «Кофейная карта Краснодара»',      date: dayAt(7, 19, 0),  description: 'Обзор третьей волны от бариста «Окколо»: что пить дома, как читать упаковку, кому доверять обжарку.',          isPaid: false, price: null, paymentUrl: null, type: 'лекция',       spotsTotal: 35, spotsTaken: 14, keywords: 'coffee,espresso',  lock: 2016 },
  { title: 'Открытая студия керамики',                 date: dayAt(7, 15, 0),  description: 'Свободный доступ к кругам и материалам. Наставник рядом, но программу выбираете сами.',                         isPaid: true,  price: 900,  paymentUrl: null, type: 'мастер-класс', spotsTotal: 6,  spotsTaken: 2,  keywords: 'pottery,ceramics', lock: 2017 },

  // День 8
  { title: 'Винил-вечер: соул и фанк 70-х',            date: dayAt(8, 20, 0),  description: 'Резиденты крутят винил, а кухня собирает закусочный сет. Танцпол небольшой, но настоящий.',                    isPaid: false, price: null, paymentUrl: null, type: 'музыка',       spotsTotal: 50, spotsTaken: 23, keywords: 'vinyl,music',      lock: 2018 },
  { title: 'Мастер-класс по батику',                   date: dayAt(8, 12, 0),  description: 'Узелковый и трафаретный батик на хлопке. Уносите готовый шарф или платок.',                                    isPaid: true,  price: 2100, paymentUrl: null, type: 'мастер-класс', spotsTotal: 8,  spotsTaken: 4,  keywords: 'fabric,dye',       lock: 2019 },
  { title: 'Лекция: «Доступная среда для бизнеса»',    date: dayAt(8, 18, 30), description: 'Что считается доступным, как это считать в деньгах и какие ошибки совершают чаще всего при ремонте кафе.',     isPaid: false, price: null, paymentUrl: null, type: 'лекция',       spotsTotal: 40, spotsTaken: 19, keywords: 'lecture,city',     lock: 2020 },

  // День 9
  { title: 'Поэтический вечер: открытый микрофон',     date: dayAt(9, 19, 0),  description: 'Тёплая аудитория, мягкий свет и 5 минут на каждое выступление. Можно слушать, можно читать.',                  isPaid: false, price: null, paymentUrl: null, type: 'лекция',       spotsTotal: 30, spotsTaken: 10, keywords: 'poetry,reading',   lock: 2021 },
  { title: 'Мастер-класс: серьги из латуни',           date: dayAt(9, 16, 0),  description: 'За два с половиной часа собираем пару серёг: эскиз, выпиловка, шлифовка, фурнитура.',                          isPaid: true,  price: 2800, paymentUrl: null, type: 'мастер-класс', spotsTotal: 5,  spotsTaken: 3,  keywords: 'jewelry,brass',    lock: 2022 },
  { title: 'Стенд-ап: женский лайнап',                 date: dayAt(9, 21, 0),  description: 'Четыре комикессы города в одной программе. Темы — городская жизнь, родители, дейтинг и работа.',                isPaid: true,  price: 700,  paymentUrl: null, type: 'стенд-ап',     spotsTotal: 50, spotsTaken: 27, keywords: 'standup,comedy',   lock: 2023 },

  // День 10
  { title: 'Семейное утро с настольными играми',       date: dayAt(10, 11, 0), description: 'Подборка игр для разных возрастов, помощь ведущего и тёплые напитки. Приходите с детьми от 5 лет.',             isPaid: false, price: null, paymentUrl: null, type: 'лекция',       spotsTotal: 24, spotsTaken: 8,  keywords: 'board,games',      lock: 2024 },
  { title: 'Концерт: камерный струнный квартет',       date: dayAt(10, 19, 0), description: 'Часовая программа из барокко и неоклассики. Места — кресла полукругом, как в маленьком зале.',                 isPaid: true,  price: 1500, paymentUrl: null, type: 'музыка',       spotsTotal: 45, spotsTaken: 33, keywords: 'classical,string', lock: 2025 },
  { title: 'Воркшоп по монотипии',                     date: dayAt(10, 15, 0), description: 'Печать с гладкой пластины: один оттиск — одно настроение. Уносите серию из 8–10 листов.',                       isPaid: true,  price: 1700, paymentUrl: null, type: 'мастер-класс', spotsTotal: 10, spotsTaken: 5,  keywords: 'print,art',        lock: 2026 },
];

const PRODUCT_TEMPLATES: Omit<ProductSeed, 'lock'>[] = [
  { title: 'Бусы «Долматинец»',       price: 2100, category: 'jewelry',  description: 'Бусы из натурального камня в спокойной серо-чёрной гамме. Универсальная длина — на каждый день.', cartUrl: null, keywords: 'beads,necklace' },
  { title: 'Ваза ручной работы',      price: 3200, category: 'ceramics', description: 'Керамическая ваза с мягкой матовой глазурью. Каждая чуть отличается по оттенку — это ручная работа.', cartUrl: null, keywords: 'vase,ceramics' },
  { title: 'Льняная салфетка',        price: 890,  category: 'textile',  description: 'Салфетка из натурального льна с обработанным краем. Хорошо переносит стирку и со временем мягче.', cartUrl: null, keywords: 'linen,napkin' },
  { title: 'Сумка-шопер из хлопка',   price: 1500, category: 'clothing', description: 'Плотный хлопковый шопер с длинными ручками. Выдерживает книги, ноутбук и продукты.',           cartUrl: null, keywords: 'bag,cotton' },
  { title: 'Кружка «Окколо»',         price: 1200, category: 'ceramics', description: 'Керамическая кружка на 300 мл с фирменной маркировкой. Удобно ложится в руку.',               cartUrl: null, keywords: 'mug,cup' },
  { title: 'Браслет «Жемчуг»',        price: 1800, category: 'jewelry',  description: 'Тонкий браслет с пресноводным жемчугом и латунной фурнитурой. Регулируемая длина.',           cartUrl: null, keywords: 'bracelet,pearl' },
  { title: 'Дорожка на стол',         price: 2400, category: 'textile',  description: 'Тканая дорожка длиной 140 см в нейтральной палитре. Подходит и под праздничную сервировку.',  cartUrl: null, keywords: 'fabric,table' },
  { title: 'Рубашка льняная',         price: 4500, category: 'clothing', description: 'Свободного кроя, без подкладки. Лён мягко мнётся и держит форму. Размеры S–XL.',              cartUrl: null, keywords: 'shirt,linen' },
  { title: 'Набор мисок',             price: 2800, category: 'ceramics', description: 'Три миски разного диаметра в одной палитре. Подходят для духовки и микроволновки.',          cartUrl: null, keywords: 'bowl,ceramics' },
  { title: 'Серьги «Солнце»',         price: 1650, category: 'jewelry',  description: 'Латунные серьги с лёгкой полировкой. Дужка из медицинской стали — комфортно весь день.',     cartUrl: null, keywords: 'earrings,brass' },
  { title: 'Шарф шерстяной',          price: 2200, category: 'textile',  description: 'Тонкая шерсть мериноса, мягкая бахрома по краям. Размер 30×180 см.',                          cartUrl: null, keywords: 'scarf,wool' },
  { title: 'Тарелка десертная',       price: 1400, category: 'ceramics', description: 'Плоская керамическая тарелка диаметром 18 см с лёгкой деформацией края.',                    cartUrl: null, keywords: 'plate,ceramics' },
  { title: 'Колье на цепочке',        price: 2400, category: 'jewelry',  description: 'Тонкая цепочка с латунной подвеской, длина 50 см. Подходит под футболки и водолазки.',       cartUrl: null, keywords: 'necklace,chain' },
  { title: 'Платок шёлковый',         price: 3100, category: 'textile',  description: 'Натуральный шёлк, ручная роспись горячим батиком. Каждый платок уникален.',                  cartUrl: null, keywords: 'silk,scarf' },
  { title: 'Худи унисекс',            price: 5200, category: 'clothing', description: 'Плотный хлопковый футер, прямой крой, карман-кенгуру. Печать «Окколо» на спине.',            cartUrl: null, keywords: 'hoodie,sweatshirt' },
  { title: 'Подсвечник',              price: 1600, category: 'ceramics', description: 'Керамический подсвечник для свечи-таблетки. Глазурь матовая, под цвет стола.',               cartUrl: null, keywords: 'candle,holder' },
  { title: 'Платье льняное',          price: 5800, category: 'clothing', description: 'Прямого силуэта с боковыми разрезами. Размер регулируется поясом, длина миди.',              cartUrl: null, keywords: 'dress,linen' },
  { title: 'Кольцо «Капля»',          price: 2300, category: 'jewelry',  description: 'Тонкое латунное кольцо с минималистичной каплевидной формой. Размеры 16–19.',                cartUrl: null, keywords: 'ring,minimal' },
  { title: 'Скатерть «Дюна»',         price: 3700, category: 'textile',  description: 'Полульняная скатерть 140×200 см с лёгкой фактурой полотна. Песочный оттенок.',               cartUrl: null, keywords: 'tablecloth,linen' },
  { title: 'Тарелка для пасты',       price: 1900, category: 'ceramics', description: 'Глубокая тарелка с расширенным краем. Стильно смотрится с любыми соусами.',                 cartUrl: null, keywords: 'plate,pasta' },
  { title: 'Футболка хлопковая',      price: 2400, category: 'clothing', description: 'Базовая футболка из плотного хлопка. Прямой крой, оверсайз посадка.',                       cartUrl: null, keywords: 'tshirt,cotton' },
  { title: 'Подушка декоративная',    price: 2100, category: 'textile',  description: 'Чехол из плотного хлопка 45×45 см. Внутренник из микрофибры в комплекте.',                   cartUrl: null, keywords: 'pillow,cushion' },
  { title: 'Чайник заварочный',       price: 4200, category: 'ceramics', description: 'Объём 600 мл, со встроенным керамическим ситом. Удобный носик не капает.',                  cartUrl: null, keywords: 'teapot,tea' },
  { title: 'Серьги-гвоздики',         price: 1300, category: 'jewelry',  description: 'Латунные гвоздики геометрической формы. Лёгкие, незаметные в ушах.',                        cartUrl: null, keywords: 'earrings,studs' },
  { title: 'Сумка через плечо',       price: 3400, category: 'clothing', description: 'Льняной кросс-боди с регулируемым ремнём и внутренним кармашком на молнии.',                cartUrl: null, keywords: 'bag,crossbody' },
  { title: 'Полотенце вафельное',     price: 1100, category: 'textile',  description: 'Хлопковое вафельное полотенце 50×70 см. Быстро сохнет, не пушится.',                        cartUrl: null, keywords: 'towel,kitchen' },
  { title: 'Кашпо керамическое',      price: 2700, category: 'ceramics', description: 'Подходит для горшков диаметром до 14 см. Дренажные отверстия и поддон в комплекте.',         cartUrl: null, keywords: 'planter,plant' },
  { title: 'Брошь «Лист»',            price: 1750, category: 'jewelry',  description: 'Латунная брошь в форме листа, ручная гравировка прожилок.',                                  cartUrl: null, keywords: 'brooch,nature' },
  { title: 'Юбка миди',               price: 4900, category: 'clothing', description: 'Юбка-полусолнце из плотного льна. Высокая посадка, потайная молния.',                       cartUrl: null, keywords: 'skirt,linen' },
  { title: 'Чехол для ноутбука',      price: 2900, category: 'textile',  description: 'Тканый чехол для 13–14" ноутбука. Мягкий ворс внутри, магнитный клапан снаружи.',           cartUrl: null, keywords: 'laptop,case' },
  { title: 'Кружка-эспрессо',         price: 950,  category: 'ceramics', description: 'Маленькая чашка на 70 мл с блюдцем. Подходит под двойной эспрессо.',                       cartUrl: null, keywords: 'espresso,cup' },
  { title: 'Серьги-кольца',           price: 1450, category: 'jewelry',  description: 'Латунные кольца-серьги диаметром 25 мм. Лёгкий объём, не оттягивают мочку.',                cartUrl: null, keywords: 'earrings,hoops' },
];

const PRODUCTS: ProductSeed[] = PRODUCT_TEMPLATES.map((p, i) => ({ ...p, lock: 3000 + i }));

// Категории шоурума (справочник). slug совпадает с ProductSeed.category.
const CATEGORY_SEED: { slug: ProductCategory; name: string; order: number }[] = [
  { slug: 'ceramics', name: 'Керамика', order: 1 },
  { slug: 'jewelry', name: 'Бижутерия', order: 2 },
  { slug: 'clothing', name: 'Одежда', order: 3 },
  { slug: 'textile', name: 'Текстиль', order: 4 },
];

// Типы мероприятий (справочник). name совпадает с EventSeed.type (по нему линкуем).
const EVENT_TYPE_SEED: { slug: string; name: EventType; order: number }[] = [
  { slug: 'music', name: 'музыка', order: 1 },
  { slug: 'master-class', name: 'мастер-класс', order: 2 },
  { slug: 'lecture', name: 'лекция', order: 3 },
  { slug: 'standup', name: 'стенд-ап', order: 4 },
];

/**
 * Меню кофейни. При первом запуске сидим как одно общее меню (season + category),
 * чтобы заказчица могла прямо в админке убирать/добавлять позиции без программиста.
 * Данные продублированы из okkolo-mobile/src/data/cafe.ts — это разовый импорт.
 */
const MENU_ITEMS: MenuItemSeed[] = [
  { name: 'Эспрессо', price: '130 ₽', category: 'coffee', season: 'main' },
  { name: 'Американо', price: '130 ₽', category: 'coffee', season: 'main' },
  { name: 'Флэт уайт', volume: '0,2', price: '200 ₽', category: 'coffee', season: 'main' },
  { name: 'Капучино', volume: '0,2 / 0,3', price: '200 / 220 ₽', category: 'coffee', season: 'main' },
  { name: 'Латте', volume: '0,3', price: '200 ₽', category: 'coffee', season: 'main' },
  { name: 'Раф', volume: '0,2 / 0,3', price: '230 / 260 ₽', category: 'coffee', season: 'main' },
  { name: 'Какао', volume: '0,3', price: '220 ₽', category: 'coffee', season: 'main' },
  { name: 'Черный чай', price: '140 ₽', category: 'tea', season: 'main' },
  { name: 'Зеленый чай', price: '140 ₽', category: 'tea', season: 'main' },
  { name: 'Черный чай с чабрецом', price: '150 ₽', category: 'tea', season: 'main' },
  { name: 'Зеленый чай с жасмином', price: '150 ₽', category: 'tea', season: 'main' },
  { name: 'Манговый улун', price: '150 ₽', category: 'tea', season: 'main' },
  { name: 'Пряная груша', price: '280 ₽', category: 'tea', season: 'main' },
  { name: 'Раф Баунти', volume: '0,2', price: '280 ₽', category: 'signature', season: 'main' },
  { name: 'Латте Халва', volume: '0,3', price: '280 ₽', category: 'signature', season: 'main' },
  { name: 'Маршмэллоу', price: '30 ₽', category: 'topping', season: 'main' },
  { name: 'Сироп', price: '30 ₽', category: 'topping', season: 'main' },

  { name: 'Айс-латте', note: 'молоко, эспрессо, лед', price: '220 ₽', category: 'cold', season: 'summer' },
  { name: 'Айс-матча', note: 'молоко, матча, лед', price: '240 ₽', category: 'cold', season: 'summer' },
  { name: 'Айс-арахисовый капучино', note: 'молоко, эспрессо, арахисовая заготовка, лед', price: '280 ₽', category: 'cold', season: 'summer' },
  { name: 'Айс-латте «Банановое мороженое»', note: 'молоко, эспрессо, заготовка, лед', price: '280 ₽', category: 'cold', season: 'summer' },
  { name: 'Бамбл', note: 'сок, эспрессо, лед; по желанию — сироп карамель', price: '250 ₽', category: 'cold', season: 'summer' },
  { name: 'Бамбл-матча', note: 'сок, матча, лед; по желанию — сироп карамель', price: '250 ₽', category: 'cold', season: 'summer' },
  { name: 'Киви — мята — виноград', price: '280 ₽', category: 'lemonade', season: 'summer' },
  { name: 'Арбуз — дыня', price: '280 ₽', category: 'lemonade', season: 'summer' },
  { name: 'Малина — имбирь', price: '280 ₽', category: 'lemonade', season: 'summer' },
];

/**
 * Локальные исходники постеров меню. В seed используем именно файлы — они уже
 * лежат в репо фронта и совпадают по содержанию с альтами в data/cafe.ts.
 *
 * Путь строим от process.cwd(), потому что Strapi всегда запускается из корня
 * okkolo-cms/, и репо фронта живёт рядом — в `../okkolo-mobile/`.
 */
function menuPosterPath(filename: string): string {
  return path.resolve(process.cwd(), '..', 'okkolo-mobile', 'src', 'assets', 'images', filename);
}

const MENU_POSTER_SOURCES = [
  {
    label: 'main',
    path: menuPosterPath('menu_photo_1.jpg'),
    alt: 'Печатное меню кофейни «Окколо»: кофе, чай, авторские напитки и топинги. Текстовая версия — под фотографией.',
    displayName: 'Меню кофейни «Окколо» — основное',
  },
  {
    label: 'summer',
    path: menuPosterPath('menu_photo_2.jpg'),
    alt: 'Печатное летнее меню кофейни «Окколо»: холодные кофейные напитки, матча и лимонады. Текстовая версия — под фотографией.',
    displayName: 'Меню кофейни «Окколо» — летнее',
  },
] as const;

const CAFE_MENU_FOOTNOTE = 'Дополнительно: альтернативное молоко +50/70 ₽.';

async function fetchImageToTmp(keywords: string, lock: number, w = 1200, h = 900): Promise<string | null> {
  // loremflickr.com отдаёт реальные фото по ключевым словам; lock даёт детерминированный кадр
  const url = `https://loremflickr.com/${w}/${h}/${encodeURIComponent(keywords)}?lock=${lock}`;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await fetch(url, { redirect: 'follow', signal: AbortSignal.timeout(15000) });
      if (!res.ok) continue;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length < 1024) continue; // защита от пустых/ошибочных ответов
      const filepath = path.join(os.tmpdir(), `seed-${lock}-${Date.now()}.jpg`);
      await fs.promises.writeFile(filepath, buf);
      return filepath;
    } catch {
      // retry
    }
  }
  return null;
}

async function uploadImage(
  strapi: Core.Strapi,
  filepath: string,
  displayName: string,
  folderId?: number,
): Promise<number | null> {
  try {
    const stat = await fs.promises.stat(filepath);
    const uploaded = await strapi.plugin('upload').service('upload').upload({
      data: {
        fileInfo: {
          name: displayName,
          alternativeText: displayName,
          ...(folderId ? { folder: folderId } : {}),
        },
      },
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

/**
 * Загружает уже существующий локальный файл (без копирования и удаления оригинала).
 * Нужна для seed-а постеров меню, исходники которых лежат в репо фронта.
 */
async function uploadLocalImage(
  strapi: Core.Strapi,
  filepath: string,
  displayName: string,
  alt: string,
  folderId?: number,
): Promise<number | null> {
  try {
    const stat = await fs.promises.stat(filepath);
    const uploaded = await strapi.plugin('upload').service('upload').upload({
      data: {
        fileInfo: {
          name: displayName,
          alternativeText: alt,
          ...(folderId ? { folder: folderId } : {}),
        },
      },
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
    strapi.log.warn(`seed: local upload failed for ${displayName}: ${(err as Error).message}`);
    return null;
  }
}

async function getImageMediaId(
  strapi: Core.Strapi,
  keywords: string,
  lock: number,
  displayName: string,
  folderId?: number,
): Promise<number | null> {
  const tmp = await fetchImageToTmp(keywords, lock);
  if (!tmp) {
    strapi.log.warn(`seed: image fetch failed for ${displayName} (loremflickr ${keywords} lock=${lock})`);
    return null;
  }
  return uploadImage(strapi, tmp, displayName, folderId);
}

async function clearCollection(strapi: Core.Strapi, uid: any, label: string) {
  const items = await strapi.entityService.findMany(uid, { fields: ['id'] } as any) as Array<{ id: number }>;
  for (const item of items) {
    await strapi.entityService.delete(uid, item.id);
  }
  strapi.log.info(`seed: cleared ${items.length} ${label}`);
}

async function seedDirections(strapi: Core.Strapi, folders: Map<MediaFolderName, number>) {
  const existing = await strapi.entityService.count('api::direction.direction', {});
  if (existing > 0) {
    strapi.log.info(`seed: directions already populated (${existing}), skip`);
    return;
  }
  const folderId = mediaFolderId(folders, MEDIA_FOLDER_NAMES.NAPRAVLENIYA);
  for (const item of DIRECTIONS) {
    const imageId = await getImageMediaId(strapi, item.keywords, item.lock, item.title, folderId);
    await strapi.entityService.create('api::direction.direction', {
      data: {
        title: item.title,
        description: item.description,
        image: imageId ?? undefined,
        publishedAt: new Date(),
      },
    });
    strapi.log.info(`seed: direction "${item.title}" created (img=${imageId ?? 'none'})`);
  }
}

async function seedEventTypes(strapi: Core.Strapi) {
  const existing = await strapi.entityService.count('api::event-type.event-type', {});
  if (existing > 0) {
    strapi.log.info(`seed: event types already populated (${existing}), skip`);
    return;
  }
  for (const item of EVENT_TYPE_SEED) {
    await strapi.entityService.create('api::event-type.event-type', {
      data: { name: item.name, slug: item.slug, order: item.order, publishedAt: new Date() },
    });
    strapi.log.info(`seed: event-type "${item.name}" created`);
  }
}

async function getEventTypeMap(strapi: Core.Strapi): Promise<Map<string, number>> {
  const types = (await strapi.entityService.findMany('api::event-type.event-type', {
    fields: ['id', 'name'],
  } as any)) as Array<{ id: number; name: string }>;
  return new Map(types.map((t) => [t.name, t.id]));
}

async function seedEvents(strapi: Core.Strapi, folders: Map<MediaFolderName, number>) {
  const existing = await strapi.entityService.count('api::event.event', {});
  if (existing > 0) {
    strapi.log.info(`seed: events already populated (${existing}), skip`);
    return;
  }
  const folderId = mediaFolderId(folders, MEDIA_FOLDER_NAMES.MEROPRIYATIYA);
  const typeMap = await getEventTypeMap(strapi);
  for (const item of EVENTS) {
    const imageId = await getImageMediaId(strapi, item.keywords, item.lock, item.title, folderId);
    const typeId = typeMap.get(item.type);
    if (!typeId) {
      strapi.log.warn(`seed: event "${item.title}" — type "${item.type}" not found in CMS`);
    }
    await strapi.entityService.create('api::event.event', {
      data: {
        title: item.title,
        date: item.date,
        description: item.description,
        photo: imageId ?? undefined,
        isPaid: item.isPaid,
        price: item.price ?? undefined,
        paymentUrl: item.paymentUrl ?? undefined,
        type: typeId ?? undefined,
        spotsTotal: item.spotsTotal,
        spotsTaken: item.spotsTaken,
        publishedAt: new Date(),
      },
    });
    strapi.log.info(`seed: event "${item.title}" created (img=${imageId ?? 'none'}, type=${typeId ?? 'none'})`);
  }
}

async function seedCategories(strapi: Core.Strapi) {
  const existing = await strapi.entityService.count('api::category.category', {});
  if (existing > 0) {
    strapi.log.info(`seed: categories already populated (${existing}), skip`);
    return;
  }
  for (const item of CATEGORY_SEED) {
    await strapi.entityService.create('api::category.category', {
      data: { name: item.name, slug: item.slug, order: item.order, publishedAt: new Date() },
    });
    strapi.log.info(`seed: category "${item.name}" created`);
  }
}

async function getCategoryMap(strapi: Core.Strapi): Promise<Map<string, number>> {
  const cats = (await strapi.entityService.findMany('api::category.category', {
    fields: ['id', 'slug'],
  } as any)) as Array<{ id: number; slug: string }>;
  return new Map(cats.map((c) => [c.slug, c.id]));
}

async function seedProducts(strapi: Core.Strapi, folders: Map<MediaFolderName, number>) {
  const existing = await strapi.entityService.count('api::product.product', {});
  if (existing > 0) {
    strapi.log.info(`seed: products already populated (${existing}), skip`);
    return;
  }
  const categoryMap = await getCategoryMap(strapi);
  let created = 0;
  let skipped = 0;
  for (const item of PRODUCTS) {
    const folderId = mediaFolderId(folders, productCategoryToFolder(item.category));
    const imageId = await getImageMediaId(strapi, item.keywords, item.lock, item.title, folderId);
    if (!imageId) {
      strapi.log.warn(`seed: product "${item.title}" skipped — no image (image is required)`);
      skipped += 1;
      continue;
    }
    const categoryId = categoryMap.get(item.category);
    if (!categoryId) {
      strapi.log.warn(`seed: product "${item.title}" — category "${item.category}" not found in CMS`);
    }
    await strapi.entityService.create('api::product.product', {
      data: {
        title: item.title,
        price: item.price,
        category: categoryId ?? undefined,
        description: item.description,
        cartUrl: item.cartUrl ?? undefined,
        image: imageId,
        publishedAt: new Date(),
      },
    });
    created += 1;
    strapi.log.info(`seed: product "${item.title}" created (img=${imageId}, cat=${categoryId ?? 'none'})`);
  }
  strapi.log.info(`seed: products done — created=${created}, skipped=${skipped}`);
}

async function seedMenuItems(strapi: Core.Strapi) {
  const existing = await strapi.entityService.count('api::menu-item.menu-item', {});
  if (existing > 0) {
    strapi.log.info(`seed: menu items already populated (${existing}), skip`);
    return;
  }
  let order = 0;
  for (const item of MENU_ITEMS) {
    await strapi.entityService.create('api::menu-item.menu-item', {
      data: {
        name: item.name,
        volume: item.volume ?? undefined,
        price: item.price,
        note: item.note ?? undefined,
        category: item.category,
        season: item.season,
        order: order++,
        publishedAt: new Date(),
      },
    });
    strapi.log.info(`seed: menu-item "${item.name}" (${item.category}/${item.season}) created`);
  }
}

async function seedCafeMenuPage(strapi: Core.Strapi, folders: Map<MediaFolderName, number>) {
  /* count работает и для Single Type — вернёт 0 или 1. */
  const existing = await strapi.entityService.count('api::cafe-menu-page.cafe-menu-page', {});
  if (existing > 0) {
    strapi.log.info('seed: cafe-menu-page already populated, skip');
    return;
  }

  const [main, summer] = MENU_POSTER_SOURCES;
  const folderId = mediaFolderId(folders, MEDIA_FOLDER_NAMES.KOFejNYA);

  let mainId: number | null = null;
  if (fs.existsSync(main.path)) {
    mainId = await uploadLocalImage(strapi, main.path, main.displayName, main.alt, folderId);
  } else {
    strapi.log.warn(`seed: cafe menu poster "${main.path}" not found, leaving empty`);
  }

  let summerId: number | null = null;
  if (fs.existsSync(summer.path)) {
    summerId = await uploadLocalImage(strapi, summer.path, summer.displayName, summer.alt, folderId);
  } else {
    strapi.log.warn(`seed: cafe menu poster "${summer.path}" not found, leaving empty`);
  }

  await strapi.entityService.create('api::cafe-menu-page.cafe-menu-page', {
    data: {
      mainPosterImage: mainId ?? undefined,
      mainPosterAlt: main.alt,
      summerPosterImage: summerId ?? undefined,
      summerPosterAlt: summer.alt,
      footnote: CAFE_MENU_FOOTNOTE,
      publishedAt: new Date(),
    },
  });
  strapi.log.info(
    `seed: cafe-menu-page created (main=${mainId ?? 'none'}, summer=${summerId ?? 'none'})`,
  );
}

async function seedShowroom(strapi: Core.Strapi, folders: Map<MediaFolderName, number>) {
  const existing = await strapi.entityService.count('api::showroom.showroom', {});
  if (existing > 0) {
    strapi.log.info(`seed: showroom already populated (${existing}), skip`);
    return;
  }
  const folderId = mediaFolderId(folders, MEDIA_FOLDER_NAMES.SAJT_STATIK);
  const imageId = await getImageMediaId(strapi, 'showroom,interior', 4001, 'Шоурум Окколо', folderId);
  await strapi.entityService.create('api::showroom.showroom', {
    data: {
      heroImage: imageId ?? undefined,
      publishedAt: new Date(),
    },
  });
  strapi.log.info(`seed: showroom entry created (img=${imageId ?? 'none'})`);
}

export async function runBootstrapSeed(strapi: Core.Strapi) {
  if (process.env.SEED_FORCE === 'true') {
    strapi.log.warn('seed: SEED_FORCE=true — wiping directions/events/products/showroom/menu before reseed');
    await clearCollection(strapi, 'api::direction.direction', 'directions');
    await clearCollection(strapi, 'api::event.event', 'events');
    // типы мероприятий чистим ПОСЛЕ мероприятий — события на них ссылаются (FK)
    await clearCollection(strapi, 'api::event-type.event-type', 'event-types');
    await clearCollection(strapi, 'api::product.product', 'products');
    // категории чистим ПОСЛЕ товаров — товары на них ссылаются (FK)
    await clearCollection(strapi, 'api::category.category', 'categories');
    await clearCollection(strapi, 'api::showroom.showroom', 'showroom');
    await clearCollection(strapi, 'api::menu-item.menu-item', 'menu-items');
  }
  const folders = await ensureMediaFolders(strapi);

  await seedDirections(strapi, folders);
  await seedEventTypes(strapi);
  await seedEvents(strapi, folders);
  await seedCategories(strapi);
  await seedProducts(strapi, folders);
  await seedShowroom(strapi, folders);
  await seedMenuItems(strapi);
  await seedCafeMenuPage(strapi, folders);
}
