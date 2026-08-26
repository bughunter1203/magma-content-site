import { cleanup, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import NewsletterSignup from "./NewsletterSignup";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

describe("NewsletterSignup", () => {
  it("NewsletterSignup does not submit malformed email", async () => {
    const fetchMock = vi.spyOn(globalThis, "fetch");
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByLabelText("이메일"), "not-an-email");
    await user.click(screen.getByRole("button", { name: "구독 신청" }));

    expect(fetchMock).not.toHaveBeenCalled();
    expect(screen.getByText("유효한 이메일을 입력하세요.")).toBeInTheDocument();
  });

  it("NewsletterSignup disables submit button while submitting", async () => {
    let resolveFetch: (response: Response) => void = () => {};
    vi.spyOn(globalThis, "fetch").mockImplementation(
      () =>
        new Promise<Response>((resolve) => {
          resolveFetch = resolve;
        }),
    );
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByLabelText("이메일"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "구독 신청" }));

    expect(screen.getByRole("button", { name: "처리 중" })).toBeDisabled();
    resolveFetch(new Response(JSON.stringify({ ok: true }), { status: 201 }));
  });

  it("NewsletterSignup shows thank you message on success", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ ok: true, message: "구독 신청이 접수되었습니다." }), { status: 201 }),
    );
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    await user.type(screen.getByLabelText("이메일"), "user@example.com");
    await user.click(screen.getByRole("button", { name: "구독 신청" }));

    expect(await screen.findByText("구독 신청이 접수되었습니다.")).toBeInTheDocument();
  });

  it("NewsletterSignup preserves input value on failure", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ error: "지금은 구독 신청을 저장할 수 없습니다. 잠시 후 다시 시도하세요." }), {
        status: 500,
      }),
    );
    const user = userEvent.setup();
    render(<NewsletterSignup />);

    const input = screen.getByLabelText("이메일");
    await user.type(input, "user@example.com");
    await user.click(screen.getByRole("button", { name: "구독 신청" }));

    expect(
      await screen.findByText("지금은 구독 신청을 저장할 수 없습니다. 잠시 후 다시 시도하세요."),
    ).toBeInTheDocument();
    await waitFor(() => expect(input).toHaveValue("user@example.com"));
  });
});
