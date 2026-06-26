import type { Core } from '@strapi/strapi';

/** slug из названия: нижний регистр, пробелы → дефис, оставляем буквы/цифры/дефис. */
function toSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zа-яё0-9-]/gi, '');
}

type AutolinkConfig = {
  /** UID коллекции-владельца, напр. 'api::product.product'. */
  uid: string;
  /** Текстовое поле ввода, напр. 'categoryName'. */
  textField: string;
  /** Поле-связь на справочник, напр. 'category'. */
  relationField: string;
  /** UID справочника-цели, напр. 'api::category.category'. */
  targetUid: string;
};

/**
 * Обобщённый autolink «текст → связь со справочником».
 *
 * Контент-менеджер вписывает значение ТЕКСТОМ в `textField`. На сохранении значение
 * ищется в справочнике по имени (без учёта регистра) или создаётся, и привязывается
 * к relation `relationField`. Так ввод остаётся простым текстом, а в БД — нормализованный
 * справочник-связь (без дублей «Лекция»/«лекция»).
 *
 * Реализовано как middleware document service — срабатывает и в админке, и через API.
 * Fail-safe: при любой ошибке запись всё равно сохранится (просто без авто-привязки).
 */
export function registerTextToRelationAutolink(strapi: Core.Strapi, config: AutolinkConfig) {
  const { uid, textField, relationField, targetUid } = config;

  strapi.documents.use(async (context, next) => {
    const ctx = context as { uid: string; action: string };
    if (ctx.uid !== uid || (ctx.action !== 'create' && ctx.action !== 'update')) {
      return next();
    }

    const data = (context as any).params?.data;
    const raw = data?.[textField];
    const typed = typeof raw === 'string' ? raw.trim().replace(/\s+/g, ' ') : '';
    // Пусто — значение не вписывали; не трогаем выбранную вручную связь.
    if (!typed) return next();

    try {
      const dict = strapi.documents(targetUid as any);
      let entry = await dict.findFirst({ filters: { name: { $eqi: typed } } });
      if (!entry) {
        entry = await dict.create({
          data: { name: typed, slug: toSlug(typed) || `item-${Date.now()}` },
        });
        strapi.log.info(`autolink: создана запись "${typed}" в ${targetUid}`);
      }
      // привязываем связь и нормализуем введённый текст к каноничному названию
      data[relationField] = { set: [entry.documentId] };
      data[textField] = entry.name;
    } catch (err) {
      strapi.log.error(`autolink: не удалось привязать ${relationField} (${uid})`, err);
    }

    return next();
  });
}
