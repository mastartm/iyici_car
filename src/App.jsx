import React, { useState, useEffect } from "react";
import Dashboard from "./Dashboard";
import Inventory from "./Inventory";
import Stock from "./Stock";
import MyRequests from "./MyRequests";
import Requests from "./Requests";
import Users from "./Users";
import Logo from "./assets/logo.png";
import { supabase } from "./supabaseClient";
import { Menu, X as CloseIcon, LogOut, User } from "lucide-react";

const App = () => {
  const [activeTab, setActiveTab] = useState("dashboard");
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [profile, setProfile] = useState(null);

  useEffect(() => {
    const fetchProfile = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();
      setProfile(data);
    };
    fetchProfile();
  }, []);

  const isAdmin = profile?.role === "admin";

  const adminMenuItems = [
    { id: "dashboard", label: "Genel Bakış" },
    { id: "inventory", label: "Envanter" },
    { id: "my_stock", label: "Stoğum" },
    { id: "requests", label: "Talepler" },
    { id: "my_requests", label: "Taleplerim" },
    { id: "users", label: "Kullanıcılar" },
  ];

  const userMenuItems = [
    { id: "dashboard", label: "Genel Bakış" },
    { id: "inventory", label: "Envanter" },
    { id: "my_stock", label: "Stoğum" },
    { id: "my_requests", label: "Taleplerim" },
  ];

  const menuItems = isAdmin ? adminMenuItems : userMenuItems;

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const NavContent = ({ mobile = false }) => (
    <>
      {menuItems.map((item) => (
        <button
          key={item.id}
          onClick={() => {
            setActiveTab(item.id);
            if (mobile) setIsMenuOpen(false);
          }}
          className={`flex items-center gap-4 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all duration-300 ${
            activeTab === item.id
              ? "bg-red-600/10 border border-red-600/20 text-red-500 shadow-[0_0_20px_rgba(220,38,38,0.1)]"
              : "text-zinc-500 hover:text-zinc-300 hover:bg-zinc-900/50 border border-transparent"
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${activeTab === item.id ? "bg-red-600 shadow-[0_0_8px_red]" : "bg-zinc-700"}`}
          />
          {item.label}
        </button>
      ))}
    </>
  );

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col lg:flex-row overflow-hidden font-sans">
      {/* MOBİL ÜST BAR */}
      <header className="lg:hidden flex items-center justify-between p-4 border-b border-zinc-800 bg-[#09090b] sticky top-0 z-[100]">
        <img src={Logo} alt="Logo" className="h-10 w-auto object-contain" />
        <button
          onClick={() => setIsMenuOpen(!isMenuOpen)}
          className="p-2 text-zinc-400"
        >
          {isMenuOpen ? <CloseIcon size={24} /> : <Menu size={24} />}
        </button>
      </header>

      {/* MOBİL MENÜ */}
      {isMenuOpen && (
        <div className="lg:hidden fixed inset-0 top-[73px] bg-[#09090b] z-[99] p-6 flex flex-col gap-2 overflow-y-auto">
          <NavContent mobile />
          <div className="mt-auto pt-6 border-t border-zinc-800">
            <div className="flex items-center gap-3 px-4 py-3 mb-2">
              <div className="w-8 h-8 rounded-xl bg-zinc-800 flex items-center justify-center">
                <User size={14} className="text-zinc-400" />
              </div>
              <div>
                <p className="text-xs font-black text-zinc-300">
                  {profile?.full_name || "—"}
                </p>
                <p className="text-[9px] text-zinc-600 uppercase font-bold">
                  {isAdmin ? "Admin" : "Kullanıcı"}
                </p>
              </div>
            </div>
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-5 py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest text-zinc-600 hover:text-red-500 border border-transparent hover:border-red-900/30 transition-all"
            >
              <LogOut size={14} /> Çıkış Yap
            </button>
          </div>
        </div>
      )}

      {/* MASAÜSTÜ SIDEBAR */}
      <aside className="hidden lg:flex w-72 border-r border-zinc-800 p-8 flex-col gap-6 bg-[#09090b] shrink-0 h-screen">
        <div className="flex flex-col items-center justify-center w-full mb-2">
          <img
            src={Logo}
            alt="Logo"
            className="h-32 w-auto max-w-[200px] object-contain mb-4"
          />
          <div className="relative w-full flex flex-col items-center">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-zinc-800/50"></div>
            </div>
            <p className="relative bg-[#09090b] px-3 text-[10px] font-black text-zinc-500 uppercase tracking-[0.3em]">
              {isAdmin ? "Yönetim Paneli" : "Kullanıcı Paneli"}
            </p>
          </div>
        </div>

        <nav className="flex flex-col gap-2 flex-1">
          <NavContent />
        </nav>

        <div className="border-t border-zinc-800 pt-6 flex flex-col gap-2">
          <div className="flex items-center gap-3 px-3 py-2">
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                isAdmin
                  ? "bg-red-600/20 border border-red-600/30"
                  : "bg-zinc-800 border border-zinc-700"
              }`}
            >
              <User
                size={15}
                className={isAdmin ? "text-red-500" : "text-zinc-400"}
              />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black text-zinc-300 truncate">
                {profile?.full_name || "Yükleniyor..."}
              </p>
              <p className="text-[9px] text-zinc-600 uppercase font-bold tracking-widest">
                {isAdmin ? "Admin" : "Kullanıcı"}
              </p>
            </div>
          </div>
          <button
            onClick={handleLogout}
            className="flex items-center gap-3 px-5 py-3.5 rounded-2xl text-[11px] font-black uppercase tracking-widest text-zinc-600 hover:text-red-500 border border-transparent hover:border-red-900/30 hover:bg-red-950/10 transition-all"
          >
            <LogOut size={14} /> Çıkış Yap
          </button>
        </div>
      </aside>

      {/* ANA İÇERİK */}
      <main className="flex-1 h-full lg:h-screen overflow-y-auto bg-[#09090b]">
        <div className="p-6 md:p-12 max-w-7xl mx-auto w-full">
          {activeTab === "dashboard" && <Dashboard profile={profile} />}
          {activeTab === "inventory" && <Inventory mode="inventory" />}
          {activeTab === "my_stock" && <Stock />}
          {activeTab === "my_requests" && <MyRequests />}
          {activeTab === "requests" && isAdmin && <Requests />}
          {activeTab === "users" && isAdmin && <Users />}
          {(activeTab === "requests" || activeTab === "users") && !isAdmin && (
            <div className="h-[60vh] flex flex-col items-center justify-center border border-dashed border-zinc-800 rounded-[2rem]">
              <h2 className="text-2xl font-black italic text-zinc-800 uppercase">
                Yetkisiz Erişim
              </h2>
              <p className="text-zinc-700 text-sm mt-2">
                Bu sayfaya erişim yetkiniz yok.
              </p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;
