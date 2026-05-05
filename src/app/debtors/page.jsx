"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import Cookies from "js-cookie";
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
  Users,
  Search,
  DollarSign,
  User,
  Calendar,
  ChevronRight,
  Info,
  X,
  CreditCard,
  History,
  CheckCircle2,
  AlertCircle
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const DebtorsPage = () => {
  const [debtors, setDebtors] = useState([]);
  const [filteredDebtors, setFilteredDebtors] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState(null);
  const [payAmount, setPayAmount] = useState('');
  const [search, setSearch] = useState(() => {
    if (typeof window !== 'undefined') return localStorage.getItem("debtors_search") || "";
    return "";
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    localStorage.setItem("debtors_search", search);
  }, [search]);

  const fetchDebtors = async () => {
    setLoading(true);
    try {
      const token = Cookies.get("token");
      const res = await axios.get('/api/debt', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setDebtors(res.data);
      setFilteredDebtors(res.data);
    } catch (error) {
      console.error('فشل في جلب المديونيات:', error);
      toast.error('فشل في تحميل بيانات المديونيات ❌');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDebtors();
  }, []);

  useEffect(() => {
    const lower = search.toLowerCase();
    setFilteredDebtors(
      debtors.filter(d => d.name.toLowerCase().includes(lower))
    );
  }, [search, debtors]);

  const handlePay = async () => {
    if (!selectedDebtor || !payAmount || isNaN(payAmount) || Number(payAmount) <= 0) {
      toast.warning("يرجى إدخال مبلغ صحيح للسداد");
      return;
    }

    try {
      const token = Cookies.get("token");
      const res = await axios.patch('/api/debt', {
        name: selectedDebtor.name,
        payAmount: Number(payAmount),
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      toast.success(res.data.message || 'تمت عملية السداد بنجاح ✅');
      await fetchDebtors();
      setSelectedDebtor(null);
      setPayAmount('');
    } catch (err) {
      console.error('فشل في الدفع:', err);
      toast.error('حدث خطأ أثناء معالجة السداد ❌');
    }
  };

  const calcRemainingAfterPay = (debtor, amount) => {
    if (!debtor) return 0;
    let totalOrders = 0;
    debtor.orders.forEach(order => {
      totalOrders += order.total;
    });
    const partialPayments = debtor.partialPayments ?? 0;
    return totalOrders - partialPayments - Number(amount || 0);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen gap-4">
        <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        <p className="font-black text-primary text-xl animate-pulse">جاري تحميل بيانات العملاء...</p>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-8" dir="rtl">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 p-6 rounded-[32px] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <Users className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-primary tracking-tight">حسابات العملاء</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Customer Debt Management</p>
          </div>
        </div>

        <div className="flex gap-4">
          <Card className="glass-morphism px-6 py-4 border-none shadow-lg flex items-center gap-4 bg-red-500/5">
            <div className="h-10 w-10 rounded-xl bg-red-500/10 flex items-center justify-center text-red-500">
              <AlertCircle className="h-5 w-5" />
            </div>
            <div>
              <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Total Debtors</div>
              <div className="text-xl font-black text-red-500">{debtors.length}</div>
            </div>
          </Card>
        </div>
      </div>

      {/* Search Section */}
      <div className="relative group max-w-2xl mx-auto w-full">
        <Search className="absolute left-auto right-5 top-1/2 -translate-y-1/2 h-6 w-6 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
        <Input
          placeholder="ابحث عن اسم العميل..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          className="h-16 pr-14 rounded-[24px] bg-white/50 dark:bg-zinc-900/50 border-white/20 dark:border-zinc-800 focus-visible:ring-primary shadow-xl font-black text-xl placeholder:text-muted-foreground/40"
        />
      </div>

      {/* Debtors Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredDebtors.map((debtor, idx) => (
          <Card
            key={idx}
            onClick={() => {
              setSelectedDebtor(debtor);
              setPayAmount('');
            }}
            className="group glass-morphism border-none p-6 shadow-lg rounded-[28px] cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all duration-300 relative overflow-hidden"
          >
            <div className="absolute top-0 right-0 h-24 w-24 bg-primary/5 rounded-full -mr-12 -mt-12 group-hover:scale-150 transition-transform duration-500" />

            <div className="flex justify-between items-start mb-6 relative z-10">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-colors duration-300">
                  <User className="h-7 w-7" />
                </div>
                <div>
                  <h3 className="text-xl font-black tracking-tight">{debtor.name}</h3>
                  <div className="flex items-center gap-1 text-[10px] font-bold text-muted-foreground uppercase tracking-wider mt-1">
                    <Clock className="h-3 w-3" />
                    اخر معاملة: {new Date(debtor.updatedAt).toLocaleDateString("ar-EG")}
                  </div>
                </div>
              </div>
              <Badge className="h-10 px-4 rounded-xl bg-red-500 text-white font-black text-lg shadow-lg shadow-red-500/20">
                {((debtor.totalOrders || 0) - (debtor.partialPayments || 0)).toLocaleString()} <span className="text-[10px] mr-1 opacity-70 font-bold">ج.م</span>
              </Badge>
            </div>

            <div className="h-px w-full bg-white/10 mb-5" />

            <div className="flex justify-between items-center relative z-10">
              <div>
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none mb-1">Total Purchases</div>
                <div className="font-bold text-md">{debtor.totalOrders?.toLocaleString()} ج.م</div>
              </div>
              <Button variant="ghost" className="rounded-xl font-black text-primary hover:bg-primary/10 group/btn">
                كشف حساب
                <ChevronRight className="mr-1 h-4 w-4 group-hover:translate-x-[-4px] transition-transform" />
              </Button>
            </div>
          </Card>
        ))}

        {filteredDebtors.length === 0 && (
          <div className="col-span-full py-20 text-center flex flex-col items-center gap-4">
            <div className="h-20 w-20 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-300 dark:text-zinc-600">
              <Search className="h-10 w-10" />
            </div>
            <p className="font-black text-2xl text-muted-foreground uppercase tracking-widest">No Debtors Found</p>
          </div>
        )}
      </div>

      {/* Debt Detail Modal */}
      <Dialog open={!!selectedDebtor} onOpenChange={(val) => !val && setSelectedDebtor(null)}>
        <DialogContent className="max-w-4xl p-0 border-none overflow-hidden rounded-[32px] glass-morphism shadow-2xl flex flex-col h-[85vh]" dir="rtl">
          <div className="bg-primary/5 p-6 border-b border-white/10 flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary flex items-center justify-center text-white shadow-lg shadow-primary/20">
                <History className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight leading-none italic">كشف حساب العميل</h2>
                <p className="text-primary font-black text-sm mt-1">{selectedDebtor?.name}</p>
              </div>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setSelectedDebtor(null)} className="h-10 w-10 rounded-xl hover:bg-red-500/10 hover:text-red-500">
              <X className="h-6 w-6" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-6 space-y-8 custom-scrollbar">
            {selectedDebtor?.orders.map((order, index) => (
              <div key={index} className="space-y-4 animate-in slide-in-from-right-4 transition-all" style={{ animationDelay: `${index * 100}ms` }}>
                <div className="flex justify-between items-end border-r-4 border-primary px-4 py-1">
                  <div>
                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em] leading-none">Order Reference</span>
                    <h4 className="text-xl font-black tracking-tighter italic">طلب رقم {index + 1}</h4>
                  </div>
                  <div className="text-left">
                    <span className="text-[10px] font-black uppercase text-primary tracking-[0.2em] leading-none block">Total Balance</span>
                    <span className="text-2xl font-black tracking-widest text-primary">{order.total.toLocaleString()} <span className="text-xs italic opacity-50 font-bold tracking-normal">ج.م</span></span>
                  </div>
                </div>

                <Card className="glass-morphism border-none shadow-xl overflow-hidden rounded-2xl">
                  <Table>
                    <TableHeader className="bg-primary/5">
                      <TableRow className="hover:bg-transparent">
                        <TableHead className="text-right font-black">المنتج</TableHead>
                        <TableHead className="text-center font-black">الكمية</TableHead>
                        <TableHead className="text-center font-black">السعر</TableHead>
                        <TableHead className="text-center font-black">الإجمالي</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {order.items.map((item, i) => (
                        <TableRow key={i} className="hover:bg-white/5 border-b border-white/5 last:border-0">
                          <TableCell className="text-right font-bold py-4 italic">{item.name}</TableCell>
                          <TableCell className="text-center">
                            <Badge variant="secondary" className="font-black px-3 rounded-md border-none">{item.quantity} {item.unit}</Badge>
                          </TableCell>
                          <TableCell className="text-center font-bold opacity-60 text-xs">{item.price.toLocaleString()} ج.م</TableCell>
                          <TableCell className="text-center">
                            <span className="font-black text-md text-primary">{item.total.toLocaleString()} ج.م</span>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Card>
              </div>
            ))}
          </div>

          <div className="p-8 bg-zinc-900/90 dark:bg-black/90 text-white">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
              <div className="space-y-4">
                <div className="flex flex-col gap-1">
                  <label className="text-[10px] font-black uppercase text-white/50 tracking-widest mr-2">مبلغ التحصيل</label>
                  <div className="relative">
                    <DollarSign className="absolute left-auto right-4 top-1/2 -translate-y-1/2 h-6 w-6 text-emerald-500" />
                    <Input
                      type="number"
                      value={payAmount}
                      onChange={(e) => setPayAmount(e.target.value)}
                      className="h-16 pr-14 rounded-2xl bg-white/10 border-white/5 text-2xl font-black italic focus-visible:ring-emerald-500 placeholder:text-white/10"
                      placeholder="0.00"
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-between items-center gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs uppercase tracking-widest">
                    <CheckCircle2 className="h-3 w-3" />
                    سداد سابقاً: {selectedDebtor?.partialPayments?.toLocaleString() || 0} ج.م
                  </div>
                  <div className="text-3xl font-black italic tracking-tighter">
                    المتبقي: <span className="text-emerald-500">{calcRemainingAfterPay(selectedDebtor, payAmount).toLocaleString()}</span> <span className="text-xs opacity-50 underline">ج.م</span>
                  </div>
                </div>

                <Button
                  onClick={handlePay}
                  disabled={!payAmount || isNaN(payAmount) || Number(payAmount) <= 0}
                  className="h-16 px-10 rounded-[20px] premium-gradient text-white font-black text-xl shadow-2xl shadow-primary/40 hover:scale-105 active:scale-95 transition-all"
                >
                  <CreditCard className="ml-2 h-6 w-6" />
                  تأكيد السداد
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default DebtorsPage;
