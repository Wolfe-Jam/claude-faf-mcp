/**
 * FAFMemory — a conformant TypeScript implementation of the `.fafm` v1.1 memory
 * soul (`application/vnd.fafm+yaml`). Local, offline-first.
 *
 * Parity-true with the Python `claude-fafm-sdk` (`Soul.etch` / `Soul.recall`) —
 * same priority vocab, same dedup-by-id, same recall ranking (priority → recency
 * → insertion-index). This is the seed of `claude-fafm-sdk-ts`.
 *
 * Boundary (doctrine): this is FAFMemory — it owns `etch`/`recall`/soul state.
 * Context (`.faf`) is a separate object; the caller composes them. Recall NEVER
 * lives on the context side.
 */
import * as fs from 'fs';
import * as path from 'path';
import * as YAML from 'yaml';

export type Priority = 'ephemeral' | 'standard' | 'high' | 'critical';

const PRIORITY_ORDER: Priority[] = ['ephemeral', 'standard', 'high', 'critical'];
const PRIORITY_RANK: Record<string, number> =
  Object.fromEntries(PRIORITY_ORDER.map((p, i) => [p, i]));
const LEGACY_PRIORITY: Record<string, Priority> = { low: 'ephemeral', medium: 'standard' };

/** Normalise a priority string: map legacy aliases, default unknowns to `standard`. */
export function canonicalPriority(p?: string | null): Priority {
  if (!p) return 'standard';
  if (p in LEGACY_PRIORITY) return LEGACY_PRIORITY[p];
  return (p in PRIORITY_RANK ? p : 'standard') as Priority;
}

/** Second-granularity UTC ISO stamp (matches existing souls; ties broken by insertion index). */
function utcnow(): string {
  return new Date().toISOString().replace(/\.\d+Z$/, 'Z');
}

export interface Fact {
  text: string;
  id?: string;
  type?: string;            // project | reference | user | feedback
  priority: Priority;
  tags: string[];
  links: string[];
  timestamp?: string;
  source?: string;
}

export interface EtchInput {
  text: string;
  id?: string;
  type?: string;
  priority?: string;
  tags?: string[];
  links?: string[];
  source?: string;
}

export interface RecallOpts {
  query?: string;
  tags?: string[];
  type?: string;
  minPriority?: string;     // default 'ephemeral'
  limit?: number;
}

/** A loaded `.fafm` knowledge soul + its basic offline memory ops. */
export class Soul {
  namepoint: string;
  profile: string;
  retention: string;
  created: string;
  last_etched: string;
  private _facts: Fact[];
  private _byId: Map<string, number>;

  constructor(namepoint: string, opts: { profile?: string; facts?: Fact[]; retention?: string; created?: string } = {}) {
    this.namepoint = namepoint;
    this.profile = opts.profile ?? 'knowledge';
    this.retention = opts.retention ?? 'forever';
    this.created = opts.created ?? utcnow();
    this.last_etched = this.created;
    this._facts = opts.facts ?? [];
    this._byId = new Map();
    this._facts.forEach((f, i) => { if (f.id != null) this._byId.set(f.id, i); });
  }

  get facts(): Fact[] { return this._facts; }

  static fromObj(o: any): Fact {
    return {
      text: o.text,
      id: o.id ?? undefined,
      type: o.type ?? undefined,
      priority: canonicalPriority(o.priority),
      tags: Array.isArray(o.tags) ? o.tags : [],
      links: Array.isArray(o.links) ? o.links : [],
      timestamp: o.timestamp ?? undefined,
      source: o.source ?? undefined,
    };
  }

  /** Load a `.fafm` soul from disk; namepoint defaults to the filename stem. */
  static load(soulPath: string): Soul {
    const doc = YAML.parse(fs.readFileSync(soulPath, 'utf-8')) || {};
    if (typeof doc !== 'object' || Array.isArray(doc)) throw new Error('soul is not a YAML mapping');
    const memory = doc.memory || {};
    const soul = new Soul(doc.namepoint ?? path.basename(soulPath, path.extname(soulPath)), {
      profile: doc.profile ?? 'knowledge',
      facts: (memory.facts || []).map((f: any) => Soul.fromObj(f)),
      retention: doc.retention ?? 'forever',
      created: doc.created,
    });
    soul.last_etched = doc.last_etched ?? soul.created;
    return soul;
  }

  /** Load if the soul exists, else a fresh empty soul (offline-first, no account). */
  static open(soulPath: string, namepoint?: string): Soul {
    if (fs.existsSync(soulPath)) return Soul.load(soulPath);
    return new Soul(namepoint ?? path.basename(soulPath, path.extname(soulPath)));
  }

  private factToObj(f: Fact): Record<string, any> {
    const out: Record<string, any> = { text: f.text };
    if (f.id != null) out.id = f.id;
    if (f.type != null) out.type = f.type;
    out.priority = f.priority;
    if (f.tags.length) out.tags = f.tags;
    if (f.links.length) out.links = f.links;
    if (f.timestamp != null) out.timestamp = f.timestamp;
    if (f.source != null) out.source = f.source;
    return out;
  }

  toDoc(): Record<string, any> {
    return {
      version: '1.1',
      profile: this.profile,
      namepoint: this.namepoint,
      created: this.created,
      last_etched: this.last_etched,
      retention: this.retention,
      memory: {
        facts: this._facts.map((f) => this.factToObj(f)),
        sessions: [],
        preferences: {},
        custom: {},
      },
    };
  }

  toYaml(): string {
    return YAML.stringify(this.toDoc(), { lineWidth: 100 });
  }

  save(soulPath: string): string {
    fs.mkdirSync(path.dirname(path.resolve(soulPath)), { recursive: true });
    fs.writeFileSync(soulPath, this.toYaml(), 'utf-8');
    return soulPath;
  }

  /** Insert or update a Fact by id (O(1) dedup); else append. The merge primitive. */
  add(fact: Fact): Fact {
    if (fact.id != null && this._byId.has(fact.id)) {
      this._facts[this._byId.get(fact.id)!] = fact;
    } else {
      this._facts.push(fact);
      if (fact.id != null) this._byId.set(fact.id, this._facts.length - 1);
    }
    if (fact.timestamp && fact.timestamp > (this.last_etched || '')) this.last_etched = fact.timestamp;
    return fact;
  }

  /** Write a fact. If `id` matches an existing fact it's updated in place; else appended. */
  etch(input: EtchInput): Fact {
    return this.add({
      text: input.text,
      id: input.id,
      type: input.type,
      priority: canonicalPriority(input.priority),
      tags: [...(input.tags ?? [])],
      links: [...(input.links ?? [])],
      timestamp: utcnow(),
      source: input.source,
    });
  }

  /**
   * Deterministic recall: case-insensitive substring on `text`, tag intersection,
   * type equality, priority floor — ranked by priority, then recency, then
   * insertion index (so the most-recently-etched fact always wins ties).
   */
  recall(opts: RecallOpts = {}): Fact[] {
    const floor = PRIORITY_RANK[canonicalPriority(opts.minPriority ?? 'ephemeral')] ?? 0;
    const q = (opts.query ?? '').toLowerCase();
    const wantTags = new Set(opts.tags ?? []);
    const indexed = this._facts
      .map((f, i) => ({ f, i }))
      .filter(({ f }) =>
        (!q || f.text.toLowerCase().includes(q)) &&
        (wantTags.size === 0 || f.tags.some((t) => wantTags.has(t))) &&
        (opts.type == null || f.type === opts.type) &&
        ((PRIORITY_RANK[f.priority] ?? 1) >= floor)
      );
    indexed.sort((a, b) => {
      const ra = PRIORITY_RANK[a.f.priority] ?? 1, rb = PRIORITY_RANK[b.f.priority] ?? 1;
      if (ra !== rb) return rb - ra;                       // priority desc
      const ta = a.f.timestamp ?? '', tb = b.f.timestamp ?? '';
      if (ta !== tb) return ta < tb ? 1 : -1;              // recency desc
      return b.i - a.i;                                    // insertion index desc
    });
    const results = indexed.map(({ f }) => f);
    return opts.limit != null ? results.slice(0, opts.limit) : results;
  }

  getFact(id: string): Fact | undefined {
    const i = this._byId.get(id);
    return i != null ? this._facts[i] : undefined;
  }

  /** The lean index — one-liners for always-loaded recall (`id — text`). */
  index(): { id: string; text: string; priority: Priority }[] {
    return this._facts
      .filter((f) => f.id != null)
      .map((f) => ({ id: f.id!, text: f.text, priority: f.priority }));
  }
}
