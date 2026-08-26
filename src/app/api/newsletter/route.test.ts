import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { POST } from "./route";

const originalCwd = process.cwd();
let dir: string;

beforeEach(async () => {
  dir = await mkdtemp(join(tmpdir(), "magma-newsletter-route-"));
  process.chdir(dir);
});

afterEach(async () => {
  process.chdir(originalCwd);
  await rm(dir, { force: true, recursive: true });
});

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/newsletter", {
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
    method: "POST",
  });
}

async function readJson(response: Response) {
  return (await response.json()) as unknown;
}

describe("POST /api/newsletter", () => {
  it("POST returns 201 with generic success for a new email", async () => {
    const response = await POST(jsonRequest({ email: "user@example.com" }));

    expect(response.status).toBe(201);
    expect(await readJson(response)).toEqual({
      ok: true,
      message: "구독 신청이 접수되었습니다.",
    });
  });

  it("POST returns the same success for a duplicate email", async () => {
    await POST(jsonRequest({ email: "user@example.com" }));

    const response = await POST(jsonRequest({ email: "user@example.com" }));

    expect(response.status).toBe(201);
    expect(await readJson(response)).toEqual({
      ok: true,
      message: "구독 신청이 접수되었습니다.",
    });
  });

  it("POST returns 422 and does not expose email for invalid email", async () => {
    const submittedEmail = "not-an-email";

    const response = await POST(jsonRequest({ email: submittedEmail }));
    const serializedBody = JSON.stringify(await readJson(response));

    expect(response.status).toBe(422);
    expect(serializedBody).toBe(JSON.stringify({ error: "유효한 이메일을 입력하세요." }));
    expect(serializedBody).not.toContain(submittedEmail);
  });

  it("POST returns 422 for non json body", async () => {
    const response = await POST(
      new NextRequest("http://localhost/api/newsletter", {
        body: "not json",
        method: "POST",
      }),
    );

    expect(response.status).toBe(422);
    expect(await readJson(response)).toEqual({ error: "유효한 이메일을 입력하세요." });
  });

  it("POST returns 500 without internal details when store fails", async () => {
    await writeFile(join(dir, "data"), "not a directory", "utf8");
    const submittedEmail = "user@example.com";
    const internalPath = join(dir, "data", "newsletter-subscribers.jsonl");

    const response = await POST(jsonRequest({ email: submittedEmail }));
    const serializedBody = JSON.stringify(await readJson(response));

    expect(response.status).toBe(500);
    expect(serializedBody).toBe(
      JSON.stringify({ error: "지금은 구독 신청을 저장할 수 없습니다. 잠시 후 다시 시도하세요." }),
    );
    expect(serializedBody).not.toContain(submittedEmail);
    expect(serializedBody).not.toContain(internalPath);
    expect(serializedBody).not.toContain("not a directory");
  });
});
