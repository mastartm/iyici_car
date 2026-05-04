import React, { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import { Car, Cog, Package } from "lucide-react";

const inputClass =
  "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none focus:border-red-600 text-sm";
const labelClass =
  "text-[10px] font-black text-zinc-500 uppercase mb-1.5 block tracking-widest";
const selectClass =
  "w-full bg-zinc-900 border border-zinc-800 rounded-xl p-3 text-white outline-none text-sm";

const Field = ({ label, children }) => (
  <div>
    <label className={labelClass}>{label}</label>
    {children}
  </div>
);

const emptyForm = {
  brand_model: "",
  vin_no: "",
  model_year: "",
  mileage: "",
  color: "",
  segment: "",
  engine_code: "",
  engine_capacity: "",
  transmission: "",
  seat_count: "",
  steering_side: "",
};

const Dashboard = ({ profile }) => {
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [formType, setFormType] = useState("vehicle");
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [formData, setFormData] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [stats, setStats] = useState({ vehicles: 0, engines: 0, parts: 0 });

  const isAdmin = profile?.role === "admin";

  const fetchStats = async () => {
    const { data, error } = await supabase
      .from("products")
      .select("category_id");
    if (!error && data) {
      setStats({
        vehicles: data.filter((p) => p.category_id === 1).length,
        engines: data.filter((p) => p.category_id === 2).length,
        parts: data.filter((p) => p.category_id === 3).length,
      });
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  const set = (key, val) => setFormData((prev) => ({ ...prev, [key]: val }));

  const handleSave = async () => {
    if (!formData.brand_model) {
      alert("Marka / Model alanı zorunludur!");
      return;
    }
    setSaving(true);
    try {
      const publicUrls = [];
      for (const file of selectedFiles) {
        const fileName = `${Date.now()}-${file.name}`;
        const { error: uploadError } = await supabase.storage
          .from("vehicle-images")
          .upload(fileName, file);
        if (uploadError) throw uploadError;
        const { data: urlData } = supabase.storage
          .from("vehicle-images")
          .getPublicUrl(fileName);
        publicUrls.push(urlData.publicUrl);
      }
      const category_id =
        formType === "vehicle" ? 1 : formType === "engine" ? 2 : 3;
      const { error } = await supabase.from("products").insert([
        {
          ...formData,
          image_urls: publicUrls,
          model_year: formData.model_year
            ? parseInt(formData.model_year)
            : null,
          mileage: formData.mileage ? parseInt(formData.mileage) : null,
          seat_count: formData.seat_count
            ? parseInt(formData.seat_count)
            : null,
          category_id,
          is_active: true,
        },
      ]);
      if (error) throw error;
      alert("Başarıyla envantere eklendi!");
      setIsFormOpen(false);
      setSelectedFiles([]);
      setFormData(emptyForm);
      fetchStats();
    } catch (err) {
      alert("Hata: " + err.message);
    }
    setSaving(false);
  };

  const formTitle =
    formType === "vehicle" ? "Araç" : formType === "engine" ? "Motor" : "Parça";

  const statCards = [
    {
      label: "Araçlar",
      value: stats.vehicles,
      icon: Car,
      color: "text-blue-500",
      bg: "bg-blue-500/10 border-blue-500/20",
    },
    {
      label: "Motorlar",
      value: stats.engines,
      icon: Cog,
      color: "text-amber-500",
      bg: "bg-amber-500/10 border-amber-500/20",
    },
    {
      label: "Parçalar",
      value: stats.parts,
      icon: Package,
      color: "text-green-500",
      bg: "bg-green-500/10 border-green-500/20",
    },
  ];

  return (
    <div className="w-full">
      {/* HEADER - GÜNCELLENEN KISIM */}
      <header className="flex justify-between items-center mb-8">
        <div className="bg-zinc-900/50 border border-zinc-800 px-4 py-2 rounded-full flex items-center gap-3">
          <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
          <span className="text-[10px] font-black uppercase text-zinc-400">
            Sistem Çevrimiçi
          </span>
        </div>
        <div className="flex gap-3">
          <a
            href="https://wa.me/905338471818"
            target="_blank"
            rel="noopener noreferrer"
            className="bg-[#25D366] text-black px-5 py-3.5 rounded-2xl font-black text-[10px] uppercase transition-all flex items-center gap-2 hover:bg-[#1ebe57]"
          >
            📞 İLETİŞİM
          </a>
          {isAdmin && (
            <button
              onClick={() => setIsFormOpen(true)}
              className="bg-white hover:bg-red-600 text-black hover:text-white px-8 py-3.5 rounded-2xl font-black text-[10px] uppercase transition-all shadow-2xl active:scale-95"
            >
              + Yeni Kayıt Ekle
            </button>
          )}
        </div>
      </header>

      {/* HOŞ GELDİN */}
      <section className="relative w-full bg-gradient-to-r from-zinc-900 to-red-950/30 border border-zinc-800 rounded-[2.5rem] p-10 md:p-12 mb-8">
        <h2 className="text-xs font-bold text-red-500 uppercase tracking-[0.4em] mb-3">
          {isAdmin ? "Master Dashboard" : "Kullanıcı Paneli"}
        </h2>
        <h3 className="text-4xl md:text-5xl font-black italic text-white uppercase tracking-tighter">
          Hoş Geldin,{" "}
          <span className="text-zinc-700">{profile?.full_name || "—"}</span>
        </h3>
      </section>

      {/* İSTATİSTİK KUTUCUKLARI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        {statCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className={`border rounded-3xl p-6 flex items-center gap-5 ${card.bg}`}
            >
              <div
                className={`w-12 h-12 rounded-2xl flex items-center justify-center bg-black/20 ${card.color}`}
              >
                <Icon size={22} />
              </div>
              <div>
                <p className="text-3xl font-black text-white">{card.value}</p>
                <p className="text-[10px] font-black uppercase tracking-widest text-zinc-500 mt-0.5">
                  {card.label}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {/* FORM MODAL */}
      {isAdmin && isFormOpen && (
        <div className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[999] flex items-center justify-center p-4">
          <div className="bg-[#0c0c0e] border border-zinc-800 w-full max-w-4xl rounded-[2.5rem] flex flex-col max-h-[95vh] overflow-hidden shadow-[0_0_100px_rgba(0,0,0,0.8)]">
            <div className="p-6 md:p-8 pb-0">
              <div className="flex justify-between items-center mb-5">
                <h3 className="text-2xl font-black italic uppercase text-white">
                  Yeni <span className="text-red-600">{formTitle}</span> Kaydı
                </h3>
                <button
                  onClick={() => setIsFormOpen(false)}
                  className="text-zinc-500 hover:text-white w-8 h-8 flex items-center justify-center text-2xl"
                >
                  &times;
                </button>
              </div>
              <div className="flex gap-6 border-b border-zinc-800/50">
                {[
                  { key: "vehicle", label: "Araç Formu" },
                  { key: "engine", label: "Motor Formu" },
                  { key: "part", label: "Parça Formu" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setFormType(tab.key)}
                    className={`pb-3 text-[10px] font-black uppercase tracking-widest transition-all ${
                      formType === tab.key
                        ? "text-red-600 border-b-2 border-red-600"
                        : "text-zinc-500 hover:text-zinc-300"
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-6 md:p-8 pt-4 text-white">
              {formType === "vehicle" && (
                <div className="space-y-6">
                  <div>
                    <p className="text-red-600 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">
                      1. Genel Bilgiler
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Marka / Model">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.brand_model}
                          onChange={(e) => set("brand_model", e.target.value)}
                        />
                      </Field>
                      <Field label="Şasi No (VIN)">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.vin_no}
                          onChange={(e) => set("vin_no", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                  <div>
                    <p className="text-red-600 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">
                      2. Teknik Detaylar
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <Field label="Model Yılı">
                        <input
                          type="number"
                          className={inputClass}
                          value={formData.model_year}
                          onChange={(e) => set("model_year", e.target.value)}
                        />
                      </Field>
                      <Field label="Kilometre">
                        <input
                          type="number"
                          className={inputClass}
                          value={formData.mileage}
                          onChange={(e) => set("mileage", e.target.value)}
                        />
                      </Field>
                      <Field label="Renk">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.color}
                          onChange={(e) => set("color", e.target.value)}
                        />
                      </Field>
                      <Field label="Segment">
                        <select
                          className={selectClass}
                          value={formData.segment}
                          onChange={(e) => set("segment", e.target.value)}
                        >
                          <option value="">Seçiniz</option>
                          {[
                            "A",
                            "B",
                            "C",
                            "D",
                            "E",
                            "S (Sport)",
                            "J (SUV)",
                          ].map((s) => (
                            <option key={s}>{s}</option>
                          ))}
                        </select>
                      </Field>
                      <Field label="Motor Kodu">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.engine_code}
                          onChange={(e) => set("engine_code", e.target.value)}
                        />
                      </Field>
                      <Field label="Motor Hacmi">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.engine_capacity}
                          onChange={(e) =>
                            set("engine_capacity", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Şanzıman">
                        <select
                          className={selectClass}
                          value={formData.transmission}
                          onChange={(e) => set("transmission", e.target.value)}
                        >
                          <option value="">Seçiniz</option>
                          <option>Manuel</option>
                          <option>Otomatik</option>
                          <option>Yarı-Otomatik</option>
                        </select>
                      </Field>
                      <Field label="Koltuk Sayısı">
                        <input
                          type="number"
                          className={inputClass}
                          value={formData.seat_count}
                          onChange={(e) => set("seat_count", e.target.value)}
                        />
                      </Field>
                      <Field label="Direksiyon">
                        <select
                          className={selectClass}
                          value={formData.steering_side}
                          onChange={(e) => set("steering_side", e.target.value)}
                        >
                          <option value="">Seçiniz</option>
                          <option>Sol (LHD)</option>
                          <option>Sağ (RHD)</option>
                        </select>
                      </Field>
                    </div>
                  </div>
                  <div>
                    <p className="text-red-600 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">
                      3. Medya Galeri
                    </p>
                    <Field label="Araç Fotoğrafları (Çoklu Seçim)">
                      <input
                        type="file"
                        multiple
                        onChange={(e) =>
                          setSelectedFiles(Array.from(e.target.files))
                        }
                        className={inputClass}
                      />
                      {selectedFiles.length > 0 && (
                        <p className="text-[10px] text-green-500 font-bold mt-2">
                          {selectedFiles.length} dosya seçildi
                        </p>
                      )}
                    </Field>
                  </div>
                </div>
              )}

              {formType === "engine" && (
                <div className="space-y-6">
                  <div>
                    <p className="text-red-600 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">
                      1. Genel Bilgiler
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Motor Adı / Marka">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.brand_model}
                          onChange={(e) => set("brand_model", e.target.value)}
                        />
                      </Field>
                      <Field label="Motor Kodu">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.engine_code}
                          onChange={(e) => set("engine_code", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                  <div>
                    <p className="text-red-600 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">
                      2. Teknik Detaylar
                    </p>
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                      <Field label="Motor Hacmi (cc)">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.engine_capacity}
                          onChange={(e) =>
                            set("engine_capacity", e.target.value)
                          }
                        />
                      </Field>
                      <Field label="Şanzıman Tipi">
                        <select
                          className={selectClass}
                          value={formData.transmission}
                          onChange={(e) => set("transmission", e.target.value)}
                        >
                          <option value="">Seçiniz</option>
                          <option>Manuel</option>
                          <option>Otomatik</option>
                          <option>Yarı-Otomatik</option>
                        </select>
                      </Field>
                      <Field label="Renk">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.color}
                          onChange={(e) => set("color", e.target.value)}
                        />
                      </Field>
                      <Field label="Model Yılı">
                        <input
                          type="number"
                          className={inputClass}
                          value={formData.model_year}
                          onChange={(e) => set("model_year", e.target.value)}
                        />
                      </Field>
                      <Field label="Kilometre">
                        <input
                          type="number"
                          className={inputClass}
                          value={formData.mileage}
                          onChange={(e) => set("mileage", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                  <div>
                    <p className="text-red-600 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">
                      3. Medya Galeri
                    </p>
                    <Field label="Motor Fotoğrafları (Çoklu Seçim)">
                      <input
                        type="file"
                        multiple
                        onChange={(e) =>
                          setSelectedFiles(Array.from(e.target.files))
                        }
                        className={inputClass}
                      />
                      {selectedFiles.length > 0 && (
                        <p className="text-[10px] text-green-500 font-bold mt-2">
                          {selectedFiles.length} dosya seçildi
                        </p>
                      )}
                    </Field>
                  </div>
                </div>
              )}

              {formType === "part" && (
                <div className="space-y-6">
                  <div>
                    <p className="text-red-600 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">
                      1. Genel Bilgiler
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <Field label="Parça Adı">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.brand_model}
                          onChange={(e) => set("brand_model", e.target.value)}
                        />
                      </Field>
                      <Field label="Parça Kodu / VIN">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.vin_no}
                          onChange={(e) => set("vin_no", e.target.value)}
                        />
                      </Field>
                      <Field label="Uyumlu Motor Kodu">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.engine_code}
                          onChange={(e) => set("engine_code", e.target.value)}
                        />
                      </Field>
                      <Field label="Renk">
                        <input
                          type="text"
                          className={inputClass}
                          value={formData.color}
                          onChange={(e) => set("color", e.target.value)}
                        />
                      </Field>
                    </div>
                  </div>
                  <div>
                    <p className="text-red-600 text-[10px] font-black uppercase tracking-widest border-b border-zinc-800 pb-2 mb-4">
                      2. Medya Galeri
                    </p>
                    <Field label="Parça Fotoğrafları (Çoklu Seçim)">
                      <input
                        type="file"
                        multiple
                        onChange={(e) =>
                          setSelectedFiles(Array.from(e.target.files))
                        }
                        className={inputClass}
                      />
                      {selectedFiles.length > 0 && (
                        <p className="text-[10px] text-green-500 font-bold mt-2">
                          {selectedFiles.length} dosya seçildi
                        </p>
                      )}
                    </Field>
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 md:p-8 border-t border-zinc-900 flex gap-4">
              <button
                onClick={() => setIsFormOpen(false)}
                className="flex-1 bg-zinc-900 text-zinc-500 py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest border border-zinc-800 hover:bg-zinc-800 transition-all"
              >
                İptal
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-white text-black hover:bg-red-600 hover:text-white py-4 rounded-2xl font-black uppercase text-[10px] tracking-widest transition-all disabled:opacity-50"
              >
                {saving ? "Kaydediliyor..." : "Envantere Kaydet"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
