import type { Core } from '@strapi/strapi';
import { applyRussianContentManagerLabels } from './apply-content-manager-labels';
import { registerTextToRelationAutolink } from './autolink-text-to-relation';
import { registerEventRegistrationLink } from './event-registration-link';
import { registerMenuItemAutoOrder } from './menu-item-auto-order';
import { runBootstrapSeed } from './bootstrap-seed';
import { organizeMediaFolders } from './media-folders';

const PUBLIC_READ_UIDS = [
  'api::direction.direction',
  'api::event.event',
  'api::event-type.event-type',
  'api::product.product',
  'api::category.category',
  'api::showroom.showroom',
  'api::cafe-menu-page.cafe-menu-page',
  'api::menu-item.menu-item',
  'api::annual-report.annual-report',
  'api::legal-document.legal-document',
  'api::workshops-page.workshops-page',
  'api::workshop-program.workshop-program',
  'api::about-page.about-page',
  'api::about-workplace-photo.about-workplace-photo',
  'api::about-team-photo.about-team-photo',
  'api::accessibility-page.accessibility-page',
];

const PUBLIC_CREATE_UIDS: string[] = [
  'api::event-registration.event-registration',
  'api::workshop-application.workshop-application',
  'api::order.order',
];

async function ensurePublicPermissions(strapi: Core.Strapi) {
  const publicRole = await strapi
    .query('plugin::users-permissions.role')
    .findOne({ where: { type: 'public' } });
  if (!publicRole) return;

  const wanted: { action: string; role: number }[] = [];
  for (const uid of PUBLIC_READ_UIDS) {
    wanted.push({ action: `${uid}.find`, role: publicRole.id });
    wanted.push({ action: `${uid}.findOne`, role: publicRole.id });
  }
  for (const uid of PUBLIC_CREATE_UIDS) {
    wanted.push({ action: `${uid}.create`, role: publicRole.id });
  }

  for (const perm of wanted) {
    const existing = await strapi
      .query('plugin::users-permissions.permission')
      .findOne({ where: perm });
    if (!existing) {
      await strapi.query('plugin::users-permissions.permission').create({ data: perm });
    }
  }
}

export default {
  register({ strapi }: { strapi: Core.Strapi }) {
    // Кастомные поля-автокомплиты «… с подсказками». Имена/типы обязаны совпадать
    // с admin-регистрацией в src/admin/app.tsx → uid global::category-name и global::event-type-name.
    strapi.customFields.register({ name: 'category-name', type: 'string' });
    strapi.customFields.register({ name: 'event-type-name', type: 'string' });

    // ввод справочного значения текстом → авто-создание/привязка связи на сохранении
    registerTextToRelationAutolink(strapi, {
      uid: 'api::product.product',
      textField: 'categoryName',
      relationField: 'category',
      targetUid: 'api::category.category',
    });
    registerTextToRelationAutolink(strapi, {
      uid: 'api::event.event',
      textField: 'typeName',
      relationField: 'type',
      targetUid: 'api::event-type.event-type',
    });

    // дожать связь заявки с мероприятием по eventId (slug); см. event-registration-link.ts
    registerEventRegistrationLink(strapi);

    // автопорядок позиций меню (новая позиция — в конец своей группы); см. menu-item-auto-order.ts
    registerMenuItemAutoOrder(strapi);
  },

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      await ensurePublicPermissions(strapi);
    } catch (err) {
      strapi.log.error('bootstrap: failed to ensure public permissions', err);
    }

    if (process.env.APPLY_RU_LABELS !== 'false') {
      try {
        await applyRussianContentManagerLabels(strapi);
      } catch (err) {
        strapi.log.error('bootstrap: failed to apply Russian content-manager labels', err);
      }
    }

    if (process.env.SEED_ON_BOOT !== 'false') {
      try {
        await runBootstrapSeed(strapi);
      } catch (err) {
        strapi.log.error('bootstrap: seed failed', err);
      }
    }

    if (process.env.ORGANIZE_MEDIA_FOLDERS !== 'false') {
      try {
        await organizeMediaFolders(strapi);
      } catch (err) {
        strapi.log.error('bootstrap: media folder organize failed', err);
      }
    }
  },
};
