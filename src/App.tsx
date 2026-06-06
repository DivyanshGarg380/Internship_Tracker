import { Routes, Route, Navigate } from "react-router-dom";

import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Toaster } from "@/components/ui/sonner";

import Dashboard from "./pages/Dashboard";
import Applications from "./pages/Application";
import Analytics from "./pages/Analytics";
import Timeline from "./pages/Timeline";
import Settings from "./pages/Settings";

export default function App() {
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
            <Route path="/applications" element={<Applications />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/timeline" element={<Timeline />} />
            <Route path="/settings" element={<Settings />} />
          </Routes>
        </main>
        <Toaster richColors position="top-right" />
      </SidebarInset>
    </SidebarProvider>
  );
}