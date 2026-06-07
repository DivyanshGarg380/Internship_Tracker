import { useEffect, useState } from "react";
import { supabase } from "../../supabase/client";

export default function Login() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    checkAccess();
  }, []);

  const checkAccess = async () => {
    const {
      data: { session },
    } = await supabase.auth.getSession();

    if (!session) return;

    const { data: allowedUser, error } = await supabase
      .from("allowed_users")
      .select("email")
      .eq("email", session.user.email)
      .maybeSingle();

    if (error || !allowedUser) {
      await supabase.auth.signOut();
      setMessage("You are not authorized to access Inboxly.");
      return;
    }

    window.location.href = "/dashboard";
  };

  const handleLogin = async () => {
    setLoading(true);

    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: window.location.origin,
      },
    });

    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-2xl border bg-card p-8 shadow-lg">
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-bold tracking-tight">
            Inboxly
          </h1>

          <p className="mt-2 text-sm text-muted-foreground">
            Internship tracking made simple.
          </p>
        </div>

        <button
          onClick={handleLogin}
          disabled={loading}
          className="flex w-full items-center justify-center gap-3 rounded-lg border px-4 py-3 font-medium transition hover:bg-accent disabled:opacity-50"
        >
          <svg width="20" height="20" viewBox="0 0 48 48">
            <path
              fill="#FFC107"
              d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12S17.4 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z"
            />
            <path
              fill="#FF3D00"
              d="M6.3 14.7l6.6 4.8C14.7 15 18.9 12 24 12c3 0 5.7 1.1 7.8 3l5.7-5.7C34.1 6.1 29.3 4 24 4c-7.7 0-14.3 4.3-17.7 10.7z"
            />
            <path
              fill="#4CAF50"
              d="M24 44c5.2 0 10-2 13.5-5.2l-6.2-5.2c-2.1 1.6-4.7 2.4-7.3 2.4-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.6 39.5 16.3 44 24 44z"
            />
            <path
              fill="#1976D2"
              d="M43.6 20.5H42V20H24v8h11.3c-1.1 3.1-3.3 5.4-6 6.9l6.2 5.2C39.1 36.7 44 31 44 24c0-1.3-.1-2.4-.4-3.5z"
            />
          </svg>

          {loading ? "Signing In..." : "Continue with Google"}
        </button>

        {message && (
          <p className="mt-4 text-center text-sm text-red-500">
            {message}
          </p>
        )}

        <p className="mt-6 text-center text-xs text-muted-foreground">
          Authorized users only
        </p>
      </div>
    </div>
  );
}