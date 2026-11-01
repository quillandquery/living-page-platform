/**
 * An in-memory stand-in for the slice of supabase-js the app uses, so the
 * visibility rules can be tested without a database.
 *
 * It models Row Level Security the way migration 0006 states it, and — the
 * point — lets a test TURN RLS OFF. With RLS off, every row is visible to
 * every viewer, which is what a loosened/missing policy would do. A query that
 * is only safe because RLS saved it will then leak, and the test fails; a
 * query that states the rule itself (`visibility = 'public'`) stays safe.
 */

export type Row = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any

export type FakeDb = { stories: Row[]; profiles: Row[] };
export type FakeOptions = { viewerId: string | null; rls?: boolean };

/** migration 0006 — policy "read public or own" */
export function canSelectStory(row: Row, viewerId: string | null): boolean {
  return (row.status === "published" && row.visibility === "public") || (viewerId !== null && row.author_id === viewerId);
}

export function makeFakeSupabase(db: FakeDb, opts: FakeOptions) {
  const rls = opts.rls ?? true;
  const log: { table: string; op: string; filters: [string, string, unknown][] }[] = [];

  function from(table: "stories" | "profiles") {
    const filters: [string, string, unknown][] = [];
    let op: "select" | "update" | "delete" | "insert" = "select";
    let patch: Row | null = null;
    let selectStr = "*";
    let orderCol: string | null = null;
    let asc = true;
    let lim = Infinity;
    let returning = false;

    const visibleRows = (): Row[] => {
      const rows = db[table];
      if (table === "profiles") return rows;
      return rls ? rows.filter((r) => canSelectStory(r, opts.viewerId)) : rows;
    };

    const matches = (r: Row) =>
      filters.every(([col, kind, val]) => (kind === "eq" ? r[col] === val : r[col] !== val));

    const withEmbeds = (r: Row): Row => {
      if (table === "stories" && /author:profiles/.test(selectStr)) {
        return { ...r, author: db.profiles.find((p) => p.id === r.author_id) ?? null };
      }
      return { ...r };
    };

    const execute = (): { data: Row[]; error: null | { message: string } } => {
      log.push({ table, op, filters: [...filters] });
      if (op === "select") {
        let rows = visibleRows().filter(matches);
        if (orderCol) {
          const c = orderCol;
          rows = [...rows].sort((a, b) => (a[c] < b[c] ? -1 : a[c] > b[c] ? 1 : 0) * (asc ? 1 : -1));
        }
        return { data: rows.slice(0, lim).map(withEmbeds), error: null };
      }
      if (op === "insert") {
        const incoming = (Array.isArray(patch) ? patch : [patch]) as Row[];
        const made = incoming.map((r) => {
          // column defaults from the migrations: visibility 'public', status 'draft'
          const row = { id: `new-${db.stories.length + 1}`, visibility: "public", status: "draft", ...r };
          db.stories.push(row);
          return row;
        });
        return { data: returning ? made.map(withEmbeds) : [], error: null };
      }
      if (op === "update") {
        // update policy: only the row's own author, always — RLS or not the
        // app also adds .eq("author_id") so this mirrors both.
        const rows = db[table].filter((r) => matches(r) && (table !== "stories" || (opts.viewerId !== null && r.author_id === opts.viewerId)));
        rows.forEach((r) => Object.assign(r, patch));
        return { data: returning ? rows.map(withEmbeds) : [], error: null };
      }
      return { data: [], error: null };
    };

    const q: any = { // eslint-disable-line @typescript-eslint/no-explicit-any
      select(cols = "*") { if (op === "select") selectStr = cols; else { returning = true; selectStr = cols; } return q; },
      update(p: Row) { op = "update"; patch = p; return q; },
      insert(p: Row | Row[]) { op = "insert"; patch = p as Row; return q; },
      eq(col: string, val: unknown) { filters.push([col, "eq", val]); return q; },
      neq(col: string, val: unknown) { filters.push([col, "neq", val]); return q; },
      order(col: string, o?: { ascending?: boolean }) { orderCol = col; asc = o?.ascending !== false; return q; },
      limit(n: number) { lim = n; return q; },
      async maybeSingle() { const r = execute(); return { data: r.data[0] ?? null, error: r.error }; },
      async single() { const r = execute(); return { data: r.data[0] ?? null, error: r.data[0] ? null : { message: "no rows" } }; },
      then(res: (v: unknown) => unknown, rej?: (e: unknown) => unknown) { return Promise.resolve(execute()).then(res, rej); },
    };
    return q;
  }

  return {
    from,
    log,
    auth: {
      async getUser() {
        return { data: { user: opts.viewerId ? { id: opts.viewerId } : null }, error: null };
      },
    },
  };
}

/** A small, fixed world: two writers, public + private + draft stories. */
export function seedWorld(): FakeDb {
  const profiles: Row[] = [
    { id: "u-ann", handle: "ann", display_name: "Ann", bio: "", avatar_url: null, created_at: "2026-01-01" },
    { id: "u-bob", handle: "bob", display_name: "Bob", bio: "", avatar_url: null, created_at: "2026-01-01" },
  ];
  const base = { place: "", date: "", accent: "#2B3ED0", backdrop: null, veil: true, source: "words", blocks: [], art_direction: {}, type: "story", world: null, claim_status: "none" };
  const stories: Row[] = [
    { ...base, id: "s-ann-pub", author_id: "u-ann", slug: "ann-public", fragment: "Ann public", status: "published", visibility: "public", published_at: "2026-03-01" },
    { ...base, id: "s-ann-priv", author_id: "u-ann", slug: "ann-private", fragment: "Ann SECRET", status: "published", visibility: "private", published_at: "2026-04-01" },
    { ...base, id: "s-ann-draft", author_id: "u-ann", slug: "ann-draft", fragment: "Ann draft", status: "draft", visibility: "public", published_at: null },
    { ...base, id: "s-bob-pub", author_id: "u-bob", slug: "bob-public", fragment: "Bob public", status: "published", visibility: "public", published_at: "2026-02-01" },
    { ...base, id: "s-bob-priv", author_id: "u-bob", slug: "bob-private", fragment: "Bob SECRET", status: "published", visibility: "private", published_at: "2026-05-01" },
  ];
  return { stories, profiles };
}
