"use client";

import React, { useEffect, useState, useMemo } from "react";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Search,
  Plus,
  Edit,
  Save,
  Trash2,
  ChevronDown,
  ChevronRight,
  AlertTriangle,
  Package,
  Building2,
  X,
  Layers,
  ShieldAlert,
  TrendingUp,
  Boxes,
  Clock,
  SlidersHorizontal,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";

import { supabase } from "../lib/supabase";
import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";
import BatchEntryDialog from "../components/BatchEntryDialog";
import { typesWithUnits } from "../lib/unitOptions";
import { cn } from "@/lib/utils";

/* ─── tiny helpers ─── */
const getExpiryStatus = (expiryDate) => {
  if (!expiryDate) return "none";
  const now = new Date();
  const exp = new Date(expiryDate);
  const daysLeft = Math.ceil((exp - now) / (1000 * 60 * 60 * 24));
  if (daysLeft < 0) return "expired";
  if (daysLeft <= 30) return "critical";
  if (daysLeft <= 90) return "warning";
  return "ok";
};

const ExpiryBadge = ({ expiryDate }) => {
  const status = getExpiryStatus(expiryDate);
  if (status === "none") return <span className="text-xs text-muted-foreground/40 font-bold">—</span>;
  const exp = new Date(expiryDate);
  const daysLeft = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));
  const label = exp.toLocaleDateString("ar-EG", { year: "2-digit", month: "short" });
  const configs = {
    expired: { cls: "bg-destructive/15 text-destructive border-destructive/30", icon: "⚠️" },
    critical: { cls: "bg-orange-500/15 text-orange-600 dark:text-orange-400 border-orange-400/30", icon: "⏰" },
    warning: { cls: "bg-amber-400/15 text-amber-600 dark:text-amber-400 border-amber-400/30", icon: "📅" },
    ok: { cls: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-400/20", icon: "✓" },
  };
  const { cls, icon } = configs[status];
  return (
    <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-lg border text-[10px] font-black whitespace-nowrap", cls)}>
      <span>{icon}</span> {label}
      {status !== "ok" && <span className="opacity-60">({daysLeft}د)</span>}
    </span>
  );
};

const StatCard = ({ icon: Icon, label, value, sub, gradient, iconBg }) => (
  <div className="relative overflow-hidden rounded-3xl border border-white/20 dark:border-white/5 bg-white/50 dark:bg-zinc-900/50 backdrop-blur-xl shadow-lg px-6 py-5 flex items-center gap-4 group hover:shadow-xl transition-all duration-300 hover:-translate-y-0.5">
    <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg", iconBg)}>
      <Icon className="h-5 w-5 text-white" />
    </div>
    <div className="flex-1 min-w-0">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-0.5">{label}</p>
      <p className="text-2xl font-black leading-none" style={{ background: gradient, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{value}</p>
      {sub && <p className="text-[10px] font-semibold text-muted-foreground/60 mt-0.5">{sub}</p>}
    </div>
    <div className="absolute -bottom-4 -left-4 h-20 w-20 rounded-full opacity-5 blur-xl" style={{ background: gradient }} />
  </div>
);

const Stock = () => {
  const [batches, setBatches] = useState([]); // قائمة الدفعات
  const [expandedProducts, setExpandedProducts] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem("stock_expanded_products");
      return saved ? new Set(JSON.parse(saved)) : new Set();
    }
    return new Set();
  }); 

  const [searchTerm, setSearchTerm] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("stock_search_term") || "";
    }
    return "";
  });

  const [searchMode, setSearchMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("stock_search_mode") || "all";
    }
    return "all";
  });

  const [openModal, setOpenModal] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  
  const [inventoryMode, setInventoryMode] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem("stock_inventory_mode") === "true";
    }
    return false;
  });

  const [invoiceDetails, setInvoiceDetails] = useState({ supplier: "", invoiceNumber: "" });
  const [suppliers, setSuppliers] = useState([]);
  const [selectedBatchIds, setSelectedBatchIds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [editingStockProduct, setEditingStockProduct] = useState(null);
  const [batchEntryTarget, setBatchEntryTarget] = useState(null);

  // Sync to localStorage
  useEffect(() => {
    localStorage.setItem("stock_search_term", searchTerm);
    localStorage.setItem("stock_search_mode", searchMode);
    localStorage.setItem("stock_inventory_mode", inventoryMode);
    localStorage.setItem("stock_expanded_products", JSON.stringify(Array.from(expandedProducts)));
  }, [searchTerm, searchMode, inventoryMode, expandedProducts]);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get("/api/suppliers", {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data.success) setSuppliers(res.data.suppliers);
      } catch (err) {
        console.error("Failed to fetch suppliers", err);
      }
    };
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      fetchBatches(searchTerm, searchMode);
    }, 300);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchMode]);

  // Real-time subscription for stock data
  useEffect(() => {
    const stockChannel = supabase
      .channel('stock_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchBatches(searchTerm, searchMode);
      })
      .subscribe();

    return () => {
      supabase.removeChannel(stockChannel);
    };
  }, [searchTerm, searchMode]);

  const [aiMacro, setAiMacro] = useState(null);

  // AI action listener
  useEffect(() => {
    const handleAiAction = (e) => {
      if (e.detail?.type === 'DELETE_PRODUCT') {
        const pName = e.detail.productName;
        // Instead of triggering search implicitly, start aiMacro visual flow
        setAiMacro({ type: 'DELETE_PRODUCT', productName: pName });
      }
    };
    window.addEventListener('ai_action', handleAiAction);
    return () => window.removeEventListener('ai_action', handleAiAction);
  }, []);

  // Visual AI Macro execution
  useEffect(() => {
    if (!aiMacro) return;

    let timer;
    const runMacro = async () => {
      if (aiMacro.type === 'DELETE_PRODUCT') {
        const pName = aiMacro.productName;
        const elSearch = document.getElementById("stock-search-input");
        
        let currentText = "";
        for (let i = 0; i < pName.length; i++) {
          currentText += pName[i];
          if (elSearch) elSearch.value = currentText;
          setSearchTerm(currentText);
          await new Promise(r => setTimeout(r, 60)); // Typing speed simulation
        }

        timer = setTimeout(async () => {
          try {
            const token = Cookies.get("token");
            const res = await axios.get("/api/search", { params: { q: pName }, headers: { Authorization: `Bearer ${token}` } });
            if (res.data?.products?.length > 0) {
              const productId = res.data.products[0]._id;
              setDeleteId({ productId, batchId: null, aiTriggered: true });
            } else {
              toast.error("لم يتم العثور على المنتج لحذفه");
            }
          } catch (err) {
            console.error(err);
          }
          setAiMacro(null); // finish macro
        }, 1000);
      }
    };

    runMacro();
    return () => clearTimeout(timer);
  }, [aiMacro]);

  // جلب الدفعات
  const fetchBatches = async (query = "", mode = "all") => {
    try {
      const token = Cookies.get("token");
      const response = await axios.get("/api/search", {
        params: { ...(query && { q: query }), mode },
        headers: { Authorization: `Bearer ${token}` },
      });
      const batchesList = (response.data.products || []).map((batch) => ({
        ...batch,
        batchId: batch.batchId || batch._id,
        originalQuantity: batch.quantity,
      }));
      setBatches(batchesList);
    } catch (error) {
      console.error("Error fetching batches:", error);
      setBatches([]);
    }
  };

  // تجميع الدفعات حسب المنتج
  const groupedProducts = useMemo(() => {
    const groups = {};
    batches.forEach((batch) => {
      const productId = batch._id;
      if (!groups[productId]) {
        groups[productId] = {
          productId,
          name: batch.name,
          type: batch.type,
          unit: batch.unit,
          company: batch.company,
          batches: [],
          totalQuantity: 0,
          lowestPrice: Infinity,
          highestPrice: 0,
        };
      }
      groups[productId].batches.push(batch);
      groups[productId].totalQuantity += Number(batch.quantity) || 0;
      groups[productId].lowestPrice = Math.min(groups[productId].lowestPrice, batch.price);
      groups[productId].highestPrice = Math.max(groups[productId].highestPrice, batch.price);
    });

    // ترتيب الدفعات داخل كل منتج حسب تاريخ الانتهاء
    Object.values(groups).forEach(group => {
      group.batches.sort((a, b) => {
        const dateA = a.expiryDate ? new Date(a.expiryDate) : new Date(8640000000000000);
        const dateB = b.expiryDate ? new Date(b.expiryDate) : new Date(8640000000000000);
        return dateA - dateB;
      });
    });

    return Object.values(groups);
  }, [batches]);

  // تحديث دفعة معينة
  const updateBatchState = (batchId, changes) => {
    setBatches((prev) =>
      prev.map((batch) => (batch.batchId?.toString() === batchId?.toString() ? { ...batch, ...changes } : batch))
    );
  };

  // فتح/غلق المنتج
  const toggleProduct = (productId) => {
    setExpandedProducts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(productId)) {
        newSet.delete(productId);
      } else {
        newSet.add(productId);
      }
      return newSet;
    });
  };

  // حفظ التعديلات على دفعة
  const handleSaveBatch = async (batch) => {
    if (isNaN(Number(batch.quantity)) || Number(batch.quantity) < 0) {
      toast.warning("الكمية يجب أن تكون 0 أو أكبر");
      return;
    }
    if (isNaN(Number(batch.price)) || Number(batch.price) < 0) {
      toast.warning("سعر البيع غير صالح");
      return;
    }
    if (isNaN(Number(batch.purchasePrice)) || Number(batch.purchasePrice) < 0) {
      toast.warning("سعر الشراء غير صالح");
      return;
    }

    try {
      const token = Cookies.get("token");

      await axios.patch("/api/products", {
        mode: "update_batch",
        batchId: batch.batchId,
        product: {
          _id: batch._id,
          quantity: Number(batch.quantity),
          purchasePrice: Number(batch.purchasePrice),
          sellingPrice: Number(batch.price),
          expiryDate: batch.expiryDate || null,
          invoiceNumber: invoiceDetails.invoiceNumber || batch.invoiceNumber || null,
          supplier: invoiceDetails.supplier || batch.supplier || null,
        },
      }, { headers: { Authorization: `Bearer ${token}` } });

      toast.success("تم التحديث بنجاح ✅");
      fetchBatches(searchTerm, searchMode);
    } catch (error) {
      console.error("Save error:", error);
      toast.error("فشل التحديث ❌");
    }
  };

  // تحديث جماعي للدفعات المختارة
  const handleBulkUpdate = async () => {
    if (selectedBatchIds.length === 0) {
      toast.warning("يرجى اختيار دفعات أولاً");
      return;
    }
    if (!invoiceDetails.supplier && !invoiceDetails.invoiceNumber) {
      toast.warning("يرجى إدخال اسم المورد أو رقم الفاتورة");
      return;
    }

    try {
      const token = Cookies.get("token");
      setLoading(true);

      for (const batchId of selectedBatchIds) {
        const batch = batches.find(b => b.batchId?.toString() === batchId?.toString());
        if (!batch) continue;

        await axios.patch("/api/products", {
          mode: "update_batch",
          batchId: batch.batchId,
          product: {
            _id: batch._id,
            quantity: Number(batch.quantity),
            purchasePrice: Number(batch.purchasePrice),
            sellingPrice: Number(batch.price),
            expiryDate: batch.expiryDate || null,
            invoiceNumber: invoiceDetails.invoiceNumber || null,
            supplier: invoiceDetails.supplier || null,
          },
        }, { headers: { Authorization: `Bearer ${token}` } });
      }

      toast.success(`تم تحديث ${selectedBatchIds.length} دفعات بنجاح ✅`);
      setSelectedBatchIds([]);
      fetchBatches(searchTerm, searchMode);
    } catch (error) {
      toast.error("فشل التحديث الجماعي ❌");
    } finally {
      setLoading(false);
    }
  };

  // حذف دفعة أو منتج كامل
  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const token = Cookies.get("token");
      const { productId, batchId } = deleteId;
      const url = batchId
        ? `/api/products?id=${productId}&batchId=${batchId}`
        : `/api/products?id=${productId}`;

      await axios.delete(url, { headers: { Authorization: `Bearer ${token}` } });
      toast.success("تم الحذف بنجاح ✅");

      fetchBatches(searchTerm, searchMode);
      setDeleteId(null);
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("حدث خطأ أثناء الحذف ❌");
    }
  };

  // 🪄 السحر: يقوم النظام بالموافقة التلقائية على نافذة الحذف 🪄
  useEffect(() => {
    if (deleteId?.aiTriggered) {
      // إشعار سحري
      toast("🪄 جاري تنفيذ الحذف السحري...", { style: { background: "#6366f1", color: "white" } });
      const timer = setTimeout(() => {
        handleDelete();
      }, 1500); // مهلة أطول قليلاً ليرى المستخدم النافذة المنبثقة
      return () => clearTimeout(timer);
    }
  }, [deleteId]);

  /* ── computed stats ── */
  const totalProducts = groupedProducts.length;
  const totalBatches = batches.length;
  const totalQty = batches.reduce((s, p) => s + (Number(p.quantity) || 0), 0);
  const expiringSoon = batches.filter(p => ["critical", "warning"].includes(getExpiryStatus(p.expiryDate))).length;
  const lowStock = batches.filter(p => Number(p.quantity) > 0 && Number(p.quantity) <= 10).length;

  // التحقق من اختيار كل الدفعات في منتج معين
  const areAllBatchesSelected = (productBatches) => {
    const batchIds = productBatches.map(b => b.batchId?.toString());
    return batchIds.length > 0 && batchIds.every(id => selectedBatchIds.includes(id));
  };

  const isAnyBatchSelected = (productBatches) => {
    return productBatches.some(b => selectedBatchIds.includes(b.batchId?.toString()));
  };

  return (
    <div className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-5" dir="rtl">

      {/* ══ HEADER ══ */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 p-5 rounded-[28px] shadow-xl">
        <div className="flex items-center gap-4">
          <div className="h-12 w-12 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg shadow-primary/25 shrink-0">
            <Package className="h-6 w-6" />
          </div>
          <div>
            <h1 className="text-2xl md:text-3xl font-black text-foreground tracking-tight leading-tight">إدارة المخزون</h1>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-0.5">Batch Management</p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {/* Inventory mode toggle */}
          <button
            onClick={() => setInventoryMode(v => !v)}
            className={cn(
              "flex items-center gap-2.5 h-11 px-4 rounded-2xl border-2 font-black text-sm transition-all duration-200",
              inventoryMode
                ? "bg-amber-500/10 border-amber-400/40 text-amber-600 dark:text-amber-400"
                : "border-border/40 bg-muted/20 text-muted-foreground hover:border-primary/30"
            )}
          >
            <SlidersHorizontal className={cn("h-4 w-4 transition-transform", inventoryMode && "rotate-90")} />
            وضع الجرد
            <div className={cn("h-2 w-2 rounded-full transition-colors", inventoryMode ? "bg-amber-400 shadow-[0_0_6px_2px] shadow-amber-400/50" : "bg-muted-foreground/30")} />
          </button>

          <Button
            onClick={() => { setEditingStockProduct(null); setOpenModal(true); }}
            className="h-11 px-6 rounded-2xl premium-gradient text-white font-black shadow-lg shadow-primary/25 hover:scale-[1.03] active:scale-95 transition-all flex items-center gap-2"
          >
            <Plus className="h-5 w-5" />
            منتج جديد
          </Button>
        </div>
      </div>

      {/* ══ STAT CARDS ══ */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Boxes}
          label="إجمالي المنتجات"
          value={totalProducts.toLocaleString("ar-EG")}
          sub="منتج"
          gradient="linear-gradient(135deg, var(--primary), oklch(0.7 0.2 220))"
          iconBg="premium-gradient"
        />
        <StatCard
          icon={TrendingUp}
          label="إجمالي الدفعات"
          value={totalBatches.toLocaleString("ar-EG")}
          sub="دفعة"
          gradient="linear-gradient(135deg, oklch(0.55 0.2 160), oklch(0.65 0.18 190))"
          iconBg="bg-gradient-to-br from-emerald-500 to-teal-600"
        />
        <StatCard
          icon={Clock}
          label="تنتهي قريباً"
          value={expiringSoon.toLocaleString("ar-EG")}
          sub="دفعة"
          gradient="linear-gradient(135deg, oklch(0.65 0.22 60), oklch(0.6 0.2 40))"
          iconBg="bg-gradient-to-br from-amber-500 to-orange-600"
        />
        <StatCard
          icon={ShieldAlert}
          label="مخزون منخفض"
          value={lowStock.toLocaleString("ar-EG")}
          sub="دفعة"
          gradient="linear-gradient(135deg, oklch(0.55 0.25 25), oklch(0.5 0.22 15))"
          iconBg="bg-gradient-to-br from-red-500 to-rose-600"
        />
      </div>

      {/* ══ SEARCH & FILTERS ══ */}
      <div className="flex flex-col md:flex-row gap-3 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 p-4 rounded-[24px] shadow-lg">
        <div className="relative flex-1">
          <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            id="stock-search-input"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="ابحث باسم المنتج، الباركود، أو التصنيف..."
            className="h-11 pr-11 rounded-2xl border-none bg-white/60 dark:bg-zinc-800/40 focus-visible:ring-primary/30 shadow-inner font-semibold placeholder:text-muted-foreground/40 text-sm"
          />
          {searchTerm && (
            <button onClick={() => setSearchTerm("")} className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 rounded-full bg-muted-foreground/20 hover:bg-muted-foreground/30 flex items-center justify-center transition-colors">
              <X className="h-3 w-3" />
            </button>
          )}
        </div>

        <Select value={searchMode} onValueChange={setSearchMode}>
          <SelectTrigger className="w-full md:w-[180px] h-11 rounded-2xl border-border/30 bg-white/50 dark:bg-zinc-800/40 font-black text-sm">
            <SelectValue placeholder="تصفية البحث" />
          </SelectTrigger>
          <SelectContent className="rounded-2xl border-none shadow-2xl glass-morphism">
            <SelectItem value="all" className="font-bold py-3">🗂 عرض الكل</SelectItem>
            <SelectItem value="shortcomings" className="font-bold py-3 text-amber-600">⚠️ النواقص فقط</SelectItem>
          </SelectContent>
        </Select>

        {batches.length > 0 && (
          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-primary/5 border border-primary/20">
            <span className="text-[10px] font-black uppercase tracking-widest text-primary/70">النتائج</span>
            <span className="text-base font-black text-primary">{batches.length} دفعة</span>
          </div>
        )}
      </div>

      {/* ══ MAIN TABLE ══ */}
      <div className="bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 rounded-[28px] shadow-2xl overflow-hidden">

        {/* Table toolbar */}
        {selectedBatchIds.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-b border-primary/10 bg-primary/5 animate-in slide-in-from-top-2">
            <div className="flex items-center gap-2">
              <CheckSquare className="h-4 w-4 text-primary" />
              <span className="text-sm font-black text-primary">{selectedBatchIds.length} دفعة مختارة</span>
            </div>
            <button onClick={() => setSelectedBatchIds([])} className="text-[10px] font-black text-muted-foreground hover:text-destructive transition-colors uppercase tracking-widest flex items-center gap-1">
              <X className="h-3 w-3" /> إلغاء التحديد
            </button>
          </div>
        )}

        <div className="overflow-x-auto">
          <Table className="w-full">
            <TableHeader>
              <TableRow className="hover:bg-transparent border-b border-border/30">
                <TableHead className="w-12 text-center pr-4">
                  {/* Select All checkbox - لاختيار كل الدفعات */}
                  <Checkbox
                    checked={batches.length > 0 && selectedBatchIds.length === batches.length}
                    onCheckedChange={(val) => {
                      if (val) setSelectedBatchIds(batches.map(p => p.batchId?.toString()));
                      else setSelectedBatchIds([]);
                    }}
                    className="h-4 w-4 border-2 border-primary/40 rounded-md"
                  />
                </TableHead>
                <TableHead className="w-10 text-center">
                  <span className="text-[10px] font-black text-muted-foreground/50 uppercase">#</span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">المنتج</span>
                </TableHead>
                <TableHead className="text-right">
                  <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">الوحدة</span>
                </TableHead>
                <TableHead className="text-center">
                  <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">إجمالي الكمية</span>
                </TableHead>
                <TableHead className="text-center hidden md:table-cell">
                  <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">نطاق السعر</span>
                </TableHead>
                <TableHead className="text-center w-28">
                  <span className="text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">إجراءات</span>
                </TableHead>
              </TableRow>
            </TableHeader>

            <TableBody>
              {groupedProducts.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-20">
                    <div className="flex flex-col items-center gap-3 opacity-30 select-none">
                      <Package className="h-16 w-16" />
                      <p className="text-base font-black">لا توجد منتجات</p>
                      <p className="text-xs font-semibold">جرّب البحث بكلمات مختلفة</p>
                    </div>
                  </TableCell>
                </TableRow>
              ) : (
                groupedProducts.map((product, idx) => {
                  const isExpanded = expandedProducts.has(product.productId);
                  const allBatchesSelected = areAllBatchesSelected(product.batches);
                  const anyBatchSelected = isAnyBatchSelected(product.batches);
                  const productIsLow = product.totalQuantity <= 20;

                  return (
                    <React.Fragment key={product.productId}>
                      {/* صف المنتج الرئيسي */}
                      <TableRow
                        className={cn(
                          "border-b border-border/20 transition-all hover:bg-primary/4 cursor-pointer",
                          isExpanded && "bg-primary/5 border-b-primary/20"
                        )}
                        onClick={() => toggleProduct(product.productId)}
                      >
                        <TableCell className="text-center pr-4" onClick={(e) => e.stopPropagation()}>
                          <Checkbox
                            checked={allBatchesSelected}
                            className={cn(
                              "h-4 w-4 border-2 rounded-md",
                              anyBatchSelected && !allBatchesSelected && "bg-primary text-white border-primary"
                            )}
                            onCheckedChange={(val) => {
                              if (val) {
                                const batchIds = product.batches.map(b => b.batchId?.toString());
                                setSelectedBatchIds(prev => [...new Set([...prev, ...batchIds])]);
                              } else {
                                const batchIds = product.batches.map(b => b.batchId?.toString());
                                setSelectedBatchIds(prev => prev.filter(id => !batchIds.includes(id)));
                              }
                            }}
                          />
                        </TableCell>
                        <TableCell className="text-center">
                          <span className="text-[10px] font-black text-muted-foreground/30">{idx + 1}</span>
                        </TableCell>
                        <TableCell className="text-left">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleProduct(product.productId);
                              }}
                              className="p-1 hover:bg-primary/10 rounded-md transition-colors"
                            >
                              {isExpanded ? (
                                <ChevronDown className="h-4 w-4 text-primary" />
                              ) : (
                                <ChevronRight className="h-4 w-4 text-primary" />
                              )}
                            </button>
                            <span className="font-black text-base">{product.name}</span>
                            {productIsLow && (
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger>
                                    <span className="h-2 w-2 rounded-full bg-orange-500 animate-pulse" />
                                  </TooltipTrigger>
                                  <TooltipContent className="text-xs font-bold">إجمالي المخزون منخفض</TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-right">
                          <span className="text-xs font-bold text-muted-foreground/60 px-2.5 py-1 bg-muted/40 rounded-lg">{product.unit}</span>
                        </TableCell>
                        <TableCell className="text-center">
                          <span className={cn(
                            "inline-block px-3 py-1 rounded-xl font-black text-lg leading-tight",
                            productIsLow ? "text-orange-500 bg-orange-500/10" : "text-primary bg-primary/10"
                          )}>
                            {product.totalQuantity}
                          </span>
                        </TableCell>
                        <TableCell className="text-center hidden md:table-cell">
                          {product.lowestPrice === product.highestPrice ? (
                            <span className="font-black text-primary">{product.lowestPrice} ج.م</span>
                          ) : (
                            <span className="font-black text-primary">
                              {product.lowestPrice} - {product.highestPrice} ج.م
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-center" onClick={(e) => e.stopPropagation()}>
                          <div className="flex justify-center gap-2">
                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-xl hover:bg-primary/15 hover:text-primary transition-all"
                                    onClick={() => {
                                      setBatchEntryTarget({ name: product.name, productId: product.productId });
                                    }}
                                  >
                                    <Plus className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-bold rounded-lg">إضافة دفعة جديدة</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>

                            <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button
                                    size="icon"
                                    variant="ghost"
                                    className="h-8 w-8 rounded-xl hover:bg-destructive/15 hover:text-destructive transition-all"
                                    onClick={() => setDeleteId({ productId: product.productId, batchId: null })}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent className="text-xs font-bold rounded-lg">حذف المنتج بالكامل</TooltipContent>
                              </Tooltip>
                            </TooltipProvider>
                          </div>
                        </TableCell>
                      </TableRow>

                      {/* الدفعات الفرعية (تظهر فقط إذا كان المنتج مفتوح) */}
                      {isExpanded && product.batches.map((batch, bIdx) => {
                        const isLow = Number(batch.quantity) > 0 && Number(batch.quantity) <= 10;
                        return (
                          <TableRow key={batch.batchId} className={cn(
                            "border-b border-border/10 transition-all group/batch",
                            "bg-gradient-to-r from-primary/2 to-transparent",
                            selectedBatchIds.includes(batch.batchId?.toString()) && "bg-primary/5"
                          )}>
                            <TableCell className="text-center pr-4">
                              <div className="flex items-center justify-center">
                                <div className="relative">
                                  <div className="absolute -right-6 top-0 w-px h-full bg-primary/15" />
                                  <div className="absolute -right-6 top-1/2 w-5 h-px bg-primary/15" />
                                  <Checkbox
                                    checked={selectedBatchIds.includes(batch.batchId?.toString())}
                                    onCheckedChange={(val) => {
                                      if (val) setSelectedBatchIds(p => [...p, batch.batchId?.toString()]);
                                      else setSelectedBatchIds(p => p.filter(id => id !== batch.batchId?.toString()));
                                    }}
                                    className="h-4 w-4 rounded-md"
                                  />
                                </div>
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <span className="text-[9px] font-black opacity-25">{idx + 1}.{bIdx + 1}</span>
                            </TableCell>
                            <TableCell className="text-left">
                              <div className="flex items-center gap-2 mr-8">
                                <div className="h-6 w-6 rounded-lg bg-primary/8 flex items-center justify-center shrink-0">
                                  <Layers className="h-3 w-3 text-primary/50" />
                                </div>
                                <span className="text-xs font-black text-muted-foreground/60 uppercase tracking-widest">دفعة #{bIdx + 1}</span>
                                {batch.batchNumber && (
                                  <span className="text-[9px] font-mono text-muted-foreground/40">
                                    {batch.batchNumber.slice(-8)}
                                  </span>
                                )}
                                {batch.barcode && (
                                  <span className="text-[9px] font-mono text-muted-foreground/40">
                                    | {batch.barcode}
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-right">
                              <span className="text-xs font-bold opacity-40 px-2 py-0.5 bg-muted/40 rounded-md">{batch.unit}</span>
                            </TableCell>
                            <TableCell className="text-center">
                              <Input
                                type="number"
                                value={batch.quantity}
                                onChange={(e) => updateBatchState(batch.batchId, { quantity: e.target.value })}
                                className={cn(
                                  "h-8 w-20 border-none rounded-lg font-black text-center text-sm mx-auto",
                                  isLow
                                    ? "bg-orange-500/10 text-orange-600 dark:text-orange-400"
                                    : "bg-primary/8 text-primary"
                                )}
                              />
                            </TableCell>
                            <TableCell className="text-center hidden md:table-cell">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-xs text-muted-foreground">شراء:</span>
                                <Input
                                  type="number"
                                  value={batch.purchasePrice}
                                  onChange={(e) => updateBatchState(batch.batchId, { purchasePrice: e.target.value })}
                                  className="h-8 w-20 border-none bg-muted/30 rounded-lg font-bold text-center text-xs"
                                />
                                <span className="text-xs text-muted-foreground">بيع:</span>
                                <Input
                                  type="number"
                                  value={batch.price}
                                  onChange={(e) => updateBatchState(batch.batchId, { price: e.target.value })}
                                  className="h-8 w-20 border-none bg-emerald-500/8 text-emerald-600 dark:text-emerald-400 rounded-lg font-black text-center text-xs"
                                />
                              </div>
                            </TableCell>
                            <TableCell className="text-center">
                              <div className="flex justify-center gap-1">
                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost"
                                        onClick={() => handleSaveBatch(batch)}
                                        className="h-7 w-7 rounded-lg hover:bg-emerald-500/15 hover:text-emerald-500 transition-all">
                                        <Save className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs font-bold rounded-lg">حفظ</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <TooltipProvider>
                                  <Tooltip>
                                    <TooltipTrigger asChild>
                                      <Button size="icon" variant="ghost"
                                        onClick={() => setDeleteId({ productId: batch._id, batchId: batch.batchId })}
                                        className="h-7 w-7 rounded-lg hover:bg-destructive/15 hover:text-destructive transition-all">
                                        <Trash2 className="h-3 w-3" />
                                      </Button>
                                    </TooltipTrigger>
                                    <TooltipContent className="text-xs font-bold rounded-lg">حذف الدفعة</TooltipContent>
                                  </Tooltip>
                                </TooltipProvider>

                                <ExpiryBadge expiryDate={batch.expiryDate} />
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </React.Fragment>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>

        {/* table footer */}
        {batches.length > 0 && (
          <div className="flex items-center justify-between px-6 py-3 border-t border-border/20 bg-muted/10">
            <span className="text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">
              {totalProducts} منتج · {totalBatches} دفعة · {totalQty} وحدة إجمالاً
            </span>
            {inventoryMode && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/30 text-[10px] font-black text-amber-600 dark:text-amber-400">
                <SlidersHorizontal className="h-2.5 w-2.5" /> وضع الجرد نشط
              </span>
            )}
          </div>
        )}
      </div>

      {/* ══ DELETE DIALOG ══ */}
      <Dialog open={!!deleteId} onOpenChange={(val) => !val && setDeleteId(null)}>
        <DialogContent className="max-w-sm p-0 border-none overflow-hidden rounded-[28px] shadow-2xl" dir="rtl">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-destructive to-rose-400" />
          <div className="p-8 flex flex-col items-center gap-5 text-center">
            <div className="h-16 w-16 rounded-2xl bg-destructive/10 border-2 border-destructive/20 flex items-center justify-center text-destructive animate-in zoom-in-75 duration-300">
              <AlertTriangle className="h-8 w-8" />
            </div>
            <div>
              <h2 className="text-xl font-black text-destructive tracking-tight">تأكيد الحذف</h2>
              <p className="text-sm font-semibold text-muted-foreground/70 mt-2 leading-relaxed">
                {deleteId?.batchId
                  ? <>هل أنت متأكد من حذف هذه الدفعة؟</>
                  : <>هل أنت متأكد من حذف هذا المنتج وجميع دفعاته؟</>
                }
                <br />
                <span className="text-destructive/60 font-black text-xs">لا يمكن التراجع عن هذا الإجراء</span>
              </p>
            </div>
            <div className="flex gap-3 w-full">
              <Button
                onClick={handleDelete}
                className="flex-1 h-12 rounded-2xl bg-destructive hover:bg-destructive/90 text-white font-black shadow-lg shadow-destructive/20 transition-all hover:scale-[1.02]"
              >
                حذف نهائي
              </Button>
              <Button
                variant="outline"
                onClick={() => setDeleteId(null)}
                className="flex-1 h-12 rounded-2xl border-2 font-black transition-all hover:scale-[1.02]"
              >
                إلغاء
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ══ MODALS ══ */}
      <CreateProductForm
        openModal={openModal}
        setOpenModal={setOpenModal}
        editingStockProduct={editingStockProduct}
        setEditingStockProduct={setEditingStockProduct}
        onSuccess={() => fetchBatches(searchTerm, searchMode)}
      />

      <BarcodeScanner
        onScan={(scannedBarcode) => {
          setSearchTerm(scannedBarcode);
          fetchBatches(scannedBarcode, searchMode);
        }}
      />

      {/* ══ BATCH ENTRY DIALOG ══ */}
      {batchEntryTarget && (
        <BatchEntryDialog
          open={!!batchEntryTarget}
          onClose={() => setBatchEntryTarget(null)}
          productName={batchEntryTarget.name}
          productId={batchEntryTarget.productId}
          suppliers={suppliers}
          onSuccess={() => fetchBatches(searchTerm, searchMode)}
        />
      )}

      {/* ══ BULK ACTION BAR ══ */}
      <div className={cn(
        "fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] w-auto min-w-[300px] md:min-w-[720px] transition-all duration-500 ease-out",
        selectedBatchIds.length > 0
          ? "translate-y-0 opacity-100 scale-100"
          : "translate-y-28 opacity-0 scale-95 pointer-events-none"
      )}>
        <div className="bg-zinc-950 dark:bg-black text-white p-3 rounded-[24px] shadow-[0_25px_60px_-15px_rgba(0,0,0,0.6)] border border-white/8 flex flex-col md:flex-row items-center gap-3">

          {/* Count badge */}
          <div className="flex items-center gap-3 bg-white/8 px-4 py-2.5 rounded-2xl shrink-0">
            <div className="h-9 w-9 rounded-xl premium-gradient flex items-center justify-center font-black text-lg shadow-lg shadow-primary/40 leading-none">
              {selectedBatchIds.length}
            </div>
            <div className="text-right">
              <div className="text-[9px] font-black uppercase text-white/40 tracking-widest">SELECTED</div>
              <div className="text-sm font-black text-white/90">دفعة مختارة</div>
            </div>
          </div>

          {/* Invoice inputs */}
          <div className="flex-1 flex flex-col md:flex-row gap-2 w-full">
            <Select
              value={invoiceDetails.supplier}
              onValueChange={(val) => setInvoiceDetails(prev => ({ ...prev, supplier: val }))}
            >
              <SelectTrigger className="h-10 rounded-xl bg-white/6 border-white/10 text-white font-bold text-sm flex-1 min-w-[160px]">
                <SelectValue placeholder="اختيار المورد" />
              </SelectTrigger>
              <SelectContent className="bg-zinc-900 border-white/10 rounded-xl text-white">
                {suppliers.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
              </SelectContent>
            </Select>

            <Input
              placeholder="رقم الفاتورة"
              value={invoiceDetails.invoiceNumber}
              onChange={(e) => setInvoiceDetails(prev => ({ ...prev, invoiceNumber: e.target.value }))}
              className="h-10 rounded-xl bg-white/6 border-white/10 text-white font-bold placeholder:text-white/20 flex-1"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Button
              onClick={handleBulkUpdate}
              disabled={loading || (!invoiceDetails.supplier && !invoiceDetails.invoiceNumber)}
              className="h-10 px-5 rounded-xl premium-gradient text-white font-black shadow-lg shadow-primary/30 hover:scale-105 active:scale-95 transition-all text-sm disabled:opacity-40"
            >
              {loading ? "جاري..." : "تحديث الكل"}
            </Button>
            <button
              onClick={() => setSelectedBatchIds([])}
              className="h-10 w-10 rounded-xl hover:bg-white/10 text-white/40 hover:text-white transition-all flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Stock;