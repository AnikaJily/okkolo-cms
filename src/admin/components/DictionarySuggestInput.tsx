import * as React from 'react';
import { Combobox, ComboboxOption, Field } from '@strapi/design-system';
import { useField, useFetchClient } from '@strapi/strapi/admin';

type SuggestInputProps = {
  name: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  required?: boolean;
  disabled?: boolean;
  labelAction?: React.ReactNode;
  placeholder?: string;
};

const MAX_SUGGESTIONS = 8;
const FUZZY_THRESHOLD = 0.6; // 0..1 — порог похожести для опечаток

/** нормализация для сравнения: нижний регистр, ё→е, схлопнуть пробелы */
function norm(s: string): string {
  return s.toLowerCase().replace(/ё/g, 'е').replace(/\s+/g, ' ').trim();
}

/** расстояние Левенштейна (две строки, O(min)) */
function levenshtein(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;
  let prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  const curr = new Array<number>(b.length + 1);
  for (let i = 1; i <= a.length; i++) {
    curr[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost);
    }
    prev = curr.slice();
  }
  return prev[b.length];
}

/**
 * Оценка похожести запроса на название из справочника.
 * Сначала подстрока (точно / в начале / внутри), затем — устойчивость к опечаткам
 * через Левенштейна. 0 — не показывать.
 */
function score(query: string, name: string): number {
  const q = norm(query);
  const n = norm(name);
  if (!q) return 1; // пустой ввод — показываем справочник целиком (сортировка по алфавиту)
  if (n === q) return 1000;
  if (n.startsWith(q)) return 900 - n.length;
  if (n.includes(q)) return 700 - n.indexOf(q);
  // фаззи: сравниваем и с полным именем, и с его префиксом длины запроса
  const full = 1 - levenshtein(q, n) / Math.max(q.length, n.length);
  const pref = 1 - levenshtein(q, n.slice(0, q.length)) / q.length;
  const sim = Math.max(full, pref);
  return sim >= FUZZY_THRESHOLD ? 200 + Math.round(sim * 100) : 0;
}

function rank(query: string, names: string[]): string[] {
  return names
    .map((name) => ({ name, s: score(query, name) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s || a.name.localeCompare(b.name, 'ru'))
    .slice(0, MAX_SUGGESTIONS)
    .map((x) => x.name);
}

/**
 * Фабрика поля-автокомплита для справочника. `endpoint` — REST-путь коллекции
 * (объекты с полем `name`). Возвращает компонент кастомного поля Strapi: контент-менеджер
 * набирает текст → видит похожие записи (подстрока + опечатки), выбирает существующую
 * или добавляет новую. Значение хранится строкой; связь проставит autolink на сохранении.
 *
 * Используется и для категорий товаров, и для типов мероприятий — логика одна.
 */
export function makeDictionarySuggestInput(endpoint: string) {
  const DictionarySuggestInput = React.forwardRef<HTMLInputElement, SuggestInputProps>(
    ({ name, label, hint, required, disabled, labelAction, placeholder }, ref) => {
      const field = useField<string>(name);
      const { get } = useFetchClient();
      const [names, setNames] = React.useState<string[]>([]);
      const [query, setQuery] = React.useState('');

      React.useEffect(() => {
        let alive = true;
        get(endpoint)
          .then((res: any) => {
            if (!alive) return;
            const list: string[] = (res?.data?.data ?? [])
              .map((c: any) => c?.name)
              .filter((x: any): x is string => typeof x === 'string' && x.trim().length > 0);
            setNames(list);
          })
          .catch(() => {
            /* справочник недоступен — не блокируем ввод; autolink создаст по тексту на сохранении */
          });
        return () => {
          alive = false;
        };
      }, [get]);

      const value = field.value ?? '';

      const suggestions = React.useMemo(() => {
        const ranked = rank(query, names);
        // выбранное значение всегда среди опций, иначе Combobox не отрисует его как выбранное
        return value && !ranked.includes(value) ? [value, ...ranked] : ranked;
      }, [query, names, value]);

      const setValue = (next: string) => field.onChange(name, next);

      return (
        <Field.Root name={name} id={name} error={field.error} hint={hint} required={required}>
          {label ? <Field.Label action={labelAction}>{label}</Field.Label> : null}
          <Combobox
            ref={ref}
            value={value || undefined}
            autocomplete="none"
            allowCustomValue
            creatable
            disabled={disabled}
            placeholder={placeholder ?? 'Начните вводить…'}
            createMessage={(v) => `Добавить «${v}»`}
            noOptionsMessage={() => 'Совпадений нет — введите название, чтобы добавить новое'}
            onInputChange={(e) => setQuery(e.currentTarget.value)}
            onChange={(v?: string) => setValue(v ?? '')}
            onClear={() => {
              setQuery('');
              setValue('');
            }}
            onCreateOption={(v?: string) => {
              const created = (v ?? query).trim().replace(/\s+/g, ' ');
              if (created) setValue(created);
            }}
          >
            {suggestions.map((n) => (
              <ComboboxOption key={n} value={n}>
                {n}
              </ComboboxOption>
            ))}
          </Combobox>
          <Field.Hint />
          <Field.Error />
        </Field.Root>
      );
    },
  );

  return DictionarySuggestInput;
}
