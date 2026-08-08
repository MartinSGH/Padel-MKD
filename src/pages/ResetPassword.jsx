import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";
import { updatePassword } from "../services/auth";

export default function ResetPassword() {
  const navigate = useNavigate();

  // Whether a valid recovery session (from the email link) is active.
  const [ready, setReady] = useState(false);
  const [checking, setChecking] = useState(true);

  const [form, setForm] = useState({ password: "", confirm: "" });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    // The reset link opens this page with a recovery token in the URL, which
    // supabase-js exchanges for a session automatically. Listen for that, and
    // also check for an already-established session in case the event fired
    // before this component mounted.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "PASSWORD_RECOVERY" || session) {
        setReady(true);
        setChecking(false);
      }
    });

    supabase.auth.getSession().then(({ data }) => {
      if (data?.session) setReady(true);
      setChecking(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  const handleChange = (e) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    if (form.password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }

    if (form.password !== form.confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    try {
      await updatePassword(form.password);
      setSuccess("Your password has been updated. Redirecting to login...");
      await supabase.auth.signOut();
      setTimeout(() => navigate("/login"), 1500);
    } catch (err) {
      setError(err.message || "Could not update your password. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="min-h-screen bg-[#081738] px-4 py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-center gap-10 lg:grid-cols-2">
          <div className="text-white">
            <span className="mb-4 inline-block rounded-full border border-white/20 bg-white/10 px-4 py-1 text-sm tracking-wide text-white/80">
              Macedonian Padel Federation
            </span>

            <h1 className="mb-5 text-4xl font-semibold leading-tight md:text-5xl">
              Set a new password
            </h1>

            <p className="max-w-xl text-base leading-8 text-white/75 md:text-lg">
              Choose a strong password you haven’t used before. You’ll use it to
              log in from now on.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-semibold text-white">New password</h2>
              <p className="mt-2 text-sm text-white/65">
                Enter and confirm your new password below.
              </p>
            </div>

            {checking ? (
              <p className="text-sm text-white/65">Verifying your reset link...</p>
            ) : !ready ? (
              <div className="space-y-4">
                <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                  This password reset link is invalid or has expired. Please
                  request a new one.
                </p>
                <Link
                  to="/forgot-password"
                  className="inline-block font-semibold text-[#d4a63d] transition hover:text-[#e6bb5b]"
                >
                  Request a new link
                </Link>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    New Password
                  </label>
                  <input
                    name="password"
                    type="password"
                    placeholder="Enter a new password"
                    value={form.password}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#d4a63d] focus:bg-white/12"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Confirm Password
                  </label>
                  <input
                    name="confirm"
                    type="password"
                    placeholder="Re-enter your new password"
                    value={form.confirm}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#d4a63d] focus:bg-white/12"
                  />
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full rounded-2xl bg-[#d4a63d] px-4 py-3 text-base font-semibold text-[#081738] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? "Updating..." : "Update password"}
                </button>

                {success ? (
                  <p className="rounded-2xl border border-green-400/20 bg-green-500/10 px-4 py-3 text-sm text-green-300">
                    {success}
                  </p>
                ) : null}

                {error ? (
                  <p className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </p>
                ) : null}
              </form>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
