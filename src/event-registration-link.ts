import type { Core } from '@strapi/strapi';

/**
 * Дожимает связь заявки с мероприятием. Фронт при записи присылает `eventId` —
 * это slug мероприятия (см. EventSignupModal: `eventId = event.id = slug`). На сохранении
 * заявки находим мероприятие по slug и проставляем relation `event`. Если по eventId
 * мероприятие не найдено (напр. синтетический `workshops-callback`) — связь просто
 * остаётся пустой, заявка всё равно сохраняется (fail-safe).
 *
 * Текстовые `eventId`/`eventTitle` при этом НЕ трогаем — они нужны как история,
 * чтобы заявка пережила переименование или удаление мероприятия.
 */
export function registerEventRegistrationLink(strapi: Core.Strapi) {
  strapi.documents.use(async (context, next) => {
    const ctx = context as { uid: string; action: string };
    if (
      ctx.uid !== 'api::event-registration.event-registration' ||
      (ctx.action !== 'create' && ctx.action !== 'update')
    ) {
      return next();
    }

    const data = (context as any).params?.data;
    const eventId = typeof data?.eventId === 'string' ? data.eventId.trim() : '';
    // нет ключа или связь уже выбрана вручную — не трогаем
    if (!eventId || data.event) return next();

    try {
      const events = strapi.documents('api::event.event');
      // фронт шлёт eventId = slug, а если у события нет slug — documentId (см. toEvent)
      let ev = await events.findFirst({ filters: { slug: { $eq: eventId } } });
      if (!ev) ev = await events.findOne({ documentId: eventId });
      if (ev) {
        data.event = { set: [ev.documentId] };
      }
    } catch (err) {
      strapi.log.error('event-registration: не удалось привязать мероприятие', err);
    }

    return next();
  });
}
