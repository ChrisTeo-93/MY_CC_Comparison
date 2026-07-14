import { promises as fs } from "fs";
import path from "path";
import type { Card } from "@kadcompare/core";

/**
 * Storage-agnostic access to the full card catalogue. `cardStore.ts` (the
 * public API used by the admin routes) delegates all reads/writes here, so
 * swapping storage backends never touches validation or route code.
 */
export interface CardsRepository {
  getAll(): Promise<Card[]>;
  writeAll(cards: Card[]): Promise<void>;
}

const DATA_PATH = path.join(process.cwd(), "packages", "core", "src", "data", "cards.json");

/**
 * Default backend: the repo's own JSON file. Works in local dev and on any
 * Node host with a writable filesystem. On a read-only serverless platform
 * (e.g. Vercel) writes won't persist across invocations — see
 * RedisCardsRepository for the production-persistent alternative.
 */
export class FilesystemCardsRepository implements CardsRepository {
  // Path is overridable (tests point this at a scratch file) so writes never
  // touch the shared production cards.json that other test files read.
  constructor(private dataPath: string = DATA_PATH) {}

  async getAll(): Promise<Card[]> {
    const raw = await fs.readFile(this.dataPath, "utf8");
    return JSON.parse(raw) as Card[];
  }

  async writeAll(cards: Card[]): Promise<void> {
    await fs.writeFile(this.dataPath, JSON.stringify(cards, null, 2) + "\n", "utf8");
  }
}

/** The minimal client surface RedisCardsRepository needs — satisfied by the real `redis` package client. */
export interface RedisLikeClient {
  get(key: string): Promise<string | null | undefined>;
  set(key: string, value: string): Promise<unknown>;
}

const REDIS_KEY = "kadcompare:cards";

/**
 * Persistent backend for serverless platforms: the whole catalogue is stored
 * as one JSON blob under a single key. This matches the existing data model
 * (the admin UI and cardStore.ts already operate on "the whole array") so no
 * schema/migration work is needed — just a different place to keep the blob.
 *
 * The client is injected so this class has no dependency on a live connection
 * to be unit-tested; `getCardsRepository()` below wires up the real `redis`
 * package client when REDIS_URL is configured.
 */
export class RedisCardsRepository implements CardsRepository {
  constructor(private client: RedisLikeClient) {}

  async getAll(): Promise<Card[]> {
    const raw = await this.client.get(REDIS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Card[];
  }

  async writeAll(cards: Card[]): Promise<void> {
    await this.client.set(REDIS_KEY, JSON.stringify(cards));
  }
}

let cached: CardsRepository | undefined;
let cachedRedisClient: RedisLikeClient | undefined;

async function getRedisClient(): Promise<RedisLikeClient> {
  if (cachedRedisClient) return cachedRedisClient;
  // Lazy import: only pull in the redis package when it's actually configured,
  // so nothing about it affects environments running the filesystem backend.
  const { createClient } = await import("redis");
  const client = createClient({ url: process.env.REDIS_URL });
  await client.connect();
  cachedRedisClient = client; // direct assignment — proves structural compatibility, no cast
  return cachedRedisClient;
}

/**
 * Picks the storage backend: Redis when REDIS_URL is set (persists across
 * Vercel's serverless invocations), otherwise the repo's JSON file (local dev,
 * or any Node host with a writable filesystem). Cached per warm process.
 */
export async function getCardsRepository(): Promise<CardsRepository> {
  if (cached) return cached;
  if (process.env.REDIS_URL) {
    cached = new RedisCardsRepository(await getRedisClient());
  } else {
    cached = new FilesystemCardsRepository();
  }
  return cached;
}

/** Test-only: clear the cached repository/client so tests can swap env/config between cases. */
export function _resetCardsRepositoryForTests(): void {
  cached = undefined;
  cachedRedisClient = undefined;
}
