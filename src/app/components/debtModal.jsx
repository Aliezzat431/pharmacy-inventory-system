"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { CreditCard, UserPlus, Calculator, X, Building2, Wallet } from "lucide-react";
import axios from "axios";
import Cookies from "js-cookie";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function DebtModal({ items, total, showDebt, setShowDebt, handleReset }) {
  const [debtors, setDebtors] = useState([]);
  const [selectedDebtor, setSelectedDebtor] = useState("");
  const [newDebtor, setNewDebtor] = useState("");
  const [partialPayment, setPartialPayment] = useState(0);

  useEffect(() => {
    if (showDebt) {
      axios
        .get("/api/debt", {
          headers: {
            Authorization: `Bearer ${Cookies.get("token")}`,
          },
        })
        .then((res) => setDebtors(res.data))
        .catch((err) => {
          console.error("Failed to fetch debtors", err);
          toast.error("فشل في تحميل قائمة العملاء ❌");
        });
    }
  }, [showDebt]);

  const handleDebtSubmit = async () => {
    const name = selectedDebtor === "__new__" ? newDebtor.trim() : selectedDebtor;

    if (!name) {
      toast.warning("يرجى اختيار اسم العميل أو إدخال اسم جديد");
      return;
    }

    if (partialPayment < 0 || isNaN(partialPayment)) {
      toast.warning("يرجى إدخال مبلغ دفع صحيح");
      return;
    }

    try {
      const response = await axios.post(
        "/api/debt",
        { name, orders: items, partialPayment },
        {
          headers: {
            Authorization: `Bearer ${Cookies.get("token")}`,
          },
        }
      );

      if (!response.data.success) {
        toast.error(response.data.error || "فشل تسجيل الدين ❌");
        return;
      }

      toast.success("تم تسجيل الدين بنجاح ✅");
      setShowDebt(false);
      handleReset();
    } catch (error) {
      console.error("Debt submission error:", error);
      toast.error("حدث خطأ أثناء تسجيل الدين ❌");
    }
  };

  return (
    <Dialog open={showDebt} onOpenChange={setShowDebt}>
      <DialogContent className="max-w-md p-0 border-none overflow-hidden rounded-[32px] glass-morphism shadow-2xl" dir="rtl">
        <div className="absolute top-0 left-0 right-0 h-1 premium-gradient" />

        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-black text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <CreditCard className="h-5 w-5" />
            </div>
            تسجيل كدين
          </DialogTitle>
        </DialogHeader>

        <div className="px-8 pb-8 space-y-6">
          <div className="p-6 rounded-2xl bg-primary/5 border border-primary/20 flex flex-col items-center justify-center space-y-2 group transition-all hover:bg-primary/10">
            <Calculator className="h-6 w-6 text-primary opacity-50 group-hover:scale-110 transition-transform" />
            <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Total Invoice Amount</div>
            <div className="text-3xl font-black text-primary tracking-tight">
              {total.toFixed(2)} <span className="text-sm font-bold">جنيه</span>
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Building2 className="h-3.5 w-3.5 text-primary" />
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">اسم العميل</Label>
              </div>
              <Select value={selectedDebtor} onValueChange={setSelectedDebtor}>
                <SelectTrigger className="h-12 font-bold rounded-xl bg-muted/20 border-border/50 focus:border-primary transition-all">
                  <SelectValue placeholder="اختر اسم العميل..." />
                </SelectTrigger>
                <SelectContent className="glass-morphism rounded-xl">
                  {debtors.map((d) => (
                    <SelectItem key={d._id} value={d.name} className="font-bold">{d.name}</SelectItem>
                  ))}
                  <SelectItem value="__new__" className="text-primary font-black">➕ إضافة عميل جديد</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {selectedDebtor === "__new__" && (
              <div className="space-y-2 animate-in slide-in-from-top-2">
                <div className="flex items-center gap-2 mb-1">
                  <UserPlus className="h-3.5 w-3.5 text-primary" />
                  <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">العميل الجديد</Label>
                </div>
                <Input
                  placeholder="اكتب اسم العميل الجديد..."
                  value={newDebtor}
                  onChange={(e) => setNewDebtor(e.target.value)}
                  className="h-12 font-bold rounded-xl bg-muted/20 border-border/50"
                />
              </div>
            )}

            <div className="space-y-2">
              <div className="flex items-center gap-2 mb-1">
                <Wallet className="h-3.5 w-3.5 text-primary" />
                <Label className="text-[10px] font-black uppercase tracking-widest opacity-70">المبلغ المدفوع (اختياري)</Label>
              </div>
              <Input
                type="number"
                placeholder="0.00"
                value={partialPayment}
                onChange={(e) => setPartialPayment(Number(e.target.value))}
                className="h-12 font-bold rounded-xl bg-muted/20 border-border/50 text-emerald-600"
              />
            </div>
          </div>

          <Button
            onClick={handleDebtSubmit}
            className="w-full h-14 rounded-2xl premium-gradient font-black tracking-widest uppercase shadow-xl shadow-primary/20 text-lg group"
          >
            تأكيد تسجيل الدين
            <CreditCard className="mr-3 h-5 w-5 group-hover:scale-110 transition-transform" />
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
