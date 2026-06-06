import { useState } from "react";
import { supabase } from "../../supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { STATUSES, type Status } from "@/lib/applications";
import { toast } from "sonner";

export function AddApplicationDialog({ onCreated, trigger }: { onCreated?: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [company, setCompany] = useState("");
  const [role, setRole] = useState("");
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState<Status>("Applied");
  const [appliedDate, setAppliedDate] = useState(new Date().toISOString().slice(0, 10));
  const [notes, setNotes] = useState("");

  function reset() {
    setCompany(""); setRole(""); setLocation(""); setStatus("Applied");
    setAppliedDate(new Date().toISOString().slice(0, 10)); setNotes("");
  }

  async function onSave() {
    if (!company.trim() || !role.trim()) {
      toast.error("Company and role are required.");
      return;
    }
    setSaving(true);
    const { data, error } = await supabase
      .from("applications")
      .insert({
        company: company.trim().slice(0, 200),
        role: role.trim().slice(0, 200),
        location: location.trim().slice(0, 200),
        status,
        applied_date: appliedDate,
        notes: notes.trim() ? notes.trim().slice(0, 4000) : null,
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      toast.error(error?.message ?? "Could not save.");
      return;
    }
    await supabase.from("timeline_events").insert({
      application_id: data.id,
      event_date: appliedDate,
      event: `Application created (${status})`,
      status,
    });
    setSaving(false);
    setOpen(false);
    reset();
    toast.success("Application added.");
    onCreated?.();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger ?? <Button>Add Application</Button>}
      </DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>New application</DialogTitle>
          <DialogDescription>Track a new internship application.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-2">
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="company">Company</Label>
              <Input id="company" value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Stripe" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="role">Role</Label>
              <Input id="role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="SWE Intern" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="grid gap-1.5">
              <Label htmlFor="location">Location</Label>
              <Input id="location" value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Remote" />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="applied">Applied date</Label>
              <Input id="applied" type="date" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)} />
            </div>
          </div>
          <div className="grid gap-1.5">
            <Label>Status</Label>
            <Select value={status} onValueChange={(v) => setStatus(v as Status)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
          <Button onClick={onSave} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}