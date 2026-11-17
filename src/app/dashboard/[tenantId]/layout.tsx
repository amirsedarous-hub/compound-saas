"use client";

import { useEffect, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  Building2,
  LayoutDashboard,
  Home,
  Users,
  Wallet,
  Wrench,
  QrCode,
  ArrowRight,
  LogOut,
} from "lucide-react";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const router = useRouter();
  const tenantId = params.tenantId as string;

  const [tenantName, setTenantName] = useState("جاري التحميل...");
  const [checkingAuth, setCheckingAuth] = useState(true);

  useEffect(() => {
    async function init() {
      // التحقق من تسجيل دخول المدير
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push("/login");
        return;
      }
      setCheckingAuth(false);

      const { data } = await supabase
        .from("tenants")
        .select("name")
        .eq("id", tenantId)
        .single();
      if (data) setTenantName(data.name);
    }

    if (tenantId) init();
  }, [tenantId, router]);

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  if (checkingAuth) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center text-slate-500 text-sm">
        جاري التحقق من صلاحيات الدخول...
      </div>
    );
  }

  const navItems = [
    { name: "نظرة عامة", href: `/dashboard/${tenantId}`, icon: LayoutDashboard },
    { name: "العمارات والوحدات", href: `/dashboard/${tenantId}/units`, icon: Home },
    { name: "الملاك والسكان", href: `/dashboard/${tenantId}/residents`, icon: Users },
    { name: "المالية والاشتراكات", href: `/dashboard/${tenantId}/finance`, icon: Wallet },
    { name: "بلاغات الصيانة", href: `/dashboard/${tenantId}/maintenance`, icon: Wrench },
    { name: "بوابة الأمن (QR)", href: `/dashboard/${tenantId}/security`, icon: QrCode },
  ];

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* القائمة الجانبية */}
      <aside className="w-64 bg-slate-900 text-white flex flex-col justify-between shrink-0 print:hidden">
        <div>
          <div className="p-5 border-b border-slate-800 flex items-center gap-3">
            <div className="bg-emerald-500 p-2 rounded-xl">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="overflow-hidden">
              <h2 className="font-bold text-sm truncate">{tenantName}</h2>
              <p className="text-xs text-slate-400">لوحة الإدارة</p>
            </div>
          </div>

          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition ${
                    isActive
                      ? "bg-emerald-600 text-white"
                      : "text-slate-300 hover:bg-slate-800 hover:text-white"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.name}</span>
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-slate-800 space-y-3">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition"
          >
            <ArrowRight className="w-4 h-4" />
            <span>العودة لقائمة الكمبوندات</span>
          </Link>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 text-xs text-rose-400 hover:text-rose-300 transition pt-2 border-t border-slate-800/80"
          >
            <LogOut className="w-4 h-4" />
            <span>تسجيل الخروج</span>
          </button>
        </div>
      </aside>

      {/* محتوى الصفحة */}
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}