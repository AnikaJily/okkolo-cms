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

const FIELD_FOLDER_BY_TYPE: Record<string, Partial<Record<string, MediaFolderName>>> = {
  'api::event.event': {
    photo: MEDIA_FOLDER_NAMES.MEROPRIYATIYA,
    gallery: MEDIA_FOLDER_NAMES.MEROPRIYATIYA,
  },
  'api::direction.direction': {
    image: MEDIA_FOLDER_NAMES.NAPRAVLENIYA,
  },
  'api::cafe-menu-page.cafe-menu-page': {
    mainPosterImage: MEDIA_FOLDER_NAMES.KOFejNYA,
    summerPosterImage: MEDIA_FOLDER_NAMES.KOFejNYA,
  },
  'api::showroom.showroom': {
    heroImage: MEDIA_FOLDER_NAMES.SAJT_STATIK,
  },
  'api::about-team-photo.about-team-photo': {
    image: MEDIA_FOLDER_NAMES.O_NAS,
  },
  'api::about-workplace-photo.about-workplace-photo': {
    image: MEDIA_FOLDER_NAMES.O_NAS,
  },
  'api::about-page.about-page': {
    heroPhoto: MEDIA_FOLDER_NAMES.O_NAS,
  },
  'api::workshop-program.workshop-program': {
    image: MEDIA_FOLDER_NAMES.MASTERSKIE,
  },
  'api::workshops-page.workshops-page': {
    audiencePhoto: MEDIA_FOLDER_NAMES.MASTERSKIE,
    afterLearningPhoto: MEDIA_FOLDER_NAMES.MASTERSKIE,
  },
  'api::annual-report.annual-report': {
    pdf: MEDIA_FOLDER_NAMES.OTCHETY,
  },
  'api::accessibility-page.accessibility-page': {
    heroPhoto: MEDIA_FOLDER_NAMES.SAJT_STATIK,
  },
  'api::legal-document.legal-document': {
    pdf: MEDIA_FOLDER_NAMES.SAJT_STATIK,
  },
};

type MediaLike = { id?: number } | null | undefined;
type MediaList = MediaLike | MediaLike[];

type MorphRow = {
  file_id: number;
  related_id: number;
  related_type: string;
  field: string;
};

type Assignment = {
  folder: MediaFolderName;
  priority: number;
};

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

/**
 * Перемещение файлов так же, как в админке Strapi (bulk move):
 * обновляются и folder_path, и связь в files_folder_lnk.
 */
async function bulkMoveFilesToFolder(
  strapi: Core.Strapi,
  fileIds: number[],
  destinationFolderId: number,
): Promise<void> {
  if (fileIds.length === 0) return;

  const destinationFolder = await strapi.db.query(FOLDER_UID).findOne({
    where: { id: destinationFolderId },
    select: ['path'],
  });
  if (!destinationFolder?.path) {
    throw new Error(`media-folders: folder ${destinationFolderId} not found`);
  }

  // @ts-expect-error — динамические метаданные модели upload
  const fileJoinTable = strapi.db.metadata.get(FILE_UID).attributes.folder.joinTable;
  const fileTable = strapi.getModel(FILE_UID).collectionName;
  // @ts-expect-error — динамические метаданные модели upload
  const folderPathColName = strapi.db.metadata.get(FILE_UID).attributes.folderPath.columnName;

  const trx = await strapi.db.transaction();
  try {
    await strapi.db
      .queryBuilder(fileJoinTable.name)
      .transacting(trx.get())
      .delete()
      .where({ [fileJoinTable.joinColumn.name]: { $in: fileIds } })
      .execute();

    await strapi.db
      .queryBuilder(fileJoinTable.name)
      .transacting(trx.get())
      .insert(
        fileIds.map((fileId) => ({
          [fileJoinTable.inverseJoinColumn.name]: destinationFolderId,
          [fileJoinTable.joinColumn.name]: fileId,
        })),
      )
      .execute();

    await strapi.db
      .getConnection(fileTable)
      .transacting(trx.get())
      .whereIn('id', fileIds)
      .update(folderPathColName, destinationFolder.path);

    await trx.commit();
  } catch (error) {
    await trx.rollback();
    throw error;
  }
}

async function loadProductCategoryMap(strapi: Core.Strapi): Promise<Map<number, string>> {
  const map = new Map<number, string>();
  try {
    const rows = (await strapi.db
      .connection('products_category_lnk')
      .join('categories', 'categories.id', 'products_category_lnk.category_id')
      .select({
        productId: 'products_category_lnk.product_id',
        slug: 'categories.slug',
      })) as Array<{ productId: number; slug: string }>;

    for (const row of rows) {
      map.set(Number(row.productId), row.slug);
    }
  } catch (error) {
    strapi.log.warn(`media-folders: product categories lookup failed: ${(error as Error).message}`);
  }
  return map;
}

async function loadMorphRows(strapi: Core.Strapi): Promise<MorphRow[]> {
  try {
    return (await strapi.db.connection('files_related_mph').select('*')) as MorphRow[];
  } catch (error) {
    strapi.log.warn(`media-folders: files_related_mph lookup failed: ${(error as Error).message}`);
    return [];
  }
}

function assignWithPriority(
  assignments: Map<number, Assignment>,
  fileIds: number[],
  folder: MediaFolderName,
  priority: number,
) {
  for (const fileId of fileIds) {
    const current = assignments.get(fileId);
    if (!current || priority >= current.priority) {
      assignments.set(fileId, { folder, priority });
    }
  }
}

async function assignFromEntityService(strapi: Core.Strapi, assignments: Map<number, Assignment>) {
  const products = (await strapi.entityService.findMany('api::product.product', {
    populate: { image: true, gallery: true, category: true },
  } as any)) as Array<{
    image?: MediaLike;
    gallery?: MediaLike[];
    category?: { slug?: string } | null;
  }>;

  for (const product of products) {
    const folder = productCategoryToFolder(product.category?.slug);
    assignWithPriority(assignments, collectMediaIds(product.image), folder, 95);
    assignWithPriority(assignments, collectMediaIds(product.gallery), folder, 95);
  }

  const events = (await strapi.entityService.findMany('api::event.event', {
    populate: { photo: true, gallery: true },
  } as any)) as Array<{ photo?: MediaLike; gallery?: MediaLike[] }>;

  for (const event of events) {
    assignWithPriority(assignments, collectMediaIds(event.photo), MEDIA_FOLDER_NAMES.MEROPRIYATIYA, 90);
    assignWithPriority(assignments, collectMediaIds(event.gallery), MEDIA_FOLDER_NAMES.MEROPRIYATIYA, 90);
  }

  const directions = (await strapi.entityService.findMany('api::direction.direction', {
    populate: { image: true },
  } as any)) as Array<{ image?: MediaLike }>;

  for (const direction of directions) {
    assignWithPriority(assignments, collectMediaIds(direction.image), MEDIA_FOLDER_NAMES.NAPRAVLENIYA, 85);
  }

  const cafePages = asList(
    await strapi.entityService.findMany('api::cafe-menu-page.cafe-menu-page', {
      populate: { mainPosterImage: true, summerPosterImage: true },
    } as any),
  ) as Array<{ mainPosterImage?: MediaLike; summerPosterImage?: MediaLike }>;

  for (const page of cafePages) {
    assignWithPriority(assignments, collectMediaIds(page.mainPosterImage), MEDIA_FOLDER_NAMES.KOFejNYA, 80);
    assignWithPriority(assignments, collectMediaIds(page.summerPosterImage), MEDIA_FOLDER_NAMES.KOFejNYA, 80);
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
    assignWithPriority(assignments, collectMediaIds(photo.image), MEDIA_FOLDER_NAMES.O_NAS, 80);
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
    assignWithPriority(assignments, collectMediaIds(entry.image), MEDIA_FOLDER_NAMES.MASTERSKIE, 80);
    assignWithPriority(assignments, collectMediaIds(entry.audiencePhoto), MEDIA_FOLDER_NAMES.MASTERSKIE, 80);
    assignWithPriority(assignments, collectMediaIds(entry.afterLearningPhoto), MEDIA_FOLDER_NAMES.MASTERSKIE, 80);
  }
}

async function buildAssignments(strapi: Core.Strapi): Promise<Map<number, MediaFolderName>> {
  const assignments = new Map<number, Assignment>();
  const productCategories = await loadProductCategoryMap(strapi);
  const morphRows = await loadMorphRows(strapi);

  for (const row of morphRows) {
    if (!row.file_id) continue;

    if (row.related_type === 'api::product.product') {
      const slug = productCategories.get(Number(row.related_id));
      assignWithPriority(
        assignments,
        [row.file_id],
        productCategoryToFolder(slug),
        100,
      );
      continue;
    }

    const fieldMap = FIELD_FOLDER_BY_TYPE[row.related_type];
    const folder = fieldMap?.[row.field];
    if (folder) {
      assignWithPriority(assignments, [row.file_id], folder, 90);
    }
  }

  await assignFromEntityService(strapi, assignments);

  const allFiles = (await strapi.db.query(FILE_UID).findMany({
    select: ['id'],
  })) as Array<{ id: number }>;

  for (const file of allFiles) {
    if (!assignments.has(file.id)) {
      assignments.set(file.id, { folder: MEDIA_FOLDER_NAMES.SAJT_STATIK, priority: 1 });
    }
  }

  const resolved = new Map<number, MediaFolderName>();
  for (const [fileId, value] of assignments) {
    resolved.set(fileId, value.folder);
  }
  return resolved;
}

export async function organizeMediaFolders(strapi: Core.Strapi): Promise<void> {
  const folders = await ensureMediaFolders(strapi);
  const assignments = await buildAssignments(strapi);

  const allFiles = (await strapi.db.query(FILE_UID).findMany({
    populate: { folder: true },
  })) as Array<{ id: number; folder?: { id: number } | null }>;

  const filesByFolder = new Map<MediaFolderName, number[]>();
  const folderCounts: Record<string, number> = {};
  let skipped = 0;

  for (const [fileId, folderName] of assignments) {
    folderCounts[folderName] = (folderCounts[folderName] ?? 0) + 1;

    const targetFolderId = folders.get(folderName);
    if (!targetFolderId) continue;

    const file = allFiles.find((item) => item.id === fileId);
    if (file?.folder?.id === targetFolderId) {
      skipped += 1;
      continue;
    }

    const list = filesByFolder.get(folderName) ?? [];
    list.push(fileId);
    filesByFolder.set(folderName, list);
  }

  let moved = 0;
  for (const [folderName, fileIds] of filesByFolder) {
    const folderId = folders.get(folderName);
    if (!folderId || fileIds.length === 0) continue;

    await bulkMoveFilesToFolder(strapi, fileIds, folderId);
    moved += fileIds.length;
  }

  strapi.log.info(
    `media-folders: organize done — moved=${moved}, already_ok=${skipped}, byFolder=${JSON.stringify(folderCounts)}`,
  );
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
