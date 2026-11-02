import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import type { Suggestion } from '@docseek/engine';
import { SearchBox } from '../src/components/SearchBox';

const suggestion = (id: string): Suggestion => ({
  id,
  url: `https://docs.test/${id}`,
  title: `fs.${id}()`,
  breadcrumbs: ['File system'],
});

function setup() {
  const onSearch = vi.fn();
  const onOpen = vi.fn();
  const fetchSuggestions = vi.fn(async (q: string) => ({
    query: q,
    suggestions: [suggestion('readFile'), suggestion('readdir')],
  }));
  render(
    <SearchBox
      initialValue=""
      onSearch={onSearch}
      onOpen={onOpen}
      fetchSuggestions={fetchSuggestions}
    />,
  );
  return {
    onSearch,
    onOpen,
    fetchSuggestions,
    input: screen.getByRole('combobox'),
    user: userEvent.setup(),
  };
}

describe('SearchBox', () => {
  it('searches on Enter when no suggestion is selected', async () => {
    const { input, user, onSearch } = setup();
    await user.type(input, '  read file  {Enter}');
    expect(onSearch).toHaveBeenCalledWith('read file');
  });

  it('shows debounced suggestions and announces the active option', async () => {
    const { input, user, fetchSuggestions } = setup();
    await user.type(input, 'fs.rea');
    const options = await screen.findAllByRole('option');
    expect(options).toHaveLength(2);
    // Una sola petición para todo lo tecleado gracias al debounce.
    expect(fetchSuggestions).toHaveBeenCalledTimes(1);
    expect(fetchSuggestions.mock.calls[0]![0]).toBe('fs.rea');
    expect(input).toHaveAttribute('aria-expanded', 'true');

    await user.keyboard('{ArrowDown}{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[1]!.id);
    expect(options[1]).toHaveAttribute('aria-selected', 'true');

    await user.keyboard('{ArrowDown}');
    expect(input).toHaveAttribute('aria-activedescendant', options[0]!.id);
  });

  it('opens the selected suggestion with Enter', async () => {
    const { input, user, onOpen, onSearch } = setup();
    await user.type(input, 'fs.rea');
    await screen.findAllByRole('option');
    await user.keyboard('{ArrowDown}{Enter}');
    expect(onOpen).toHaveBeenCalledWith(expect.objectContaining({ id: 'readFile' }));
    expect(onSearch).not.toHaveBeenCalled();
  });

  it('closes suggestions with Escape, then clears the input', async () => {
    const { input, user } = setup();
    await user.type(input, 'fs.rea');
    await screen.findAllByRole('option');
    await user.keyboard('{Escape}');
    expect(input).toHaveAttribute('aria-expanded', 'false');
    await user.keyboard('{Escape}');
    expect(input).toHaveValue('');
  });

  it('does not ask for suggestions for a single character', async () => {
    const { input, user, fetchSuggestions } = setup();
    await user.type(input, 'f');
    await new Promise((resolve) => setTimeout(resolve, 200));
    expect(fetchSuggestions).not.toHaveBeenCalled();
  });

  it('focuses the input when pressing "/" anywhere on the page', async () => {
    const { input, user } = setup();
    input.blur();
    await user.keyboard('/');
    await waitFor(() => expect(input).toHaveFocus());
    expect(input).toHaveValue('');
  });
});
