import { describe, it, expect, afterEach } from "vitest";
import { promises as fs } from "fs";
import path from "path";
import type { Card } from "@kadcompare/core";
import {
  FilesystemCardsRepository,
  RedisCardsRepository,
  getCardsRepository,
  _resetCardsRepositoryForTests,
  type RedisLikeClient,
} from "@/lib/data/cardsRepository";

function makeCard(id: string): Card {
  return {
    id,
    name: `Test ${id}`,
    bank: "Test Bank",
    network: "Visa",
    rewardType: "cashback",
    color: "#000",
    annualFee: 0,
    feeWaiver: { type: "always" },
    minAnnualIncome: 0,
    baseRule: { category: "general", rate: 0.005, unit: "percent" },
    earnRules: [],
    perks: [],
    lastVerified: "2026-06-25",
    sourceUrl: "https://example.com",
    confidence: "high",
  };
}

/** In-memory stand-in for the real redis client — proves RedisCardsRepository's
 *  own read/write/serialization logic without needing a live connection. */
class FakeRedisClient implements RedisLikeClient {
  store = new Map<string, string>();
  async get(key: string) {
    return this.store.get(key) ?? null;
  }
  async set(key: string, value: string) {
    this.store.set(key, value);
    return "OK";
  }
}

describe("RedisCardsRepository", () => {
  it("returns an empty array when the key has never been written", async () => {
    const repo = new RedisCardsRepository(new FakeRedisClient());
    expect(await repo.getAll()).toEqual([]);
  });

  it("round-trips a full write/read cycle", async () => {
    const repo = new RedisCardsRepository(new FakeRedisClient());
    const cards = [makeCard("a"), makeCard("b")];
    await repo.writeAll(cards);
    expect(await repo.getAll()).toEqual(cards);
  });

  it("overwrites the previous value on a second write", async () => {
    const client = new FakeRedisClient();
    const repo = new RedisCardsRepository(client);
    await repo.writeAll([makeCard("a")]);
    await repo.writeAll([makeCard("b")]);
    const result = await repo.getAll();
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("b");
  });

  it("stores the catalogue under a single well-known key", async () => {
    const client = new FakeRedisClient();
    const repo = new RedisCardsRepository(client);
    await repo.writeAll([makeCard("a")]);
    expect(client.store.has("kadcompare:cards")).toBe(true);
  });
});

describe("FilesystemCardsRepository", () => {
  const realDataPath = path.join(process.cwd(), "packages", "core", "src", "data", "cards.json");
  // A dedicated scratch file for write-path tests — never touches the shared
  // production cards.json, which other test files read concurrently.
  const scratchPath = path.join(process.cwd(), "tests", ".scratch-cards.json");

  afterEach(async () => {
    await fs.rm(scratchPath, { force: true });
  });

  it("reads the real catalogue file", async () => {
    const repo = new FilesystemCardsRepository(realDataPath);
    const cards = await repo.getAll();
    expect(cards.length).toBeGreaterThan(0);
  });

  it("round-trips a write back through getAll (scratch file, not the shared catalogue)", async () => {
    const repo = new FilesystemCardsRepository(scratchPath);
    const cards = [makeCard("roundtrip-test")];
    await repo.writeAll(cards);
    expect(await repo.getAll()).toEqual(cards);
  });
});

describe("getCardsRepository (backend selection)", () => {
  const originalUrl = process.env.REDIS_URL;

  afterEach(() => {
    if (originalUrl === undefined) delete process.env.REDIS_URL;
    else process.env.REDIS_URL = originalUrl;
    _resetCardsRepositoryForTests();
  });

  it("defaults to the filesystem backend when REDIS_URL is unset", async () => {
    delete process.env.REDIS_URL;
    _resetCardsRepositoryForTests();
    const repo = await getCardsRepository();
    expect(repo).toBeInstanceOf(FilesystemCardsRepository);
  });
});
