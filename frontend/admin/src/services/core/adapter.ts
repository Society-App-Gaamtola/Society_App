import { API_URL, DATA_MODE, MOCK_UPLOAD_MAX_MB, SEED_VERSION } from '@/config';
import type { Id } from '@/types';

export type Filters = Record<string, string | number | boolean | undefined>;

export type ListParams = {
  page?: number;
  pageSize?: number;
  search?: string;
  /** Exact matches; keys ending in _gte / _lte are range filters. */
  filters?: Filters;
  sort?: { field: string; order: 'asc' | 'desc' };
};

export type ListResult<T> = { data: T[]; total: number };

export type Row = Record<string, unknown> & { id: Id };

export type DataAdapter = {
  list(collection: string, params: ListParams): Promise<ListResult<Row>>;
  get(collection: string, id: Id): Promise<Row>;
  create(collection: string, body: object): Promise<Row>;
  update(collection: string, id: Id, body: object): Promise<Row>;
  remove(collection: string, id: Id): Promise<void>;
  getObject(name: string): Promise<Row>;
  patchObject(name: string, body: object): Promise<Row>;
  upload(file: File): Promise<{ url: string }>;
};

async function request(path: string, init?: RequestInit) {
  const res = await fetch(`${API_URL}${path}`, { cache: 'no-store', ...init });
  if (!res.ok) throw new Error(`Request failed (${res.status})`);
  return res;
}

const jsonInit = (method: string, body: object): RequestInit => ({
  method,
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(body),
});

const localServerAdapter: DataAdapter = {
  async list(collection, { page, pageSize, search, filters, sort }) {
    const query = new URLSearchParams();
    if (page) query.set('_page', String(page));
    if (pageSize) query.set('_limit', String(pageSize));
    if (search) query.set('q', search);
    if (sort) {
      query.set('_sort', sort.field);
      query.set('_order', sort.order);
    }
    for (const [key, value] of Object.entries(filters ?? {})) {
      if (value !== undefined && value !== '') query.set(key, String(value));
    }
    const res = await request(`/api/${collection}?${query}`);
    const data = (await res.json()) as Row[];
    return { data, total: Number(res.headers.get('X-Total-Count') ?? data.length) };
  },
  get: async (collection, id) => (await request(`/api/${collection}/${id}`)).json(),
  create: async (collection, body) => (await request(`/api/${collection}`, jsonInit('POST', body))).json(),
  update: async (collection, id, body) => (await request(`/api/${collection}/${id}`, jsonInit('PATCH', body))).json(),
  remove: async (collection, id) => {
    await request(`/api/${collection}/${id}`, { method: 'DELETE' });
  },
  getObject: async (name) => (await request(`/api/${name}`)).json(),
  patchObject: async (name, body) => (await request(`/api/${name}`, jsonInit('PATCH', body))).json(),
  upload: async (file) => {
    const form = new FormData();
    form.append('file', file);
    return (await request('/upload', { method: 'POST', body: form })).json();
  },
};

// --- mock mode: the whole database lives in this browser's localStorage, starting from seed.json.
const MOCK_KEY = 'admin_mock_db';
const MOCK_VERSION_KEY = 'admin_mock_db_version';
type MockDb = Record<string, unknown>;

function writeMock(db: MockDb) {
  try {
    localStorage.setItem(MOCK_KEY, JSON.stringify(db));
    localStorage.setItem(MOCK_VERSION_KEY, SEED_VERSION);
  } catch {
    throw new Error('Demo storage is full. Remove some uploaded photos or reset the demo data in Settings.');
  }
}

// Pages fire many reads at once on first visit; they must share one seeding, not each write their own copy.
let seeding: Promise<void> | null = null;

async function readMock(): Promise<MockDb> {
  const fresh = () => !!localStorage.getItem(MOCK_KEY) && localStorage.getItem(MOCK_VERSION_KEY) === SEED_VERSION;
  if (!fresh()) {
    seeding ??= import('../seed.json')
      .then(({ default: seed }) => {
        if (!fresh()) writeMock(structuredClone(seed) as MockDb);
      })
      .finally(() => {
        seeding = null;
      });
    await seeding;
  }
  return JSON.parse(localStorage.getItem(MOCK_KEY) as string);
}

/** Throws away this browser's changes and starts again from seed.json. */
export function resetMockData() {
  localStorage.removeItem(MOCK_KEY);
  localStorage.removeItem(MOCK_VERSION_KEY);
}

/** Uploads become data: URLs so they survive a reload; size is capped to fit browser storage. */
const readAsDataUrl = (file: File) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error('Could not read the file.'));
    reader.readAsDataURL(file);
  });

const matches = (row: Row, key: string, value: string | number | boolean) => {
  if (key.endsWith('_gte')) return String(row[key.slice(0, -4)] ?? '') >= String(value);
  if (key.endsWith('_lte')) return String(row[key.slice(0, -4)] ?? '') <= String(value);
  return String(row[key]) === String(value);
};

const sameId = (a: Id, b: Id) => String(a) === String(b);

const mockAdapter: DataAdapter = {
  async list(collection, { page, pageSize, search, filters, sort }) {
    let rows = ((await readMock())[collection] ?? []) as Row[];
    const q = search?.toLowerCase();
    if (q) rows = rows.filter((r) => Object.values(r).some((v) => String(v).toLowerCase().includes(q)));
    for (const [key, value] of Object.entries(filters ?? {})) {
      if (value !== undefined && value !== '') rows = rows.filter((r) => matches(r, key, value));
    }
    if (sort) {
      const dir = sort.order === 'asc' ? 1 : -1;
      rows = [...rows].sort((a, b) => {
        const x = a[sort.field] as string | number;
        const y = b[sort.field] as string | number;
        return x < y ? -dir : x > y ? dir : 0;
      });
    }
    const total = rows.length;
    if (page && pageSize) rows = rows.slice((page - 1) * pageSize, page * pageSize);
    return { data: rows, total };
  },
  async get(collection, id) {
    const row = ((await readMock())[collection] as Row[]).find((r) => sameId(r.id, id));
    if (!row) throw new Error('Record not found');
    return row;
  },
  async create(collection, body) {
    const db = await readMock();
    const rows = (db[collection] ?? []) as Row[];
    const row = { ...body, id: Math.max(0, ...rows.map((r) => Number(r.id) || 0)) + 1 } as Row;
    db[collection] = [...rows, row];
    writeMock(db);
    return row;
  },
  async update(collection, id, body) {
    const db = await readMock();
    const rows = db[collection] as Row[];
    const current = rows.find((r) => sameId(r.id, id));
    if (!current) throw new Error('Record not found');
    const row = { ...current, ...body } as Row;
    db[collection] = rows.map((r) => (sameId(r.id, id) ? row : r));
    writeMock(db);
    return row;
  },
  async remove(collection, id) {
    const db = await readMock();
    db[collection] = (db[collection] as Row[]).filter((r) => !sameId(r.id, id));
    writeMock(db);
  },
  getObject: async (name) => (await readMock())[name] as Row,
  async patchObject(name, body) {
    const db = await readMock();
    db[name] = { ...(db[name] as Row), ...body };
    writeMock(db);
    return db[name] as Row;
  },
  async upload(file) {
    if (file.size > MOCK_UPLOAD_MAX_MB * 1024 * 1024) {
      throw new Error(`In the demo, files must be smaller than ${MOCK_UPLOAD_MAX_MB} MB.`);
    }
    return { url: await readAsDataUrl(file) };
  },
};

const notImplemented = async (): Promise<never> => {
  throw new Error('Supabase mode is not implemented yet.');
};

// TODO(supabase): replace each method with the matching Supabase query.
const supabaseAdapter: DataAdapter = {
  list: notImplemented,
  get: notImplemented,
  create: notImplemented,
  update: notImplemented,
  remove: notImplemented,
  getObject: notImplemented,
  patchObject: notImplemented,
  upload: notImplemented,
};

const adapters: Record<typeof DATA_MODE, DataAdapter> = {
  'local-server': localServerAdapter,
  mock: mockAdapter,
  supabase: supabaseAdapter,
};

export const adapter = adapters[DATA_MODE];
