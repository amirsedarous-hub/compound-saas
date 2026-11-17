"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Wallet,
  FilePlus2,
  CheckCircle2,
  ArrowDownCircle,
  ArrowUpCircle,
  Receipt,
  Printer,
} from "lucide-react";

interface Account {
  id: string;
  name: string;
  current_balance: number;
}

interface Unit {
  id: string;
  unit_number: string;
  area_sqm: number;
  property_nodes?: { name: string } | null;
}

interface Invoice {
  id: string;
  unit_id: string;
  title: string;
  amount: number;
  paid_amount: number;
  due_date: string;
  status: "unpaid" | "partially_paid" | "paid" | "overdue";
  units?: { unit_number: string; property_nodes?: { name: string } | null } | null;
  payments?: { id: string }[];
}

interface Expense {
  id: string;
  category: string;
  amount: number;
  description: string;
  expense_date: string;
}

export default function FinancePage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [account, setAccount] = useState<Account | null>(null);
  const [units, setUnits] = useState<Unit[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);

  // نموذج إصدار مطالبة
  const [invTitle, setInvTitle] = useState("اشتراك صيانة شهر نوفمبر");
  const [targetType, setTargetType] = useState<"all" | "single">("all");
  const [selectedUnitId, setSelectedUnitId] = useState("");
  const [calcMethod, setCalcMethod] = useState<"fixed" | "per_sqm">("fixed");
  const [rateAmount, setRateAmount] = useState("500");
  const [dueDate, setDueDate] = useState(new Date().toISOString().split("T")[0]);
  const [issuing, setIssuing] = useState(false);

  // نموذج تسجيل مصروف
  const [expCategory, setExpCategory] = useState("security");
  const [expAmount, setExpAmount] = useState("");
  const [expDesc, setExpDesc] = useState("");
  const [addingExp, setAddingExp] = useState(false);

  useEffect(() => {
    if (tenantId) fetchAll();
  }, [tenantId]);

  async function fetchAll() {
    setLoading(true);
    const [accRes, uRes, invRes, expRes] = await Promise.all([
      supabase.from("accounts").select("*").eq("tenant_id", tenantId).limit(1).single(),
      supabase.from("units").select("id, unit_number, area_sqm, property_nodes(name)").eq("tenant_id", tenantId),
      supabase
        .from("invoices")
        .select("*, units(unit_number, property_nodes(name)), payments(id)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
      supabase
        .from("expenses")
        .select("*")
        .eq("tenant_id", tenantId)
        .order("expense_date", { ascending: false }),
    ]);

    if (accRes.data) setAccount(accRes.data);
    if (uRes.data) {
      setUnits(uRes.data as any);
      if (uRes.data.length > 0 && !selectedUnitId) setSelectedUnitId(uRes.data[0].id);
    }
    if (invRes.data) setInvoices(invRes.data as any);
    if (expRes.data) setExpenses(expRes.data);
    setLoading(false);
  }

  // 1. إصدار مطالبات مالية
  async function handleIssueInvoices(e: React.FormEvent) {
    e.preventDefault();
    if (!invTitle || !rateAmount) return;

    const targetUnits = targetType === "all" ? units : units.filter((u) => u.id === selectedUnitId);
    if (targetUnits.length === 0) {
      alert("لا توجد وحدات لإصدار مطالبات لها!");
      return;
    }

    setIssuing(true);
    const rate = Number(rateAmount);

    const newInvoices = targetUnits.map((u) => {
      const finalAmount = calcMethod === "per_sqm" ? rate * (Number(u.area_sqm) || 1) : rate;
      return {
        tenant_id: tenantId,
        unit_id: u.id,
        title: invTitle,
        amount: finalAmount,
        due_date: dueDate,
        status: "unpaid",
      };
    });

    const { error } = await supabase.from("invoices").insert(newInvoices);
    if (error) {
      alert("خطأ: " + error.message);
    } else {
      alert(`تم إصدار ${newInvoices.length} مطالبة مالية بنجاح!`);
      fetchAll();
    }
    setIssuing(false);
  }

  // 2. تحصيل فاتورة (كاش أو إنستاباي)
  async function handleCollectPayment(inv: Invoice, method: "cash" | "instapay") {
    if (!account) return;
    const remaining = Number(inv.amount) - Number(inv.paid_amount);
    if (remaining <= 0) return;

    const receiptNum = `REC-${Math.floor(100000 + Math.random() * 900000)}`;

    // تسجيل المقبوضات
    const { error: payErr } = await supabase.from("payments").insert([
      {
        tenant_id: tenantId,
        invoice_id: inv.id,
        unit_id: inv.unit_id,
        account_id: account.id,
        receipt_number: receiptNum,
        amount: remaining,
        payment_method: method,
        status: "confirmed",
      },
    ]);

    if (payErr) {
      alert("خطأ في التحصيل: " + payErr.message);
      return;
    }

    // تحديث الفاتورة إلى مدفوعة
    await supabase
      .from("invoices")
      .update({ paid_amount: inv.amount, status: "paid" })
      .eq("id", inv.id);

    // زيادة رصيد الخزينة
    await supabase
      .from("accounts")
      .update({ current_balance: Number(account.current_balance) + remaining })
      .eq("id", account.id);

    fetchAll();
  }

  // 3. تسجيل مصروف وخصمه من الخزينة
  async function handleAddExpense(e: React.FormEvent) {
    e.preventDefault();
    if (!account || !expAmount || !expDesc) return;
    setAddingExp(true);

    const amountNum = Number(expAmount);

    const { error } = await supabase.from("expenses").insert([
      {
        tenant_id: tenantId,
        account_id: account.id,
        category: expCategory,
        amount: amountNum,
        description: expDesc,
        status: "approved",
      },
    ]);

    if (!error) {
      await supabase
        .from("accounts")
        .update({ current_balance: Number(account.current_balance) - amountNum })
        .eq("id", account.id);

      setExpAmount("");
      setExpDesc("");
      fetchAll();
    }
    setAddingExp(false);
  }

  const totalUnpaid = invoices
    .filter((i) => i.status !== "paid")
    .reduce((sum, i) => sum + (Number(i.amount) - Number(i.paid_amount)), 0);

  const totalExpenses = expenses.reduce((sum, e) => sum + Number(e.amount), 0);

  const categoryLabels: Record<string, string> = {
    security: "أمن وحراسة",
    cleaning: "نظافة",
    maintenance: "صيانة ومصاعد",
    utilities: "كهرباء ومياه",
    landscaping: "زراعة ولاندسكيب",
    admin: "مصروفات إدارية",
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">الإدارة المالية والاشتراكات</h1>
        <p className="text-sm text-slate-500 mt-1">إصدار مطالبات الصيانة، التحصيل، ومتابعة المصروفات ورصيد الخزينة</p>
      </div>

      {/* ملخص الخزينة */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <div className="bg-slate-900 text-white p-6 rounded-2xl shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-400">الرصيد الفعلي في الخزينة</span>
            <Wallet className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-emerald-400">
            {Number(account?.current_balance || 0).toLocaleString()} ج.م
          </div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">متأخرات ومطالبات غير محصلة</span>
            <ArrowDownCircle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalUnpaid.toLocaleString()} ج.م</div>
        </div>

        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-slate-500">إجمالي المصروفات</span>
            <ArrowUpCircle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">{totalExpenses.toLocaleString()} ج.م</div>
        </div>
      </div>

      {/* النماذج: إصدار مطالبات + تسجيل مصروف */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* إصدار مطالبات */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
            <FilePlus2 className="w-5 h-5 text-emerald-600" />
            إصدار مطالبات اشتراك / صيانة
          </h2>
          <form onSubmit={handleIssueInvoices} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">بيان المطالبة</label>
              <input
                type="text"
                required
                value={invTitle}
                onChange={(e) => setInvTitle(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">تطبيق على</label>
                <select
                  value={targetType}
                  onChange={(e) => setTargetType(e.target.value as any)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="all">جميع الوحدات ({units.length})</option>
                  <option value="single">وحدة محددة</option>
                </select>
              </div>

              {targetType === "single" ? (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">اختر الوحدة</label>
                  <select
                    value={selectedUnitId}
                    onChange={(e) => setSelectedUnitId(e.target.value)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    {units.map((u) => (
                      <option key={u.id} value={u.id}>
                        وحدة {u.unit_number}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">طريقة الحساب</label>
                  <select
                    value={calcMethod}
                    onChange={(e) => setCalcMethod(e.target.value as any)}
                    className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                  >
                    <option value="fixed">مبلغ ثابت لكل وحدة</option>
                    <option value="per_sqm">سعر المتر × المساحة</option>
                  </select>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  {calcMethod === "per_sqm" ? "سعر المتر (ج.م)" : "المبلغ (ج.م)"}
                </label>
                <input
                  type="number"
                  required
                  value={rateAmount}
                  onChange={(e) => setRateAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">تاريخ الاستحقاق</label>
                <input
                  type="date"
                  required
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={issuing}
              className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium py-2.5 rounded-xl transition"
            >
              {issuing ? "جاري الإصدار..." : "إصدار المطالبات"}
            </button>
          </form>
        </div>

        {/* تسجيل مصروف */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
            <Receipt className="w-5 h-5 text-rose-600" />
            تسجيل مصروف من الخزينة
          </h2>
          <form onSubmit={handleAddExpense} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">بند المصروف</label>
                <select
                  value={expCategory}
                  onChange={(e) => setExpCategory(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm bg-white"
                >
                  <option value="security">أمن وحراسة</option>
                  <option value="cleaning">نظافة</option>
                  <option value="maintenance">صيانة ومصاعد</option>
                  <option value="utilities">كهرباء ومياه</option>
                  <option value="landscaping">زراعة ولاندسكيب</option>
                  <option value="admin">مصروفات إدارية</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">المبلغ (ج.م)</label>
                <input
                  type="number"
                  required
                  placeholder="1500"
                  value={expAmount}
                  onChange={(e) => setExpAmount(e.target.value)}
                  className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">وصف المصروف</label>
              <input
                type="text"
                required
                placeholder="مثال: فاتورة كهرباء السلم والمصعد شهر أكتوبر"
                value={expDesc}
                onChange={(e) => setExpDesc(e.target.value)}
                className="w-full px-3 py-2 rounded-xl border border-slate-300 text-sm"
              />
            </div>

            <button
              type="submit"
              disabled={addingExp}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 rounded-xl transition"
            >
              {addingExp ? "جاري الخصم..." : "تسجيل المصروف وخصمه من الخزينة"}
            </button>
          </form>
        </div>
      </div>

      {/* جدول المطالبات والتحصيل */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200">
          <h3 className="font-bold text-slate-800">سجل المطالبات والتحصيل ({invoices.length})</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">الوحدة</th>
                <th className="py-3 px-4">البيان</th>
                <th className="py-3 px-4">المبلغ</th>
                <th className="py-3 px-4">الاستحقاق</th>
                <th className="py-3 px-4">الحالة</th>
                <th className="py-3 px-4 text-center">إجراء / إيصال</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {invoices.map((inv) => {
                const paymentId = inv.payments?.[0]?.id;
                return (
                  <tr key={inv.id} className="hover:bg-slate-50">
                    <td className="py-3 px-4 font-bold text-slate-900">
                      {inv.units?.property_nodes?.name ? `${inv.units.property_nodes.name} - ` : ""}
                      وحدة {inv.units?.unit_number}
                    </td>
                    <td className="py-3 px-4 text-slate-700">{inv.title}</td>
                    <td className="py-3 px-4 font-bold text-slate-900">{Number(inv.amount).toLocaleString()} ج.م</td>
                    <td className="py-3 px-4 text-slate-500 text-xs">{inv.due_date}</td>
                    <td className="py-3 px-4">
                      {inv.status === "paid" ? (
                        <span className="inline-flex items-center gap-1 text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full font-medium">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          مدفوعة
                        </span>
                      ) : (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full font-medium">
                          غير مدفوعة
                        </span>
                      )}
                    </td>
                    <td className="py-3 px-4 text-center">
                      {inv.status !== "paid" ? (
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleCollectPayment(inv, "cash")}
                            className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            تحصيل كاش
                          </button>
                          <button
                            onClick={() => handleCollectPayment(inv, "instapay")}
                            className="text-xs bg-purple-600 hover:bg-purple-700 text-white px-3 py-1.5 rounded-lg transition"
                          >
                            InstaPay
                          </button>
                        </div>
                      ) : paymentId ? (
                        <Link
                          href={`/dashboard/${tenantId}/receipt/${paymentId}`}
                          className="inline-flex items-center gap-1.5 text-xs bg-slate-100 hover:bg-slate-200 text-slate-800 font-medium px-3 py-1.5 rounded-lg transition"
                        >
                          <Printer className="w-3.5 h-3.5 text-emerald-600" />
                          <span>طباعة إيصال</span>
                        </Link>
                      ) : (
                        <span className="text-xs text-slate-400">تم السداد</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* جدول المصروفات */}
      {expenses.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="p-5 border-b border-slate-200">
            <h3 className="font-bold text-slate-800">كشف المصروفات الشفاف ({expenses.length})</h3>
          </div>
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">البند</th>
                <th className="py-3 px-4">الوصف</th>
                <th className="py-3 px-4">التاريخ</th>
                <th className="py-3 px-4">المبلغ</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {expenses.map((exp) => (
                <tr key={exp.id}>
                  <td className="py-3 px-4 font-medium text-slate-700">{categoryLabels[exp.category]}</td>
                  <td className="py-3 px-4 text-slate-600">{exp.description}</td>
                  <td className="py-3 px-4 text-slate-500 text-xs">{exp.expense_date}</td>
                  <td className="py-3 px-4 font-bold text-rose-600">-{Number(exp.amount).toLocaleString()} ج.م</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}