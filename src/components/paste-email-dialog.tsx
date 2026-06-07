import { useState } from "react";
import { supabase } from "../../supabase/client";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { STATUSES, type Status } from "@/lib/applications";
import { Sparkles, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { extractEmail } from "@/lib/extract-email";

type Stage = "input" | "review";
interface Extracted {
  company: string;
  role: string;
  location: string;
  status: Status;
  event_date: string;
  event_summary: string;
}

export function PasteEmailDialog({ onCreated, trigger }: { onCreated?: () => void; trigger?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const [stage, setStage] = useState<Stage>("input");
  const [email, setEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<Extracted | null>(null);

  function close() {
    setOpen(false);
    setTimeout(() => { setStage("input"); setEmail(""); setData(null); }, 200);
  }

  async function onExtract() {
    if (email.trim().length < 20) {
      toast.error("Paste the full email body.");
      return;
    }

    setBusy(true);

    try {
      const res = await extractEmail(
        email.trim().slice(0, 50000)
      );
      console.log(res);
      const status = (STATUSES as readonly string[]).includes(res.status)
        ? (res.status as Status)
        : "Applied";

      setData({
        company: res.company ?? "",
        role: res.role ?? "",
        location: res.location ?? "",
        status,
        event_date:
          res.event_date ||
          new Date().toISOString().slice(0, 10),
        event_summary: res.event_summary ?? "",
      });

      setStage("review");
    } catch (e) {
      console.error(e);
      toast.error("AI extract failed.");
    } finally {
      setBusy(false);
    }
  }

  async function onSave() {
    if (!data) return;
    if (!data.company.trim() || !data.role.trim()) {
      toast.error("Company and role are required.");
      return;
    }
    setBusy(true);

    const { data: existing } = await supabase
      .from("applications")
      .select("id, status")
      .ilike("company", data.company)
      .ilike("role", data.role)
      .limit(1)
      .maybeSingle();

    let appId = existing?.id;
    if (!appId) {
      const { data: created, error } = await supabase
        .from("applications")
        .insert({
          company: data.company.slice(0, 200),
          role: data.role.slice(0, 200),
          location: data.location.slice(0, 200),
          status: data.status,
          applied_date: data.event_date,
        })
        .select("id")
        .single();
      if (error || !created) {
        setBusy(false);
        toast.error(error?.message ?? "Could not save.");
        return;
      }
      appId = created.id;
    } else {
      await supabase.from("applications").update({ status: data.status }).eq("id", appId);
    }

    await supabase.from("timeline_events").insert({
      application_id: appId,
      event_date: data.event_date,
      event: data.event_summary.slice(0, 500),
      status: data.status,
    });

    setBusy(false);
    toast.success(existing ? "Updated existing application." : "Application added.");
    onCreated?.();
    close();
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : close())}>
      <DialogTrigger asChild>
        {trigger ?? (
          <Button variant="outline" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> Paste Email
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>{stage === "input" ? "Paste recruiting email" : "Review extracted info"}</DialogTitle>
          <DialogDescription>
            {stage === "input"
              ? "Paste the full email body. AI will extract company, role, status, and date."
              : "Edit anything before saving. Matching company + role updates the existing application."}
          </DialogDescription>
        </DialogHeader>

        {stage === "input" && (
          <Textarea
            rows={12}
            placeholder="Paste the recruiting email here…"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="font-mono text-xs"
          />
        )}

        {stage === "review" && data && (
          <div className="grid gap-3 py-1">
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Company</Label>
                <Input value={data.company} onChange={(e) => setData({ ...data, company: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Role</Label>
                <Input value={data.role} onChange={(e) => setData({ ...data, role: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label>Location</Label>
                <Input value={data.location} onChange={(e) => setData({ ...data, location: e.target.value })} />
              </div>
              <div className="grid gap-1.5">
                <Label>Event date</Label>
                <Input type="date" value={data.event_date} onChange={(e) => setData({ ...data, event_date: e.target.value })} />
              </div>
            </div>
            <div className="grid gap-1.5">
              <Label>Status</Label>
              <Select value={data.status} onValueChange={(v) => setData({ ...data, status: v as Status })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-1.5">
              <Label>Event summary</Label>
              <Textarea rows={2} value={data.event_summary} onChange={(e) => setData({ ...data, event_summary: e.target.value })} />
            </div>
          </div>
        )}

        <DialogFooter>
          {stage === "input" ? (
            <>
              <Button variant="outline" onClick={close} disabled={busy}>Cancel</Button>
              <Button onClick={onExtract} disabled={busy} className="gap-1.5">
                {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
                {busy ? "Extracting…" : "Extract with AI"}
              </Button>
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => setStage("input")} disabled={busy}>Back</Button>
              <Button onClick={onSave} disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}