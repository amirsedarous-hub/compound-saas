"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Users, UserPlus, Phone, Home, Trash2 } from "lucide-react";

interface Unit {
  id: string;
  unit_number: string;
  property_nodes?: { name: string } | null;
}

interface OccupantRecord {
  id: string;
  relation_type: "owner" | "tenant" | "family_member";
  is_primary_payer: boolean;
  units?: {
    unit_number: string;
    property_nodes?: { name: string } | null;
  } | null;
  tenant_memberships?: {
    id: string;
    full_name: string;
    phone: string;
    role: string;
  } | null;
}

export default function ResidentsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [units, setUnits] = useState<Unit[]>([]);
  const [occupants, setOccupants] = useState<OccupantRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // حقول النموذج
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [unitId, setUnitId] = useState("");
  const [relationType, setRelationType] = useState<"owner" | "tenant" | "family_member">("owner");
  const [role, setRole] = useState<"resident" | "board_member" | "tenant_admin">("resident");
  const [isPrimaryPayer, setIsPrimaryPayer] = useState(true);

  useEffect(() => {
    if (tenantId) fetchData();
  }, [tenantId]);

  async function fetchData() {
    setLoading(true);
    const [uRes, oRes] = await Promise.all([
      supabase
        .from("units")
        .select("id, unit_number, property_nodes(name)")
        .eq("tenant_id", tenantId)
        .order("unit_number", { ascending: true }),
      supabase
        .from("unit_occupants")
        .select(
          `
          id,
          relation_type,
          is_primary_payer,
          units ( unit_number, property_nodes ( name ) ),
          tenant_memberships ( id, full_name, phone, role )
        `
        )
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);

    if (uRes.data) {
      setUnits(uRes.data as any);
      if (uRes.data.length > 0 && !unitId) {
        setUnitId(uRes.data[0].id);
      }
    }
    if (oRes.data) setOccupants(oRes.data as any);
    setLoading(false);
  }

  async function handleAddResident(e: React.FormEvent) {
    e.preventDefault();
    if (!fullName.trim() || !phone.trim() || !unitId) {
      alert("من فضلك أكمل الاسم ورقم الهاتف واختر الوحدة");
      return;
    }

    setSaving(true);

    // 1. إضافة الشخص في جدول أعضاء الكمبوند
    const { data: memberData, error: memberError } = await supabase
      .from("tenant_memberships")
      .insert([
        {
          tenant_id: tenantId,
          full_name: fullName.trim(),
          phone: phone.trim(),
          role,
        },
      ])
      .select()
      .single();

    if (memberError || !memberData) {
      alert("خطأ في تسجيل العضو: " + memberError?.message);
      setSaving(false);
      return;
    }

    // 2. ربط الشخص بالوحدة
    const { error: occError } = await supabase.from("unit_occupants").insert([
      {
        tenant_id: tenantId,
        unit_id: unitId,
        member_id: memberData.id,
        relation_type: relationType,
        is_primary_payer: isPrimaryPayer,
      },
    ]);

    if (occError) {
      alert("خطأ في ربط الوحدة: " + occError.message);
    } else {
      setFullName("");
      setPhone("");
      fetchData();
    }
    setSaving(false);
  }

  async function handleRemove(occupantId: string, memberId?: string) {
    if (!confirm("هل تريد حذف هذا الساكن/المالك؟")) return;
    await supabase.from("unit_occupants").delete().eq("id", occupantId);
    if (memberId) {
      await supabase.from("tenant_memberships").delete().eq("id", memberId);
    }
    fetchData();
  }

  const relationLabels = {
    owner: { text: "مالك الوحدة", color: "bg-emerald-50 text-emerald-700" },
    tenant: { text: "مستأجر", color: "bg-blue-50 text-blue-700" },
    family_member: { text: "فرد أسرة", color: "bg-slate-100 text-slate-700" },
  };

  const roleLabels: Record<string, string> = {
    resident: "ساكن / مالك",
    board_member: "عضو مجلس إدارة",
    tenant_admin: "مدير النظام",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">الملاك والسكان</h1>
        <p className="text-sm text-slate-500 mt-1">تسجيل بيانات الملاك والمستأجرين وربط كل شخص بالوحدة الخاصة به</p>
      </div>

      {/* نموذج إضافة مالك أو ساكن */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
        <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
          <UserPlus className="w-5 h-5 text-emerald-600" />
          تسجيل مالك أو ساكن جديد
        </h2>

        <form onSubmit={handleAddResident} className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الاسم بالكامل *</label>
            <input
              type="text"
              required
              placeholder="مثال: أحمد محمود حسن"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">رقم الموبايل (واتساب) *</label>
            <input
              type="tel"
              required
              placeholder="01012345678"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-500"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الوحدة التابع لها *</label>
            <select
              required
              value={unitId}
              onChange={(e) => setUnitId(e.target.value)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-emerald-500"
            >
              <option value="">-- اختر الوحدة --</option>
              {units.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.property_nodes?.name ? `${u.property_nodes.name} - ` : ""}وحدة {u.unit_number}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الصفة في الوحدة</label>
            <select
              value={relationType}
              onChange={(e) => setRelationType(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-emerald-500"
            >
              <option value="owner">مالك الوحدة</option>
              <option value="tenant">مستأجر</option>
              <option value="family_member">فرد من الأسرة</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">الدور الإداري في الاتحاد</label>
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as any)}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-emerald-500"
            >
              <option value="resident">ساكن / مالك عادي</option>
              <option value="board_member">عضو مجلس إدارة الاتحاد</option>
              <option value="tenant_admin">مدير النظام / رئيس الاتحاد</option>
            </select>
          </div>

          <div className="flex items-center pt-5">
            <label className="flex items-center gap-2 cursor-pointer text-sm text-slate-700">
              <input
                type="checkbox"
                checked={isPrimaryPayer}
                onChange={(e) => setIsPrimaryPayer(e.target.checked)}
                className="w-4 h-4 accent-emerald-600 rounded"
              />
              <span>المسؤول مالياً عن سداد الصيانة</span>
            </label>
          </div>

          <div className="md:col-span-3 flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition flex items-center gap-2"
            >
              <Users className="w-4 h-4" />
              {saving ? "جاري الحفظ..." : "تسجيل وربط بالوحدة"}
            </button>
          </div>
        </form>
      </div>

      {/* جدول الملاك والسكان */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">دليل الملاك والسكان ({occupants.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">جاري التحميل...</div>
        ) : occupants.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            لا يوجد ملاك أو سكان مسجلون بعد. استخدم النموذج أعلاه لإضافة أول مالك.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">الاسم</th>
                  <th className="py-3.5 px-4">الموبايل</th>
                  <th className="py-3.5 px-4">الوحدة</th>
                  <th className="py-3.5 px-4">الصفة</th>
                  <th className="py-3.5 px-4">الدور الإداري</th>
                  <th className="py-3.5 px-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {occupants.map((occ) => (
                  <tr key={occ.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-bold text-slate-900">
                      {occ.tenant_memberships?.full_name}
                      {occ.is_primary_payer && (
                        <span className="mr-2 text-[11px] bg-amber-50 text-amber-700 px-2 py-0.5 rounded-md font-normal">
                          مسؤول السداد
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 font-mono" dir="ltr">
                      <span className="inline-flex items-center gap-1">
                        <Phone className="w-3.5 h-3.5 text-slate-400" />
                        {occ.tenant_memberships?.phone}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      <span className="inline-flex items-center gap-1">
                        <Home className="w-3.5 h-3.5 text-emerald-600" />
                        {occ.units?.property_nodes?.name ? `${occ.units.property_nodes.name} - ` : ""}
                        وحدة {occ.units?.unit_number}
                      </span>
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${relationLabels[occ.relation_type].color}`}>
                        {relationLabels[occ.relation_type].text}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-slate-600 text-xs">
                      {roleLabels[occ.tenant_memberships?.role || "resident"]}
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleRemove(occ.id, occ.tenant_memberships?.id)}
                        className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}