export function SourceIcon({ type, className = "h-5 w-5" }: { type: string; className?: string }) {
  switch (type) {
    case "SLACK":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path
            fill="#36C5F0"
            d="M9.5 2A1.5 1.5 0 0 0 8 3.5v4A1.5 1.5 0 0 0 9.5 9h0A1.5 1.5 0 0 0 11 7.5v-4A1.5 1.5 0 0 0 9.5 2z"
          />
          <path
            fill="#2EB67D"
            d="M3.5 8A1.5 1.5 0 0 0 2 9.5v0A1.5 1.5 0 0 0 3.5 11h4A1.5 1.5 0 0 0 9 9.5v0A1.5 1.5 0 0 0 7.5 8z"
          />
          <path
            fill="#ECB22E"
            d="M14.5 9A1.5 1.5 0 0 0 13 10.5v4a1.5 1.5 0 0 0 1.5 1.5h0a1.5 1.5 0 0 0 1.5-1.5v-4A1.5 1.5 0 0 0 14.5 9z"
          />
          <path
            fill="#E01E5A"
            d="M16.5 13a1.5 1.5 0 0 0-1.5 1.5v0a1.5 1.5 0 0 0 1.5 1.5h4a1.5 1.5 0 0 0 1.5-1.5v0a1.5 1.5 0 0 0-1.5-1.5z"
          />
        </svg>
      );

    case "NOTION":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#000" />
          <path
            fill="#fff"
            d="M7 6.5h1.7l6.2 8V7.2L16.3 6v10.5h-1.7l-6.2-8v8L7 17.4z"
          />
        </svg>
      );

    case "GMAIL":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#fff" stroke="#E2E8F0" />
          <path fill="#4285F4" d="M19 7H5a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h1.2V8.6L12 13l5.8-4.4V17H19a1 1 0 0 0 1-1V8a1 1 0 0 0-1-1z" />
          <path fill="#EA4335" d="M5 7.5 12 13l7-5.5V8L12 14 5 8z" />
        </svg>
      );

    case "JIRA":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#0052CC" />
          <path
            fill="#fff"
            d="M12 4 6 10h3.2c0 1.77 1.43 3.2 3.2 3.2V16zm0 8.8L18 7h-3.2c0-1.77-1.43-3.2-3.2-3.2V4zm0 0v3.2c-1.77 0-3.2 1.43-3.2 3.2H6z"
          />
        </svg>
      );

    case "LINEAR":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#101113" />
          <path fill="#fff" d="M5 14.5 14.5 5l1.4 1.4L6.4 15.9z" />
          <path fill="#5E6AD2" d="M5 9.5 9.5 5l1.4 1.4L6.4 10.9z" />
          <path fill="#fff" d="M8 18.5 18.5 8l1.4 1.4-10.5 10.5z" />
        </svg>
      );

    case "GITHUB":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#181717" />
          <path
            fill="#fff"
            fillRule="evenodd"
            clipRule="evenodd"
            d="M12 3.5c-4.7 0-8.5 3.8-8.5 8.5 0 3.76 2.44 6.95 5.81 8.08.42.08.58-.18.58-.41 0-.2-.01-.88-.01-1.6-2.37.51-2.86-1.14-2.86-1.14-.39-.98-.94-1.25-.94-1.25-.77-.52.06-.51.06-.51.85.06 1.3.87 1.3.87.76 1.3 1.99.92 2.47.71.08-.55.3-.92.54-1.13-1.89-.21-3.87-.94-3.87-4.2 0-.93.33-1.69.87-2.28-.09-.21-.38-1.08.08-2.25 0 0 .71-.23 2.34.87a8.2 8.2 0 0 1 4.26 0c1.63-1.1 2.34-.87 2.34-.87.46 1.17.17 2.04.08 2.25.54.59.87 1.35.87 2.28 0 3.27-1.99 3.99-3.88 4.2.31.27.57.78.57 1.57 0 1.14-.01 2.05-.01 2.33 0 .23.16.5.58.41A8.51 8.51 0 0 0 20.5 12c0-4.7-3.8-8.5-8.5-8.5z"
          />
        </svg>
      );

    case "CONFLUENCE":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#fff" stroke="#E2E8F0" />
          <path
            fill="#2684FF"
            d="M4.5 16.2c-.4.65-.15 1.5.5 1.9.65.4 1.5.15 1.9-.5 1.7-2.75 3.4-2.4 6.3-.95l3 1.5.95-2.5-3-1.5c-4.1-2.05-6.95-2.1-9.65 2.05z"
          />
          <path
            fill="#2684FF"
            d="M19.5 7.8c.4-.65.15-1.5-.5-1.9-.65-.4-1.5-.15-1.9.5-1.7 2.75-3.4 2.4-6.3.95l-3-1.5-.95 2.5 3 1.5c4.1 2.05 6.95 2.1 9.65-2.05z"
          />
        </svg>
      );

    case "GOOGLE_DRIVE":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <path fill="#0066DA" d="M8.2 2 2 12.8 4.9 18 11.1 7.2z" />
          <path fill="#00AC47" d="M12.9 7.2 6.7 18h12.6L16 12.8z" />
          <path fill="#EA4335" d="M19.3 18 22 12.8 15.8 2H10.2L16.4 12.8 19.3 18z" />
        </svg>
      );

    case "ZOOM":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect width="24" height="24" rx="5" fill="#2D8CFF" />
          <rect x="3.5" y="8" width="11" height="8" rx="1.5" fill="#fff" />
          <path fill="#fff" d="m16 11 4-2.5v7L16 13z" />
        </svg>
      );

    case "HUBSPOT":
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <circle cx="12" cy="12" r="12" fill="#FF7A59" />
          <circle cx="9" cy="14.5" r="2.5" fill="none" stroke="#fff" strokeWidth="1.5" />
          <circle cx="16" cy="7" r="1.6" fill="#fff" />
          <path stroke="#fff" strokeWidth="1.5" d="M9 12V8.5M9 12 14 9" fill="none" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
          <rect width="24" height="24" rx="4" fill="#E2E8F0" />
          <path fill="#94A3B8" d="M6 5h8l4 4v10H6z" opacity="0.6" />
          <path fill="#64748B" d="M14 5v4h4z" opacity="0.8" />
        </svg>
      );
  }
}
