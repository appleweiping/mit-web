import React, { useState } from "react";

/**
 * A controlled text input with a submit button. Presentational and self-
 * contained: it owns the draft text and calls `onSubmit(value)` with a trimmed,
 * non-empty value, then clears itself. Used for both new stories and comments.
 */
export default function NewPostInput({ onSubmit, placeholder = "What's on your mind?", buttonLabel = "Post", maxLength = 280 }) {
  const [value, setValue] = useState("");

  const submit = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    onSubmit(trimmed);
    setValue("");
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      submit();
    }
  };

  return (
    <div className="NewPostInput">
      <input
        type="text"
        aria-label={placeholder}
        placeholder={placeholder}
        value={value}
        maxLength={maxLength}
        onChange={(e) => setValue(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <button type="button" onClick={submit} disabled={!value.trim()}>
        {buttonLabel}
      </button>
    </div>
  );
}
