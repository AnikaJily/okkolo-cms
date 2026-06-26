import { makeDictionarySuggestInput } from './DictionarySuggestInput';

/** Поле «Тип» мероприятия с подсказками из справочника типов мероприятий. */
export default makeDictionarySuggestInput('/api/event-types?sort=name:asc&pagination[pageSize]=100');
