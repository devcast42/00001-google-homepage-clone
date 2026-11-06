import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Highlighted } from '../src/components/Highlighted';

const html = (text: string, highlights: [number, number][]) =>
  render(
    <p>
      <Highlighted value={{ text, highlights }} />
    </p>,
  ).container.querySelector('p')!.innerHTML;

describe('Highlighted', () => {
  it('wraps ranges in <mark>', () => {
    expect(html('use fs.readFile now', [[4, 15]])).toBe('use <mark>fs.readFile</mark> now');
  });

  it('escapes HTML coming from indexed content', () => {
    expect(html('<img src=x onerror=alert(1)>', [[1, 4]])).toBe(
      '&lt;<mark>img</mark> src=x onerror=alert(1)&gt;',
    );
  });

  it('ignores overlapping or out-of-bounds ranges', () => {
    expect(
      html('abcdef', [
        [0, 2],
        [1, 3],
        [4, 99],
      ]),
    ).toBe('<mark>ab</mark>cdef');
  });
});
