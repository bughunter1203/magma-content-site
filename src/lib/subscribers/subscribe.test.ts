import { describe, expect, it } from "vitest";
import { SubscribeError, subscribeToNewsletter } from "./subscribe";
import type { SubscriberStore } from "./store";

function createStore(inserted: boolean): SubscriberStore & { saved: string[] } {
  return {
    saved: [],
    async add(email: string) {
      this.saved.push(email);
      return { email, inserted };
    },
  };
}

describe("subscribeToNewsletter", () => {
  it("subscribeToNewsletter normalizes before saving", async () => {
    const store = createStore(true);

    await expect(
      subscribeToNewsletter({ email: "  USER@Example.COM " }, store),
    ).resolves.toEqual({ ok: true });

    expect(store.saved).toEqual(["user@example.com"]);
  });

  it("subscribeToNewsletter rejects malformed email without saving", async () => {
    const store = createStore(true);

    await expect(subscribeToNewsletter({ email: "not-an-email" }, store)).rejects.toBeInstanceOf(
      SubscribeError,
    );

    expect(store.saved).toEqual([]);
  });

  it("subscribeToNewsletter returns the same success for duplicate and new emails", async () => {
    await expect(subscribeToNewsletter({ email: "new@example.com" }, createStore(true))).resolves.toEqual({
      ok: true,
    });
    await expect(
      subscribeToNewsletter({ email: "duplicate@example.com" }, createStore(false)),
    ).resolves.toEqual({ ok: true });
  });

  it("subscribeToNewsletter rejects non object payload without saving", async () => {
    for (const input of [null, "user@example.com", {}, { email: 123 }]) {
      const store = createStore(true);

      await expect(subscribeToNewsletter(input, store)).rejects.toBeInstanceOf(SubscribeError);
      expect(store.saved).toEqual([]);
    }
  });
});
