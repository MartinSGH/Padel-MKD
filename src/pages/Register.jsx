import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { signUp } from "../services/auth";
import { getAllClubs } from "../services/clubs";
import { supabase } from "../lib/supabaseClient";

const defaultAvatars = [
  "/Avatars/Avatar1.webp",
  "/Avatars/Avatar2.webp",
  "/Avatars/Avatar3.webp",
  "/Avatars/Avatar4.webp",
];

export default function Register() {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    sex: "",
    birthDate: "",
    placeOfBirth: "",
    phone: "",
    clubId: "",
    email: "",
    password: "",
  });

  const [avatarFile, setAvatarFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [clubs, setClubs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    getAllClubs()
      .then((data) => setClubs(data || []))
      .catch(() => setClubs([]));
  }, []);

  const randomDefaultAvatar = useMemo(() => {
    return defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)];
  }, []);

  const shownPreview = previewUrl || randomDefaultAvatar;

  const handleChange = (e) => {
    setForm((prev) => ({
      ...prev,
      [e.target.name]: e.target.value,
    }));
  };

  const handleAvatarChange = (e) => {
    const file = e.target.files?.[0] || null;
    setAvatarFile(file);

    if (file) {
      const localPreview = URL.createObjectURL(file);
      setPreviewUrl(localPreview);
    } else {
      setPreviewUrl("");
    }
  };

  const uploadAvatar = async (file) => {
    const ext = file.name.split(".").pop();
    const fileName = `${crypto.randomUUID()}.${ext}`;
    const filePath = `register-avatars/${fileName}`;

    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Validate the phone number is in international format: +<country><number>.
    const cleanedPhone = form.phone.replace(/[\s\-()]/g, "");
    if (!/^\+[1-9]\d{7,14}$/.test(cleanedPhone)) {
      setError(
        "Please enter a valid phone number in international format, e.g. +38970123456."
      );
      return;
    }

    if (!form.clubId) {
      setError("Please choose your club.");
      return;
    }

    setLoading(true);

    try {
      let avatarUrl = randomDefaultAvatar;

      if (avatarFile) {
        avatarUrl = await uploadAvatar(avatarFile);
      }

      const selectedClub = clubs.find((c) => c.id === form.clubId);

      await signUp({
        email: form.email,
        password: form.password,
        firstName: form.firstName,
        lastName: form.lastName,
        sex: form.sex,
        birthDate: form.birthDate,
        placeOfBirth: form.placeOfBirth,
        phone: cleanedPhone,
        clubId: form.clubId,
        clubName: selectedClub?.name || "",
        avatarUrl,
      });

      setSuccess("Registration successful. Check your email for verification.");

      setTimeout(() => {
        navigate("/login");
      }, 1500);
    } catch (err) {
      setError(err.message || "Registration failed.");
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
              Create your player account
            </h1>

            <p className="max-w-xl text-base leading-8 text-white/75 md:text-lg">
              Register to manage your player profile, submit tournament points,
              and track the status of your submissions in one place.
            </p>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur-xl md:p-8">
            <div className="mb-6">
              <h2 className="text-3xl font-semibold text-white">Register</h2>
              <p className="mt-2 text-sm text-white/65">
                Fill in your details to create an account.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="flex flex-col items-center">
                <div className="mb-3 h-24 w-24 overflow-hidden rounded-full border-2 border-white/20 bg-white/10">
                  <img
                    src={shownPreview}
                    alt="Avatar preview"
                    className="h-full w-full object-cover"
                  />
                </div>

                <label className="cursor-pointer rounded-xl border border-white/15 bg-white/10 px-4 py-2 text-sm text-white transition hover:bg-white/15">
                  Choose Profile Picture
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleAvatarChange}
                    className="hidden"
                  />
                </label>

                <p className="mt-2 text-center text-xs text-white/50">
                  Optional. If you skip this, a random default avatar will be used.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    First Name
                  </label>
                  <input
                    name="firstName"
                    type="text"
                    placeholder="Enter your first name"
                    value={form.firstName}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#d4a63d] focus:bg-white/12"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Last Name
                  </label>
                  <input
                    name="lastName"
                    type="text"
                    placeholder="Enter your last name"
                    value={form.lastName}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#d4a63d] focus:bg-white/12"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Sex
                  </label>
                  <select
                    name="sex"
                    value={form.sex}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#d4a63d] focus:bg-white/12 [&>option]:text-[#081738]"
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                  </select>
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Date of Birth
                  </label>
                  <input
                    name="birthDate"
                    type="date"
                    value={form.birthDate}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#d4a63d] focus:bg-white/12 [color-scheme:dark]"
                  />
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Place of Birth
                </label>
                <input
                  name="placeOfBirth"
                  type="text"
                  placeholder="City, Country"
                  value={form.placeOfBirth}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#d4a63d] focus:bg-white/12"
                />
              </div>

              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    placeholder="+38970123456"
                    value={form.phone}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#d4a63d] focus:bg-white/12"
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-white/80">
                    Club
                  </label>
                  <select
                    name="clubId"
                    value={form.clubId}
                    onChange={handleChange}
                    required
                    className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white outline-none transition focus:border-[#d4a63d] focus:bg-white/12 [&>option]:text-[#081738]"
                  >
                    <option value="" disabled>
                      Select your club…
                    </option>
                    {clubs.map((club) => (
                      <option key={club.id} value={club.id}>
                        {club.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Email
                </label>
                <input
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  value={form.email}
                  onChange={handleChange}
                  required
                  className="w-full rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-white placeholder:text-white/40 outline-none transition focus:border-[#d4a63d] focus:bg-white/12"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-white/80">
                  Password
                </label>
                <input
                  name="password"
                  type="password"
                  placeholder="Create a password"
                  value={form.password}
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
                {loading ? "Creating account..." : "Register"}
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
              Already have an account?{" "}
              <Link
                to="/login"
                className="font-semibold text-[#d4a63d] transition hover:text-[#e6bb5b]"
              >
                Login here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}