"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Home, Users, Wallet, Wrench, Building2 } from "lucide-react";
import Link from "next/link";

export default function DashboardOverview() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [stats, setStats] = useState({
    unitsCount: 0,
    residentsCount: 0,
    balance: 0,
    openTickets: 0,
  });

  useEffect(() => {
    async function loadStats() {
      const [unitsRes, membersRes, accountsRes, ticketsRes] = await Promise.all([
        supabase.from("units").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        supabase.from("tenant_memberships").select("id", { count: "exact" }).eq("tenant_id", tenantId),
        supabase.from("accounts").select("current_balance").eq("tenant_id", tenantId),
        supabase
          .from("maintenance_tickets")
          .select("id", { count: "exact" })
          .eq("tenant_id", tenantId)
          .eq("status", "open"),
      ]);

      const totalBalance =
        accountsRes.data?.reduce((sum, acc) => sum + Number(acc.current_balance || 0), 0) || 0;

      setStats({
        unitsCount: unitsRes.count || 0,
        residentsCount: membersRes.count || 0,
        balance: totalBalance,
        openTickets: ticketsRes.count || 0,
      });
    }

    if (tenantId) loadStats();
  }, [tenantId]);

  const cards = [
    {
      title: "إجمالي الوحدات",
      value: stats.unitsCount,
      icon: Home,
      color: "bg-blue-50 text-blue-600",
      link: `/dashboard/${tenantId}/units`,
    },
    {
      title: "الملاك والسكان",
      value: stats.residentsCount,
      icon: Users,
      color: "bg-emerald-50 text-emerald-600",
      link: `/dashboard/${tenantId}/residents`,
    },
    {
      title: "رصيد الخزينة والبنك",
      value: `${stats.balance.toLocaleString()} ج.م`,
      icon: Wallet,
      color: "bg-amber-50 text-amber-600",
      link: `/dashboard/${tenantId}/finance`,
    },
    {
      title: "بلاغات صيانة مفتوحة",
      value: stats.openTickets,
      icon: Wrench,
      color: "bg-rose-50 text-rose-600",
      link: `/dashboard/${tenantId}/maintenance`,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">لوحة المتابعة العامة</h1>
        <p className="text-sm text-slate-500 mt-1">ملخص حي لحالة الكمبوند والعمليات المالية والتشغيلية</p>
      </div>

      {/* بطاقات الإحصائيات */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <Link
              key={card.title}
              href={card.link}
              className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm hover:border-emerald-400 transition"
            >
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-medium text-slate-500">{card.title}</span>
                <div className={`p-2.5 rounded-xl ${card.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
              </div>
              <div className="text-2xl font-bold text-slate-900">{card.value}</div>
            </Link>
          );
        })}
      </div>

      {/* إرشاد سريع للبدء */}
      <div className="bg-white p-6 rounded-2xl border border-slate-200 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="bg-emerald-100 text-emerald-700 p-3 rounded-xl">
            <Building2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900">ابدأ بتأسيس بيانات الكمبوند أو العمارة</h3>
            <p className="text-sm text-slate-500">
              الخطوة الأولى هي إضافة العمارات والوحدات السكنية، ثم ربط الملاك والسكان بها.
            </p>
          </div>
        </div>
        <Link
          href={`/dashboard/${tenantId}/units`}
          className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-5 py-2.5 rounded-xl transition shrink-0"
        >
          إدارة العمارات والوحدات
        </Link>
      </div>
    </div>
  );
}