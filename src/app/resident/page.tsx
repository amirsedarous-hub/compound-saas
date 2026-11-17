"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  Phone,
  LogIn,
  Wallet,
  QrCode,
  Wrench,
  Receipt,
  CheckCircle2,
  LogOut,
  Plus,
} from "lucide-react";

export default function ResidentPortalPage() {
  const [phoneInput, setPhoneInput] = useState("");
  const [loading, setLoading] = useState(false);

  // بيانات الساكن بعد الدخول
  const [member, setMember] = useState<any>(null);
  const [unitInfo, setUnitInfo] = useState<any>(null);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);

  // نموذج تصريح QR سريع
  const [guestName, setGuestName] = useState("");
  const [passType, setPassType] = useState<"visitor" | "delivery" | "contractor">("visitor");
  const [creatingPass, setCreatingPass] = useState(false);

  // نموذج بلاغ صيانة سريع
  const [ticketCategory, setTicketCategory] = useState("مصاعد");
  const [ticketDesc, setTicketDesc] = useState("");
  const [sendingTicket, setSendingTicket] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    if (!phoneInput.trim()) return;
    setLoading(true);

    // البحث عن الساكن برقم الموبايل
    const { data: memberData, error } = await supabase
      .from("tenant_memberships")
      .select("*, tenants(id, name)")
      .eq("phone", phoneInput.trim())
      .limit(1)
      .single();

    if (error || !memberData) {
      alert("رقم الموبايل غير مسجل! تأكد من تسجيل الرقم في شاشة الملاك والسكان أولاً.");
      setLoading(false);
      return;
    }

    setMember(memberData);
    await loadResidentData(memberData);
    setLoading(false);
  }

  async function loadResidentData(memberData: any) {
    // جلب الوحدة المرتبطة بالساكن
    const { data: occData } = await supabase
      .from("unit_occupants")
      .select("*, units(*, property_nodes(name))")
      .eq("member_id", memberData.id)
      .limit(1)
      .single();

    if (occData?.units) {
      setUnitInfo(occData.units);

      const [invRes, expRes, passRes] = await Promise.all([
        supabase
          .from("invoices")
          .select("*")
          .eq("unit_id", occData.units.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("expenses")
          .select("*")
          .eq("tenant_id", memberData.tenant_id)
          .order("expense_date", { ascending: false })
          .limit(5),
        supabase
          .from("gate_passes")
          .select("*")
          .eq("unit_id", occData.units.id)
          .order("created_at", { ascending: false })
          .limit(4),
      ]);

      if (invRes.data) setInvoices(invRes.data);
      if (expRes.data) setExpenses(expRes.data);
      if (passRes.data) setPasses(passRes.data);
    }
  }

  // إصدار QR للزائر
  async function handleQuickPass(e: React.FormEvent) {
    e.preventDefault();
    if (!guestName.trim() || !unitInfo || !member) return;
    setCreatingPass(true);

    const validUntil = new Date(Date.now() + 6 * 60 * 60 * 1000).toISOString();
    await supabase.from("gate_passes").insert([
      {
        tenant_id: member.tenant_id,
        unit_id: unitInfo.id,
        issued_by: member.id,
        pass_type: passType,
        guest_name: guestName.trim(),
        valid_until: validUntil,
      },
    ]);

    setGuestName("");
    await loadResidentData(member);
    setCreatingPass(false);
  }

  // إرسال بلاغ صيانة
  async function handleQuickTicket(e: React.FormEvent) {
    e.preventDefault();
    if (!ticketDesc.trim() || !unitInfo || !member) return;
    setSendingTicket(true);

    await supabase.from("maintenance_tickets").insert([
      {
        tenant_id: member.tenant_id,
        unit_id: unitInfo.id,
        created_by: member.id,
        category: ticketCategory,
        priority: "medium",
        description: ticketDesc.trim(),
        status: "open",
      },
    ]);

    setTicketDesc("");
    alert("تم إرسال بلاغ الصيانة للإدارة بنجاح!");
    setSendingTicket(false);
  }

  // شاشة تسجيل الدخول برقم الموبايل
  if (!member) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Building2 className="w-7 h-7" />
          </div>
          <h1 className="text-xl font-bold text-center text-slate-900">بوابة الملاك والسكان</h1>
          <p className="text-sm text-center text-slate-500 mt-1 mb-6">
            ادخل برقم الموبايل المسجل لمتابعة وحدتك وإصدار تصاريح الزوار
          </p>

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-700 mb-1">رقم الموبايل</label>
              <div className="relative">
                <input
                  type="tel"
                  required
                  placeholder="01012345678"
                  value={phoneInput}
                  onChange={(e) => setPhoneInput(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-600"
                />
                <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              <LogIn className="w-4 h-4" />
              {loading ? "جاري التحقق..." : "دخول لحسابي"}
            </button>
          </form>
        </div>
      </div>
    );
  }

  const unpaidTotal = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + (Number(i.amount) - Number(i.paid_amount)), 0);

  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      {/* هيدر الموبايل */}
      <header className="bg-slate-900 text-white p-5 rounded-b-3xl shadow-md">
        <div className="max-w-2xl mx-auto flex items-center justify-between">
          <div>
            <p className="text-xs text-emerald-400 font-medium">{member.tenants?.name}</p>
            <h1 className="text-lg font-bold mt-0.5">أهلاً، {member.full_name}</h1>
            {unitInfo && (
              <p className="text-xs text-slate-300 mt-0.5">
                {unitInfo.property_nodes?.name ? `${unitInfo.property_nodes.name} - ` : ""}
                وحدة {unitInfo.unit_number}
              </p>
            )}
          </div>
          <button
            onClick={() => setMember(null)}
            className="bg-slate-800 hover:bg-slate-700 p-2.5 rounded-xl text-slate-300"
            title="خروج"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <main className="max-w-2xl mx-auto p-4 space-y-6 mt-2">
        {/* بطاقة الموقف المالي للوحدة */}
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500">مستحقات غير مسددة</span>
            <div className={`text-xl font-bold mt-1 ${unpaidTotal > 0 ? "text-rose-600" : "text-emerald-600"}`}>
              {unpaidTotal.toLocaleString()} ج.م
            </div>
          </div>
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
            <span className="text-xs text-slate-500">رصيد وديعة الوحدة</span>
            <div className="text-xl font-bold text-slate-900 mt-1">
              {Number(unitInfo?.deposit_balance || 0).toLocaleString()} ج.م
            </div>
          </div>
        </div>

        {/* إصدار تصريح QR سريع */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
            <QrCode className="w-4 h-4 text-emerald-600" />
            إصدار تصريح دخول (QR) لزائر أو دليفري
          </h2>
          <form onSubmit={handleQuickPass} className="flex flex-col sm:flex-row gap-2">
            <select
              value={passType}
              onChange={(e) => setPassType(e.target.value as any)}
              className="px-3 py-2.5 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="visitor">زائر</option>
              <option value="delivery">دليفري</option>
              <option value="contractor">صنايعي</option>
            </select>
            <input
              type="text"
              required
              placeholder="اسم الزائر..."
              value={guestName}
              onChange={(e) => setGuestName(e.target.value)}
              className="flex-1 px-3 py-2.5 rounded-xl border border-slate-300 text-xs outline-none"
            />
            <button
              type="submit"
              disabled={creatingPass}
              className="bg-emerald-600 text-white text-xs font-medium px-4 py-2.5 rounded-xl flex items-center justify-center gap-1"
            >
              <Plus className="w-4 h-4" />
              توليد
            </button>
          </form>

          {passes.length > 0 && (
            <div className="grid grid-cols-2 gap-3 mt-4 pt-4 border-t border-slate-100">
              {passes.map((p) => (
                <div key={p.id} className="bg-slate-50 p-3 rounded-xl text-center border border-slate-200">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${p.qr_token}`}
                    alt="QR"
                    className="w-24 h-24 mx-auto rounded-lg"
                  />
                  <p className="font-bold text-xs text-slate-800 mt-2">{p.guest_name}</p>
                  <span className="text-[10px] text-slate-500">
                    {p.is_used ? "تم الدخول" : "صالح للدخول"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* المطالبات المالية للوحدة */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
            <Wallet className="w-4 h-4 text-amber-600" />
            مطالبات الصيانة والاشتراكات
          </h2>
          {invoices.length === 0 ? (
            <p className="text-xs text-slate-400">لا توجد مطالبات مسجلة على وحدتك.</p>
          ) : (
            <div className="space-y-2">
              {invoices.map((inv) => (
                <div key={inv.id} className="flex items-center justify-between p-3 bg-slate-50 rounded-xl text-xs">
                  <div>
                    <p className="font-bold text-slate-800">{inv.title}</p>
                    <p className="text-slate-400 mt-0.5">استحقاق: {inv.due_date}</p>
                  </div>
                  <div className="text-left">
                    <p className="font-bold text-slate-900">{Number(inv.amount).toLocaleString()} ج.م</p>
                    {inv.status === "paid" ? (
                      <span className="text-emerald-600 font-medium inline-flex items-center gap-0.5">
                        <CheckCircle2 className="w-3 h-3" /> مسددة
                      </span>
                    ) : (
                      <span className="text-rose-600 font-medium">غير مسددة</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* بلاغ صيانة سريع */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
            <Wrench className="w-4 h-4 text-rose-600" />
            إرسال بلاغ صيانة للإدارة
          </h2>
          <form onSubmit={handleQuickTicket} className="space-y-2.5">
            <select
              value={ticketCategory}
              onChange={(e) => setTicketCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs bg-white"
            >
              <option value="مصاعد">مصاعد</option>
              <option value="سباكة ومياه">سباكة ومياه</option>
              <option value="كهرباء وإنارة">كهرباء وإنارة</option>
              <option value="نظافة وزراعة">نظافة وزراعة</option>
            </select>
            <input
              type="text"
              required
              placeholder="اكتب تفاصيل المشكلة..."
              value={ticketDesc}
              onChange={(e) => setTicketDesc(e.target.value)}
              className="w-full px-3 py-2 rounded-xl border border-slate-300 text-xs outline-none"
            />
            <button
              type="submit"
              disabled={sendingTicket}
              className="w-full bg-slate-900 text-white text-xs font-medium py-2.5 rounded-xl"
            >
              {sendingTicket ? "جاري الإرسال..." : "إرسال البلاغ"}
            </button>
          </form>
        </div>

        {/* شفافية المصروفات */}
        {expenses.length > 0 && (
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="font-bold text-sm text-slate-900 mb-3 flex items-center gap-2">
              <Receipt className="w-4 h-4 text-blue-600" />
              آخر مصروفات الاتحاد (للشفافية)
            </h2>
            <div className="space-y-2">
              {expenses.map((exp) => (
                <div key={exp.id} className="flex justify-between items-center text-xs border-b border-slate-100 pb-2">
                  <span className="text-slate-700">{exp.description}</span>
                  <span className="font-bold text-slate-900">{Number(exp.amount).toLocaleString()} ج.م</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}