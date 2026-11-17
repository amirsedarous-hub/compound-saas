"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Printer, ArrowRight, CheckCircle2, Building2 } from "lucide-react";

export default function ReceiptPage() {
  const params = useParams();
  const router = useRouter();
  const paymentId = params.paymentId as string;

  const [payment, setPayment] = useState<any>(null);
  const [ownerName, setOwnerName] = useState<string>("المالك / الساكن");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadReceipt() {
      const { data } = await supabase
        .from("payments")
        .select(
          `
          *,
          tenants ( name, type ),
          invoices ( title, due_date ),
          units ( unit_number, property_nodes ( name ) )
        `
        )
        .eq("id", paymentId)
        .single();

      if (data) {
        setPayment(data);
        // جلب اسم المالك المسؤول عن الوحدة
        const { data: occ } = await supabase
          .from("unit_occupants")
          .select("tenant_memberships(full_name)")
          .eq("unit_id", data.unit_id)
          .limit(1)
          .single();

        if (occ && (occ as any).tenant_memberships?.full_name) {
          setOwnerName((occ as any).tenant_memberships.full_name);
        }
      }
      setLoading(false);
    }

    if (paymentId) loadReceipt();
  }, [paymentId]);

  if (loading) {
    return <div className="p-10 text-center text-slate-500">جاري تجهيز الإيصال...</div>;
  }

  if (!payment) {
    return <div className="p-10 text-center text-rose-500">لم يتم العثور على الإيصال!</div>;
  }

  const methodLabels: Record<string, string> = {
    cash: "نقداً (كاش)",
    instapay: "تحويل إلكتروني (InstaPay)",
    bank_transfer: "تحويل بنكي",
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* أزرار التحكم (تختفي عند الطباعة) */}
      <div className="flex items-center justify-between print:hidden">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
        >
          <ArrowRight className="w-4 h-4" />
          <span>رجوع للمالية</span>
        </button>

        <button
          onClick={() => window.print()}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl flex items-center gap-2 shadow-sm transition"
        >
          <Printer className="w-4 h-4" />
          <span>طباعة / حفظ PDF</span>
        </button>
      </div>

      {/* ورقة الإيصال الرسمية */}
      <div className="bg-white p-8 md:p-10 rounded-3xl border-2 border-slate-200 shadow-sm print:border-slate-400 print:shadow-none">
        {/* رأس الإيصال */}
        <div className="flex items-start justify-between border-b-2 border-slate-100 pb-6">
          <div className="flex items-center gap-3">
            <div className="bg-slate-900 text-white p-3 rounded-2xl">
              <Building2 className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">{payment.tenants?.name}</h1>
              <p className="text-xs text-slate-500 mt-0.5">إدارة الحسابات والتحصيل</p>
            </div>
          </div>

          <div className="text-left">
            <span className="inline-block bg-emerald-50 text-emerald-700 text-xs font-bold px-3 py-1 rounded-full mb-1">
              إيصال استلام نقدية
            </span>
            <p className="text-xs font-mono text-slate-600" dir="ltr">
              #{payment.receipt_number}
            </p>
          </div>
        </div>

        {/* تفاصيل السداد */}
        <div className="py-6 space-y-4 text-sm">
          <div className="flex justify-between py-2 border-b border-dashed border-slate-200">
            <span className="text-slate-500">تاريخ التحصيل:</span>
            <span className="font-semibold text-slate-900">
              {new Date(payment.paid_at).toLocaleDateString("ar-EG", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-dashed border-slate-200">
            <span className="text-slate-500">استلمنا من السيد / السيدة:</span>
            <span className="font-bold text-slate-900">{ownerName}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-dashed border-slate-200">
            <span className="text-slate-500">عن الوحدة:</span>
            <span className="font-semibold text-slate-900">
              {payment.units?.property_nodes?.name ? `${payment.units.property_nodes.name} - ` : ""}
              وحدة {payment.units?.unit_number}
            </span>
          </div>

          <div className="flex justify-between py-2 border-b border-dashed border-slate-200">
            <span className="text-slate-500">وذلك مقابل:</span>
            <span className="font-semibold text-slate-900">{payment.invoices?.title}</span>
          </div>

          <div className="flex justify-between py-2 border-b border-dashed border-slate-200">
            <span className="text-slate-500">طريقة السداد:</span>
            <span className="font-semibold text-slate-900">
              {methodLabels[payment.payment_method] || payment.payment_method}
            </span>
          </div>
        </div>

        {/* المبلغ الإجمالي */}
        <div className="bg-slate-50 p-5 rounded-2xl border border-slate-200 flex items-center justify-between my-4">
          <span className="font-bold text-slate-700">المبلغ المدفوع وقدره:</span>
          <span className="text-2xl font-bold text-emerald-700">
            {Number(payment.amount).toLocaleString()} ج.م
          </span>
        </div>

        {/* التذييل والختم */}
        <div className="mt-8 pt-6 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
          <div className="flex items-center gap-1.5 text-emerald-700 font-medium">
            <CheckCircle2 className="w-4 h-4" />
            <span>سند إلكتروني معتمد من النظام</span>
          </div>
          <div className="text-center">
            <p className="mb-6">توقيع أمين الصندوق / الإدارة</p>
            <div className="w-32 border-b border-slate-300"></div>
          </div>
        </div>
      </div>
    </div>
  );
}