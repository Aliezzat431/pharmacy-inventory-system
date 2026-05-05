"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  Building2,
  Plus,
  Edit,
  Trash2,
  Save,
  X,
  FileBarChart,
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  AlertTriangle,
  ChevronDown,
  BarChart3,
  Package,
  CheckCircle2
} from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState([]);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [editingCompanyId, setEditingCompanyId] = useState(null);
  const [editedCompanyName, setEditedCompanyName] = useState("");

  const [isLoading, setIsLoading] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [savingCompanyId, setSavingCompanyId] = useState(null);
  const [deletingCompanyId, setDeletingCompanyId] = useState(null);

  // Report Modal State
  const [reportOpen, setReportOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState(null);
  const [reportData, setReportData] = useState([]);
  const [isReportLoading, setIsReportLoading] = useState(false);

  useEffect(() => {
    fetchCompanies();
  }, []);

  const fetchCompanies = async () => {
    setIsLoading(true);
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/companies", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies(res.data);
    } catch (error) {
      console.error("Failed to fetch companies:", error);
      toast.error("خطأ في تحميل الشركات ❌");
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenReport = async (company) => {
    setSelectedCompany(company);
    setReportOpen(true);
    setIsReportLoading(true);
    try {
      const token = Cookies.get("token");
      const res = await axios.get(`/api/companies/report?name=${encodeURIComponent(company.name)}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setReportData(res.data.products);
    } catch (error) {
      console.error("Report Error:", error);
      toast.error("فشل في تحميل التقرير ❌");
    } finally {
      setIsReportLoading(false);
    }
  };

  const handleAddCompany = async () => {
    if (!newCompanyName.trim()) return;
    setIsAdding(true);
    try {
      const token = Cookies.get("token");
      const res = await axios.post(
        "/api/companies",
        { name: newCompanyName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanies((prev) => [...prev, res.data]);
      setNewCompanyName("");
      toast.success("تمت إضافة الشركة بنجاح ✅");
    } catch (error) {
      console.error("Failed to add company:", error);
      toast.error("خطأ في إضافة الشركة ❌");
    } finally {
      setIsAdding(false);
    }
  };

  const handleEditCompany = (id, name) => {
    setEditingCompanyId(id);
    setEditedCompanyName(name);
  };

  const handleSaveEdit = async (id) => {
    setSavingCompanyId(id);
    try {
      const token = Cookies.get("token");
      const res = await axios.patch(
        `/api/companies/${id}`,
        { name: editedCompanyName },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanies((prev) =>
        prev.map((company) => (company._id === id ? res.data : company))
      );
      setEditingCompanyId(null);
      setEditedCompanyName("");
      toast.success("تم تحديث اسم الشركة ✅");
    } catch (error) {
      console.error("Failed to update company:", error);
      toast.error("خطأ في تحديث الشركة ❌");
    } finally {
      setSavingCompanyId(null);
    }
  };

  const handleDeleteCompany = async (id) => {
    setDeletingCompanyId(id);
    try {
      const token = Cookies.get("token");
      await axios.delete(`/api/companies/${id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setCompanies((prev) => prev.filter((company) => company._id !== id));
      toast.success("تم حذف الشركة بنجاح ✅");
    } catch (error) {
      console.error("Failed to delete company:", error);
      toast.error("فشل في حذف الشركة ❌");
    } finally {
      setDeletingCompanyId(null);
    }
  };

  return (
    <div className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-8" dir="rtl">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 p-6 rounded-[32px] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Building2 className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-primary tracking-tight">إدارة الشركات</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Suppliers & Manufacturers</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Card className="glass-morphism px-6 py-4 border-none shadow-lg flex items-center gap-4">
            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
              <Package className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Total Partners</div>
              <div className="text-xl font-black">{companies.length}</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Add New Company section */}
      <Card className="glass-morphism border-none p-6 shadow-xl flex flex-col md:flex-row gap-4 items-center">
        <div className="relative flex-1 w-full">
          <Building2 className="absolute left-auto right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="اسم الشركة أو المورد الجديد..."
            value={newCompanyName}
            onChange={(e) => setNewCompanyName(e.target.value)}
            disabled={isAdding}
            className="h-14 pr-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold text-lg"
          />
        </div>
        <Button
          onClick={handleAddCompany}
          disabled={isAdding || !newCompanyName.trim()}
          className="h-14 px-10 rounded-2xl premium-gradient text-white font-black text-lg shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all w-full md:w-auto"
        >
          {isAdding ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Plus className="ml-2 h-5 w-5" />
              إضافة شريك جديد
            </>
          )}
        </Button>
      </Card>

      {/* Companies List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          Array(6).fill(0).map((_, i) => (
            <div key={i} className="h-32 rounded-[28px] bg-zinc-100 dark:bg-zinc-800/50 animate-pulse" />
          ))
        ) : (
          companies.map((company) => (
            <Card
              key={company._id}
              className="group glass-morphism border-none p-5 shadow-lg rounded-[28px] hover:shadow-2xl transition-all duration-300 relative overflow-hidden"
            >
              <div className="absolute top-0 right-0 h-2 bg-primary/20 w-1/3 rounded-bl-full" />

              {editingCompanyId === company._id ? (
                <div className="flex flex-col gap-4 animate-in fade-in zoom-in-95 duration-200">
                  <Input
                    value={editedCompanyName}
                    onChange={(e) => setEditedCompanyName(e.target.value)}
                    className="h-12 rounded-xl font-bold bg-white dark:bg-black focus-visible:ring-primary"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button onClick={() => handleSaveEdit(company._id)} className="flex-1 h-10 rounded-xl premium-gradient text-white font-black" disabled={savingCompanyId === company._id}>
                      {savingCompanyId === company._id ? <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "حفظ"}
                    </Button>
                    <Button variant="outline" onClick={() => setEditingCompanyId(null)} className="flex-1 h-10 rounded-xl font-black">إلغاء</Button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-4">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xl font-black tracking-tight mb-1">{company.name}</h3>
                      <Badge variant="secondary" className="bg-primary/5 text-primary border-none text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md">
                        Provider ID: #{company._id.slice(-5)}
                      </Badge>
                    </div>
                    <div className="flex gap-1">
                      <Button variant="ghost" size="icon" onClick={() => handleOpenReport(company)} className="h-9 w-9 rounded-xl hover:bg-primary/20 text-primary">
                        <BarChart3 className="h-5 w-5" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleEditCompany(company._id, company.name)} className="h-9 w-9 rounded-xl hover:bg-emerald-500/10 text-emerald-500">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => handleDeleteCompany(company._id)} disabled={deletingCompanyId === company._id} className="h-9 w-9 rounded-xl hover:bg-destructive/10 text-destructive">
                        {deletingCompanyId === company._id ? <div className="h-4 w-4 border-2 border-destructive/30 border-t-destructive rounded-full animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          ))
        )}
      </div>

      {/* Report Dialog */}
      <Dialog open={reportOpen} onOpenChange={(val) => !val && setReportOpen(false)}>
        <DialogContent className="max-w-4xl p-0 border-none overflow-hidden rounded-[32px] glass-morphism shadow-2xl flex flex-col h-[80vh]" dir="rtl">
          <div className="bg-primary/5 p-6 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <FileBarChart className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight italic">تحليل منتجات الشريك</h2>
                <p className="text-primary font-black text-sm mt-1">{selectedCompany?.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setReportOpen(false)} className="h-10 w-10 rounded-xl hover:bg-red-500/10 hover:text-red-500">
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto custom-scrollbar p-6">
            {isReportLoading ? (
              <div className="flex flex-col items-center justify-center h-full gap-4 opacity-50">
                <div className="h-12 w-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="font-black text-lg">جاري استلام البيانات...</p>
              </div>
            ) : (
              <Card className="glass-morphism border-none shadow-xl overflow-hidden rounded-[24px]">
                <Table>
                  <TableHeader className="bg-primary/5">
                    <TableRow className="hover:bg-transparent">
                      <TableHead className="text-right font-black">المنتج</TableHead>
                      <TableHead className="text-center font-black">المخزون</TableHead>
                      <TableHead className="text-center font-black">المبيعات (30يوم)</TableHead>
                      <TableHead className="text-center font-black">التوجه Trend</TableHead>
                      <TableHead className="text-center font-black">الحالة</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {reportData.map((prod) => (
                      <TableRow key={prod._id} className="hover:bg-primary/5 border-b border-white/5 last:border-0 group">
                        <TableCell className="text-right font-black py-5 text-lg opacity-80 group-hover:opacity-100 transition-opacity italic">
                          {prod.name}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="outline" className={cn(
                            "font-black px-4 h-8 rounded-lg border-2",
                            prod.isShortcoming ? "border-red-500/30 text-red-500 bg-red-500/5" : "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                          )}>
                            {prod.quantity} <span className="text-[10px] mr-1 opacity-60 font-bold">{prod.unit}</span>
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center text-xl font-black tracking-tighter">
                          {prod.salesCount}
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex justify-center">
                            {prod.trend === 'increasing' ? (
                              <div className="h-10 w-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-500" title="زيادة في الطلب">
                                <TrendingUp className="h-6 w-6" />
                              </div>
                            ) : prod.trend === 'decreasing' ? (
                              <div className="h-10 w-10 rounded-full bg-red-500/10 flex items-center justify-center text-red-500" title="انخفاض في الطلب">
                                <TrendingDown className="h-6 w-6" />
                              </div>
                            ) : (
                              <div className="h-10 w-10 rounded-full bg-zinc-500/10 flex items-center justify-center text-zinc-400" title="طلب مستقر">
                                <svg
                                  xmlns="http://www.w3.org/2000/svg"
                                  className="h-6 w-6"
                                  fill="none"
                                  viewBox="0 0 24 24"
                                  stroke="currentColor"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 7l-10 10m0-10h10v10" />
                                </svg>                              </div>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          {prod.isShortLongTime ? (
                            <Badge className="bg-destructive text-white font-black px-3 py-1 animate-pulse flex gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              نواقص قديمة
                            </Badge>
                          ) : prod.isShortcoming ? (
                            <Badge variant="destructive" className="font-black px-3 py-1">نواقص</Badge>
                          ) : (
                            <Badge className="bg-emerald-500 text-white font-black px-3 py-1 flex gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              متوفر
                            </Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                    {reportData.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="h-40 text-center opacity-40">
                          <div className="flex flex-col items-center gap-2">
                            <X className="h-12 w-12" />
                            <p className="font-black text-xl italic uppercase tracking-widest leading-none">لا توجد بيانات حالية</p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </Card>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
