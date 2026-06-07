import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";
import { AlertCircle, Inbox, Lock, Loader2 } from "lucide-react";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const authError = sessionStorage.getItem("auth_error");
    if (authError) {
      setMessage(authError);
      sessionStorage.removeItem("auth_error");
    }
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) return;

    const { data: allowedUser, error } = await supabase
      .from("allowed_users")
      .select("email")
      .eq("email", session.user.email)
      .maybeSingle();

    if (error || !allowedUser) {
      await supabase.auth.signOut();
      sessionStorage.setItem("auth_error", "You are not authorized to access Inboxly.");
      window.location.reload();
      return;
    }

    window.location.href = "/dashboard";
  };

  const handleLogin = async () => {
    setLoading(true);
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: window.location.origin },
    });
    setLoading(false);
  };

  const GoogleIcon = () => (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2c-2.1 1.6-4.7 2.4-7.3 2.4-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.5 16.3 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.4-6 6.9l6.2 5.2C39.1 36.7 44 31 44 24c0-1.3-.1-2.4-.4-3.5z"/>
    </svg>
  );

  return (
    <div className="relative flex min-h-screen bg-zinc-950 text-zinc-100 overflow-hidden">

      {/* Grid Background */}
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage:
            "linear-gradient(to right, rgba(255,255,255,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(255,255,255,0.08) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      {/* Left Section */}
      <div className="hidden lg:flex w-1/2 flex-col justify-between border-r border-zinc-900 p-16 relative">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
              <Inbox className="h-5 w-5" />
            </div>

            <span className="text-lg font-medium">
              Inboxly
            </span>
          </div>

          <div className="mt-24">
            <h1 className="text-6xl font-semibold tracking-tight leading-[1.05]">
              Track
              <br />
              applications.
              <br />
              Manage
              <br />
              interviews.
            </h1>

            <p className="mt-8 max-w-md text-lg leading-relaxed text-zinc-500">
              A private recruiting workspace built for managing internship
              applications, interviews, recruiter conversations, and career
              opportunities.
            </p>
          </div>
        </div>

        <div>
          <p className="text-sm text-zinc-600">
            Built and maintained by Divyansh Garg
          </p>
        </div>
      </div>

      {/* Right Section */}
      <div className="flex flex-1 items-center justify-center p-6">

        <div className="w-full max-w-md">

          <div className="lg:hidden mb-10">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900">
                <Inbox className="h-5 w-5" />
              </div>

              <span className="text-lg font-medium">
                Inboxly
              </span>
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-800 bg-zinc-900/50 p-8">

            <div className="mb-8">
              <h2 className="text-3xl font-semibold tracking-tight">
                Welcome back
              </h2>

              <p className="mt-2 text-sm text-zinc-500">
                Sign in with your authorized Google account.
              </p>
            </div>

            <button
              onClick={handleLogin}
              disabled={loading}
              className="
                flex
                w-full
                items-center
                justify-center
                gap-3
                rounded-xl
                border
                border-zinc-700
                bg-white
                px-4
                py-3
                font-medium
                text-black
                transition-all
                hover:bg-zinc-200
                active:scale-[0.98]
                disabled:opacity-50
                cursor-pointer
              "
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <GoogleIcon />
              )}

              {loading
                ? "Signing in..."
                : "Continue with Google"}
            </button>

            {message && (
              <div className="mt-4 flex items-start gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3">
                <AlertCircle className="mt-0.5 h-4 w-4 text-red-400" />
                <p className="text-sm text-red-300">
                  {message}
                </p>
              </div>
            )}

            <div className="mt-8 border-t border-zinc-800 pt-6">
              <p className="text-sm text-zinc-500">
                Access is restricted to approved users.
              </p>

              <div className="mt-2 flex items-center gap-2 text-xs text-zinc-600">
                <Lock className="h-3 w-3" />
                Authorized users only
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}