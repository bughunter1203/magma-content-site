import { join } from "node:path";
import { NextRequest, NextResponse } from "next/server";
import { JsonlSubscriberStore } from "@/lib/subscribers/jsonl-store";
import { SubscribeError, subscribeToNewsletter } from "@/lib/subscribers/subscribe";

const SUCCESS_MESSAGE = "구독 신청이 접수되었습니다.";
const INVALID_EMAIL_MESSAGE = "유효한 이메일을 입력하세요.";
const STORE_FAILURE_MESSAGE = "지금은 구독 신청을 저장할 수 없습니다. 잠시 후 다시 시도하세요.";

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: INVALID_EMAIL_MESSAGE }, { status: 422 });
  }

  try {
    await subscribeToNewsletter(body, createSubscriberStore());
    return NextResponse.json({ ok: true, message: SUCCESS_MESSAGE }, { status: 201 });
  } catch (error) {
    if (error instanceof SubscribeError) {
      return NextResponse.json({ error: error.publicMessage }, { status: error.status });
    }

    console.error("[newsletter] subscribe storage failed");
    return NextResponse.json({ error: STORE_FAILURE_MESSAGE }, { status: 500 });
  }
}

function createSubscriberStore() {
  return new JsonlSubscriberStore({
    filePath: join(process.cwd(), "data", "newsletter-subscribers.jsonl"),
  });
}
