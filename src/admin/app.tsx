import type { StrapiApp } from '@strapi/strapi/admin';

export default {
  config: {
    locales: ['ru'],
    translations: {
      ru: {
        'app.components.LeftMenu.navbrand.title': 'Окколо',
        'app.components.LeftMenu.navbrand.workplace': 'Панель управления',
      },
    },
  },
  register(app: StrapiApp) {
    // Кастомное поле «Категория» с подсказками (см. ./components/CategoryNameInput).
    // Имя и тип обязаны совпадать с серверной регистрацией в src/index.ts → global::category-name.
    app.customFields.register({
      name: 'category-name',
      type: 'string',
      intlLabel: { id: 'okkolo.category-name.label', defaultMessage: 'Категория (с подсказками)' },
      intlDescription: {
        id: 'okkolo.category-name.description',
        defaultMessage: 'Подсказывает похожие категории и позволяет добавить новую.',
      },
      components: {
        Input: async () => import('./components/CategoryNameInput'),
      },
    });
    // Кастомное поле «Тип мероприятия» с подсказками (см. ./components/EventTypeNameInput).
    // Имя/тип совпадают с серверной регистрацией в src/index.ts → global::event-type-name.
    app.customFields.register({
      name: 'event-type-name',
      type: 'string',
      intlLabel: { id: 'okkolo.event-type-name.label', defaultMessage: 'Тип мероприятия (с подсказками)' },
      intlDescription: {
        id: 'okkolo.event-type-name.description',
        defaultMessage: 'Подсказывает похожие типы и позволяет добавить новый.',
      },
      components: {
        Input: async () => import('./components/EventTypeNameInput'),
      },
    });
  },
  bootstrap(_app: StrapiApp) {},
};
