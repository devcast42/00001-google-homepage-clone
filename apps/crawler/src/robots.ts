/**
 * Intérprete de robots.txt según RFC 9309.
 *
 * - Se usa el grupo cuyo `User-agent` coincide de forma más específica con el nuestro,
 *   o el grupo `*` si no hay ninguno.
 * - Gana la regla `Allow`/`Disallow` con la ruta más larga; a igualdad, gana `Allow`.
 * - Soporta los comodines `*` y `$`.
 */
export interface RobotsRules {
  isAllowed(pathWithQuery: string): boolean;
  /** Segundos entre peticiones si el sitio declara `Crawl-delay` (no es estándar, pero se respeta). */
  readonly crawlDelaySeconds?: number;
}

interface Rule {
  readonly allow: boolean;
  readonly pattern: string;
  readonly regex: RegExp;
}

interface Group {
  readonly agents: string[];
  readonly rules: Rule[];
  crawlDelay?: number;
}

function compile(pattern: string): RegExp {
  const anchored = pattern.endsWith('$');
  const body = (anchored ? pattern.slice(0, -1) : pattern)
    .split('*')
    .map((part) => part.replace(/[.+?^${}()|[\]\\]/g, '\\$&'))
    .join('.*');
  return new RegExp(`^${body}${anchored ? '$' : ''}`);
}

export function parseRobots(content: string, userAgent: string): RobotsRules {
  const groups: Group[] = [];
  let current: Group | undefined;
  let lastWasAgent = false;

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    const separator = line.indexOf(':');
    if (separator === -1) continue;
    const key = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim();

    if (key === 'user-agent') {
      if (!current || !lastWasAgent) {
        current = { agents: [], rules: [] };
        groups.push(current);
      }
      current.agents.push(value.toLowerCase());
      lastWasAgent = true;
      continue;
    }

    lastWasAgent = false;
    if (!current) continue;
    if ((key === 'allow' || key === 'disallow') && value !== '') {
      current.rules.push({ allow: key === 'allow', pattern: value, regex: compile(value) });
    } else if (key === 'crawl-delay') {
      const seconds = Number(value);
      if (Number.isFinite(seconds) && seconds >= 0) current.crawlDelay = seconds;
    }
  }

  const product = userAgent.split('/')[0]!.toLowerCase();
  const specific = groups
    .flatMap((group) => group.agents.map((agent) => ({ group, agent })))
    .filter(({ agent }) => agent !== '*' && product.includes(agent))
    .sort((a, b) => b.agent.length - a.agent.length)[0]?.group;
  const group = specific ?? groups.find((candidate) => candidate.agents.includes('*'));

  const rules = group?.rules ?? [];
  return {
    ...(group?.crawlDelay !== undefined ? { crawlDelaySeconds: group.crawlDelay } : {}),
    isAllowed(pathWithQuery: string): boolean {
      let best: Rule | undefined;
      for (const rule of rules) {
        if (!rule.regex.test(pathWithQuery)) continue;
        if (
          !best ||
          rule.pattern.length > best.pattern.length ||
          (rule.pattern.length === best.pattern.length && rule.allow)
        ) {
          best = rule;
        }
      }
      return best?.allow ?? true;
    },
  };
}

export const ALLOW_ALL: RobotsRules = { isAllowed: () => true };
