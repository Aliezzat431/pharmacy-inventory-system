"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import {
  ShoppingCart,
  Package,
  Undo2,
  ReceiptText,
  PlusCircle,
  Users,
  Truck,
  Sparkles,
  AlertTriangle,
  BarChart3,
  UserCog,
  History,
  Clock,
  Settings,
  BookOpen,
  BadgeDollarSign
} from "lucide-react";
import { useSelector } from "react-redux";

const links = [
  { href: "/", label: "كاشير المبيعات", icon: ShoppingCart },
  { href: "/stock", label: "إدارة المخزون", icon: Package },
  { href: "/returns", label: "مرتجع مبيعات", icon: Undo2 },
  { href: "/invoices", label: "الفواتير", icon: ReceiptText },
  { href: "/restock", label: "إضافة رصيد (نواقص)", icon: PlusCircle },
  { href: "/debtors", label: "حسابات العملاء", icon: Users },
  { href: "/companies", label: "شركات الأدوية والموردين", icon: Truck },
  { href: "/chat", label: "شات الذكاء الاصطناعي", icon: Sparkles },
  { href: "/inventory-report", label: "النواقص والمنتهية الصلاحية", icon: AlertTriangle },
  { href: "/dashboard", label: "تقارير الأرباح", roles: ["master"], icon: BarChart3 },
  { href: "/employees", label: "سجل الموظفين", roles: ["master"], icon: UserCog },
  { href: "/payroll", label: "المرتبات", roles: ["master"], icon: BadgeDollarSign },
  { href: "/activities", label: "سجل النشاطات", roles: ["master"], icon: History },
  { href: "/sessions", label: "جلسات العمل", roles: ["master"], icon: Clock },
  { href: "/settings", label: "الإعدادات", icon: Settings },
  { href: "/documentation", label: "دليل الإستخدام", icon: BookOpen },
];

export default function NewTabPage() {
  const { user } = useSelector((state) => state.auth);

  const displayLinks = React.useMemo(() => {
    return links.filter((l) => !l.roles || l.roles.includes(user?.role));
  }, [user]);

  return (
    <div className="max-w-7xl mx-auto p-8" dir="rtl">
      <div className="flex flex-col items-center justify-center mb-12 mt-12">
        <h1 className="text-4xl font-black text-primary mb-4 tracking-tighter">الصفحة الرئيسية</h1>
        <p className="text-muted-foreground font-bold">ماذا تريد أن تفعل اليوم؟ اختر من الروابط السريعة أدناه</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {displayLinks.map((link) => {
          const Icon = link.icon;
          return (
            <div key={link.href} onClick={() => window.navigateToTab && window.navigateToTab(link.href)}>
              <Card className="glass-morphism group h-full flex flex-col items-center justify-center p-8 gap-4 hover:bg-primary/5 hover:border-primary/20 transition-all cursor-pointer shadow-sm hover:shadow-lg rounded-3xl">
                <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                  <Icon className="h-8 w-8" />
                </div>
                <h3 className="font-black text-center text-sm md:text-base group-hover:text-primary transition-colors">{link.label}</h3>
              </Card>
            </div>
          );
        })}
      </div>
    </div>
  );
}
