import { describe, expect, it } from "vitest";
import React from "react";
import { render } from "ink-testing-library";
import { App } from "../../src/tui/App.js";
import { DEFAULT_CONFIG } from "../../src/core/config.js";

describe("TUI smoke", () => {
  it("mounts without throwing", () => {
    const { lastFrame, unmount } = render(<App initial={DEFAULT_CONFIG} />);
    expect(lastFrame()).toContain("ccstatusline");
    unmount();
  });
});
