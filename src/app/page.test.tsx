import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import Home from "./page";

afterEach(() => {
  cleanup();
});

describe("Home", () => {
  it("Home renders newsletter section after brand section and before latest posts", () => {
    const { container } = render(<Home />);
    const text = container.textContent ?? "";

    const brandIndex = text.indexOf("브랜드");
    const newsletterIndex = text.indexOf("뉴스레터");
    const latestPostsIndex = text.indexOf("최신 글");

    expect(brandIndex).toBeGreaterThanOrEqual(0);
    expect(newsletterIndex).toBeGreaterThan(brandIndex);
    expect(latestPostsIndex).toBeGreaterThan(newsletterIndex);
  });

  it("Home includes exactly one newsletter email field", () => {
    render(<Home />);

    expect(screen.getAllByLabelText("이메일")).toHaveLength(1);
  });
});
