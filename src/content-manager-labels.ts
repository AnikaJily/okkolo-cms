type FieldLabels = {
  edit: { label: string; description?: string; placeholder?: string };
  list: { label: string };
};

type ContentTypeLabels = Record<string, FieldLabels>;

function ru(label: string, description?: string, placeholder?: string): FieldLabels {
  return {
    edit: {
      label,
      ...(description ? { description } : {}),
      ...(placeholder ? { placeholder } : {}),
    },
    list: { label },
  };
}

/** Общие системные поля Strapi */
export const SYSTEM_FIELD_LABELS: ContentTypeLabels = {
  createdAt: ru('Создано'),
  updatedAt: ru('Обновлено'),
  publishedAt: ru('Дата публикации'),
  createdBy: ru('Автор'),
  updatedBy: ru('Кто обновил'),
  locale: ru('Локаль'),
};

/**
 * Русские подписи полей Content Manager.
 * API-имена атрибутов не меняем — только labels для редакторов.
 */
export const CONTENT_MANAGER_LABELS: Record<string, ContentTypeLabels> = {
  'api::direction.direction': {
    title: ru('Заголовок'),
    description: ru('Описание'),
    href: ru('Ссылка', 'Куда ведёт карточка. Например: /cafe, /workshops, /showroom, /events.'),
    image: ru('Изображение'),
  },
  'api::event.event': {
    title: ru('Заголовок'),
    slug: ru('URL (slug)', 'Используется в адресе: /events/<slug>. Заполняется из заголовка.'),
    date: ru('Дата и время'),
    photo: ru('Обложка'),
    gallery: ru(
      'Галерея',
      'Дополнительные фото для слайдера. Первое фото дублирует обложку (photo).',
    ),
    description: ru('Описание'),
    isPaid: ru('Платное мероприятие'),
    price: ru('Цена', 'Сумма в рублях, если мероприятие платное.'),
    paymentUrl: ru('Ссылка на оплату'),
    typeName: ru(
      'Тип',
      'Начните вводить — покажем похожие типы. Выберите из списка или добавьте новый.',
      'Например: Лекция',
    ),
    type: ru(
      'Тип (связь)',
      'Заполняется автоматически из поля «Тип». Менять вручную не нужно.',
    ),
    spotsTotal: ru('Всего мест'),
    spotsTaken: ru('Занято мест'),
    registrations: ru('Регистрации', 'Заявки на это мероприятие. Заполняется автоматически.'),
  },
  'api::event-type.event-type': {
    name: ru('Название', 'Напр. «Лекция».'),
    slug: ru('Ключ (slug)', 'Ключ для фильтра/URL. Создаётся из названия, уникален.'),
    order: ru('Порядок', 'Меньше число — раньше в списке.'),
    events: ru('Мероприятия', 'Мероприятия этого типа. Заполняется автоматически.'),
  },
  'api::event-registration.event-registration': {
    eventTitle: ru('Название мероприятия'),
    name: ru('Имя'),
    phone: ru('Телефон'),
    email: ru('Email'),
    comment: ru('Комментарий'),
    eventId: ru('ID мероприятия', 'Технический ключ (slug/documentId). Хранится как история.'),
    event: ru('Мероприятие (связь)', 'Привязывается автоматически по ID. Менять вручную не нужно.'),
    paymentStatus: ru(
      'Статус оплаты',
      'pending — ждёт оплаты, not_required — оплата не нужна, paid — оплачено.',
    ),
  },
  'api::product.product': {
    title: ru('Название'),
    price: ru('Цена', 'Сумма в рублях.'),
    categoryName: ru(
      'Категория',
      'Начните вводить — покажем похожие категории. Выберите из списка или добавьте новую.',
      'Например: Свечи',
    ),
    category: ru(
      'Категория (связь)',
      'Заполняется автоматически из поля «Категория». Менять вручную не нужно.',
    ),
    image: ru('Фото'),
    cartUrl: ru('Ссылка «Купить»', 'Если пусто — товар добавляется в корзину на сайте.'),
    description: ru('Описание'),
    gallery: ru('Галерея'),
    isAvailable: ru(
      'В наличии',
      'Снимите галочку, чтобы временно скрыть товар с сайта.',
    ),
  },
  'api::category.category': {
    name: ru('Название', 'Напр. «Керамика».'),
    slug: ru('Ключ (slug)', 'Ключ для фильтра/URL. Создаётся из названия, уникален.'),
    order: ru('Порядок', 'Меньше число — левее в фильтрах.'),
    products: ru('Товары', 'Товары этой категории. Заполняется автоматически.'),
  },
  'api::showroom.showroom': {
    heroImage: ru('Hero-фото страницы шоурума'),
  },
  'api::order.order': {
    customerName: ru('Имя клиента'),
    phone: ru('Телефон'),
    email: ru('Email'),
    itemsSubtotal: ru('Сумма товаров', 'В рублях, без доставки.'),
    deliveryPrice: ru('Стоимость доставки', 'В рублях. 0 — самовывоз.'),
    totalPrice: ru('Итого', 'В рублях, с доставкой.'),
    items: ru('Состав заказа', 'JSON: товары, количество и цены.'),
    orderStatus: ru('Статус заказа', 'pending — новый, completed — обработан.'),
    fulfillmentType: ru('Способ получения', 'pickup — самовывоз, delivery — доставка.'),
    city: ru('Город'),
    address: ru('Адрес'),
    deliveryComment: ru('Комментарий к доставке'),
  },
  'api::workshop-application.workshop-application': {
    name: ru('Имя'),
    contactMethod: ru(
      'Способ связи',
      'phone — звонок, email — письмо. Значения в списке технические, не менять.',
    ),
    phone: ru('Телефон'),
    email: ru('Email'),
    status: ru(
      'Статус',
      'pending — новая, contacted — связались, rejected — отклонена.',
    ),
  },
  'api::workshop-program.workshop-program': {
    title: ru('Название'),
    description: ru('Описание'),
    image: ru('Фото'),
    order: ru('Порядок', 'Меньше число — выше в списке.'),
  },
  'api::workshops-page.workshops-page': {
    intro: ru('Вступление', 'Текст под заголовком «Мастерские».'),
    audienceText: ru('Кому подходят', 'Блок «Кому подходят мастерские».'),
    audienceNote: ru('Плашка «Важно»', 'Текст в жёлтой плашке.'),
    afterIntro: ru('После обучения', 'Вводный текст блока «Что будет после обучения».'),
    audiencePhoto: ru('Фото — аудитория'),
    audiencePhotoAlt: ru('Alt для фото аудитории'),
    afterLearningPhoto: ru('Фото — после обучения'),
    afterLearningPhotoAlt: ru('Alt для фото после обучения'),
  },
  'api::about-page.about-page': {
    eyebrow: ru('Надзаголовок'),
    title: ru('Заголовок'),
    lead: ru('Лид'),
    tagline: ru('Слоган'),
    heroPhoto: ru('Hero-фото'),
    heroPhotoAlt: ru('Alt для hero-фото'),
  },
  'api::about-team-photo.about-team-photo': {
    image: ru('Фото'),
    name: ru('Имя'),
    role: ru('Должность', 'Напр. «бариста». Необязательно.'),
    order: ru('Порядок'),
  },
  'api::about-workplace-photo.about-workplace-photo': {
    image: ru('Фото'),
    alt: ru('Alt-текст', 'Описание для скринридеров.'),
    order: ru('Порядок'),
  },
  'api::accessibility-page.accessibility-page': {
    title: ru('Заголовок'),
    lead: ru('Лид'),
    heroPhoto: ru('Hero-фото'),
    heroPhotoAlt: ru('Alt для hero-фото'),
  },
  'api::menu-item.menu-item': {
    name: ru('Название'),
    volume: ru('Объём', 'Например: 0,2 или 0,2 / 0,3'),
    price: ru('Цена', 'Строкой: «200 / 220 ₽».'),
    note: ru('Примечание', 'Состав или комментарий.'),
    category: ru(
      'Раздел меню',
      'coffee — кофе, tea — чай, signature — авторские, topping — топинги, cold — холодные, lemonade — лимонады.',
    ),
    season: ru('Сезон', 'main — основное, summer — летнее, winter — зимнее.'),
    order: ru('Порядок', 'Проставляется автоматически (в конец раздела); можно поменять вручную — меньше выше.'),
  },
  'api::cafe-menu-page.cafe-menu-page': {
    mainPosterImage: ru('Постер основного меню'),
    mainPosterAlt: ru('Alt основного постера'),
    summerPosterImage: ru('Постер летнего меню'),
    summerPosterAlt: ru('Alt летнего постера'),
    footnote: ru('Сноска', 'Текст под обоими меню.'),
  },
  'api::annual-report.annual-report': {
    year: ru('Год'),
    kind: ru(
      'Тип отчёта',
      'content — содержательный, finance — финансовый, nko-activity — деятельность НКО, spending — расходование средств.',
    ),
    pdf: ru('PDF-файл'),
    note: ru('Примечание'),
  },
  'api::legal-document.legal-document': {
    title: ru('Название', 'Как показано на сайте, например «Устав фонда».'),
    category: ru(
      'Категория',
      'requisites — реквизиты, foundation — учредительные, privacy — персональные данные.',
    ),
    pdf: ru('PDF-файл'),
    order: ru('Порядок', 'Меньше — выше в категории.'),
  },
};
