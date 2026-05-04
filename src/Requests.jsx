import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { ChevronDown, ChevronUp, User, Trash2, EyeOff } from "lucide-react";

const statusConfig = {
  pending: { label: "Beklemede", color: "text-amber-500", bg: "bg-amber-500/10 border-amber-500/20" },
  approved: { label: "Onaylandı", color: "text-green-500", bg: "bg-green-500/10 border-green-500/20" },
  rejected: { label: "Reddedildi", color: "text-red-500", bg: "bg-red-500/10 border-red-500/20" },
  completed: { label: "Tamamlandı", color: "text-blue-500", bg: "bg-blue-500/10 border-blue-500/20" },
};

const Requests = () => {
  const [orders, setOrders] = useState([]);
  const [profiles, setProfiles] = useState({});
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [updating, setUpdating] = useState(null);

  const fetchOrders = async () => {
    setLoading(true);
    // Admin TÜM talepleri görür — is_hidden filtresi YOK
    const { data, error } = await supabase
      .from("orders")
      .select(`*, order_items(*, products(*))`)
      .order("created_at", { ascending: false });

    if (!error) {
      setOrders(data || []);
      const userIds = [...new Set(data?.map(o => o.user_id).filter(Boolean))];
      if (userIds.length > 0) {
        const { data: profileData } = await supabase
          .from("profiles").select("id, full_name").in("id", userIds);
        const map = {};
        profileData?.forEach(p => { map[p.id] = p.full_name; });
        setProfiles(map);
      }
    }
    setLoading(false);
  };

  useEffect(() => { fetchOrders(); }, []);

  const handleUpdateStatus = async (orderId, newStatus) => {
    setUpdating(orderId);
    await supabase.from("orders").update({ status: newStatus }).eq("id", orderId);
    fetchOrders();
    setUpdating(null);
  };

  // Sadece kullanıcının arayüzünden gizler, admin her zaman görür
  const handleHideFromUser = async (orderId) => {
    await supabase.from("orders").update({ is_hidden: true }).eq("id", orderId);
    fetchOrders();
  };

  const handleShowToUser = async (orderId) => {
    await supabase.from("orders").update({ is_hidden: false }).eq("id", orderId);
    fetchOrders();
  };

  const handleDelete = async (orderId) => {
    if (!window.confirm("Bu talebi kalıcı olarak silmek istediğine emin misin?")) return;
    await supabase.from("order_items").delete().eq("order_id", orderId);
    await supabase.from("orders").delete().eq("id", orderId);
    fetchOrders();
  };

  const getUserName = (userId) => profiles[userId] || userId?.slice(0, 8) + "...";

  const getOrderCode = (order) => {
    const name = profiles[order.user_id] || "USR";
    const initials = name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 3);
    const date = new Date(order.created_at);
    return `${initials}-${date.getDate()}${date.getMonth() + 1}${String(date.getFullYear()).slice(2)}`;
  };

  const filteredOrders = orders.filter(o => filterStatus === "all" ? true : o.status === filterStatus);
  const counts = {
    all: orders.length,
    pending: orders.filter(o => o.status === "pending").length,
    approved: orders.filter(o => o.status === "approved").length,
    rejected: orders.filter(o => o.status === "rejected").length,
    completed: orders.filter(o => o.status === "completed").length,
  };

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
    </div>
  );

  return (
    <div className="w-full text-white font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">TALEPLER</h1>
        <span className="text-[11px] font-black text-zinc-500 uppercase tracking-widest">{orders.length} toplam talep</span>
      </div>

      <div className="flex gap-2 flex-wrap mb-8">
        {[
          { key: "all", label: "Tümü" },
          { key: "pending", label: "Beklemede" },
          { key: "approved", label: "Onaylandı" },
          { key: "rejected", label: "Reddedildi" },
          { key: "completed", label: "Tamamlandı" },
        ].map(f => (
          <button key={f.key} onClick={() => setFilterStatus(f.key)}
            className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
              filterStatus === f.key ? "bg-red-600 text-white" : "bg-zinc-900 border border-zinc-800 text-zinc-500 hover:bg-zinc-800"
            }`}>
            {f.label}
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-black ${filterStatus === f.key ? "bg-white/20" : "bg-zinc-800"}`}>
              {counts[f.key]}
            </span>
          </button>
        ))}
      </div>

      {filteredOrders.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-zinc-800 rounded-3xl">
          <p className="text-zinc-700 font-black uppercase text-sm">Talep Bulunamadı</p>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filteredOrders.map(order => {
            const status = statusConfig[order.status] || statusConfig.pending;
            const isExpanded = expandedId === order.id;
            const isUpdating = updating === order.id;

            return (
              <div key={order.id} className={`border rounded-2xl overflow-hidden transition-all ${
                order.is_hidden ? "border-zinc-700/30 bg-zinc-900/20" : "bg-zinc-900/40 border-zinc-800/40"
              }`}>
                <div onClick={() => setExpandedId(isExpanded ? null : order.id)}
                  className="flex items-center gap-3 p-4 cursor-pointer hover:bg-zinc-800/20 transition-all">
                  <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-black uppercase shrink-0 ${status.bg} ${status.color}`}>
                    {status.label}
                  </div>

                  {order.is_hidden && (
                    <span className="text-[9px] px-2 py-1 rounded-lg bg-zinc-800 text-zinc-500 font-black uppercase shrink-0 border border-zinc-700">
                      Kullanıcıdan Gizli
                    </span>
                  )}

                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black uppercase tracking-tight">{getOrderCode(order)}</p>
                    <p className="text-[10px] text-zinc-500 font-bold mt-0.5 flex items-center gap-1 flex-wrap">
                      <User size={10} />
                      <span className="text-zinc-300 font-black">{getUserName(order.user_id)}</span>
                      <span className="mx-1 text-zinc-700">•</span>
                      {new Date(order.created_at).toLocaleDateString("tr-TR", {
                        day: "numeric", month: "long", year: "numeric",
                        hour: "2-digit", minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <span className="text-[10px] font-black text-zinc-500 uppercase shrink-0">{order.total_units} araç</span>

                  {/* GİZLE/GÖSTER — sadece kullanıcı arayüzünü etkiler */}
                  <button
                    onClick={e => { e.stopPropagation(); order.is_hidden ? handleShowToUser(order.id) : handleHideFromUser(order.id); }}
                    className={`w-8 h-8 flex items-center justify-center rounded-xl border transition-all shrink-0 ${
                      order.is_hidden
                        ? "bg-amber-500/10 border-amber-500/20 text-amber-500"
                        : "bg-zinc-800/50 border-zinc-700/50 text-zinc-500 hover:text-amber-500"
                    }`}
                    title={order.is_hidden ? "Kullanıcıya Göster" : "Kullanıcıdan Gizle"}>
                    <EyeOff size={14} />
                  </button>

                  <button
                    onClick={e => { e.stopPropagation(); handleDelete(order.id); }}
                    className="w-8 h-8 flex items-center justify-center bg-zinc-800/50 border border-zinc-700/50 rounded-xl text-zinc-500 hover:text-red-500 transition-all shrink-0"
                    title="Kalıcı Sil">
                    <Trash2 size={14} />
                  </button>

                  {isExpanded ? <ChevronUp size={15} className="text-zinc-500 shrink-0" /> : <ChevronDown size={15} className="text-zinc-500 shrink-0" />}
                </div>

                {isExpanded && (
                  <div className="border-t border-zinc-800/40 p-5">
                    <div className="flex flex-col gap-2 mb-5">
                      {order.order_items?.map(item => (
                        <div key={item.id} className="flex items-center gap-3 p-3 bg-zinc-900/50 rounded-xl border border-zinc-800/30">
                          <div className="w-16 h-12 rounded-lg overflow-hidden bg-zinc-950 shrink-0">
                            <img src={item.products?.image_urls?.[0]} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="flex-1">
                            <p className="text-xs font-black uppercase tracking-tight">{item.products?.brand_model}</p>
                            <p className="text-[10px] text-blue-500 font-black tracking-widest uppercase mt-0.5">{item.products?.vin_no || "VIN-GIRILMEDI"}</p>
                            <p className="text-[10px] text-zinc-500 font-bold mt-0.5 uppercase">
                              {item.products?.model_year}
                              {item.products?.mileage && ` • ${item.products.mileage.toLocaleString()} KM`}
                              {item.products?.transmission && ` • ${item.products.transmission}`}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {order.notes && (
                      <div className="p-4 bg-zinc-900/30 border border-zinc-800/30 rounded-xl mb-5">
                        <p className="text-[9px] font-black text-zinc-500 uppercase tracking-widest mb-1">Müşteri Notu</p>
                        <p className="text-xs text-zinc-400 italic">{order.notes}</p>
                      </div>
                    )}

                    {order.status === "pending" && (
                      <div className="flex gap-3">
                        <button onClick={() => handleUpdateStatus(order.id, "approved")} disabled={isUpdating}
                          className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50">
                          {isUpdating ? "..." : "✓ Onayla"}
                        </button>
                        <button onClick={() => handleUpdateStatus(order.id, "rejected")} disabled={isUpdating}
                          className="flex-1 py-3 bg-red-600/10 border border-red-600/20 hover:bg-red-600/20 text-red-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50">
                          {isUpdating ? "..." : "✕ Reddet"}
                        </button>
                        <button onClick={() => handleUpdateStatus(order.id, "completed")} disabled={isUpdating}
                          className="flex-1 py-3 bg-blue-600/10 border border-blue-600/20 hover:bg-blue-600/20 text-blue-500 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all disabled:opacity-50">
                          {isUpdating ? "..." : "Tamamlandı"}
                        </button>
                      </div>
                    )}

                    {order.status !== "pending" && (
                      <button onClick={() => handleUpdateStatus(order.id, "pending")} disabled={isUpdating}
                        className="w-full py-3 bg-zinc-800 text-zinc-500 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-zinc-700 transition-all">
                        Beklemeye Al
                      </button>
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

export default Requests;
