import React, { useState } from "react";
import { supabase } from "./supabaseClient";
import Logo from "./assets/logo.png";

const Login = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError("E-posta veya şifre hatalı: " + error.message);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-[#09090b] flex items-center justify-center p-6">
      <div className="w-full max-w-md bg-zinc-900/50 border border-zinc-800 p-10 rounded-2xl">
        <div className="text-center mb-10">
          <img
            src={Logo}
            alt="Logo"
            className="h-20 w-auto object-contain mx-auto mb-4"
          />
          <p className="text-zinc-500 text-xs uppercase tracking-[0.2em]">
            Yönetim Paneli
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
              E-Posta
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
              required
            />
          </div>
          <div>
            <label className="block text-[10px] uppercase tracking-widest text-zinc-500 font-bold mb-2">
              Şifre
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-red-600 transition-colors"
              required
            />
          </div>

          {error && <p className="text-red-500 text-xs text-center">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-white text-black font-black uppercase py-4 rounded-lg hover:bg-red-600 hover:text-white transition-all duration-300 tracking-widest text-sm disabled:opacity-50"
          >
            {loading ? "Giriş Yapılıyor..." : "Sisteme Giriş Yap"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;
