export type Status =
  | "Applied"
  | "Under Review"
  | "OA Received"
  | "Interview"
  | "Rejected"
  | "Offer";

export interface Application {
  id: string;
  company: string;
  role: string;
  location: string;
  status: Status;
  lastUpdated: string;
  appliedDate: string;
  timeline: { date: string; event: string; status: Status | "Email" }[];
}

export const applications: Application[] = [
  {
    id: "1", company: "Uber", role: "Software Engineer Intern", location: "San Francisco, CA",
    status: "OA Received", lastUpdated: "2025-05-13", appliedDate: "2025-05-10",
    timeline: [
      { date: "2025-05-10", event: "Applied via careers portal", status: "Applied" },
      { date: "2025-05-11", event: "Application received confirmation", status: "Under Review" },
      { date: "2025-05-13", event: "Online assessment sent", status: "OA Received" },
    ],
  },
  {
    id: "2", company: "Amazon", role: "SDE Intern", location: "Seattle, WA",
    status: "Interview", lastUpdated: "2025-05-18", appliedDate: "2025-04-22",
    timeline: [
      { date: "2025-04-22", event: "Applied", status: "Applied" },
      { date: "2025-04-30", event: "OA completed", status: "OA Received" },
      { date: "2025-05-18", event: "Interview scheduled for May 24", status: "Interview" },
    ],
  },
  {
    id: "3", company: "Google", role: "STEP Intern", location: "Mountain View, CA",
    status: "Rejected", lastUpdated: "2025-05-02", appliedDate: "2025-03-15",
    timeline: [
      { date: "2025-03-15", event: "Applied", status: "Applied" },
      { date: "2025-05-02", event: "Rejection email received", status: "Rejected" },
    ],
  },
  {
    id: "4", company: "Stripe", role: "Frontend Engineering Intern", location: "Remote",
    status: "Offer", lastUpdated: "2025-05-20", appliedDate: "2025-03-01",
    timeline: [
      { date: "2025-03-01", event: "Applied", status: "Applied" },
      { date: "2025-03-10", event: "OA completed", status: "OA Received" },
      { date: "2025-04-05", event: "Technical interview", status: "Interview" },
      { date: "2025-05-20", event: "Offer extended", status: "Offer" },
    ],
  },
  {
    id: "5", company: "Notion", role: "Product Engineering Intern", location: "New York, NY",
    status: "Under Review", lastUpdated: "2025-05-15", appliedDate: "2025-05-12",
    timeline: [
      { date: "2025-05-12", event: "Applied", status: "Applied" },
      { date: "2025-05-15", event: "Recruiter reached out", status: "Under Review" },
    ],
  },
  {
    id: "6", company: "Linear", role: "Software Engineering Intern", location: "Remote",
    status: "Applied", lastUpdated: "2025-05-22", appliedDate: "2025-05-22",
    timeline: [{ date: "2025-05-22", event: "Applied", status: "Applied" }],
  },
  {
    id: "7", company: "Vercel", role: "DX Engineering Intern", location: "San Francisco, CA",
    status: "Interview", lastUpdated: "2025-05-19", appliedDate: "2025-04-10",
    timeline: [
      { date: "2025-04-10", event: "Applied", status: "Applied" },
      { date: "2025-04-25", event: "Phone screen", status: "Interview" },
      { date: "2025-05-19", event: "Onsite scheduled", status: "Interview" },
    ],
  },
  {
    id: "8", company: "Figma", role: "Design Engineer Intern", location: "San Francisco, CA",
    status: "OA Received", lastUpdated: "2025-05-16", appliedDate: "2025-05-05",
    timeline: [
      { date: "2025-05-05", event: "Applied", status: "Applied" },
      { date: "2025-05-16", event: "Coding challenge sent", status: "OA Received" },
    ],
  },
  {
    id: "9", company: "Airbnb", role: "Backend Intern", location: "Remote",
    status: "Rejected", lastUpdated: "2025-04-28", appliedDate: "2025-03-20",
    timeline: [
      { date: "2025-03-20", event: "Applied", status: "Applied" },
      { date: "2025-04-28", event: "Rejected after OA", status: "Rejected" },
    ],
  },
  {
    id: "10", company: "Datadog", role: "Software Engineer Intern", location: "New York, NY",
    status: "Applied", lastUpdated: "2025-05-24", appliedDate: "2025-05-24",
    timeline: [{ date: "2025-05-24", event: "Applied", status: "Applied" }],
  },
  {
    id: "11", company: "Cloudflare", role: "Systems Intern", location: "Austin, TX",
    status: "Under Review", lastUpdated: "2025-05-21", appliedDate: "2025-05-14",
    timeline: [
      { date: "2025-05-14", event: "Applied", status: "Applied" },
      { date: "2025-05-21", event: "Resume under review", status: "Under Review" },
    ],
  },
  {
    id: "12", company: "Supabase", role: "Full-Stack Intern", location: "Remote",
    status: "Interview", lastUpdated: "2025-05-17", appliedDate: "2025-04-18",
    timeline: [
      { date: "2025-04-18", event: "Applied", status: "Applied" },
      { date: "2025-05-01", event: "OA completed", status: "OA Received" },
      { date: "2025-05-17", event: "Final round scheduled", status: "Interview" },
    ],
  },
];

export const stats = {
  total: applications.length,
  active: applications.filter((a) => !["Rejected", "Offer"].includes(a.status)).length,
  oas: applications.filter((a) => ["OA Received", "Interview", "Offer"].includes(a.status)).length,
  interviews: applications.filter((a) => ["Interview", "Offer"].includes(a.status)).length,
  offers: applications.filter((a) => a.status === "Offer").length,
  responseRate: Math.round(
    (applications.filter((a) => a.status !== "Applied").length / applications.length) * 100,
  ),
};

export const monthlyApplications = [
  { month: "Jan", count: 4 },
  { month: "Feb", count: 6 },
  { month: "Mar", count: 9 },
  { month: "Apr", count: 11 },
  { month: "May", count: 14 },
];

export const statusDistribution = [
  { name: "Applied", value: applications.filter((a) => a.status === "Applied").length },
  { name: "Under Review", value: applications.filter((a) => a.status === "Under Review").length },
  { name: "OA Received", value: applications.filter((a) => a.status === "OA Received").length },
  { name: "Interview", value: applications.filter((a) => a.status === "Interview").length },
  { name: "Rejected", value: applications.filter((a) => a.status === "Rejected").length },
  { name: "Offer", value: applications.filter((a) => a.status === "Offer").length },
];

export const funnel = [
  { label: "Applications", value: 12 },
  { label: "Responses", value: 9 },
  { label: "OAs", value: 6 },
  { label: "Interviews", value: 4 },
  { label: "Offers", value: 1 },
];
