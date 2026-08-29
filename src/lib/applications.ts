export const STATUSES = [
  "Applied",
  "Under Review",
  "OA Received",
  "OA Completed",
  "Interview",
  "Rejected",
  "Offer",
] as const;

export type Status = (typeof STATUSES)[number];

export interface TimelineEvent {
  id: string;
  application_id: string;
  event_date: string;
  event: string;
  status: Status | null;
  created_at: string;
}

export interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  status: Status;
  applied_date: string;
  notes: string | null;
  created_at: string;
  updated_at: string;
  timeline_events?: TimelineEvent[];
}

export function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}d ago`;
  return new Date(iso).toLocaleDateString();
}