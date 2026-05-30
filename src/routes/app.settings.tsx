import { createFileRoute } from "@tanstack/react-router";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useTheme } from "@/lib/theme";
import { Mail } from "lucide-react";

export const Route = createFileRoute("/app/settings")({
  head: () => ({ meta: [{ title: "Settings — Inboxly" }] }),
  component: SettingsPage,
});

function SettingsPage() {
  const { theme, toggle } = useTheme();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">Manage your account, sync, and preferences.</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Connected Gmail Account</CardTitle>
          <CardDescription>Inboxly reads recruiting emails only.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-md border border-border bg-muted">
              <Mail className="h-4 w-4" />
            </div>
            <div>
              <p className="text-sm font-medium">alex@stanford.edu</p>
              <p className="text-xs text-muted-foreground">Connected on Mar 1, 2025 · Last synced 4 min ago</p>
            </div>
          </div>
          <Button variant="outline" size="sm">Sync now</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sync Preferences</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Auto-detect applications</p>
              <p className="text-xs text-muted-foreground">Parse new recruiting emails automatically.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Notify on status change</p>
              <p className="text-xs text-muted-foreground">Email me when an application progresses.</p>
            </div>
            <Switch defaultChecked />
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Include archived threads</p>
              <p className="text-xs text-muted-foreground">Scan archived mail during sync.</p>
            </div>
            <Switch />
          </div>
        </CardContent>
      </Card>

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
        <CardHeader><CardTitle className="text-base">Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" defaultValue="Alex Kim" />
          </div>
          <div className="grid gap-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" defaultValue="alex@stanford.edu" disabled />
          </div>
          <div>
            <Button size="sm">Save changes</Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-destructive/40">
        <CardHeader>
          <CardTitle className="text-base text-destructive">Danger Zone</CardTitle>
          <CardDescription>These actions are permanent.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Disconnect Gmail</p>
              <p className="text-xs text-muted-foreground">Stop syncing. Existing data is kept.</p>
            </div>
            <Button variant="outline" size="sm">Disconnect</Button>
          </div>
          <Separator />
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium">Delete account</p>
              <p className="text-xs text-muted-foreground">Permanently delete all data.</p>
            </div>
            <Button variant="destructive" size="sm">Delete</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
