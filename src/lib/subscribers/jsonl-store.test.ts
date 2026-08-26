import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { JsonlSubscriberStore } from "./jsonl-store";

let dir: string;
let filePath: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "magma-newsletter-"));
  filePath = join(dir, "subscribers.jsonl");
});

afterEach(async () => {
  await rm(dir, { force: true, recursive: true });
});

async function readJsonlRecords() {
  const content = await readFile(filePath, "utf8");
  return content
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line) as { email: string; createdAt: string });
}

describe("JsonlSubscriberStore", () => {
  it("JsonlSubscriberStore writes one json line for a new email", async () => {
    const store = new JsonlSubscriberStore({ filePath });

    await store.add("user@example.com");

    const records = await readJsonlRecords();
    expect(records).toHaveLength(1);
    expect(records[0]?.email).toBe("user@example.com");
    expect(records[0]?.createdAt).toEqual(expect.any(String));
  });

  it("JsonlSubscriberStore does not append duplicate normalized email", async () => {
    const store = new JsonlSubscriberStore({ filePath });

    await store.add("user@example.com");
    await store.add("user@example.com");

    await expect(readJsonlRecords()).resolves.toHaveLength(1);
  });

  it("JsonlSubscriberStore returns inserted false for duplicates", async () => {
    const store = new JsonlSubscriberStore({ filePath });

    await expect(store.add("user@example.com")).resolves.toEqual({
      email: "user@example.com",
      inserted: true,
    });
    await expect(store.add("user@example.com")).resolves.toEqual({
      email: "user@example.com",
      inserted: false,
    });
  });
});
