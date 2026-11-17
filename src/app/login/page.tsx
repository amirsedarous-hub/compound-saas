"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import { Building2, Mail, Lock, LogIn, UserPlus, ArrowRight } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAuth(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: email.trim(),
        password,
      });

      if (error) {
        alert("خطأ في إنشاء الحساب: " + error.message);
      } else {
        alert("تم إنشاء حساب الإدارة بنجاح! جاري الدخول...");
        router.push("/");
      }
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });

      if (error) {
        alert("بيانات الدخول غير صحيحة: " + error.message);
      } else {
        router.push("/");
      }
    }

    setLoading(false);
  }

  return (
    <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
      <div className="bg-white w-full max-w-md p-8 rounded-3xl shadow-xl">
        <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-7 h-7" />
        </div>

        <h1 className="text-xl font-bold text-center text-slate-900">
          {isSignUp ? "إنشاء حساب إدارة جديد" : "تسجيل دخول الإدارة"}
        </h1>
        <p className="text-sm text-center text-slate-500 mt-1 mb-6">
          لوحة التحكم السحابية لإدارة الكمبوندات واتحادات الملاك
        </p>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">البريد الإلكتروني</label>
            <div className="relative">
              <input
                type="email"
                required
                placeholder="admin@compound.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-600"
                dir="ltr"
              />
              <Mail className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-700 mb-1">كلمة المرور</label>
            <div className="relative">
              <input
                type="password"
                required
                minLength={6}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-600"
                dir="ltr"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute right-3.5 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {isSignUp ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
            {loading ? "جاري المعالجة..." : isSignUp ? "إنشاء الحساب" : "دخول لوحة الإدارة"}
          </button>
        </form>

        <div className="mt-5 text-center">
          <button
            type="button"
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-emerald-700 hover:underline font-medium"
          >
            {isSignUp ? "لديك حساب بالفعل؟ سجل دخولك الآن" : "ليس لديك حساب مدير؟ أنشئ حساباً جديداً"}
          </button>
        </div>

        <div className="mt-6 pt-4 border-t border-slate-100 text-center">
          <Link
            href="/resident"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-800"
          >
            <span>دخول بوابة الملاك والسكان برقم الموبايل</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </Link>
        </div>
      </div>
    </div>
  );
}