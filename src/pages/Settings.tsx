import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { supabase } from "../../supabase/client";
import { toast } from "sonner";
import { LogOut } from "lucide-react";

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

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Logged out");
  }

  async function clearAll() {
    if (!confirm("Delete ALL applications and timeline events? This cannot be undone.")) return;
    const { error } = await supabase.from("applications").delete().neq("id", "00000000-0000-0000-0000-000000000000");
    if (error) { toast.error(error.message); return; }
    toast.success("All data cleared.");
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Personal tracker with Google authentication.</p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Theme</CardTitle></CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Appearance</p>
            <p className="text-xs text-muted-foreground">Currently {theme}.</p>
          </div>
          <Button variant="outline" size="sm" onClick={toggle}>
            Switch to {theme === "dark" ? "light" : "dark"}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Data</CardTitle>
          <CardDescription>Export your applications and timeline events as JSON.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Export all data</p>
            <p className="text-xs text-muted-foreground">Downloads a JSON snapshot.</p>
          </div>
          <Button variant="outline" size="sm" onClick={exportJson}>Export JSON</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>
            Manage your Inboxly session.
          </CardDescription>
        </CardHeader>

        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Sign out</p>
            <p className="text-xs text-muted-foreground">
              Log out of your Google account session for Inboxly.
            </p>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={logout}
          >
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>This action is permanent.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium">Clear all applications</p>
            <p className="text-xs text-muted-foreground">Deletes every application and timeline event.</p>
          </div>
          <Button variant="destructive" size="sm" onClick={clearAll}>Clear all</Button>
        </CardContent>
      </Card>
    </div>
  );
}

export default SettingsPage;

