import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import { createMockRoom } from "@baditaflorin/mesh-common/testing";
import { Feature, isValidChallenge } from "../../src/Feature";
import { config } from "../../src/config";

describe("Feature", () => {
  it("renders an accessible shared-board empty state", () => {
    const room = createMockRoom();
    render(<Feature room={room} config={config} />);
    expect(screen.getByRole("heading", { name: "Skill challenge" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Challenges in this room" })).toBeInTheDocument();
  });

  it("accepts bounded valid records and rejects malformed data", () => {
    expect(
      isValidChallenge({
        id: "challenge1",
        title: "Try one kind introduction",
        skill: "Speaking",
        detail: "",
        createdBy: "Ari",
        createdAt: 1,
        completedBy: [],
      }),
    ).toBe(true);
    expect(
      isValidChallenge({
        id: "x",
        title: "no",
        skill: "Nope" as "Writing",
        detail: "",
        createdBy: "",
        createdAt: Number.NaN,
        completedBy: ["A", "A"],
      }),
    ).toBe(false);
  });
});
