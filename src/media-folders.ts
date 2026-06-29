import type { Core } from '@strapi/strapi';

/** Имена папок в медиатеке Strapi (корневой уровень). */
export const MEDIA_FOLDER_NAMES = {
  MEROPRIYATIYA: 'мероприятия',
  ODEZHDA: 'одежда',
  TEKSTIL: 'текстиль',
  BIZHUTERIYA: 'бижутерия',
  KERAMIKA: 'керамика',
  NAPRAVLENIYA: 'направления',
  KOFejNYA: 'кофейня',
  MASTERSKIE: 'мастерские',
  O_NAS: 'о_нас',
  OTCHETY: 'отчёты',
  SAJT_STATIK: 'сайт_статик',
} as const;

export type MediaFolderName = (typeof MEDIA_FOLDER_NAMES)[keyof typeof MEDIA_FOLDER_NAMES];

const PRODUCT_CATEGORY_FOLDER: Record<string, MediaFolderName> = {
  clothing: MEDIA_FOLDER_NAMES.ODEZHDA,
  textile: MEDIA_FOLDER_NAMES.TEKSTIL,
  jewelry: MEDIA_FOLDER_NAMES.BIZHUTERIYA,
  ceramics: MEDIA_FOLDER_NAMES.KERAMIKA,
};

const FOLDER_UID = 'plugin::upload.folder' as const;
const FILE_UID = 'plugin::upload.file' as const;

type MediaLike = { id?: number } | null | undefined;
type MediaList = MediaLike | MediaLike[];

function asList<T>(value: T | T[] | null | undefined): T[] {
  if (!value) return [];
  return Array.isArray(value) ? value : [value];
}

function collectMediaIds(value: MediaList): number[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap((item) => (item?.id ? [item.id] : []));
  }
  return value.id ? [value.id] : [];
}

async function findRootFolderId(strapi: Core.Strapi, name: string): Promise<number | null> {
  const folder = await strapi.db.query(FOLDER_UID).findOne({
    where: { name, parent: null },
  });
  return folder?.id ?? null;
}

export async function ensureMediaFolders(strapi: Core.Strapi): Promise<Map<MediaFolderName, number>> {
  const folderService = strapi.plugin('upload').service('folder');
  const map = new Map<MediaFolderName, number>();

  for (const name of Object.values(MEDIA_FOLDER_NAMES)) {
    let id = await findRootFolderId(strapi, name);
    if (!id) {
      const created = await folderService.create({ name, parent: null });
      id = created.id;
      strapi.log.info(`media-folders: created folder "${name}" (id=${id})`);
    }
    map.set(name, id);
  }

  return map;
}

export function productCategoryToFolder(slug: string | null | undefined): MediaFolderName {
  if (slug && PRODUCT_CATEGORY_FOLDER[slug]) {
    return PRODUCT_CATEGORY_FOLDER[slug];
  }
  return MEDIA_FOLDER_NAMES.SAJT_STATIK;
}

export async function moveFileToFolder(
  strapi: Core.Strapi,
  fileId: number,
  folderId: number,
): Promise<void> {
  const uploadService = strapi.plugin('upload').service('upload');
  await uploadService.updateFileInfo(fileId, { folder: folderId });
}

export async function organizeMediaFolders(strapi: Core.Strapi): Promise<void> {
  const folders = await ensureMediaFolders(strapi);
  const assignments = new Map<number, MediaFolderName>();

  const assign = (fileIds: number[], folder: MediaFolderName) => {
    for (const id of fileIds) {
      if (!assignments.has(id)) {
        assignments.set(id, folder);
      }
    }
  };

  const products = (await strapi.entityService.findMany('api::product.product', {
    populate: { image: true, gallery: true, category: true },
  } as any)) as Array<{
    image?: MediaLike;
    gallery?: MediaLike[];
    category?: { slug?: string } | null;
  }>;

  for (const product of products) {
    const folder = productCategoryToFolder(product.category?.slug);
    assign(collectMediaIds(product.image), folder);
    assign(collectMediaIds(product.gallery), folder);
  }

  const events = (await strapi.entityService.findMany('api::event.event', {
    populate: { photo: true, gallery: true },
  } as any)) as Array<{ photo?: MediaLike; gallery?: MediaLike[] }>;

  for (const event of events) {
    assign(collectMediaIds(event.photo), MEDIA_FOLDER_NAMES.MEROPRIYATIYA);
    assign(collectMediaIds(event.gallery), MEDIA_FOLDER_NAMES.MEROPRIYATIYA);
  }

  const directions = (await strapi.entityService.findMany('api::direction.direction', {
    populate: { image: true },
  } as any)) as Array<{ image?: MediaLike }>;

  for (const direction of directions) {
    assign(collectMediaIds(direction.image), MEDIA_FOLDER_NAMES.NAPRAVLENIYA);
  }

  const cafePages = asList(
    await strapi.entityService.findMany('api::cafe-menu-page.cafe-menu-page', {
      populate: { mainPosterImage: true, summerPosterImage: true },
    } as any),
  ) as Array<{ mainPosterImage?: MediaLike; summerPosterImage?: MediaLike }>;

  for (const page of cafePages) {
    assign(collectMediaIds(page.mainPosterImage), MEDIA_FOLDER_NAMES.KOFejNYA);
    assign(collectMediaIds(page.summerPosterImage), MEDIA_FOLDER_NAMES.KOFejNYA);
  }

  const showroomEntries = asList(
    await strapi.entityService.findMany('api::showroom.showroom', {
      populate: { heroImage: true },
    } as any),
  ) as Array<{ heroImage?: MediaLike }>;

  for (const entry of showroomEntries) {
    assign(collectMediaIds(entry.heroImage), MEDIA_FOLDER_NAMES.SAJT_STATIK);
  }

  const aboutPhotos = [
    ...(await strapi.entityService.findMany('api::about-team-photo.about-team-photo', {
      populate: { image: true },
    } as any)),
    ...(await strapi.entityService.findMany('api::about-workplace-photo.about-workplace-photo', {
      populate: { image: true },
    } as any)),
  ] as Array<{ image?: MediaLike }>;

  for (const photo of aboutPhotos) {
    assign(collectMediaIds(photo.image), MEDIA_FOLDER_NAMES.O_NAS);
  }

  const aboutPages = asList(
    await strapi.entityService.findMany('api::about-page.about-page', {
      populate: { heroPhoto: true },
    } as any),
  ) as Array<{ heroPhoto?: MediaLike }>;

  for (const page of aboutPages) {
    assign(collectMediaIds(page.heroPhoto), MEDIA_FOLDER_NAMES.O_NAS);
  }

  const workshops = [
    ...(await strapi.entityService.findMany('api::workshop-program.workshop-program', {
      populate: { image: true },
    } as any)),
    ...asList(
      await strapi.entityService.findMany('api::workshops-page.workshops-page', {
        populate: { audiencePhoto: true, afterLearningPhoto: true },
      } as any),
    ),
  ] as Array<{
    image?: MediaLike;
    audiencePhoto?: MediaLike;
    afterLearningPhoto?: MediaLike;
  }>;

  for (const entry of workshops) {
    assign(collectMediaIds(entry.image), MEDIA_FOLDER_NAMES.MASTERSKIE);
    assign(collectMediaIds(entry.audiencePhoto), MEDIA_FOLDER_NAMES.MASTERSKIE);
    assign(collectMediaIds(entry.afterLearningPhoto), MEDIA_FOLDER_NAMES.MASTERSKIE);
  }

  const reports = (await strapi.entityService.findMany('api::annual-report.annual-report', {
    populate: { pdf: true },
  } as any)) as Array<{ pdf?: MediaLike }>;

  for (const report of reports) {
    assign(collectMediaIds(report.pdf), MEDIA_FOLDER_NAMES.OTCHETY);
  }

  const staticPages = [
    ...asList(
      await strapi.entityService.findMany('api::accessibility-page.accessibility-page', {
        populate: { heroPhoto: true },
      } as any),
    ),
    ...(await strapi.entityService.findMany('api::legal-document.legal-document', {
      populate: { pdf: true },
    } as any)),
  ] as Array<{ heroPhoto?: MediaLike; pdf?: MediaLike }>;

  for (const page of staticPages) {
    assign(collectMediaIds(page.heroPhoto), MEDIA_FOLDER_NAMES.SAJT_STATIK);
    assign(collectMediaIds(page.pdf), MEDIA_FOLDER_NAMES.SAJT_STATIK);
  }

  const allFiles = (await strapi.db.query(FILE_UID).findMany({
    populate: { folder: true },
  })) as Array<{ id: number; folder?: { id: number } | null }>;

  for (const file of allFiles) {
    if (!assignments.has(file.id)) {
      assignments.set(file.id, MEDIA_FOLDER_NAMES.SAJT_STATIK);
    }
  }

  let moved = 0;
  let skipped = 0;

  for (const [fileId, folderName] of assignments) {
    const targetFolderId = folders.get(folderName);
    if (!targetFolderId) continue;

    const file = allFiles.find((f) => f.id === fileId);
    if (file?.folder?.id === targetFolderId) {
      skipped += 1;
      continue;
    }

    await moveFileToFolder(strapi, fileId, targetFolderId);
    moved += 1;
  }

  strapi.log.info(`media-folders: organize done — moved=${moved}, already_ok=${skipped}, total=${assignments.size}`);
}

export function mediaFolderId(
  folders: Map<MediaFolderName, number>,
  name: MediaFolderName,
): number {
  const id = folders.get(name);
  if (!id) {
    throw new Error(`media folder "${name}" is missing`);
  }
  return id;
}

export { collectMediaIds };
