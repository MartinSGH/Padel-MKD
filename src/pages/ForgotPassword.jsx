import { useState } from "react";
import { Link } from "react-router-dom";
import { sendPasswordReset } from "../services/auth";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setSuccess("");
    setError("");

    try {
      await sendPasswordReset(email);
      setSuccess(
        "If an account exists for this email, a password reset link is on its way. Check your inbox."
      );
    } catch (err) {
      setError(err.message || "Could not send the reset link. Please try again.");
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
              Forgot your password?
            </h1>

            <p className="max-w-xl text-base leading-8 text-white/75 md:text-lg">
              Enter the email address linked to your account and we’ll send you a
              secure link to set a new password.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-semibold text-white">Reset password</h2>
              <p className="mt-2 text-sm text-white/65">
                We’ll email you a link to reset your password.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#d4a63d] focus:bg-white/12"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-2xl bg-[#d4a63d] px-4 py-3 text-base font-semibold text-[#081738] transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {loading ? "Sending link..." : "Send reset link"}
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

            <p className="mt-6 text-sm text-white/65">
              Remembered it?{" "}
              <Link
                to="/login"
                className="font-semibold text-[#d4a63d] transition hover:text-[#e6bb5b]"
              >
                Back to login
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
