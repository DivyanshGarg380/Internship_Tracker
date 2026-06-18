import { useCallback, useEffect, useState } from "react";
import { Plus, X, Loader2, Save, Building2, MapPin, Briefcase, GraduationCap } from "lucide-react";
import { getPreferences, upsertPreferences, getJobSources, type JobSource } from "@/lib/agent";
import { toast } from "sonner";

const EXPERIENCE_LEVELS = ["Intern", "Co-op", "New Grad", "Junior"];
const SUGGESTED_LOCATIONS = ["Remote", "India", "Hyderabad", "Bangalore", "Mumbai", "New Delhi"];
const SUGGESTED_ROLES = [
  "Software Engineer Intern", "Frontend Engineer Intern", "Backend Engineer Intern",
  "Full Stack Engineer Intern", "ML Engineer Intern", "Data Engineer Intern",
  "iOS Engineer Intern", "Android Engineer Intern", "DevOps Intern",
];

function TagInput({
  label, values, suggestions = [], placeholder, onChange,
}: {
  label: string;
  values: string[];
  suggestions?: string[];
  placeholder: string;
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const add = (val: string) => {
    const trimmed = val.trim();
    if (trimmed && !values.includes(trimmed)) onChange([...values, trimmed]);
    setInput("");
    setShowSuggestions(false);
  };

  const remove = (val: string) => onChange(values.filter((v) => v !== val));

  const filtered = suggestions.filter(
    (s) => s.toLowerCase().includes(input.toLowerCase()) && !values.includes(s)
  );

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex flex-wrap gap-1.5 min-h-[2rem]">
        {values.map((v) => (
          <span key={v} className="flex items-center gap-1 rounded-md bg-primary/10 px-2 py-1 text-xs font-medium text-primary">
            {v}
            <button onClick={() => remove(v)} className="hover:text-destructive">
              <X className="h-3 w-3" />
            </button>
          </span>
        ))}
      </div>
      <div className="relative">
        <input
          value={input}
          onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          onKeyDown={(e) => { if (e.key === "Enter" && input) { e.preventDefault(); add(input); } }}
          placeholder={placeholder}
          className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
        />
        {showSuggestions && filtered.length > 0 && (
          <div className="absolute z-10 mt-1 w-full rounded-md border border-border bg-popover shadow-md">
            {filtered.slice(0, 6).map((s) => (
              <button
                key={s}
                onMouseDown={() => add(s)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent"
              >
                <Plus className="h-3 w-3 text-muted-foreground" />
                {s}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgentPreferences() {
  const [sources, setSources] = useState<JobSource[]>([]);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);

  const [roles, setRoles] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>(["Remote"]);
  const [targetCompanies, setTargetCompanies] = useState<string[]>([]);
  const [graduationYear, setGraduationYear] = useState<string>("");
  const [experienceLevel, setExperienceLevel] = useState("Intern");

  const load = useCallback(async () => {
    const [prefs, srcs] = await Promise.all([getPreferences(), getJobSources()]);
    setSources(srcs);
    if (prefs) {
      setRoles(prefs.preferred_roles ?? []);
      setLocations(prefs.preferred_locations ?? ["Remote"]);
      setTargetCompanies(prefs.target_companies ?? []);
      setGraduationYear(prefs.graduation_year ? String(prefs.graduation_year) : "");
      setExperienceLevel(prefs.experience_level ?? "Intern");
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(); }, [load]);

  const save = async () => {
    setSaving(true);
    const { error } = await upsertPreferences({
      preferred_roles: roles,
      preferred_locations: locations,
      target_companies: targetCompanies,
      graduation_year: graduationYear ? parseInt(graduationYear) : null,
      experience_level: experienceLevel,
    });
    setSaving(false);
    if (error) toast.error(error);
    else toast.success("Preferences saved!");
  };

  const companyNames = sources.map((s) => s.company);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Agent Preferences</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tell the agent what you're looking for. It will use these to discover and rank opportunities.
        </p>
      </div>

      <div className="space-y-6">
        {/* Roles */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-4 w-4 text-primary" />
            <h2 className="font-medium">Target Roles</h2>
          </div>
          <TagInput
            label="Roles you're looking for"
            values={roles}
            suggestions={SUGGESTED_ROLES}
            placeholder="e.g. Software Engineer Intern"
            onChange={setRoles}
          />
        </div>

        {/* Locations */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <h2 className="font-medium">Preferred Locations</h2>
          </div>
          <TagInput
            label="Where you want to work"
            values={locations}
            suggestions={SUGGESTED_LOCATIONS}
            placeholder="e.g. Remote, New York, NY"
            onChange={setLocations}
          />
        </div>

        {/* Experience + Grad Year */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <GraduationCap className="h-4 w-4 text-primary" />
            <h2 className="font-medium">Experience & Graduation</h2>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Experience Level</label>
              <div className="flex flex-wrap gap-2">
                {EXPERIENCE_LEVELS.map((level) => (
                  <button
                    key={level}
                    onClick={() => setExperienceLevel(level)}
                    className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                      experienceLevel === level
                        ? "bg-primary text-primary-foreground"
                        : "border border-border hover:bg-accent"
                    }`}
                  >
                    {level}
                  </button>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Graduation Year</label>
              <input
                type="number"
                value={graduationYear}
                onChange={(e) => setGraduationYear(e.target.value)}
                placeholder="e.g. 2026"
                min={2024}
                max={2030}
                className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        </div>

        {/* Target Companies */}
        <div className="rounded-xl border border-border bg-card p-6 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h2 className="font-medium">Target Companies</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Specify companies you're most interested in. The agent tracks{" "}
            <span className="font-medium text-foreground">{sources.length}</span> career pages.
          </p>
          <TagInput
            label="Prioritize these companies"
            values={targetCompanies}
            suggestions={companyNames}
            placeholder="e.g. Stripe, Anthropic"
            onChange={setTargetCompanies}
          />

          {/* Company grid preview */}
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">All tracked companies</p>
            <div className="flex flex-wrap gap-1.5">
              {sources.map((s) => (
                <span
                  key={s.id}
                  className={`rounded-md px-2 py-0.5 text-xs ${
                    s.tier === 1
                      ? "bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {s.company}
                </span>
              ))}
            </div>
            <p className="mt-2 text-xs text-muted-foreground">
              <span className="inline-block h-2 w-2 rounded-sm bg-amber-200 mr-1" />Tier 1 ·
              <span className="inline-block h-2 w-2 rounded-sm bg-muted ml-2 mr-1" />Tier 2
            </p>
          </div>
        </div>
      </div>

      <button
        onClick={save}
        disabled={saving}
        className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-60"
      >
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
        Save Preferences
      </button>
    </div>
  );
}