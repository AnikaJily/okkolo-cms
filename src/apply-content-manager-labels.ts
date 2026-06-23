import type { Core } from '@strapi/strapi';
import {
  CONTENT_MANAGER_LABELS,
  SYSTEM_FIELD_LABELS,
} from './content-manager-labels';

type Metadata = {
  edit: { label?: string; description?: string; placeholder?: string };
  list: { label?: string };
};

function mergeFieldLabels(target: Metadata, source: Metadata) {
  if (source.edit.label) target.edit.label = source.edit.label;
  if (source.edit.description) target.edit.description = source.edit.description;
  if (source.edit.placeholder) target.edit.placeholder = source.edit.placeholder;
  if (source.list.label) target.list.label = source.list.label;
}

export async function applyRussianContentManagerLabels(strapi: Core.Strapi) {
  const contentTypesService = strapi.plugin('content-manager').service('content-types');

  await contentTypesService.syncConfigurations();

  for (const [uid, fieldLabels] of Object.entries(CONTENT_MANAGER_LABELS)) {
    const contentType = contentTypesService.findContentType(uid);
    if (!contentType) {
      strapi.log.warn(`content-manager labels: тип не найден — ${uid}`);
      continue;
    }

    const configuration = await contentTypesService.findConfiguration(contentType);
    const mergedLabels = { ...SYSTEM_FIELD_LABELS, ...fieldLabels };

    for (const [fieldName, labels] of Object.entries(mergedLabels)) {
      if (!configuration.metadatas[fieldName]) continue;
      mergeFieldLabels(configuration.metadatas[fieldName], labels);
    }

    await contentTypesService.updateConfiguration(contentType, {
      settings: configuration.settings,
      metadatas: configuration.metadatas,
      layouts: configuration.layouts,
    });
  }

  strapi.log.info('content-manager: применены русские подписи полей');
}
