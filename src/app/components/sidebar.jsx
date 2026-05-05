"use client";

import React from "react";
import {
  LogOut,
  Moon,
  Sun,
  ShoppingCart,
  Undo2,
  Users,
  Truck,
  PlusCircle,
  Package,
  AlertTriangle,
  BarChart3,
  UserCog,
  History,
  Clock,
  Settings,
  BookOpen,
  BadgeDollarSign,
  ReceiptText,
  Menu,
} from "lucide-react";

import { useDispatch, useSelector } from "react-redux";
import { usePathname } from "next/navigation";

import { toggleDarkMode } from "../../lib/redux/slices/uiSlice";
import { logoutUser } from "../../lib/redux/slices/authSlice";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const tabColors = {
  emerald: {
    active:
      "bg-gradient-to-tr from-emerald-500 to-teal-400 shadow-emerald-500/40",
    hover: "hover:bg-emerald-500/10 hover:text-emerald-600",
  },

  blue: {
    active:
      "bg-gradient-to-tr from-blue-600 to-indigo-400 shadow-blue-500/40",
    hover: "hover:bg-blue-500/10 hover:text-blue-600",
  },

  violet: {
    active:
      "bg-gradient-to-tr from-violet-600 to-fuchsia-400 shadow-violet-500/40",
    hover: "hover:bg-violet-500/10 hover:text-violet-600",
  },
};

const navigation = [
  {
    id: "daily",
    label: "العمليات",
    icon: ShoppingCart,
    color: "emerald",

    links: [
      {
        href: "/",
        label: "كاشير المبيعات",
        icon: ShoppingCart,
      },

      {
        href: "/stock",
        label: "إدارة المخزون",
        icon: Package,
      },

      {
        href: "/returns",
        label: "مرتجع مبيعات",
        icon: Undo2,
      },

      {
        href: "/invoices",
        label: "الفواتير",
        icon: ReceiptText,
      },

      {
        href: "/restock",
        label: "إضافة رصيد",
        icon: PlusCircle,
      },

      {
        href: "/debtors",
        label: "حسابات العملاء",
        icon: Users,
      },
    ],
  },

  {
    id: "management",
    label: "الإدارة",
    icon: UserCog,
    color: "blue",

    links: [
      {
        href: "/companies",
        label: "الموردين",
        icon: Truck,
      },

      {
        href: "/employees",
        label: "الموظفين",
        icon: UserCog,
        roles: ["master"],
      },

      {
        href: "/payroll",
        label: "المرتبات",
        icon: BadgeDollarSign,
        roles: ["master"],
      },
    ],
  },

  {
    id: "reports",
    label: "التقارير",
    icon: BarChart3,
    color: "violet",

    links: [
      {
        href: "/inventory-report",
        label: "النواقص والانتهاء",
        icon: AlertTriangle,
      },

      {
        href: "/dashboard",
        label: "تقارير الأرباح",
        icon: BarChart3,
        roles: ["master"],
      },

      {
        href: "/activities",
        label: "سجل النشاطات",
        icon: History,
        roles: ["master"],
      },

      {
        href: "/sessions",
        label: "جلسات العمل",
        icon: Clock,
        roles: ["master"],
      },

      {
        href: "/settings",
        label: "الإعدادات",
        icon: Settings,
      },

      {
        href: "/documentation",
        label: "دليل الاستخدام",
        icon: BookOpen,
      },
    ],
  },
];

const Sidebar = ({ onNavigate }) => {
  const pathname = usePathname();

  const dispatch = useDispatch();

  const darkMode = useSelector((state) => state.ui.darkMode);

  const { user } = useSelector((state) => state.auth);

  const [open, setOpen] = React.useState(true);

  const [activeTab, setActiveTab] = React.useState("daily");

  React.useEffect(() => {
    const foundTab = navigation.find((tab) =>
      tab.links.some((link) => link.href === pathname)
    );

    if (foundTab) {
      setActiveTab(foundTab.id);
    }
  }, [pathname]);

  const activeCategory = React.useMemo(() => {
    return navigation.find((tab) => tab.id === activeTab);
  }, [activeTab]);

  const displayLinks = React.useMemo(() => {
    return (
      activeCategory?.links.filter(
        (link) => !link.roles || link.roles.includes(user?.role)
      ) || []
    );
  }, [activeCategory, user]);

  const handleLogout = async () => {
    await dispatch(logoutUser());

    localStorage.removeItem("token");

    window.location.reload();
  };

  return (
    <>
      {/* Mobile Toggle */}
      <Button
        variant="outline"
        size="icon"
        onClick={() => setOpen(!open)}
        className="fixed top-4 left-4 z-[100] md:hidden glass-morphism"
      >
        <Menu className="h-5 w-5" />
      </Button>

      {/* Sidebar */}
      <aside
        className={cn(
          "sticky top-0 h-screen border-l glass-morphism transition-all duration-500 ease-in-out",
          open ? "w-80 opacity-100" : "w-0 overflow-hidden p-0 opacity-0"
        )}
        style={{
          borderRadius: "32px 0 0 32px",
        }}
      >
        <div className="flex h-full flex-col px-5 py-6">
          {/* Tabs */}
          <div className="relative mb-8 flex gap-1 rounded-[26px] border border-white/30 bg-white/40 p-1.5 shadow-inner backdrop-blur-2xl dark:border-zinc-800 dark:bg-zinc-900/40">
            {navigation.map((tab) => {
              const Icon = tab.icon;

              const active = activeTab === tab.id;

              const colors = tabColors[tab.color];

              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "relative z-10 flex flex-1 flex-col items-center justify-center rounded-[22px] py-3 transition-all duration-300",
                    active
                      ? "scale-105 text-white"
                      : `text-muted-foreground ${colors.hover}`
                  )}
                >
                  {active && (
                    <div
                      className={cn(
                        "absolute inset-0 -z-10 rounded-[22px] shadow-lg",
                        colors.active
                      )}
                    />
                  )}

                  <Icon
                    className={cn(
                      "mb-1.5 h-5 w-5 transition-transform duration-300",
                      active && "scale-110"
                    )}
                  />

                  <span className="text-[10px] font-black tracking-widest">
                    {tab.label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Navigation Links */}
          <div className="custom-scrollbar flex-1 space-y-1 overflow-y-auto pr-1">
            {displayLinks.map((link) => {
              const active = pathname === link.href;

              const Icon = link.icon;

              return (
                <button
                  key={link.href}
                  onClick={() => onNavigate?.(link.href)}
                  className={cn(
                    "group relative flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-right transition-all duration-300",
                    active
                      ? "translate-x-1 bg-primary text-primary-foreground shadow-lg shadow-primary/20"
                      : "text-foreground/70 hover:translate-x-1 hover:bg-primary/10 hover:text-primary"
                  )}
                >
                  <div
                    className={cn(
                      "flex items-center justify-center rounded-xl p-2",
                      active
                        ? "bg-white/20"
                        : "bg-muted group-hover:bg-primary/10"
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </div>

                  <span className="text-xs font-bold tracking-tight">
                    {link.label}
                  </span>

                  {active && (
                    <div className="absolute right-3 h-1.5 w-1.5 animate-pulse rounded-full bg-primary-foreground shadow-[0_0_8px_white]" />
                  )}
                </button>
              );
            })}
          </div>

          {/* User Card */}
          <div className="mt-6 border-t pt-4">
            <div className="rounded-3xl border border-border/50 bg-muted/40 p-4 backdrop-blur-sm transition-all duration-300 hover:bg-muted/60">
              <div className="mb-4 flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-lg font-black text-primary-foreground shadow-xl shadow-primary/30">
                  {user?.username?.[0]?.toUpperCase() || "G"}
                </div>

                <div className="flex-1 overflow-hidden">
                  <h4 className="truncate text-sm font-black uppercase tracking-tight">
                    {user?.username || "Guest"}
                  </h4>

                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {user?.role === "master"
                      ? "مدير النظام"
                      : "صيدلي"}
                  </p>
                </div>
              </div>

              <div className="flex gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  className="h-10 flex-1 rounded-xl shadow-sm"
                  onClick={() => dispatch(toggleDarkMode())}
                >
                  {darkMode ? (
                    <Sun className="h-4 w-4 text-yellow-500" />
                  ) : (
                    <Moon className="h-4 w-4 text-slate-700" />
                  )}
                </Button>

                <Button
                  variant="destructive"
                  size="sm"
                  className="h-10 flex-1 rounded-xl shadow-sm"
                  onClick={handleLogout}
                >
                  <LogOut className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;