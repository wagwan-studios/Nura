export const TYPE_PILL: Record<string, string> = {
  PROCESS: "pill-blue",
  DECISION: "pill-violet",
  EXCEPTION: "pill-orange",
  POLICY: "pill-green",
};

export const TYPE_ICON_BG: Record<string, { bg: string; fg: string }> = {
  PROCESS: { bg: "var(--blue-bg)", fg: "var(--blue)" },
  DECISION: { bg: "var(--violet-bg)", fg: "var(--violet)" },
  EXCEPTION: { bg: "var(--orange-bg)", fg: "var(--orange)" },
  POLICY: { bg: "var(--green-bg)", fg: "var(--green)" },
};

export const SOURCE_ICON_BG: Record<string, string> = {
  SLACK: "#F8F8F8",
  NOTION: "#F7F6F4",
  GMAIL: "#FFFFFF",
  JIRA: "#E9F2FF",
  LINEAR: "#F5F5F6",
  GITHUB: "#F0F0F0",
  CONFLUENCE: "#FFFFFF",
  GDRIVE: "#F5F9FF",
  ZOOM: "#EAF3FF",
  HUBSPOT: "#FFF3EF",
  MANUAL: "#F5F3EE",
};
