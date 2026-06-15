import type { Core } from '@strapi/strapi';
import { runBootstrapSeed } from './bootstrap-seed';

const PUBLIC_READ_UIDS = [
  'api::direction.direction',
  'api::event.event',
  'api::product.product',
  'api::showroom.showroom',
  'api::cafe-menu-page.cafe-menu-page',
  'api::menu-item.menu-item',
  'api::monthly-report.monthly-report',
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
  register() {},

  async bootstrap({ strapi }: { strapi: Core.Strapi }) {
    try {
      await ensurePublicPermissions(strapi);
    } catch (err) {
      strapi.log.error('bootstrap: failed to ensure public permissions', err);
    }

    if (process.env.SEED_ON_BOOT !== 'false') {
      try {
        await runBootstrapSeed(strapi);
      } catch (err) {
        strapi.log.error('bootstrap: seed failed', err);
      }
    }
  },
};
