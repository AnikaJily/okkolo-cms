import type { Core } from '@strapi/strapi';

/**
 * Автопроставление порядка позиции меню. При создании, если `order` не задан (пуст или 0),
 * ставим «максимум + 1» среди позиций той же категории и сезона — новая позиция падает
 * в конец своей группы. Контент-менеджеру не нужно думать о числах; если он указал число
 * вручную, не трогаем. Меню сортируется внутри группы (сезон + категория) по `order`.
 *
 * Срабатывает только на document service (админка и REST), не на сид (entityService).
 */
export function registerMenuItemAutoOrder(strapi: Core.Strapi) {
  strapi.documents.use(async (context, next) => {
    const ctx = context as { uid: string; action: string };
    if (ctx.uid !== 'api::menu-item.menu-item' || ctx.action !== 'create') return next();

    const data = (context as any).params?.data;
    const hasOrder = data && typeof data.order === 'number' && data.order > 0;
    if (!data || hasOrder) return next();

    try {
      const filters: Record<string, unknown> = {};
      if (data.category) filters.category = data.category;
      if (data.season) filters.season = data.season;
      const last = await strapi.documents('api::menu-item.menu-item').findFirst({
        filters,
        sort: 'order:desc',
        fields: ['order'],
      });
      const maxOrder = last && typeof last.order === 'number' ? last.order : 0;
      data.order = maxOrder + 1;
    } catch (err) {
      strapi.log.error('menu-item auto-order: не удалось вычислить порядок', err);
    }

    return next();
  });
}
