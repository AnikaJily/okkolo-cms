import { makeDictionarySuggestInput } from './DictionarySuggestInput';

/** Поле «Категория» товара с подсказками из справочника категорий. */
export default makeDictionarySuggestInput('/api/categories?sort=name:asc&pagination[pageSize]=100');
