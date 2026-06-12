/**
 * Sourced README context — the honest human-context (6W) extractor.
 *
 * This REPLACES the retired v5 RelentlessContextExtractor, which inferred slots
 * from the project name / tech stack (an `INFERRED`/`DEFAULT` tier) and so could
 * write a guessed value into an empty slot. That violated the FAF doctrine:
 * FAF don't lie. This extractor follows the same rule as Turbo-Cat (stack slots
 * from real formats) and faf-cli's v6 `relentlessContext` (human slots, sourced):
 *
 *   Fill a slot ONLY from evidence present in the README. No inference, no
 *   defaults, no placeholders. Every field starts null and is set only on a
 *   real pattern match. No match → the slot stays empty, to be handed to the
 *   human (e.g. via faf_go). An honest empty beats a guessed fill.
 *
 * Sourced-but-partial by design: the patterns are deliberately conservative.
 * Missing a fillable slot (false negative) is acceptable; fabricating one
 * (false positive) is not.
 */

export interface SixWs {
  who: string | null;
  what: string | null;
  why: string | null;
  where: string | null;
  when: string | null;
  how: string | null;
}

/**
 * Extract the 6 human-context slots from README text. Sourced-or-empty: a slot
 * is filled only from a pattern match in `content`, never inferred.
 */
export function extractSixWsFromReadme(content: string): SixWs {
  const result: SixWs = {
    who: null, what: null, why: null, where: null, when: null, how: null,
  };

  // WHAT: first real paragraph after the title.
  const whatMatch = content.match(/^#\s+[^\n]+\n+(?:\*\*[^*]+\*\*\n+)?([A-Z][^#\n]{30,})/m);
  if (whatMatch) result.what = whatMatch[1].trim().substring(0, 200);

  // WHO: "built by / created by / maintained by / for / team …"
  const whoMatch = content.match(/(?:built by|created by|maintained by|for|team)\s+([^\n.]{10,50})/i);
  if (whoMatch) result.who = whoMatch[1].trim();

  // WHY: "because / to help / enables / allows / makes it …"
  const whyMatch = content.match(/(?:because|to help|enables|allows|makes it)\s+([^\n.]{15,100})/i);
  if (whyMatch) result.why = whyMatch[1].trim();

  // WHERE: deployment / runtime mention.
  const whereMatch = content.match(/(?:runs on|deployed to|works with|for)\s+(browser|server|edge|npm|cargo|cloud|local)/i);
  if (whereMatch) result.where = whereMatch[0].trim();

  // WHEN: a version token.
  const whenMatch = content.match(/(?:version|v)\s*(\d+\.\d+(?:\.\d+)?)/i);
  if (whenMatch) result.when = `v${whenMatch[1]}`;

  // HOW: an install/run command.
  const howMatch = content.match(/(?:npm install|cargo|pip install|brew install)\s+[^\n]+/i);
  if (howMatch) result.how = howMatch[0].trim();

  return result;
}
