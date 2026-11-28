import type { ReactNode } from "react";
import type { AdminNotificationCategory } from "@/types";

const PATHS: Record<AdminNotificationCategory, ReactNode> = {
  THANKS: (
    <path
      d="M12 20s-7-4.35-7-9.5A4.5 4.5 0 0 1 12 7a4.5 4.5 0 0 1 7 3.5C19 15.65 12 20 12 20Z"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  ),
  ANNOUNCEMENT: (
    <>
      <path
        d="M4 10v4a1 1 0 0 0 1 1h2l5 3V6L7 9H5a1 1 0 0 0-1 1Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M15.5 9a4 4 0 0 1 0 6M18 6.5a8 8 0 0 1 0 11"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  UPDATE: (
    <>
      <path
        d="M12 4v10m0 0 3.5-3.5M12 14 8.5 10.5"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 16.5v1A2.5 2.5 0 0 0 7.5 20h9a2.5 2.5 0 0 0 2.5-2.5v-1"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </>
  ),
  EVENT: (
    <>
      <path
        d="M12 3.5 14 9l5.5.4-4.2 3.6 1.3 5.4L12 15.5l-4.6 2.9 1.3-5.4-4.2-3.6L10 9l2-5.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>
  ),
  COMPENSATION: (
    <>
      <path
        d="M4 10h16v9a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1v-9Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M3 7h18v3H3V7Zm9 0v13M12 7s-3.5-.3-4.5-2A1.9 1.9 0 0 1 10.5 3C12 4 12 7 12 7Zm0 0s3.5-.3 4.5-2A1.9 1.9 0 0 0 13.5 3C12 4 12 7 12 7Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
    </>
  ),
  GENERAL: (
    <>
      <circle cx="12" cy="12" r="8.5" stroke="currentColor" strokeWidth="1.6" />
      <path
        d="M12 11v5.5M12 7.6v.1"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
    </>
  ),
  CUSTOM: (
    <>
      <path
        d="M5 5.5h9M5 9.5h6"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="m14.5 19 5-5-2.5-2.5-5 5L11 21l3.5-2Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </>
  ),
};

export function NotificationCategoryIcon({
  category,
  className = "h-5 w-5",
}: {
  category: AdminNotificationCategory;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      aria-hidden="true"
      focusable="false"
    >
      {PATHS[category]}
    </svg>
  );
}
