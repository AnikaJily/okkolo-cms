import type { Core } from '@strapi/strapi';

const PUBLIC_READ_UIDS = [
  'api::direction.direction',
];

const PUBLIC_CREATE_UIDS: string[] = [
  // 'api::event-registration.event-registration',
  // 'api::order.order',
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
  },
};
