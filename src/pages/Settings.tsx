import { useTheme } from "@/lib/theme";
import { supabase } from "../../supabase/client";
import { toast } from "sonner";
import { LogOut, Download, Trash2, Sun, Moon } from "lucide-react";

function SettingsPage() {
  const { theme, toggle } = useTheme();

  async function exportJson() {
    const [{ data: a }, { data: e }] = await Promise.all([
      supabase.from("applications").select("*"),
      supabase.from("timeline_events").select("*"),
    ]);
    const blob = new Blob([JSON.stringify({ applications: a, timeline_events: e }, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `inboxly-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    URL.revokeObjectURL(url);
  }

  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) { toast.error(error.message); return; }
    toast.success("Logged out");
  }

  async function clearAll() {
    if (!confirm("Delete ALL applications and timeline events? This cannot be undone.")) return;
    const { error } = await supabase.from("applications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error(error.message); return; }
    toast.success("All data cleared.");
  }

  return (
    <div className="relative min-h-screen bg-white text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 transition-colors">
      {/* Grid Background */}
      <div
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(0,0,0,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(0,0,0,0.06) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
          opacity: 0.4,
        }}
      />

      <div className="relative z-10 mx-auto max-w-3xl space-y-6 p-8">
        {/* Header */}
        <div className="border-b border-zinc-200 dark:border-zinc-800 pb-6">
          <p className="text-xs font-semibold uppercase tracking-widest text-zinc-400 dark:text-zinc-600 mb-1">Preferences</p>
          <h1 className="text-3xl font-semibold tracking-tight">Settings</h1>
          <p className="mt-1 text-sm text-zinc-500">Personal tracker with Google authentication.</p>
        </div>

        {/* Theme */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
            <p className="text-sm font-semibold">Theme</p>
          </div>
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-medium">Appearance</p>
              <p className="text-xs text-zinc-500 mt-0.5">Currently {theme} mode.</p>
            </div>
            <button
              onClick={toggle}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-[0.97]"
            >
              {theme === "dark"
                ? <><Sun className="h-3.5 w-3.5" /> Switch to light</>
                : <><Moon className="h-3.5 w-3.5" /> Switch to dark</>
              }
            </button>
          </div>
        </div>

        {/* Data Export */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
            <p className="text-sm font-semibold">Data</p>
            <p className="text-xs text-zinc-500 mt-0.5">Export your applications and timeline events.</p>
          </div>
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-medium">Export all data</p>
              <p className="text-xs text-zinc-500 mt-0.5">Downloads a JSON snapshot of everything.</p>
            </div>
            <button
              onClick={exportJson}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-[0.97]"
            >
              <Download className="h-3.5 w-3.5" /> Export JSON
            </button>
          </div>
        </div>

        {/* Account */}
        <div className="rounded-2xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-900/50">
          <div className="border-b border-zinc-200 dark:border-zinc-800 px-6 py-4">
            <p className="text-sm font-semibold">Account</p>
            <p className="text-xs text-zinc-500 mt-0.5">Manage your Inboxly session.</p>
          </div>
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-medium">Sign out</p>
              <p className="text-xs text-zinc-500 mt-0.5">Log out of your Google account session.</p>
            </div>
            <button
              onClick={logout}
              className="flex items-center gap-2 rounded-xl border border-zinc-200 dark:border-zinc-700 bg-white dark:bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-700 dark:text-zinc-300 transition-all hover:border-zinc-300 dark:hover:border-zinc-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 active:scale-[0.97]"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="rounded-2xl border border-red-200 dark:border-red-500/20 bg-red-50/50 dark:bg-red-500/5">
          <div className="border-b border-red-200 dark:border-red-500/20 px-6 py-4">
            <p className="text-sm font-semibold text-red-500 dark:text-red-400">Danger Zone</p>
            <p className="text-xs text-zinc-500 mt-0.5">These actions are permanent and cannot be undone.</p>
          </div>
          <div className="flex items-center justify-between px-6 py-5">
            <div>
              <p className="text-sm font-medium">Clear all applications</p>
              <p className="text-xs text-zinc-500 mt-0.5">Deletes every application and timeline event.</p>
            </div>
            <button
              onClick={clearAll}
              className="flex items-center gap-2 rounded-xl border border-red-200 dark:border-red-500/30 bg-white dark:bg-red-500/10 px-4 py-2 text-sm font-medium text-red-500 dark:text-red-400 transition-all hover:border-red-300 dark:hover:border-red-500/50 hover:bg-red-50 dark:hover:bg-red-500/20 active:scale-[0.97]"
            >
              <Trash2 className="h-3.5 w-3.5" /> Clear all
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsPage;