"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { Building, Home, Plus, Trash2 } from "lucide-react";

interface BuildingNode {
  id: string;
  name: string;
}

interface Unit {
  id: string;
  unit_number: string;
  unit_type: "apartment" | "villa" | "commercial" | "garage";
  area_sqm: number;
  deposit_balance: number;
  status: "occupied_owner" | "rented" | "vacant";
  property_nodes?: { name: string } | null;
}

export default function UnitsPage() {
  const params = useParams();
  const tenantId = params.tenantId as string;

  const [buildings, setBuildings] = useState<BuildingNode[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [loading, setLoading] = useState(true);

  // حقول إضافة عمارة
  const [buildingName, setBuildingName] = useState("");
  const [addingBuilding, setAddingBuilding] = useState(false);

  // حقول إضافة وحدة
  const [selectedBuilding, setSelectedBuilding] = useState("");
  const [unitNumber, setUnitNumber] = useState("");
  const [unitType, setUnitType] = useState<"apartment" | "villa" | "commercial" | "garage">("apartment");
  const [areaSqm, setAreaSqm] = useState("");
  const [depositBalance, setDepositBalance] = useState("");
  const [status, setStatus] = useState<"occupied_owner" | "rented" | "vacant">("occupied_owner");
  const [addingUnit, setAddingUnit] = useState(false);

  useEffect(() => {
    if (tenantId) fetchData();
  }, [tenantId]);

  async function fetchData() {
    setLoading(true);
    const [bRes, uRes] = await Promise.all([
      supabase
        .from("property_nodes")
        .select("id, name")
        .eq("tenant_id", tenantId)
        .eq("node_type", "building")
        .order("created_at", { ascending: true }),
      supabase
        .from("units")
        .select("*, property_nodes(name)")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false }),
    ]);

    if (bRes.data) {
      setBuildings(bRes.data);
      if (bRes.data.length > 0 && !selectedBuilding) {
        setSelectedBuilding(bRes.data[0].id);
      }
    }
    if (uRes.data) setUnits(uRes.data as Unit[]);
    setLoading(false);
  }

  // إضافة عمارة / مبنى
  async function handleAddBuilding(e: React.FormEvent) {
    e.preventDefault();
    if (!buildingName.trim()) return;
    setAddingBuilding(true);

    const { error } = await supabase.from("property_nodes").insert([
      {
        tenant_id: tenantId,
        node_type: "building",
        name: buildingName.trim(),
      },
    ]);

    if (error) {
      alert("خطأ: " + error.message);
    } else {
      setBuildingName("");
      fetchData();
    }
    setAddingBuilding(false);
  }

  // إضافة وحدة سكنية / تجارية
  async function handleAddUnit(e: React.FormEvent) {
    e.preventDefault();
    if (!unitNumber.trim()) return;
    setAddingUnit(true);

    const { error } = await supabase.from("units").insert([
      {
        tenant_id: tenantId,
        node_id: selectedBuilding || null,
        unit_number: unitNumber.trim(),
        unit_type: unitType,
        area_sqm: Number(areaSqm) || 0,
        deposit_balance: Number(depositBalance) || 0,
        status,
      },
    ]);

    if (error) {
      alert("خطأ: " + error.message);
    } else {
      setUnitNumber("");
      setAreaSqm("");
      setDepositBalance("");
      fetchData();
    }
    setAddingUnit(false);
  }

  // حذف وحدة
  async function handleDeleteUnit(id: string) {
    if (!confirm("هل أنت متأكد من حذف هذه الوحدة؟")) return;
    await supabase.from("units").delete().eq("id", id);
    fetchData();
  }

  const unitTypeLabels = {
    apartment: "شقة",
    villa: "فيلا",
    commercial: "محل تجاري",
    garage: "جراج",
  };

  const statusLabels = {
    occupied_owner: { text: "مقيم بها المالك", color: "bg-emerald-50 text-emerald-700" },
    rented: { text: "مؤجرة", color: "bg-blue-50 text-blue-700" },
    vacant: { text: "مغلقة / شاغرة", color: "bg-slate-100 text-slate-600" },
  };

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">العمارات والوحدات</h1>
        <p className="text-sm text-slate-500 mt-1">تأسيس الهيكل العقاري للكمبوند أو الاتحاد وإضافة الوحدات</p>
      </div>

      {/* نماذج الإضافة */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 1. إضافة عمارة */}
        <div className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm h-fit">
          <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
            <Building className="w-5 h-5 text-emerald-600" />
            1. إضافة عمارة أو مبنى
          </h2>
          <form onSubmit={handleAddBuilding} className="space-y-3">
            <input
              type="text"
              required
              placeholder="مثال: عمارة 1 أو بلوك A"
              value={buildingName}
              onChange={(e) => setBuildingName(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-500"
            />
            <button
              type="submit"
              disabled={addingBuilding}
              className="w-full bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium py-2.5 rounded-xl transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              {addingBuilding ? "جاري الإضافة..." : "إضافة العمارة"}
            </button>
          </form>

          {buildings.length > 0 && (
            <div className="mt-5 pt-4 border-t border-slate-100">
              <p className="text-xs font-medium text-slate-500 mb-2">العمارات المسجلة ({buildings.length}):</p>
              <div className="flex flex-wrap gap-2">
                {buildings.map((b) => (
                  <span
                    key={b.id}
                    className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-lg font-medium"
                  >
                    {b.name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 2. إضافة وحدة */}
        <div className="lg:col-span-2 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
          <h2 className="font-bold text-base text-slate-800 mb-4 flex items-center gap-2">
            <Home className="w-5 h-5 text-emerald-600" />
            2. إضافة وحدة جديدة
          </h2>
          <form onSubmit={handleAddUnit} className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">العمارة / المبنى</label>
              <select
                value={selectedBuilding}
                onChange={(e) => setSelectedBuilding(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-emerald-500"
              >
                <option value="">-- بدون عمارة (فيلا مستقلة) --</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">رقم / كود الوحدة *</label>
              <input
                type="text"
                required
                placeholder="مثال: 101 أو A-12"
                value={unitNumber}
                onChange={(e) => setUnitNumber(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">نوع الوحدة</label>
              <select
                value={unitType}
                onChange={(e) => setUnitType(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-emerald-500"
              >
                <option value="apartment">شقة سكنية</option>
                <option value="villa">فيلا</option>
                <option value="commercial">محل تجاري</option>
                <option value="garage">باكية جراج</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">المساحة (م²)</label>
              <input
                type="number"
                placeholder="150"
                value={areaSqm}
                onChange={(e) => setAreaSqm(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">وديعة الصيانة (ج.م)</label>
              <input
                type="number"
                placeholder="25000"
                value={depositBalance}
                onChange={(e) => setDepositBalance(e.target.value)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm outline-none focus:border-emerald-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">حالة الإشغال</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-300 text-sm bg-white outline-none focus:border-emerald-500"
              >
                <option value="occupied_owner">مقيم بها المالك</option>
                <option value="rented">مؤجرة</option>
                <option value="vacant">مغلقة / شاغرة</option>
              </select>
            </div>

            <div className="md:col-span-3 flex justify-end">
              <button
                type="submit"
                disabled={addingUnit}
                className="bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium px-6 py-2.5 rounded-xl transition flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                {addingUnit ? "جاري الحفظ..." : "إضافة الوحدة"}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* جدول الوحدات */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-5 border-b border-slate-200 flex items-center justify-between">
          <h3 className="font-bold text-slate-800">قائمة الوحدات المسجلة ({units.length})</h3>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500 text-sm">جاري التحميل...</div>
        ) : units.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">
            لم يتم إضافة أي وحدات بعد. ابدأ بإضافة عمارة ثم أضف الوحدات التابعة لها.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 text-slate-600 font-medium border-b border-slate-200">
                <tr>
                  <th className="py-3.5 px-4">العمارة</th>
                  <th className="py-3.5 px-4">رقم الوحدة</th>
                  <th className="py-3.5 px-4">النوع</th>
                  <th className="py-3.5 px-4">المساحة</th>
                  <th className="py-3.5 px-4">وديعة الصيانة</th>
                  <th className="py-3.5 px-4">الحالة</th>
                  <th className="py-3.5 px-4 text-center">إجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {units.map((unit) => (
                  <tr key={unit.id} className="hover:bg-slate-50">
                    <td className="py-3.5 px-4 font-medium text-slate-700">
                      {unit.property_nodes?.name || "مستقلة"}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-900">{unit.unit_number}</td>
                    <td className="py-3.5 px-4 text-slate-600">{unitTypeLabels[unit.unit_type]}</td>
                    <td className="py-3.5 px-4 text-slate-600">{unit.area_sqm} م²</td>
                    <td className="py-3.5 px-4 font-medium text-emerald-700">
                      {Number(unit.deposit_balance).toLocaleString()} ج.م
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${statusLabels[unit.status].color}`}>
                        {statusLabels[unit.status].text}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <button
                        onClick={() => handleDeleteUnit(unit.id)}
                        className="text-rose-500 hover:bg-rose-50 p-1.5 rounded-lg transition"
                        title="حذف الوحدة"
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