"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { QrCode, UserCheck, Plus, CheckCircle2, Clock } from "lucide-react";

interface Unit {
  id: string;
  unit_number: string;
  property_nodes?: { name: string } | null;
}

interface Member {
  id: string;
  full_name: string;
}

interface GatePass {
  id: string;
  pass_type: "visitor" | "delivery" | "contractor";
  guest_name: string;
  qr_token: string;
  valid_until: string;
  is_used: boolean;
  used_at: string | null;
  units?: { unit_number: string; property_nodes?: { name: string } | null } | null;
  tenant_memberships?: { full_name: string } | null;
}

export default function SecurityGatePage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [units, setUnits] = useState<Unit[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [passes, setPasses] = useState<GatePass[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  // حقول النموذج
  const [unitId, setUnitId] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [passType, setPassType] = useState<"visitor" | "delivery" | "contractor">("visitor");
  const [guestName, setGuestName] = useState("");
  const [hoursValid, setHoursValid] = useState("6");

  useEffect(() => {
    if (tenantId) fetchData();
  }, [tenantId]);

  async function fetchData() {
    setLoading(true);
    const [uRes, mRes, pRes] = await Promise.all([
      supabase.from("units").select("id, unit_number, property_nodes(name)").eq("tenant_id", tenantId),
      supabase.from("tenant_memberships").select("id, full_name").eq("tenant_id", tenantId),
      supabase
        .from("gate_passes")
        .select("*, units(unit_number, property_nodes(name)), tenant_memberships(full_name)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);

    if (uRes.data) {
      setUnits(uRes.data as any);
      if (uRes.data.length > 0 && !unitId) setUnitId(uRes.data[0].id);
    }
    if (mRes.data) {
      setMembers(mRes.data);
      if (mRes.data.length > 0 && !issuedBy) setIssuedBy(mRes.data[0].id);
    }
    if (pRes.data) setPasses(pRes.data as any);
    setLoading(false);
  }

  async function handleCreatePass(e: React.FormEvent) {
    e.preventDefault();
    if (!unitId || !issuedBy || !guestName.trim()) {
      alert("تأكد من وجود وحدة ومالك مسجل وإدخال اسم الزائر");
      return;
    }

    setCreating(true);
    const validUntil = new Date(Date.now() + Number(hoursValid) * 60 * 60 * 1000).toISOString();

    const { error } = await supabase.from("gate_passes").insert([
      {
        tenant_id: tenantId,
        unit_id: unitId,
        issued_by: issuedBy,
        pass_type: passType,
        guest_name: guestName.trim(),
        valid_until: validUntil,
      },
    ]);

    if (error) {
      alert("خطأ: " + error.message);
    } else {
      setGuestName("");
      fetchData();
    }
    setCreating(false);
  }

  // تأكيد دخول الزائر من البوابة
  async function handleCheckIn(passId: string) {
    await supabase
      .from("gate_passes")
      .update({ is_used: true, used_at: new Date().toISOString() })
      .eq("id", passId);
    fetchData();
  }

  const typeLabels = {
    visitor: { text: "زائر عائلي", color: "bg-blue-50 text-blue-700" },
    delivery: { text: "دليفري / شحن", color: "bg-amber-50 text-amber-700" },
    contractor: { text: "صنايعي / مقاول", color: "bg-purple-50 text-purple-700" },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">بوابة الأمن وتصاريح الدخول (QR)</h1>
        <p className="text-sm text-slate-500 mt-1">إصدار تصاريح زيارة إلكترونية والتحقق من دخول الزوار على البوابات</p>
      </div>

      {/* نموذج إصدار تصريح */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5 text-emerald-600" />
          إصدار تصريح دخول جديد
        </h2>

        <form onSubmit={handleCreatePass} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الوحدة المستضيفة *</label>
            <select
              required
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.property_nodes?.name ? `${u.property_nodes.name} - ` : ""}وحدة {u.unit_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">المُصدر للتصريح (المالك/الساكن) *</label>
            <select
              required
              value={issuedBy}
              onChange={(e) => setIssuedBy(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              {members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.full_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">نوع التصريح</label>
            <select
              value={passType}
              onChange={(e) => setPassType(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="visitor">زائر</option>
              <option value="delivery">دليفري / توصيل طلبات</option>
              <option value="contractor">صنايعي / أعمال صيانة</option>
            </select>
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-slate-600 mb-1">اسم الزائر أو الشركة *</label>
            <input
              type="text"
              required
              placeholder="مثال: محمود علي - أو مندوب أمازون"
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">صلاحية التصريح</label>
            <select
              value={hoursValid}
              onChange={(e) => setHoursValid(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white"
            >
              <option value="2">لمدة ساعتين</option>
              <option value="6">لمدة 6 ساعات</option>
              <option value="24">لمدة 24 ساعة (يوم كامل)</option>
            </select>
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={creating}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              <QrCode className="w-4 h-4" />
              {creating ? "جاري الإصدار..." : "توليد تصريح QR"}
            </button>
          </div>
        </form>
      </div>

      {/* بطاقات التصاريح */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {loading ? (
          <div className="col-span-full text-center text-slate-500 text-sm">جاري التحميل...</div>
        ) : passes.length === 0 ? (
          <div className="col-span-full bg-white p-10 rounded-2xl border border-slate-200 text-center text-slate-400 text-sm">
            لا توجد تصاريح دخول صادرة حالياً.
          </div>
        ) : (
          passes.map((pass) => (
            <div
              key={pass.id}
              className={`bg-white p-5 rounded-2xl border shadow-sm flex flex-col justify-between ${
                pass.is_used ? "border-slate-200 opacity-75" : "border-emerald-300"
              }`}
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${typeLabels[pass.pass_type].color}`}>
                    {typeLabels[pass.pass_type].text}
                  </span>
                  <span className="text-xs font-bold text-slate-700">
                    وحدة {pass.units?.unit_number}
                  </span>
                </div>

                {/* كود QR حقيقي عبر API مجاني سريع */}
                <div className="my-4 flex flex-col items-center justify-center bg-slate-50 p-4 rounded-xl border border-slate-100">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=130x130&data=${pass.qr_token}`}
                    alt="QR Code"
                    className="w-32 h-32 rounded-lg"
                  />
                  <span className="text-[10px] font-mono text-slate-400 mt-2">
                    {pass.qr_token.slice(0, 8).toUpperCase()}
                  </span>
                </div>

                <h3 className="font-bold text-slate-900 text-base">{pass.guest_name}</h3>
                <p className="text-xs text-slate-500 mt-1">
                  بإذن من: {pass.tenant_memberships?.full_name}
                </p>
                <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  صالح حتى: {new Date(pass.valid_until).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100">
                {pass.is_used ? (
                  <div className="text-xs text-emerald-700 font-medium flex items-center justify-center gap-1.5 py-1.5 bg-emerald-50 rounded-xl">
                    <CheckCircle2 className="w-4 h-4" />
                    تم الدخول ({pass.used_at ? new Date(pass.used_at).toLocaleTimeString("ar-EG", { hour: "2-digit", minute: "2-digit" }) : ""})
                  </div>
                ) : (
                  <button
                    onClick={() => handleCheckIn(pass.id)}
                    className="w-full bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-1.5"
                  >
                    <UserCheck className="w-4 h-4" />
                    تسجيل دخول من البوابة
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}