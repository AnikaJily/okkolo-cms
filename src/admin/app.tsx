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
  bootstrap(_app: StrapiApp) {},
};
