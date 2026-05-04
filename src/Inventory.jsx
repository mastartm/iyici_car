import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import {
  X,
  Trash2,
  Eye,
  EyeOff,
  PackagePlus,
  Wrench,
  Search,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";

const THUMB_VISIBLE = 4;

const Inventory = ({ mode }) => {
  const [items, setItems] = useState([]);
  const [userStocks, setUserStocks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeCategory, setActiveCategory] = useState(1);
  const [selectedItem, setSelectedItem] = useState(null);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [thumbStart, setThumbStart] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterYear, setFilterYear] = useState("");
  const [filterTransmission, setFilterTransmission] = useState("");
  const [userProfile, setUserProfile] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);

  // --- SAYFALAMA STATE'LERİ ---
  const [currentPage, setCurrentPage] = useState(1);
  const [perPage, setPerPage] = useState(25);

  useEffect(() => {
    const init = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        const { data } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .single();
        setUserProfile(data);
      }
    };
    init();
  }, []);

  const isAdmin = userProfile?.role === "admin";

  const fetchProducts = async () => {
    setLoading(true);
    let query = supabase.from("products").select("*");
    if (!isAdmin) query = query.eq("is_active", true);
    const { data, error } = await query.order("created_at", {
      ascending: false,
    });
    if (!error) setItems(data || []);
    setLoading(false);
  };

  const fetchUserStocks = async () => {
    if (!currentUserId) return;
    const { data } = await supabase
      .from("user_stocks")
      .select("product_id")
      .eq("user_id", currentUserId);
    setUserStocks(data?.map((s) => s.product_id) || []);
  };

  useEffect(() => {
    if (userProfile !== null) fetchProducts();
  }, [mode, userProfile]);

  useEffect(() => {
    if (currentUserId) fetchUserStocks();
  }, [currentUserId]);

  // --- FİLTRE DEĞİŞİNCE SAYFAYI SIFIRLA ---
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, filterYear, filterTransmission, activeCategory]);

  const isInStock = (productId) => userStocks.includes(productId);

  const handleToggleStock = async (e, productId) => {
    e.stopPropagation();
    if (!currentUserId) return;
    if (isInStock(productId)) {
      await supabase
        .from("user_stocks")
        .delete()
        .eq("user_id", currentUserId)
        .eq("product_id", productId);
    } else {
      await supabase
        .from("user_stocks")
        .insert([{ user_id: currentUserId, product_id: productId }]);
    }
    await fetchUserStocks();
  };

  const handleToggleActive = async (e, id, currentStatus) => {
    e.stopPropagation();
    if (!isAdmin) return;
    const { error } = await supabase
      .from("products")
      .update({ is_active: !currentStatus })
      .eq("id", id);
    if (!error) fetchProducts();
  };

  const handleDelete = async (e, item) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (!window.confirm("Bu kaydı silmek istediğine emin misin?")) return;

    try {
      // 1. Storage'dan fotoğrafları sil
      if (item.image_urls?.length > 0) {
        const fileNames = item.image_urls.map((url) => {
          const parts = url.split("/");
          return parts[parts.length - 1]; // dosya adını al
        });

        await supabase.storage.from("vehicle-images").remove(fileNames);
      }

      // 2. Veritabanından sil
      const { error } = await supabase
        .from("products")
        .delete()
        .eq("id", item.id);

      if (error) throw error;
      fetchProducts();
      if (selectedItem?.id === item.id) setSelectedItem(null);
    } catch (err) {
      alert("Hata: " + err.message);
    }
  };

  const closeModal = () => {
    setSelectedItem(null);
    setActiveImageIndex(0);
    setThumbStart(0);
  };

  const categories = [
    { id: 1, label: "Araçlar" },
    { id: 2, label: "Motorlar" },
    { id: 3, label: "Parçalar" },
  ];

  const years = [
    ...new Set(items.map((i) => i.model_year).filter(Boolean)),
  ].sort((a, b) => b - a);

  // --- FİLTRELEME VE SAYFALAMA MANTIĞI ---
  const filteredItems = items.filter((item) => {
    if (item.category_id !== activeCategory) return false;
    if (
      searchQuery &&
      !item.brand_model?.toLowerCase().includes(searchQuery.toLowerCase()) &&
      !item.vin_no?.toLowerCase().includes(searchQuery.toLowerCase())
    )
      return false;
    if (filterYear && item.model_year !== parseInt(filterYear)) return false;
    if (filterTransmission && item.transmission !== filterTransmission)
      return false;
    return true;
  });

  const totalPages = Math.ceil(filteredItems.length / perPage);
  const paginatedItems = filteredItems.slice(
    (currentPage - 1) * perPage,
    currentPage * perPage,
  );

  const categoryCounts = {
    1: items.filter((i) => i.category_id === 1).length,
    2: items.filter((i) => i.category_id === 2).length,
    3: items.filter((i) => i.category_id === 3).length,
  };

  return (
    <div className="w-full text-white font-sans">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-black italic uppercase tracking-tighter">
          ENVANTER
        </h1>
        <div className="flex gap-3">
          <a
            href="https://wa.me/905338471818"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-black px-5 py-2.5 rounded-xl text-[11px] font-black tracking-widest uppercase hover:bg-[#1ebe57] transition-all flex items-center gap-2"
          >
            📞 İLETİŞİM
          </a>
        </div>
      </div>

      <div className="flex gap-2 border-b border-zinc-800/50 mb-6">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => setActiveCategory(cat.id)}
            className={`pb-3 px-1 text-sm font-black tracking-widest uppercase transition-all relative flex items-center gap-2 ${activeCategory === cat.id ? "text-white" : "text-zinc-600 hover:text-zinc-400"}`}
          >
            {cat.label}
            <span
              className={`text-[10px] px-2 py-0.5 rounded-full font-black ${activeCategory === cat.id ? "bg-red-600 text-white" : "bg-zinc-800 text-zinc-500"}`}
            >
              {categoryCounts[cat.id]}
            </span>
            {activeCategory === cat.id && (
              <div className="absolute bottom-0 left-0 w-full h-0.5 bg-red-600" />
            )}
          </button>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 mb-8 p-4 bg-zinc-900/30 border border-zinc-800/40 rounded-2xl">
        <div className="relative flex-1 min-w-[200px]">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-600"
            size={14}
          />
          <input
            type="text"
            placeholder="Marka, model, şasi ara..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-4 py-2.5 text-xs focus:outline-none focus:border-zinc-600 transition-all"
          />
        </div>
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-400 focus:outline-none min-w-[130px]"
        >
          <option value="">Tüm Yıllar</option>
          {years.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
        <select
          value={filterTransmission}
          onChange={(e) => setFilterTransmission(e.target.value)}
          className="bg-zinc-900 border border-zinc-800 rounded-xl px-4 py-2.5 text-xs text-zinc-400 focus:outline-none min-w-[150px]"
        >
          <option value="">Tüm Şanzımanlar</option>
          <option value="Manuel">Manuel</option>
          <option value="Otomatik">Otomatik</option>
          <option value="Yarı-Otomatik">Yarı-Otomatik</option>
        </select>
        <div className="flex items-center text-[11px] text-zinc-500 font-bold ml-auto">
          {filteredItems.length} /{" "}
          {items.filter((i) => i.category_id === activeCategory).length} kayıt
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-ping" />
        </div>
      ) : paginatedItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-48 border border-dashed border-zinc-800 rounded-3xl">
          <p className="text-zinc-700 font-black uppercase text-sm">
            Kayıt Bulunamadı
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {paginatedItems.map((item) => {
              const inStock = isInStock(item.id);
              return (
                <div
                  key={item.id}
                  onClick={() => {
                    setSelectedItem(item);
                    setActiveImageIndex(0);
                    setThumbStart(0);
                  }}
                  className="group bg-zinc-900/40 border border-zinc-800/50 rounded-3xl overflow-hidden hover:border-zinc-700 transition-all cursor-pointer flex flex-col"
                >
                  <div className="relative h-48 bg-zinc-950 overflow-hidden">
                    <img
                      src={item.image_urls?.[0]}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                      alt=""
                    />
                    <div className="absolute top-3 left-3 flex gap-2">
                      {isAdmin &&
                        (item.is_active ? (
                          <span className="bg-green-500 text-black text-[9px] px-3 py-1 rounded-full font-black uppercase">
                            YAYINDA
                          </span>
                        ) : (
                          <span className="bg-zinc-700 text-zinc-400 text-[9px] px-3 py-1 rounded-full font-black uppercase">
                            GİZLİ
                          </span>
                        ))}
                      {inStock && (
                        <span className="bg-blue-600 text-white text-[9px] px-3 py-1 rounded-full font-black uppercase">
                          STOKTA
                        </span>
                      )}
                    </div>
                    {item.image_urls?.length > 1 && (
                      <div className="absolute bottom-2 right-3 bg-black/60 text-[9px] text-zinc-400 px-2 py-1 rounded-lg font-bold">
                        {item.image_urls.length} foto
                      </div>
                    )}
                  </div>
                  <div className="p-5 flex flex-col flex-1">
                    <h3 className="text-base font-black italic uppercase tracking-tight mb-1 truncate">
                      {item.brand_model}
                    </h3>
                    <p className="text-[10px] font-black text-blue-500 mb-3 tracking-widest uppercase">
                      {item.vin_no || "VIN-GIRILMEDI"}
                    </p>
                    <div className="flex flex-wrap gap-2 text-[10px] font-bold text-zinc-500 uppercase mb-4">
                      {item.model_year && <span>{item.model_year}</span>}
                      {item.model_year && item.mileage && (
                        <span className="text-zinc-700">•</span>
                      )}
                      {item.mileage && (
                        <span>{item.mileage.toLocaleString()} km</span>
                      )}
                      {item.transmission && (
                        <>
                          <span className="text-zinc-700">•</span>
                          <span>{item.transmission}</span>
                        </>
                      )}
                    </div>
                    <div className="flex gap-2 mb-2 mt-auto">
                      <button
                        onClick={(e) => handleToggleStock(e, item.id)}
                        className={`flex-1 py-3 rounded-xl text-[9px] font-black tracking-widest transition-all flex items-center justify-center gap-1.5 ${inStock ? "bg-blue-600/10 text-blue-500 border border-blue-600/20 hover:bg-blue-600/20" : "bg-red-600 text-white hover:bg-red-700"}`}
                      >
                        <PackagePlus size={12} />{" "}
                        {inStock ? "STOĞUMDAN ÇIKAR" : "STOĞA EKLE"}
                      </button>
                      <button
                        onClick={(e) => e.stopPropagation()}
                        className="w-11 h-11 bg-zinc-800/50 flex items-center justify-center rounded-xl text-zinc-500 hover:text-white border border-zinc-700/50 transition-all"
                      >
                        <Wrench size={14} />
                      </button>
                    </div>
                    {isAdmin && (
                      <div className="flex gap-2 pt-3 border-t border-zinc-800/40">
                        <button
                          onClick={(e) =>
                            handleToggleActive(e, item.id, item.is_active)
                          }
                          className="flex-1 py-2 bg-zinc-900/50 text-zinc-500 text-[8px] font-black rounded-lg hover:bg-zinc-800 transition-all flex items-center justify-center gap-1.5"
                        >
                          {item.is_active ? (
                            <>
                              <EyeOff size={11} /> GİZLE
                            </>
                          ) : (
                            <>
                              <Eye size={11} /> YAYINLA
                            </>
                          )}
                        </button>
                        <button
                          onClick={(e) => handleDelete(e, item)}
                          className="px-3 py-2 bg-zinc-900/50 text-zinc-600 hover:text-red-500 rounded-lg transition-all"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* SAYFALAMA ÇUBUĞU */}
          {filteredItems.length > 0 && (
            <div className="flex items-center justify-between mt-8 pt-6 border-t border-zinc-800/40">
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500 font-bold uppercase">
                  Göster
                </span>
                <select
                  value={perPage}
                  onChange={(e) => {
                    setPerPage(Number(e.target.value));
                    setCurrentPage(1);
                  }}
                  className="bg-zinc-900 border border-zinc-800 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
                <span className="text-[10px] text-zinc-500 font-bold uppercase">
                  kayıt
                </span>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="w-9 h-9 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  ←
                </button>
                <span className="text-[11px] font-black text-zinc-400 uppercase tracking-widest">
                  Sayfa {currentPage} / {totalPages || 1}
                </span>
                <button
                  onClick={() =>
                    setCurrentPage((p) => Math.min(totalPages, p + 1))
                  }
                  disabled={currentPage === totalPages || totalPages === 0}
                  className="w-9 h-9 flex items-center justify-center bg-zinc-900 border border-zinc-800 rounded-xl text-zinc-400 hover:text-white disabled:opacity-30 transition-all"
                >
                  →
                </button>
              </div>
            </div>
          )}
        </>
      )}

      {/* MODAL PENCERESİ */}
      {selectedItem && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center bg-black/95 backdrop-blur-md p-4">
          <div className="bg-[#0e0e0e] w-full max-w-5xl max-h-[90vh] rounded-[2.5rem] relative flex flex-col md:flex-row overflow-hidden border border-zinc-800 shadow-2xl">
            <button
              onClick={closeModal}
              className="absolute top-5 right-5 z-50 bg-white text-black w-9 h-9 rounded-full flex items-center justify-center hover:scale-110 transition-all"
            >
              <X size={18} />
            </button>
            <div className="md:w-[55%] bg-zinc-950 flex flex-col p-6">
              <div className="relative flex-1 flex items-center justify-center min-h-[250px]">
                <img
                  src={selectedItem.image_urls?.[activeImageIndex]}
                  className="max-h-[45vh] max-w-full object-contain rounded-2xl"
                  alt=""
                />
                {selectedItem.image_urls?.length > 1 && (
                  <>
                    <button
                      onClick={() => {
                        const n = Math.max(0, activeImageIndex - 1);
                        setActiveImageIndex(n);
                        if (n < thumbStart) setThumbStart(n);
                      }}
                      className="absolute left-2 top-1/2 -translate-y-1/2 bg-black/60 w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-black"
                    >
                      <ChevronLeft size={16} />
                    </button>
                    <button
                      onClick={() => {
                        const n = Math.min(
                          selectedItem.image_urls.length - 1,
                          activeImageIndex + 1,
                        );
                        setActiveImageIndex(n);
                        if (n >= thumbStart + THUMB_VISIBLE)
                          setThumbStart(n - THUMB_VISIBLE + 1);
                      }}
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-black/60 w-8 h-8 rounded-full flex items-center justify-center text-white hover:bg-black"
                    >
                      <ChevronRight size={16} />
                    </button>
                    <div className="absolute bottom-2 right-3 bg-black/60 text-[9px] text-zinc-400 px-2 py-1 rounded-lg font-bold">
                      {activeImageIndex + 1} / {selectedItem.image_urls.length}
                    </div>
                  </>
                )}
              </div>
              {(selectedItem.image_urls?.length || 0) > 1 && (
                <div className="flex items-center gap-2 mt-4">
                  <button
                    onClick={() => setThumbStart((s) => Math.max(0, s - 1))}
                    disabled={thumbStart === 0}
                    className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-20 shrink-0"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <div className="flex gap-2 flex-1 overflow-hidden">
                    {selectedItem.image_urls
                      .slice(thumbStart, thumbStart + THUMB_VISIBLE)
                      .map((url, i) => {
                        const ri = thumbStart + i;
                        return (
                          <img
                            key={ri}
                            src={url}
                            onClick={() => setActiveImageIndex(ri)}
                            className={`h-14 flex-1 object-cover rounded-xl cursor-pointer border-2 transition-all ${activeImageIndex === ri ? "border-red-600 scale-95" : "border-transparent opacity-40 hover:opacity-80"}`}
                          />
                        );
                      })}
                  </div>
                  <button
                    onClick={() =>
                      setThumbStart((s) =>
                        Math.min(
                          selectedItem.image_urls.length - THUMB_VISIBLE,
                          s + 1,
                        ),
                      )
                    }
                    disabled={
                      thumbStart + THUMB_VISIBLE >=
                      (selectedItem.image_urls?.length || 0)
                    }
                    className="w-7 h-7 rounded-lg bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-white disabled:opacity-20 shrink-0"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              )}
            </div>
            <div className="md:w-[45%] p-7 overflow-y-auto bg-[#111111] border-l border-zinc-800/50">
              <p className="text-[10px] font-black text-blue-500 tracking-[0.3em] mb-2 uppercase">
                {selectedItem.vin_no || "VIN-GIRILMEDI"}
              </p>
              <h2 className="text-3xl font-black italic uppercase tracking-tighter mb-1 text-white">
                {selectedItem.brand_model}
              </h2>
              <p className="text-[9px] font-black text-red-600 tracking-[0.2em] mb-6 uppercase">
                Teknik Detaylar
              </p>
              <div className="grid grid-cols-2 gap-2.5 mb-6">
                {[
                  { label: "YIL", value: selectedItem.model_year },
                  {
                    label: "KİLOMETRE",
                    value: selectedItem.mileage
                      ? selectedItem.mileage.toLocaleString() + " km"
                      : null,
                  },
                  { label: "MOTOR KODU", value: selectedItem.engine_code },
                  { label: "MOTOR HACMİ", value: selectedItem.engine_capacity },
                  { label: "VİTES", value: selectedItem.transmission },
                  { label: "RENK", value: selectedItem.color },
                  { label: "KOLTUK", value: selectedItem.seat_count },
                  { label: "DİREKSİYON", value: selectedItem.steering_side },
                  { label: "SEGMENT", value: selectedItem.segment },
                ].map((d, i) => (
                  <div
                    key={i}
                    className="bg-zinc-900/60 p-3.5 rounded-2xl border border-zinc-800/40"
                  >
                    <p className="text-[8px] text-zinc-500 font-black mb-1 uppercase tracking-widest">
                      {d.label}
                    </p>
                    <p className="text-xs font-bold text-zinc-200 uppercase">
                      {d.value || "---"}
                    </p>
                  </div>
                ))}
              </div>
              <button
                onClick={(e) => handleToggleStock(e, selectedItem.id)}
                className={`w-full py-4 rounded-2xl font-black italic text-xs mb-3 transition-all tracking-widest ${isInStock(selectedItem.id) ? "bg-zinc-800 text-zinc-400 border border-zinc-700 hover:border-red-900/50 hover:text-red-500" : "bg-red-600 text-white hover:bg-red-700 shadow-xl"}`}
              >
                {isInStock(selectedItem.id)
                  ? "STOĞUMDAN ÇIKAR"
                  : "STOĞUMA EKLE"}
              </button>
              {isAdmin && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleActive(
                      e,
                      selectedItem.id,
                      selectedItem.is_active,
                    );
                  }}
                  className="w-full py-3 rounded-2xl font-black text-[10px] tracking-widest transition-all bg-zinc-900 border border-zinc-800 text-zinc-500 hover:text-white hover:bg-zinc-800 flex items-center justify-center gap-2"
                >
                  {selectedItem.is_active ? (
                    <>
                      <EyeOff size={12} /> GİZLE
                    </>
                  ) : (
                    <>
                      <Eye size={12} /> YAYINLA
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inventory;
