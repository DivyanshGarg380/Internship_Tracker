import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { Session } from "@supabase/supabase-js";

import { supabase } from "../supabase/client";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";

import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import ApplicationsPage from "./pages/Application";
import AnalyticsPage from "./pages/Analytics";
import TimelinePage from "./pages/Timeline";
import SettingsPage from "./pages/Settings";

export default function App() {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState<boolean | null>(null);

  useEffect(() => {
    async function init() {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      setSession(session);

      if (!session) {
        setAuthorized(false);
        setLoading(false);
        return;
      }

      const { data: allowedUser } = await supabase
        .from("allowed_users")
        .select("email")
        .eq("email", session.user.email)
        .maybeSingle();

      if (!allowedUser) {
        await supabase.auth.signOut();
        setSession(null);
        setAuthorized(false);
      } else {
        setAuthorized(true);
      }

      setLoading(false);
    }

    init();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setSession(session);

      if (!session) {
        setAuthorized(false);
        return;
      }

      const { data: allowedUser } = await supabase
        .from("allowed_users")
        .select("email")
        .eq("email", session.user.email)
        .maybeSingle();

      if (!allowedUser) {
        await supabase.auth.signOut();
        setSession(null);
        setAuthorized(false);
      } else {
        setAuthorized(true);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center">
        Loading...
      </div>
    );
  }

  if (!session || authorized === false) {
    return <Login />;
  }

  return (
    <SidebarProvider>
      <AppSidebar />

      <SidebarInset>
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-background/80 px-4 backdrop-blur">
          <SidebarTrigger className="-ml-1" />

          <p className="text-sm font-medium tracking-tight">
            Inboxly
          </p>

          <div className="ml-auto flex items-center gap-2">
            <ThemeToggle />
          </div>
        </header>

        <main className="flex-1 p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/applications" element={<ApplicationsPage />} />
            <Route path="/analytics" element={<AnalyticsPage />} />
            <Route path="/timeline" element={<TimelinePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        <Toaster richColors position="top-right" />
      </SidebarInset>
    </SidebarProvider>
  );
}