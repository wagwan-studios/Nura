"use client";

export function CommandPaletteTrigger() {
  return (
    <button
      className="topbar-search"
      type="button"
      onClick={() => {
        window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true }));
      }}
    >
      <span>⌘K — search customers, pages...</span>
    </button>
  );
}
