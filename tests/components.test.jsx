import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import NewPostInput from "../client/src/components/NewPostInput.jsx";
import Story from "../client/src/components/Story.jsx";
import { formatParams } from "../client/src/utilities.js";

describe("utilities.formatParams", () => {
  it("encodes params into a query string", () => {
    expect(formatParams({ parent: "abc", q: "a b" })).toBe("parent=abc&q=a%20b");
  });
  it("returns empty string for no params", () => {
    expect(formatParams({})).toBe("");
  });
});

describe("<NewPostInput />", () => {
  it("submits trimmed text and clears the field", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NewPostInput onSubmit={onSubmit} placeholder="Share a story…" />);

    const input = screen.getByLabelText("Share a story…");
    await user.type(input, "  a new story  ");
    await user.click(screen.getByRole("button", { name: "Post" }));

    expect(onSubmit).toHaveBeenCalledWith("a new story");
    expect(input).toHaveValue("");
  });

  it("does not submit empty/whitespace text", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NewPostInput onSubmit={onSubmit} />);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    await user.type(screen.getByRole("textbox"), "   ");
    expect(button).toBeDisabled();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("submits on Enter", async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn();
    render(<NewPostInput onSubmit={onSubmit} />);
    await user.type(screen.getByRole("textbox"), "via enter{Enter}");
    expect(onSubmit).toHaveBeenCalledWith("via enter");
  });
});

describe("<Story />", () => {
  const story = {
    _id: "s1",
    creator_id: "u2",
    creator_name: "Ada",
    content: "Hello world",
    likes: [],
    likeCount: 0,
  };

  it("renders author, content and like count", () => {
    render(<Story story={story} currentUser={null} />);
    expect(screen.getByText("Ada")).toBeInTheDocument();
    expect(screen.getByText("Hello world")).toBeInTheDocument();
    expect(screen.getByText("0")).toBeInTheDocument();
  });

  it("disables the like button when logged out", () => {
    render(<Story story={story} currentUser={null} />);
    expect(screen.getByRole("button", { name: /like story/i })).toBeDisabled();
  });

  it("calls onToggleLike with the next liked state", async () => {
    const user = userEvent.setup();
    const onToggleLike = vi.fn();
    render(<Story story={story} currentUser={{ _id: "u1", name: "Me" }} onToggleLike={onToggleLike} />);
    await user.click(screen.getByRole("button", { name: /like story/i }));
    expect(onToggleLike).toHaveBeenCalledWith(story, true);
  });

  it("reflects an already-liked story with aria-pressed", () => {
    const liked = { ...story, likes: ["u1"], likeCount: 1 };
    render(<Story story={liked} currentUser={{ _id: "u1", name: "Me" }} />);
    const btn = screen.getByRole("button", { name: /unlike story/i });
    expect(btn).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByText("1")).toBeInTheDocument();
  });

  it("renders its comments", () => {
    const comments = [
      { _id: "c1", creator_name: "Bob", content: "nice" },
      { _id: "c2", creator_name: "Cid", content: "cool" },
    ];
    render(<Story story={story} currentUser={null} comments={comments} />);
    expect(screen.getByText("nice")).toBeInTheDocument();
    expect(screen.getByText("cool")).toBeInTheDocument();
  });
});
