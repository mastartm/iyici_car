import React, { useState, useEffect, useMemo, useCallback } from "react";
import { supabase } from "./supabaseClient";
import {
  X,
  Search,
  MessageCircle,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  ArrowLeft,
} from "lucide-react";

const Stock = () => {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("My Stock");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [thumbStart, setThumbStart] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [currentUserId, setCurrentUserId] = useState(null);

  const THUMB_VISIBLE = 4;

  // Kullanıcı bilgisini çek
  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) setCurrentUserId(user.id);
    };
    getUser();
  }, []);

  // Stok verisini getir - useCallback ile sarmaladık ki dependency olarak kullanabilelim
  const fetchStock = useCallback(async () => {
    if (!currentUserId) return;
    setLoading(true);
    try {
      const { data: stockData } = await supabase
        .from("user_stocks")
        .select("product_id")
        .eq("user_id", currentUserId);

      const productIds = stockData?.map((s) => s.product_id) || [];

      if (productIds.length === 0) {
        setItems([]);
      } else {
        const { data, error } = await supabase
          .from("products")
          .select("*")
          .in("id", productIds)
          .order("created_at", { ascending: false });

        if (error) throw error;
        setItems(data || []);
      }
    } catch (error) {
      console.error("Stok çekme hatası:", error.message);
    } finally {
      setLoading(false);
    }
  }, [currentUserId]);

  useEffect(() => {
    fetchStock();
  }, [fetchStock]);

  // Ürünü stoktan çıkar
  const handleRemoveFromStock = async (e, id) => {
    e?.stopPropagation();
    try {
      const { error } = await supabase
        .from("user_stocks")
        .delete()
        .eq("user_id", currentUserId)
        .eq("product_id", id);

      if (error) throw error;

      setSelectedIds((prev) => prev.filter((sid) => sid !== id));
      if (selectedItem?.id === id) setSelectedItem(null);
      fetchStock();
    } catch (error) {
      alert("Çıkarma işlemi başarısız: " + error.message);
    }
  };

  const toggleSelect = (e, id) => {
    e.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((sid) => sid !== id) : [...prev, id],
    );
  };

  // Sipariş/Talep Gönder
  const handleSubmitOrder = async () => {
    if (selectedIds.length === 0) return;
    setSubmitting(true);
    try {
      const { data: order, error: orderError } = await supabase
        .from("orders")
        .insert([
          {
            user_id: currentUserId,
            status: "pending",
            notes,
            total_units: selectedIds.length,
          },
        ])
        .select()
        .single();

      if (orderError) throw orderError;

      const { error: itemsError } = await supabase
        .from("order_items")
        .insert(
          selectedIds.map((pid) => ({ order_id: order.id, product_id: pid })),
        );

      if (itemsError) throw itemsError;

      // Stoktan temizle
      await supabase
        .from("user_stocks")
        .delete()
        .eq("user_id", currentUserId)
        .in("product_id", selectedIds);

      setSelectedIds([]);
      setNotes("");
      setShowReview(false);
      alert("Talebiniz başarıyla yöneticiye iletildi!");
      fetchStock();
    } catch (err) {
      alert("Hata oluştu: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // Filtreleme ve Sayım Mantığı (Memoized)
  const categoryMap = { All: null, Vehicles: 1, Engines: 2, Parts: 3 };

  const categoryCounts = useMemo(
    () => ({
      All: items.length,
      Vehicles: items.filter((i) => i.category_id === 1).length,
      Engines: items.filter((i) => i.category_id === 2).length,
      Parts: items.filter((i) => i.category_id === 3).length,
    }),
    [items],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const matchesCategory =
        categoryFilter === "All" ||
        item.category_id === categoryMap[categoryFilter];
      const matchesSearch =
        !searchQuery ||
        item.brand_model?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.vin_no?.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [items, categoryFilter, searchQuery]);

  const selectedItems = useMemo(
    () => items.filter((i) => selectedIds.includes(i.id)),
    [items, selectedIds],
  );

  // LOADING EKRANI
  if (loading && items.length === 0) {
    return (
      <div className="w-full h-64 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-zinc-500 text-xs font-black tracking-widest uppercase">
            Yükleniyor...
          </p>
        </div>
      </div>
    );
  }

  // REVIEW EKRANI
  if (showReview) {
    return (
      <div className="w-full text-white font-sans animate-in fade-in duration-300">
        <button
          onClick={() => setShowReview(false)}
          className="flex items-center gap-2 text-zinc-500 hover:text-white text-[11px] font-black uppercase tracking-widest mb-8 transition-all"
        >
          <ArrowLeft size={14} /> Stoğuma Dön
        </button>

        <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-2">
          Seçimi İncele
        </h2>
        <p className="text-zinc-500 text-xs mb-8">
          Talebinizi onaylamadan önce son kontrolleri yapın.
        </p>

        <div className="flex flex-col gap-2 mb-8">
          {selectedItems.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-4 p-4 bg-zinc-900/40 border border-zinc-800/40 rounded-2xl"
            >
              <div className="w-16 h-12 rounded-xl overflow-hidden bg-zinc-950 shrink-0">
                <img
                  src={item.image_urls?.[0]}
                  className="w-full h-full object-cover"
                  alt=""
                />
              </div>
              <div className="flex-1">
                <h3 className="font-black text-sm uppercase tracking-tight">
                  {item.brand_model}
                </h3>
                <p className="text-[10px] font-black text-blue-500 tracking-widest uppercase">
                  {item.vin_no || "VIN YOK"}
                </p>
              </div>
              <button
                onClick={() =>
                  setSelectedIds((prev) => prev.filter((id) => id !== item.id))
                }
                className="w-8 h-8 flex items-center justify-center text-zinc-600 hover:text-red-500 transition-all"
              >
                <X size={15} />
              </button>
            </div>
          ))}
        </div>

        <div className="mb-8">
          <label className="block text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-3">
            Ek Notlar
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="İsteğinizle ilgili detayları buraya yazabilirsiniz..."
            rows={4}
            className="w-full bg-zinc-900/40 border border-zinc-800/40 rounded-2xl p-4 text-sm text-white focus:outline-none focus:border-blue-600 transition-all resize-none"
          />
        </div>

        <div className="flex justify-between items-center p-6 bg-blue-600/5 border border-blue-600/20 rounded-2xl mb-8">
          <div>
            <p className="text-[10px] font-black text-blue-500 uppercase tracking-widest">
              Toplam Seçim
            </p>
            <p className="text-2xl font-black italic">
              {selectedItems.length} Birim
            </p>
          </div>
          <button
            onClick={handleSubmitOrder}
            disabled={submitting || selectedItems.length === 0}
            className="px-8 py-4 bg-green-600 hover:bg-green-700 text-white rounded-2xl text-xs font-black uppercase tracking-widest transition-all disabled:opacity-50 flex items-center gap-2"
          >
            {submitting ? "Gönderiliyor..." : "Talebi Onayla ve Gönder"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full text-white font-sans pb-24">
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">
          STOĞUM
        </h1>
        <a
          href="https://wa.me/905338471818"
          target="_blank"
          rel="noopener noreferrer"
          className="bg-[#25D366] text-black px-5 py-2.5 rounded-xl text-[11px] font-black tracking-widest uppercase hover:scale-105 transition-all flex items-center gap-2"
        >
          📞 İLETİŞİM
        </a>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 mb-6">
        <button className="px-6 py-3 rounded-xl text-[11px] font-black tracking-widest uppercase bg-blue-600 text-white shadow-lg shadow-blue-600/20 flex items-center gap-2">
          MY STOCK
          <span className="bg-white/20 px-2 py-0.5 rounded-md text-[9px]">
            {items.length}
          </span>
        </button>
      </div>

      {/* Filters & Search */}
      <div className="flex flex-wrap items-center gap-4 mb-6 p-4 bg-zinc-900/30 border border-zinc-800/40 rounded-3xl">
        <div className="flex bg-zinc-950 p-1 rounded-xl border border-zinc-800">
          {["All", "Vehicles", "Engines", "Parts"].map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-4 py-2 rounded-lg text-[10px] font-black transition-all ${
                categoryFilter === cat
                  ? "bg-zinc-800 text-white shadow-sm"
                  : "text-zinc-500 hover:text-zinc-300"
              }`}
            >
              {cat.toUpperCase()} ({categoryCounts[cat]})
            </button>
          ))}
        </div>

        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-4 top-1/2 -translate-y-1/2 text-zinc-600"
            size={14}
          />
          <input
            type="text"
            placeholder="Model veya VIN ile ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-950 border border-zinc-800 rounded-xl pl-10 pr-4 py-3 text-xs focus:outline-none focus:border-blue-600 transition-all"
          />
        </div>
      </div>

      {/* List */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 border border-dashed border-zinc-800 rounded-[3rem] bg-zinc-900/10">
          <p className="text-zinc-700 font-black uppercase text-lg tracking-tighter italic">
            Eşleşen ürün bulunamadı
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3">
          {filteredItems.map((item) => {
            const isSelected = selectedIds.includes(item.id);
            return (
              <div
                key={item.id}
                onClick={() => {
                  setSelectedItem(item);
                  setActiveImageIndex(0);
                  setThumbStart(0);
                }}
                className={`group flex items-center gap-4 p-4 rounded-[2rem] border cursor-pointer transition-all ${
                  isSelected
                    ? "bg-blue-600/10 border-blue-600/40"
                    : "bg-zinc-900/40 border-zinc-800/40 hover:border-zinc-600"
                }`}
              >
                <div
                  onClick={(e) => toggleSelect(e, item.id)}
                  className={`w-6 h-6 rounded-lg border-2 shrink-0 flex items-center justify-center transition-all ${
                    isSelected
                      ? "bg-blue-600 border-blue-600 shadow-lg shadow-blue-600/30"
                      : "border-zinc-700 group-hover:border-zinc-500"
                  }`}
                >
                  {isSelected && (
                    <span className="text-white text-[10px] font-black">✓</span>
                  )}
                </div>

                <div className="w-24 h-16 rounded-2xl overflow-hidden bg-zinc-950 border border-zinc-800/50 shrink-0">
                  <img
                    src={item.image_urls?.[0]}
                    className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    alt=""
                  />
                </div>

                <div className="flex-1 min-w-0">
                  <h3 className="font-black text-base uppercase tracking-tight truncate">
                    {item.brand_model}
                  </h3>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-[10px] font-black text-blue-500 tracking-widest uppercase">
                      {item.vin_no || "VIN YOK"}
                    </span>
                    <span className="text-zinc-700">|</span>
                    <span className="text-[10px] font-bold text-zinc-500 uppercase">
                      {item.model_year} • {item.mileage?.toLocaleString()} KM
                    </span>
                  </div>
                </div>

                <button
                  onClick={(e) => handleRemoveFromStock(e, item.id)}
                  className="w-10 h-10 flex items-center justify-center bg-zinc-950 border border-zinc-800 rounded-xl text-zinc-600 hover:text-red-500 hover:border-red-500/30 transition-all"
                >
                  <X size={16} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Floating Action Bar */}
      {selectedIds.length > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[500] bg-zinc-950/80 backdrop-blur-xl border border-zinc-800 px-6 py-4 rounded-[2rem] flex items-center gap-8 shadow-2xl animate-in slide-in-from-bottom-10 duration-500">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white font-black italic">
              {selectedIds.length}
            </div>
            <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">
              Birim Seçildi
            </span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setSelectedIds([])}
              className="px-6 py-3 rounded-2xl text-zinc-500 text-[11px] font-black uppercase hover:text-white transition-all"
            >
              Temizle
            </button>
            <button
              onClick={() => setShowReview(true)}
              className="px-8 py-3 rounded-2xl bg-green-600 text-white text-[11px] font-black uppercase tracking-widest hover:bg-green-700 transition-all shadow-lg shadow-green-600/20"
            >
              İsteği Tamamla
            </button>
          </div>
        </div>
      )}

      {/* Modal - Seçili Ürün Detayı */}
      {selectedItem && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/90 backdrop-blur-md p-4 animate-in fade-in duration-300">
          <div className="bg-[#0f1117] w-full max-w-5xl max-h-[90vh] rounded-[3rem] relative flex flex-col md:flex-row overflow-hidden border border-zinc-800 shadow-2xl">
            <button
              onClick={() => setSelectedItem(null)}
              className="absolute top-6 right-6 z-50 bg-white text-black w-10 h-10 rounded-full flex items-center justify-center hover:scale-110 transition-all shadow-xl"
            >
              <X size={20} />
            </button>

            {/* Modal Sol: Görseller */}
            <div className="md:w-[55%] bg-black flex flex-col p-8 border-r border-zinc-800/50">
              <div className="relative flex-1 flex items-center justify-center min-h-[300px]">
                <img
                  src={selectedItem.image_urls?.[activeImageIndex]}
                  className="max-h-[50vh] w-full object-contain rounded-3xl"
                  alt=""
                />
                {selectedItem.image_urls?.length > 1 && (
                  <>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) => Math.max(0, prev - 1))
                      }
                      className="absolute left-0 bg-zinc-900/80 w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-all"
                    >
                      <ChevronLeft size={24} />
                    </button>
                    <button
                      onClick={() =>
                        setActiveImageIndex((prev) =>
                          Math.min(
                            selectedItem.image_urls.length - 1,
                            prev + 1,
                          ),
                        )
                      }
                      className="absolute right-0 bg-zinc-900/80 w-12 h-12 rounded-full flex items-center justify-center text-white hover:bg-blue-600 transition-all"
                    >
                      <ChevronRight size={24} />
                    </button>
                  </>
                )}
              </div>

              {/* Thumbnails */}
              {selectedItem.image_urls?.length > 1 && (
                <div className="flex gap-2 mt-6 justify-center">
                  {selectedItem.image_urls.slice(0, 6).map((url, i) => (
                    <img
                      key={i}
                      src={url}
                      onClick={() => setActiveImageIndex(i)}
                      className={`w-16 h-12 object-cover rounded-xl cursor-pointer border-2 transition-all ${
                        activeImageIndex === i
                          ? "border-blue-600 scale-110"
                          : "border-transparent opacity-40"
                      }`}
                    />
                  ))}
                </div>
              )}
            </div>

            {/* Modal Sağ: Detaylar */}
            <div className="md:w-[45%] p-10 overflow-y-auto bg-[#0f1117]">
              <p className="text-[10px] font-black text-blue-500 tracking-[0.4em] mb-3 uppercase opacity-80">
                {selectedItem.vin_no || "VIN KAYDI YOK"}
              </p>
              <h2 className="text-4xl font-black italic uppercase tracking-tighter mb-8 text-white">
                {selectedItem.brand_model}
              </h2>

              <div className="grid grid-cols-2 gap-4 mb-10">
                {[
                  { label: "MODEL YILI", value: selectedItem.model_year },
                  {
                    label: "KİLOMETRE",
                    value: selectedItem.mileage
                      ? selectedItem.mileage.toLocaleString() + " KM"
                      : "---",
                  },
                  { label: "MOTOR KODU", value: selectedItem.engine_code },
                  { label: "ŞANZIMAN", value: selectedItem.transmission },
                  { label: "RENK", value: selectedItem.color },
                  { label: "DİREKSİYON", value: selectedItem.steering_side },
                ].map((d, i) => (
                  <div
                    key={i}
                    className="bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800/50"
                  >
                    <p className="text-[8px] text-zinc-500 font-black mb-1 uppercase tracking-widest">
                      {d.label}
                    </p>
                    <p className="text-sm font-bold text-zinc-200 uppercase">
                      {d.value || "---"}
                    </p>
                  </div>
                ))}
              </div>

              <button
                onClick={(e) => handleRemoveFromStock(e, selectedItem.id)}
                className="w-full bg-red-600/10 border border-red-600/20 text-red-500 hover:bg-red-600 hover:text-white py-4 rounded-2xl font-black text-[11px] tracking-widest transition-all uppercase"
              >
                Bu Ürünü Stoğumdan Çıkar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Stock;
