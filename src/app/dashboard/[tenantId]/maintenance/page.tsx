"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Wrench, Plus, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

interface Unit {
  id: string;
  unit_number: string;
  property_nodes?: { name: string } | null;
}

interface Ticket {
  id: string;
  category: string;
  priority: "low" | "medium" | "high" | "emergency";
  description: string;
  status: "open" | "in_progress" | "resolved" | "closed";
  created_at: string;
  units?: { unit_number: string; property_nodes?: { name: string } | null } | null;
}

export default function MaintenancePage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [units, setUnits] = useState<Unit[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حقول النموذج
  const [unitId, setUnitId] = useState("");
  const [category, setCategory] = useState("مصاعد");
  const [priority, setPriority] = useState<"low" | "medium" | "high" | "emergency">("medium");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (tenantId) fetchData();
  }, [tenantId]);

  async function fetchData() {
    setLoading(true);
    const [uRes, tRes] = await Promise.all([
      supabase.from("units").select("id, unit_number, property_nodes(name)").eq("tenant_id", tenantId),
      supabase
        .from("maintenance_tickets")
        .select("*, units(unit_number, property_nodes(name))")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);

    if (uRes.data) setUnits(uRes.data as any);
    if (tRes.data) setTickets(tRes.data as any);
    setLoading(false);
  }

  async function handleCreateTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!description.trim()) return;
    setSaving(true);

    const { error } = await supabase.from("maintenance_tickets").insert([
      {
        tenant_id: tenantId,
        unit_id: unitId || null,
        category,
        priority,
        description: description.trim(),
        status: "open",
      },
    ]);

    if (error) {
      alert("خطأ: " + error.message);
    } else {
      setDescription("");
      fetchData();
    }
    setSaving(false);
  }

  async function handleStatusChange(ticketId: string, newStatus: Ticket["status"]) {
    await supabase.from("maintenance_tickets").update({ status: newStatus }).eq("id", ticketId);
    fetchData();
  }

  const priorityBadges = {
    low: { text: "عادية", color: "bg-slate-100 text-slate-700" },
    medium: { text: "متوسطة", color: "bg-blue-50 text-blue-700" },
    high: { text: "عاجلة", color: "bg-amber-50 text-amber-700" },
    emergency: { text: "طوارئ!", color: "bg-rose-100 text-rose-700 font-bold" },
  };

  const statusLabels = {
    open: { text: "بلاغ جديد", color: "bg-rose-50 text-rose-700" },
    in_progress: { text: "جاري الإصلاح", color: "bg-amber-50 text-amber-700" },
    resolved: { text: "تم الحل", color: "bg-emerald-50 text-emerald-700" },
    closed: { text: "مغلق", color: "bg-slate-100 text-slate-600" },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">بلاغات الصيانة والأعطال</h1>
        <p className="text-sm text-slate-500 mt-1">تسجيل ومتابعة أعطال المرافق المشتركة والوحدات السكنية</p>
      </div>

      {/* نموذج تسجيل بلاغ صيانة */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          فتح بلاغ صيانة جديد
        </h2>

        <form onSubmit={handleCreateTicket} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">مكان العطل (الوحدة أو عام)</label>
            <select
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-emerald-500"
            >
              <option value="">-- مرافق عامة (مدخل / سلم / جراج / حديقة) --</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.property_nodes?.name ? `${u.property_nodes.name} - ` : ""}وحدة {u.unit_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">تصنيف العطل</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-emerald-500"
            >
              <option value="مصاعد">مصاعد</option>
              <option value="سباكة ومياه">سباكة ومياه</option>
              <option value="كهرباء وإنارة">كهرباء وإنارة</option>
              <option value="بوابات وإنتركوم">بوابات وإنتركوم</option>
              <option value="نظافة وزراعة">نظافة وزراعة</option>
              <option value="أخرى">أخرى</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">درجة الأولوية</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-emerald-500"
            >
              <option value="low">عادية</option>
              <option value="medium">متوسطة</option>
              <option value="high">عاجلة</option>
              <option value="emergency">طوارئ قصوى</option>
            </select>
          </div>

          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-slate-600 mb-1">وصف المشكلة بالتفصيل *</label>
            <input
              type="text"
              required
              placeholder="مثال: توقف المصعد الرئيسي في عمارة 1 عن العمل منذ الصباح"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              <Wrench className="w-4 h-4" />
              {saving ? "جاري التسجيل..." : "تسجيل البلاغ"}
            </button>
          </div>
        </form>
      </div>

      {/* قائمة البلاغات */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">سجل بلاغات الصيانة ({tickets.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">جاري التحميل...</div>
        ) : tickets.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            لا توجد بلاغات صيانة مسجلة حالياً.
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {tickets.map((t) => (
              <div key={t.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-slate-50">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-slate-900 text-sm">{t.category}</span>
                    <span className="text-xs text-slate-500">
                      • {t.units ? `وحدة ${t.units.unit_number}` : "مرافق عامة"}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full ${priorityBadges[t.priority].color}`}>
                      {priorityBadges[t.priority].text}
                    </span>
                    <span className={`text-xs px-2.5 py-0.5 rounded-full font-medium ${statusLabels[t.status].color}`}>
                      {statusLabels[t.status].text}
                    </span>
                  </div>
                  <p className="text-sm text-slate-700">{t.description}</p>
                  <p className="text-xs text-slate-400 flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {new Date(t.created_at).toLocaleDateString("ar-EG")}
                  </p>
                </div>

                {/* أزرار تغيير الحالة */}
                <div className="flex items-center gap-2 shrink-0">
                  {t.status === "open" && (
                    <button
                      onClick={() => handleStatusChange(t.id, "in_progress")}
                      className="text-xs bg-amber-500 hover:bg-amber-600 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                    >
                      <AlertTriangle className="w-3.5 h-3.5" />
                      بدء الإصلاح
                    </button>
                  )}
                  {(t.status === "open" || t.status === "in_progress") && (
                    <button
                      onClick={() => handleStatusChange(t.id, "resolved")}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition flex items-center gap-1"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      تم الحل
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}