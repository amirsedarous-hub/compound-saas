"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";
import { Building2, Plus, ArrowLeft, ShieldCheck, Home } from "lucide-react";
import Link from "next/link";

interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  type: "hoa_building" | "compound";
  created_at: string;
}

export default function HomePage() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // بيانات النموذج
  const [name, setName] = useState("");
  const [subdomain, setSubdomain] = useState("");
  const [type, setType] = useState<"hoa_building" | "compound">("compound");

  // جلب الكمبوندات/الاتحادات المسجلة
  useEffect(() => {
    fetchTenants();
  }, []);

  async function fetchTenants() {
    setLoading(true);
    const { data, error } = await supabase
      .from("tenants")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setTenants(data);
    }
    setLoading(false);
  }

  // إضافة كمبوند أو اتحاد ملاك جديد
  async function handleCreateTenant(e: React.FormEvent) {
    e.preventDefault();
    if (!name || !subdomain) return;

    setCreating(true);
    const cleanSubdomain = subdomain.toLowerCase().replace(/[^a-z0-9-]/g, "");

    const { data, error } = await supabase
      .from("tenants")
      .insert([
        {
          name,
          subdomain: cleanSubdomain,
          type,
        },
      ])
      .select()
      .single();

    if (error) {
      alert("حدث خطأ: " + error.message);
    } else if (data) {
      // إنشاء خزينة افتراضية للكمبوند الجديد تلقائياً
      await supabase.from("accounts").insert([
        {
          tenant_id: data.id,
          name: "الخزينة الرئيسية",
          account_type: "cash",
          current_balance: 0,
        },
      ]);

      setName("");
      setSubdomain("");
      fetchTenants();
    }
    setCreating(false);
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* الشريط العلوي */}
      <header className="bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="bg-emerald-600 text-white p-2 rounded-xl">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="font-bold text-lg text-slate-900">منصة إدارة العقارات والمجتمعات</h1>
              <p className="text-xs text-slate-500">نظام سحابي لإدارة الكمبوندات واتحادات الملاك</p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/resident"
              className="text-xs bg-slate-900 hover:bg-slate-800 text-white px-4 py-2.5 rounded-xl font-medium transition"
            >
              دخول بوابة الملاك والسكان
            </Link>
            <span className="hidden sm:flex text-xs bg-emerald-50 text-emerald-700 px-3 py-2 rounded-xl font-medium items-center gap-1">
              <ShieldCheck className="w-4 h-4" />
              نسخة SaaS
            </span>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto p-6 grid grid-cols-1 lg:grid-cols-3 gap-8 mt-4">
        {/* القسم الأيمن: إضافة كمبوند / اتحاد ملاك جديد */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <h2 className="font-bold text-lg text-slate-800 mb-1 flex items-center gap-2">
            <Plus className="w-5 h-5 text-emerald-600" />
            تسجيل كمبوند أو اتحاد ملاك
          </h2>
          <p className="text-sm text-slate-500 mb-6">أنشئ مساحة عمل مستقلة لإدارة الوحدات والمالية</p>

          <form onSubmit={handleCreateTenant} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">نوع الكيان</label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setType("compound")}
                  className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition ${
                    type === "compound"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Building2 className="w-4 h-4" />
                  كمبوند سكني
                </button>
                <button
                  type="button"
                  onClick={() => setType("hoa_building")}
                  className={`p-3 rounded-xl border text-sm font-medium flex items-center justify-center gap-2 transition ${
                    type === "hoa_building"
                      ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                      : "border-slate-200 text-slate-600 hover:bg-slate-50"
                  }`}
                >
                  <Home className="w-4 h-4" />
                  اتحاد ملاك عمارة
                </button>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">اسم الكمبوند أو الاتحاد</label>
              <input
                type="text"
                required
                placeholder="مثال: كمبوند الياسمين أو اتحاد ملاك برج النيل"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-300 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">الرابط المختصر (Subdomain)</label>
              <div className="flex items-center border border-slate-300 rounded-xl overflow-hidden bg-slate-50" dir="ltr">
                <input
                  type="text"
                  required
                  placeholder="alyasmin"
                  value={subdomain}
                  onChange={(e) => setSubdomain(e.target.value)}
                  className="w-full px-3 py-2.5 bg-white outline-none text-sm text-left"
                />
                <span className="px-3 text-xs text-slate-500 font-mono">.app.com</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={creating}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition disabled:opacity-50"
            >
              {creating ? "جاري الإنشاء..." : "إنشاء مساحة العمل"}
            </button>
          </form>
        </div>

        {/* القسم الأيسر: قائمة الكمبوندات والاتحادات المسجلة */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-bold text-lg text-slate-800">الكمبوندات واتحادات الملاك المسجلة ({tenants.length})</h2>

          {loading ? (
            <div className="bg-white p-8 rounded-2xl border border-slate-200 text-center text-slate-500">
              جاري تحميل البيانات...
            </div>
          ) : tenants.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-dashed border-slate-300 text-center">
              <Building2 className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">لا يوجد أي كمبوند أو اتحاد ملاك مسجل بعد</p>
              <p className="text-sm text-slate-400 mt-1">ابدأ بإضافة أول كمبوند أو عمارة من النموذج الجانبي</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {tenants.map((tenant) => (
                <div
                  key={tenant.id}
                  className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-400 transition flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <span
                        className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                          tenant.type === "compound"
                            ? "bg-blue-50 text-blue-700"
                            : "bg-amber-50 text-amber-700"
                        }`}
                      >
                        {tenant.type === "compound" ? "كمبوند سكني" : "اتحاد ملاك"}
                      </span>
                      <span className="text-xs text-slate-400 font-mono" dir="ltr">
                        {tenant.subdomain}.app.com
                      </span>
                    </div>
                    <h3 className="font-bold text-lg text-slate-900">{tenant.name}</h3>
                  </div>

                  <Link
                    href={`/dashboard/${tenant.id}`}
                    className="mt-5 w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 px-4 rounded-xl flex items-center justify-center gap-2 transition"
                  >
                    <span>دخول لوحة الإدارة</span>
                    <ArrowLeft className="w-4 h-4" />
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}