"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip as ChartTooltip,
  Legend,
} from "chart.js";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  LayoutDashboard,
  TrendingUp,
  ArrowUpCircle,
  ArrowDownCircle,
  Heart,
  Clock,
  Sparkles,
  Wallet,
  Receipt,
  Building2,
  Calendar,
  X,
  Plus
} from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";

ChartJS.register(BarElement, CategoryScale, LinearScale, ChartTooltip, Legend);
import { supabase } from "../lib/supabase";

const Dashboard = () => {
  const [data, setData] = useState([]);
  const [aiReport, setAiReport] = useState("");
  const [loadingAi, setLoadingAi] = useState(false);
  const [settling, setSettling] = useState(false);

  const [pendingSadaqah, setPendingSadaqah] = useState(0);

  const [withdrawalOpen, setWithdrawalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState("");
  const [withdrawReason, setWithdrawReason] = useState("");
  const [withdrawing, setWithdrawing] = useState(false);
  const [userRole, setUserRole] = useState("master");

  useEffect(() => {
    const fetchWinnings = async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get("/api/winnings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(res.data);
      } catch (err) {
        console.error(err);
      }
    };

    const fetchPending = async () => {
      try {
        const token = Cookies.get("token");
        if (token) {
          setUserRole("master");
        }
        const res = await axios.get("/api/pending-sadaqah", {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.data.success) {
          setPendingSadaqah(res.data.pendingCount);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchWinnings();
    fetchPending();

    // Real-time subscription for dashboard data
    const txChannel = supabase
      .channel('dashboard_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        fetchWinnings();
        fetchPending();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'withdrawals' }, () => {
        fetchWinnings();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(txChannel);
    };
  }, []);

  const fetchWinnings = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/winnings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setData(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const generateAiReport = async () => {
    setLoadingAi(true);
    try {
      const token = Cookies.get("token");
      const res = await axios.post(
        "/api/ai-report",
        { data },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      setAiReport(res.data.report);
      toast.success("تم توليد التقرير بنجاح ✅");
    } catch (err) {
      console.error("AI Report failed:", err);
      setAiReport("عذراً، فشل في توليد التقرير حالياً. يرجى المحاولة لاحقاً.");
      toast.error("فشل توليد التقرير ❌");
    } finally {
      setLoadingAi(false);
    }
  };

  const settleSadaqah = async () => {
    setSettling(true);
    try {
      const token = Cookies.get("token");
      const res = await axios.post(
        "/api/settle-sadaqah",
        {},
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.data.success) {
        toast.success(res.data.message);

        const refreshed = await axios.get("/api/winnings", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setData(refreshed.data);

        const pendingRes = await axios.get("/api/pending-sadaqah", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (pendingRes.data.success) {
          setPendingSadaqah(pendingRes.data.pendingCount);
        }
      } else {
        toast.error(res.data.message || "حدث خطأ");
      }
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ أثناء التسديد ❌");
    } finally {
      setSettling(false);
    }
  };

  const handleWithdrawal = async () => {
    if (!withdrawAmount || isNaN(withdrawAmount) || Number(withdrawAmount) <= 0) {
      toast.error("يرجى إدخال مبلغ صحيح");
      return;
    }
    if (!withdrawReason) {
      toast.error("يرجى إدخال سبب السحب");
      return;
    }

    setWithdrawing(true);
    try {
      const token = Cookies.get("token");
      const res = await axios.post(
        "/api/withdrawals",
        { amount: withdrawAmount, reason: withdrawReason },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        toast.success(res.data.message);
        setWithdrawalOpen(false);
        setWithdrawAmount("");
        setWithdrawReason("");
        fetchWinnings();
      } else {
        toast.error(res.data.message || "حدث خطأ");
      }
    } catch (err) {
      console.error(err);
      toast.error("فشل تسجيل السحب ❌");
    } finally {
      setWithdrawing(false);
    }
  };

  const chartData = {
    labels: data.map((day) => day.date),
    datasets: [
      {
        label: "إجمالي الوارد",
        data: data.map((day) => day.totalIn),
        backgroundColor: "rgba(16, 185, 129, 0.8)",
        borderRadius: 8,
      },
      {
        label: "إجمالي المنصرف",
        data: data.map((day) => day.totalOut),
        backgroundColor: "rgba(239, 68, 68, 0.8)",
        borderRadius: 8,
      },
      {
        label: "الصدقات",
        data: data.map((day) => day.totalSadaqah || 0),
        backgroundColor: "rgba(59, 130, 246, 0.8)",
        borderRadius: 8,
      },
      {
        label: "معلق",
        data: data.map((day) => day.totalSuspended || 0),
        backgroundColor: "rgba(245, 158, 11, 0.8)",
        borderRadius: 8,
      },
    ],
  };

  const formatType = (type) => {
    if (type === "in") return "إيداع";
    if (type === "out") return "دفع";
    if (type === "sadaqah") return "صدقة";
    if (type === "sadaqahPaid") return "تسديد صدقات";
    if (type === "withdrawal") return "سحب مدير";
    return "معلّق";
  };

  return (
    <div className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-8" dir="rtl">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20">
            <LayoutDashboard className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-3xl font-black text-primary tracking-tight">تقرير الأرباح</h1>
            <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Pharmacy Financial Dashboard</p>
          </div>
        </div>

        {data.length > 0 && userRole === "master" && (
          <div className="flex gap-4">
            <Card className="glass-morphism p-4 border-none shadow-xl flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <Wallet className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Base Capital</div>
                <div className="text-lg font-black">{data[0]?.baseCapital?.toLocaleString() || 100000} <span className="text-xs opacity-50">ج.م</span></div>
              </div>
            </Card>

            <Card className="glass-morphism p-4 border-none shadow-xl flex items-center gap-4 bg-primary/5">
              <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <div>
                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest">Current Capital</div>
                <div className="text-lg font-black text-secondary">{data[data.length - 1]?.currentCapital?.toLocaleString() || 0} <span className="text-xs opacity-50">ج.م</span></div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Main Chart Section */}
      {userRole === "master" && (
        <Card className="glass-morphism border-none p-8 shadow-2xl relative overflow-hidden group">
          <div className="absolute top-0 left-0 right-0 h-1 premium-gradient opacity-30 group-hover:opacity-100 transition-opacity" />
          <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <TrendingUp className="h-5 w-5" />
              </div>
              <h2 className="text-xl font-black tracking-tight">أداء الصيدلية (آخر 30 يوم)</h2>
            </div>
          </div>
          <div className="h-[400px]">
            <Bar
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                  legend: { position: "top", rtl: true, labels: { font: { weight: "900", size: 12 }, boxWidth: 15, padding: 20 } },
                },
                scales: {
                  y: { grid: { color: "rgba(0,0,0,0.03)" }, ticks: { font: { weight: "700" } } },
                  x: { grid: { display: false }, ticks: { font: { weight: "700" } } },
                },
              }}
            />
          </div>
        </Card>
      )}

      {/* AI Report Card */}
      {userRole === "master" && (
        <Card className="premium-gradient border-none p-8 shadow-2xl text-white relative overflow-hidden group">
          <div className="absolute -right-20 -top-20 h-64 w-64 bg-white/10 rounded-full blur-3xl" />
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-3">
                <Sparkles className="h-6 w-6 animate-pulse" />
                <h2 className="text-2xl font-black tracking-tight">تحليل الذكاء الاصطناعي</h2>
              </div>
              <p className="text-white/80 font-bold max-w-md">احصل على رؤى ذكية وتوصيات مبنية على أدائك المالي الحالي.</p>
            </div>
            <Button
              onClick={generateAiReport}
              className="h-14 px-8 rounded-2xl bg-white text-primary hover:bg-white/90 font-black text-lg transition-all shadow-xl shadow-black/20"
              disabled={loadingAi || data.length === 0}
            >
              {loadingAi ? (
                <div className="h-5 w-5 border-2 border-primary/30 border-t-primary rounded-full animate-spin" />
              ) : "توليد التقرير الذكي"}
            </Button>
          </div>

          {aiReport && (
            <div className="mt-8 relative animate-in fade-in slide-in-from-bottom-4">
              <div className="p-6 rounded-[24px] bg-white/10 border border-white/20 backdrop-blur-md">
                <p className="whitespace-pre-wrap leading-relaxed font-bold text-lg text-white/90">
                  {aiReport}
                </p>
              </div>
            </div>
          )}
        </Card>
      )}

      {/* Action Buttons */}
      <div className="flex justify-end gap-4">
        {userRole === "master" && (
          <Button
            onClick={() => setWithdrawalOpen(true)}
            className="h-14 px-8 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg shadow-lg shadow-amber-500/20"
          >
            <ArrowDownCircle className="ml-2 h-5 w-5" />
            سحب من الخزنة
          </Button>
        )}
        <Button
          onClick={settleSadaqah}
          disabled={settling || pendingSadaqah === 0}
          className="h-14 px-8 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg shadow-lg shadow-indigo-600/20"
        >
          {settling ? (
            <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <Heart className="ml-2 h-5 w-5 fill-white" />
              تسديد الصدقات ({pendingSadaqah})
            </>
          )}
        </Button>
      </div>

      {/* Daily Logs History */}
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Calendar className="h-6 w-6 text-primary" />
          <h2 className="text-2xl font-black tracking-tight">السجلات اليومية</h2>
        </div>

        {data.map((day, i) => (
          <Card key={i} className="glass-morphism border-none p-6 shadow-xl relative group">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6 pb-6 border-b border-white/10 transition-all">
              <div className="flex items-center gap-4">
                <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black">
                  {i + 1}
                </div>
                <h3 className="text-xl font-black tracking-tighter">{day.date}</h3>
              </div>

              {userRole === "master" && (
                <div className="flex gap-2">
                  <Badge className="bg-emerald-500/10 text-emerald-500 border-none font-black px-3 py-1 rounded-lg">
                    ↑ {day.totalIn}
                  </Badge>
                  <Badge className="bg-red-500/10 text-red-500 border-none font-black px-3 py-1 rounded-lg">
                    ↓ {day.totalOut}
                  </Badge>
                  <Badge className="bg-blue-500/10 text-blue-500 border-none font-black px-3 py-1 rounded-lg">
                    💛 {day.totalSadaqah || 0}
                  </Badge>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/5 overflow-hidden">
              <Table>
                <TableHeader className="bg-white/5">
                  <TableRow className="hover:bg-transparent">
                    <TableHead className="text-right font-black">العملية / السبب</TableHead>
                    {userRole === "master" && <TableHead className="text-center font-black">المبلغ</TableHead>}
                    <TableHead className="text-center font-black">المورد</TableHead>
                    <TableHead className="text-center font-black">المستند</TableHead>
                    <TableHead className="text-center font-black">النوع</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {day.orders.map((order, idx) => (
                    <TableRow key={idx} className="hover:bg-white/5 border-b border-white/5 last:border-0">
                      <TableCell className="text-right font-bold py-4">{order.reason}</TableCell>
                      {userRole === "master" && (
                        <TableCell className="text-center">
                          <span className={cn(
                            "font-black tracking-tight",
                            order.type === 'in' ? "text-emerald-500" : "text-red-500"
                          )}>{order.amount?.toLocaleString()} ج.م</span>
                        </TableCell>
                      )}
                      <TableCell className="text-center font-bold opacity-60">
                        {order.supplier ? (
                          <div className="flex items-center justify-center gap-1">
                            <Building2 className="h-3 w-3" />
                            {order.supplier}
                          </div>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        {order.invoiceNumber ? (
                          <Badge variant="outline" className="font-mono text-[10px] tracking-widest border-primary/20 bg-primary/5 text-primary">
                            #{order.invoiceNumber}
                          </Badge>
                        ) : "-"}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge className={cn(
                          "border-none font-black text-[10px] uppercase px-3 py-1 rounded-md",
                          order.type === 'in' && "bg-emerald-500/10 text-emerald-500",
                          order.type === 'out' && "bg-red-500/10 text-red-500",
                          order.type === 'sadaqah' && "bg-blue-500/10 text-blue-500",
                          order.type === 'withdrawal' && "bg-amber-500/10 text-amber-500",
                          !['in', 'out', 'sadaqah', 'withdrawal'].includes(order.type) && "bg-zinc-500/10 text-zinc-500"
                        )}>
                          {formatType(order.type)}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </Card>
        ))}
      </div>

      {/* Withdrawal Dialog */}
      <Dialog open={withdrawalOpen} onOpenChange={(val) => !withdrawing && setWithdrawalOpen(val)}>
        <DialogContent className="max-w-md p-8 border-none overflow-hidden rounded-[32px] glass-morphism shadow-2xl" dir="rtl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-amber-500" />
          <DialogHeader className="flex flex-col items-center gap-4 text-center">
            <div className="h-16 w-16 rounded-2xl bg-amber-500/10 border-2 border-amber-500/20 flex items-center justify-center text-amber-500 animate-in zoom-in-50">
              <ArrowDownCircle className="h-8 w-8" />
            </div>
            <DialogTitle className="text-3xl font-black uppercase tracking-tight text-amber-500">سحب من الخزنة</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-6">
            <div className="space-y-2">
              <label className="text-sm font-black opacity-50 mr-2">المبلغ المسحوب</label>
              <Input
                type="number"
                value={withdrawAmount}
                onChange={(e) => setWithdrawAmount(e.target.value)}
                disabled={withdrawing}
                className="h-14 rounded-2xl text-xl font-black text-center focus-visible:ring-amber-500"
                placeholder="0.00"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-black opacity-50 mr-2">سبب السحب</label>
              <Input
                value={withdrawReason}
                onChange={(e) => setWithdrawReason(e.target.value)}
                disabled={withdrawing}
                className="h-14 rounded-2xl font-bold"
                placeholder="مثال: نفقات شخصية"
              />
            </div>
          </div>

          <DialogFooter className="flex gap-4 mt-4">
            <Button
              onClick={handleWithdrawal}
              className="flex-1 h-16 rounded-2xl bg-amber-500 hover:bg-amber-600 text-white font-black text-lg uppercase tracking-widest shadow-xl shadow-amber-500/20 group"
              disabled={withdrawing}
            >
              {withdrawing ? (
                <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ArrowDownCircle className="ml-2 h-5 w-5 group-hover:-translate-y-1 transition-transform" />
                  تأكيد السحب
                </>
              )}
            </Button>
            <Button
              variant="outline"
              onClick={() => setWithdrawalOpen(false)}
              className="flex-1 h-16 rounded-2xl border-2 font-black text-lg tracking-widest uppercase"
              disabled={withdrawing}
            >
              إلغاء
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Dashboard;
