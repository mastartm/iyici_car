import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  ChevronDown,
  ChevronUp,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  RefreshCw,
} from "lucide-react";

const statusConfig = {
  pending: {
    label: "Beklemede",
    color: "text-amber-500",
    bg: "bg-amber-500/10 border-amber-500/20",
    icon: Clock,
  },
  approved: {
    label: "Onaylandı",
    color: "text-green-500",
    bg: "bg-green-500/10 border-green-500/20",
    icon: CheckCircle,
  },
  rejected: {
    label: "Reddedildi",
    color: "text-red-500",
    bg: "bg-red-500/10 border-red-500/20",
    icon: XCircle,
  },
  completed: {
    label: "Tamamlandı",
    color: "text-blue-500",
    bg: "bg-blue-500/10 border-blue-500/20",
    icon: Package,
  },
};

const MyRequests = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [activeTab, setActiveTab] = useState("all");

  const fetchOrders = async () => {
    setLoading(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setOrders([]);
      setLoading(false);
      return;
    }

    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items(*, products(*))`)
      .eq("user_id", user.id) // user?.id değil, user.id
      .eq("is_hidden", false)
      .order("created_at", { ascending: false });

    if (!error) setOrders(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchOrders();

    // Realtime: admin durumu değiştirince otomatik güncelle
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          fetchOrders();
        },
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, []);

  const tabs = [
    { key: "all", label: "Tümü" },
    { key: "pending", label: "Beklemede" },
    { key: "approved", label: "Onaylandı" },
    { key: "rejected", label: "Reddedildi" },
    { key: "completed", label: "Tamamlandı" },
  ];

  const filteredOrders =
    activeTab === "all" ? orders : orders.filter((o) => o.status === activeTab);

  const counts = {
    all: orders.length,
    pending: orders.filter((o) => o.status === "pending").length,
    approved: orders.filter((o) => o.status === "approved").length,
    rejected: orders.filter((o) => o.status === "rejected").length,
    completed: orders.filter((o) => o.status === "completed").length,
  };

  if (loading)
    return (
      <div className="flex items-center justify-center h-48">
        <div className="w-2 h-2 bg-blue-600 rounded-full animate-ping" />
      </div>
    );

  return (
    <div className="w-full text-white font-sans">
      {/* BAŞLIK */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">
          TALEPLERİM
        </h1>
        <button
          onClick={fetchOrders}
          className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 px-4 py-2 rounded-xl text-[10px] font-black uppercase text-zinc-500 hover:text-white hover:bg-zinc-800 transition-all"
        >
          <RefreshCw size={12} /> Yenile
        </button>
      </div>

      {/* SEKMELER */}
      <div className="flex gap-1 flex-wrap mb-6">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-3 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-1.5 ${
              activeTab === tab.key
                ? tab.key === "pending"
                  ? "bg-amber-500/20 text-amber-500 border border-amber-500/30"
                  : tab.key === "approved"
                    ? "bg-green-500/20 text-green-500 border border-green-500/30"
                    : tab.key === "rejected"
                      ? "bg-red-500/20 text-red-500 border border-red-500/30"
                      : tab.key === "completed"
                        ? "bg-blue-500/20 text-blue-500 border border-blue-500/30"
                        : "bg-zinc-700 text-white border border-zinc-600"
                : "bg-zinc-900 text-zinc-500 border border-zinc-800 hover:bg-zinc-800"
            }`}
          >
            {tab.label}
            <span className="text-[9px] opacity-70">{counts[tab.key]}</span>
          </button>
        ))}
      </div>

      {/* LİSTE */}
      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-zinc-800 rounded-3xl">
          <p className="text-zinc-700 font-black uppercase text-sm">
            Talep Bulunamadı
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredOrders.map((order) => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const StatusIcon = status.icon;
            const isExpanded = expandedId === order.id;

            return (
              <div
                key={order.id}
                className={`border rounded-2xl overflow-hidden transition-all ${
                  order.status === "approved"
                    ? "bg-green-500/5 border-green-500/20"
                    : order.status === "rejected"
                      ? "bg-red-500/5 border-red-500/20"
                      : order.status === "completed"
                        ? "bg-blue-500/5 border-blue-500/20"
                        : "bg-zinc-900/40 border-zinc-800/40"
                }`}
              >
                {/* BAŞLIK */}
                <div
                  onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-white/5 transition-all"
                >
                  <div
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase shrink-0 ${status.bg} ${status.color}`}
                  >
                    <StatusIcon size={11} />
                    {status.label}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-tight">
                      Talep #{order.id.slice(0, 8).toUpperCase()}
                    </p>
                    <p className="text-[10px] text-zinc-500 font-bold mt-0.5">
                      {new Date(order.created_at).toLocaleDateString("tr-TR", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <span className="text-[10px] font-black text-zinc-500 uppercase shrink-0">
                    {order.total_units} araç
                  </span>

                  {isExpanded ? (
                    <ChevronUp size={15} className="text-zinc-500 shrink-0" />
                  ) : (
                    <ChevronDown size={15} className="text-zinc-500 shrink-0" />
                  )}
                </div>

                {/* DETAY */}
                {isExpanded && (
                  <div className="border-t border-zinc-800/30 p-4 space-y-3">
                    {/* Admin notu varsa göster */}
                    {order.status === "rejected" && (
                      <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                        <p className="text-[9px] font-black text-red-500 uppercase tracking-widest mb-1">
                          Bilgi
                        </p>
                        <p className="text-xs text-red-400">
                          Talebiniz reddedildi. Daha fazla bilgi için
                          yöneticinizle iletişime geçin.
                        </p>
                      </div>
                    )}
                    {order.status === "approved" && (
                      <div className="p-3 bg-green-500/10 border border-green-500/20 rounded-xl">
                        <p className="text-[9px] font-black text-green-500 uppercase tracking-widest mb-1">
                          Bilgi
                        </p>
                        <p className="text-xs text-green-400">
                          Talebiniz onaylandı! En kısa sürede sizinle iletişime
                          geçilecek.
                        </p>
                      </div>
                    )}
                    {order.status === "completed" && (
                      <div className="p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                        <p className="text-[9px] font-black text-blue-500 uppercase tracking-widest mb-1">
                          Bilgi
                        </p>
                        <p className="text-xs text-blue-400">
                          Talebiniz tamamlandı. İyi günler dileriz!
                        </p>
                      </div>
                    )}

                    {/* ARAÇLAR */}
                    <div className="flex flex-col gap-2">
                      {order.order_items?.map((item) => (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/30"
                        >
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-zinc-950 shrink-0">
                            <img
                              src={item.products?.image_urls?.[0]}
                              className="w-full h-full object-cover"
                              alt=""
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-xs font-black uppercase tracking-tight truncate">
                              {item.products?.brand_model}
                            </p>
                            <p className="text-[10px] text-blue-500 font-black tracking-widest uppercase mt-0.5">
                              {item.products?.vin_no || "VIN-GIRILMEDI"}
                            </p>
                            <p className="text-[10px] text-zinc-500 font-bold mt-0.5 uppercase">
                              {item.products?.model_year}
                              {item.products?.mileage &&
                                ` • ${item.products.mileage.toLocaleString()} KM`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* KULLANICI NOTU */}
                    {order.notes && (
                      <div className="p-3 bg-zinc-900/30 border border-zinc-800/30 rounded-xl">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">
                          Notunuz
                        </p>
                        <p className="text-xs text-zinc-400 italic">
                          {order.notes}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default MyRequests;
