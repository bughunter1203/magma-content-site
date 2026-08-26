import { isValidEmail, normalizeEmail } from "./email";
import type { SubscriberStore } from "./store";

const INVALID_EMAIL_MESSAGE = "유효한 이메일을 입력하세요.";

export class SubscribeError extends Error {
  constructor(
    public readonly status: number,
    public readonly publicMessage: string,
  ) {
    super(publicMessage);
    this.name = "SubscribeError";
  }
}

export async function subscribeToNewsletter(
  input: unknown,
  store: SubscriberStore,
): Promise<{ ok: true }> {
  if (!isEmailPayload(input)) {
    throw new SubscribeError(422, INVALID_EMAIL_MESSAGE);
  }

  const email = normalizeEmail(input.email);
  if (!isValidEmail(email)) {
    throw new SubscribeError(422, INVALID_EMAIL_MESSAGE);
  }

  await store.add(email);
  return { ok: true };
}

function isEmailPayload(input: unknown): input is { email: string } {
  return typeof input === "object" && input !== null && typeof (input as { email?: unknown }).email === "string";
}
