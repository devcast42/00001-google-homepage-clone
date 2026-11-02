import { useEffect, useId, useRef, useState } from 'react';
import type { Suggestion } from '@docseek/engine';
import { suggest } from '../api';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

export interface SearchBoxProps {
  /** Valor inicial. Para cambiarlo desde fuera, vuelve a montar el componente con otra `key`. */
  readonly initialValue: string;
  readonly onSearch: (query: string) => void;
  /** Al elegir una sugerencia se va directamente a la documentación. */
  readonly onOpen: (suggestion: Suggestion) => void;
  readonly autoFocus?: boolean;
  /** Inyectable para pruebas. */
  readonly fetchSuggestions?: typeof suggest;
}

const SUGGEST_DELAY_MS = 120;

/**
 * Cuadro de búsqueda con autocompletado según el patrón "combobox" de WAI-ARIA 1.2:
 * flechas para moverse, Enter para elegir, Escape para cerrar, y el lector de pantalla
 * anuncia la opción activa con `aria-activedescendant`. La tecla "/" enfoca el cuadro.
 */
export function SearchBox({
  initialValue,
  onSearch,
  onOpen,
  autoFocus = false,
  fetchSuggestions = suggest,
}: SearchBoxProps) {
  const [value, setValue] = useState(initialValue);
  // Las sugerencias se guardan con la consulta que las produjo; si no coincide con la
  // actual (el usuario siguió escribiendo) no se muestran.
  const [fetched, setFetched] = useState<{ query: string; suggestions: readonly Suggestion[] }>({
    query: '',
    suggestions: [],
  });
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const listId = useId();
  const debounced = useDebouncedValue(value.trim(), SUGGEST_DELAY_MS);

  useEffect(() => {
    if (debounced.length < 2) return;
    const controller = new AbortController();
    fetchSuggestions(debounced, controller.signal).then(
      (response) => {
        setFetched({ query: debounced, suggestions: response.suggestions });
        setActive(-1);
      },
      () => {
        // Las sugerencias son una ayuda: si fallan, se puede seguir buscando con Enter.
        if (!controller.signal.aborted) setFetched({ query: debounced, suggestions: [] });
      },
    );
    return () => controller.abort();
  }, [debounced, fetchSuggestions]);

  const suggestions = fetched.query === value.trim() ? fetched.suggestions : [];

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target?.closest('input, textarea, [contenteditable="true"]');
      if (event.key === '/' && !typing && !event.metaKey && !event.ctrlKey) {
        event.preventDefault();
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const expanded = open && suggestions.length > 0;
  const optionId = (index: number) => `${listId}-option-${index}`;

  const submit = () => {
    const query = value.trim();
    setOpen(false);
    if (query) onSearch(query);
  };

  const choose = (suggestion: Suggestion) => {
    setOpen(false);
    onOpen(suggestion);
  };

  const onKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case 'ArrowDown':
        if (suggestions.length === 0) return;
        event.preventDefault();
        setOpen(true);
        setActive((index) => (index + 1) % suggestions.length);
        break;
      case 'ArrowUp':
        if (suggestions.length === 0) return;
        event.preventDefault();
        setOpen(true);
        setActive((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
        break;
      case 'Enter': {
        event.preventDefault();
        const selected = expanded ? suggestions[active] : undefined;
        if (selected) choose(selected);
        else submit();
        break;
      }
      case 'Escape':
        if (expanded) {
          event.preventDefault();
          setOpen(false);
          setActive(-1);
        } else if (value) {
          setValue('');
        }
        break;
    }
  };

  return (
    <form
      className="search-box"
      role="search"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
    >
      <svg className="search-box__icon" viewBox="0 0 24 24" aria-hidden="true">
        <circle cx="11" cy="11" r="7" fill="none" stroke="currentColor" strokeWidth="2" />
        <path d="m20 20-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        className="search-box__input"
        type="search"
        name="q"
        role="combobox"
        aria-label="Buscar en la documentación"
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded && active >= 0 ? optionId(active) : undefined}
        placeholder="Busca una API: readFile, http server, promisify…"
        autoComplete="off"
        spellCheck={false}
        autoFocus={autoFocus}
        value={value}
        onChange={(event) => {
          setValue(event.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={onKeyDown}
      />
      <kbd className="search-box__hint" aria-hidden="true">
        /
      </kbd>
      <ul
        id={listId}
        role="listbox"
        aria-label="Sugerencias"
        className="suggestions"
        hidden={!expanded}
      >
        {suggestions.map((suggestion, index) => (
          <li
            key={suggestion.id}
            id={optionId(index)}
            role="option"
            aria-selected={index === active}
            className="suggestions__item"
            // mousedown en vez de click: se dispara antes del blur que cierra la lista.
            onMouseDown={(event) => {
              event.preventDefault();
              choose(suggestion);
            }}
            onMouseEnter={() => setActive(index)}
          >
            <span className="suggestions__title">{suggestion.title}</span>
            {suggestion.breadcrumbs.length > 0 && (
              <span className="suggestions__path">{suggestion.breadcrumbs.join(' › ')}</span>
            )}
          </li>
        ))}
      </ul>
    </form>
  );
}
