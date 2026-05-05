"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
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
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  Loader2,
  Globe,
  Plus,
  Save,
  Edit2,
  Trash2,
  ScanBarcode,
  Sparkles,
  Calendar,
  Building2,
  Receipt,
  PackageSearch,
  Tag,
  DollarSign,
  Hash,
  Boxes,
  FlaskConical,
  ArrowRight,
  CheckCircle2,
  X,
  Layers,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import BarcodeScanner from "./BarcodeScanner";
import { typesWithUnits, treatmentTypes } from "../lib/unitOptions";
import { useInternetSearch } from "../hooks/useInternetSearch";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";

/* ─────────────────────────── tiny helpers ─────────────────────────── */

const FieldWrapper = ({ label, icon: Icon, error, children, className }) => (
  <div className={cn("space-y-1.5", className)}>
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
      {Icon && <Icon className="h-3 w-3 text-primary/70" />}
      {label}
    </label>
    {children}
    {error && (
      <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
        <X className="h-2.5 w-2.5" /> {error}
      </p>
    )}
  </div>
);

const SectionDivider = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-3 py-1">
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm">
      <Icon className="h-3.5 w-3.5 text-primary" />
      <span className="text-[10px] font-black text-primary uppercase tracking-widest">{label}</span>
    </div>
    <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
  </div>
);

/* ─────────────────────────── main component ─────────────────────────── */

const CreateProductForm = ({
  openModal,
  setOpenModal,
  editingStockProduct,
  setEditingStockProduct,
  onSuccess,
}) => {
  const [form, setForm] = useState({
    name: "",
    type: "",
    purchasePrice: "",
    salePrice: "",
    quantity: "",
    barcode: "",
    expiryDate: "",
    unitConversion: "",
    unit: "",
    details: "",
    supplier: "",
    invoiceNumber: "",
  });

  const [companies, setCompanies] = useState([]);
  const [creationMode, setCreationMode] = useState("invoice");
  const [automise, setAutomise] = useState(true);
  const [productList, setProductList] = useState([]);
  const [editingIndex, setEditingIndex] = useState(null);
  const [selectedCompany, setSelectedCompany] = useState("");
  const [aiSuggestion, setAiSuggestion] = useState(null);
  const [checkingAi, setCheckingAi] = useState(false);
  const [validationErrors, setValidationErrors] = useState({});

  const { results: webResults, loading: webLoading, searchInternet, clearResults } =
    useInternetSearch();

  /* ── effects ── */
  useEffect(() => {
    if (editingStockProduct && openModal) {
      setForm({
        name: editingStockProduct.name || "",
        type: editingStockProduct.type || "",
        purchasePrice: editingStockProduct.purchasePrice || "",
        salePrice: editingStockProduct.price || "",
        quantity: editingStockProduct.quantity || "",
        barcode: editingStockProduct.barcode || "",
        expiryDate: editingStockProduct.expiryDate
          ? editingStockProduct.expiryDate.split("T")[0]
          : "",
        unitConversion: editingStockProduct.conversion || "",
        unit: editingStockProduct.unit || "",
        details: editingStockProduct.details || "",
        supplier: editingStockProduct.supplier || "",
        invoiceNumber: editingStockProduct.invoiceNumber || "",
      });
      setCreationMode(editingStockProduct.supplier ? "invoice" : "manual");
      if (editingStockProduct.company) setSelectedCompany(editingStockProduct.company);
    } else if (!openModal) {
      resetForm();
    }
  }, [editingStockProduct, openModal]);

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get("/api/companies", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setCompanies(res.data);
      } catch (err) {
        console.error("Failed to fetch companies:", err);
      }
    };
    fetchCompanies();
  }, []);

  /* ── helpers ── */
  const resetForm = (keepContext = false) => {
    setEditingIndex(null);
    setEditingStockProduct?.(null);
    setForm({
      name: "",
      type: "",
      purchasePrice: "",
      salePrice: "",
      quantity: "",
      barcode: "",
      expiryDate: "",
      unitConversion: "",
      unit: "",
      details: "",
      supplier: keepContext ? form.supplier : "",
      invoiceNumber: keepContext ? form.invoiceNumber : "",
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((prev) => ({ ...prev, [name]: value }));
  };

  /* ── companies ── */
  const handleCreateCompany = async (name) => {
    if (!name.trim()) return;
    try {
      const token = Cookies.get("token");
      const res = await axios.post(
        "/api/companies",
        { name: name.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setCompanies((prev) => [...prev, res.data]);
      setSelectedCompany(res.data.name);
      toast.success(`تمت إضافة شركة ${name} بنجاح`);
    } catch {
      toast.error("فشل إنشاء الشركة");
    }
  };

  const checkCompanyWithAI = async (name) => {
    if (!name || name.trim().length < 2) return;
    setCheckingAi(true);
    setAiSuggestion(null);
    try {
      const token = Cookies.get("token");
      const res = await axios.post(
        "/api/ai/company-suggestions",
        { companyName: name.trim() },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      if (res.data.isDuplicate && res.data.existingName !== name.trim()) {
        setAiSuggestion(res.data);
      }
    } catch {
      console.error("AI check failed");
    } finally {
      setCheckingAi(false);
    }
  };

  /* ── barcode ── */
  const handleBarcodeScan = (scanned) => {
    setForm((prev) => ({ ...prev, barcode: scanned }));
    toast.success("تم مسح الباركود بنجاح 📸");
  };

  /* ── web results ── */
  const normalizeName = (name) => {
    if (!name) return "";
    let n = name
      .toLowerCase()
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.,]/g, "")
      .replace(
        /\b(limited|ltd|inc|corporation|corp|co|company|pharmaceuticals|pharma|pharmaceutical|industries|group)\b/gi,
        ""
      )
      .trim();
    const aliases = {
      glaxosmithkline: "gsk",
      "sanofi aventis": "sanofi",
      "medical union": "mup",
      "amoun pharmaceutical": "amoun",
      "global napi": "global napi",
      eva: "eva",
      pharaohs: "pharaohs",
      "european egyptian": "european egyptian",
      "alexandria pharmaceutical": "alexandria",
      "misr pharmaceutical": "misr",
      "cid pharmaceutical": "cid",
      "arab drug": "adco",
      "arab drug company": "adco",
      "memphis pharmaceutical": "memphis",
      "nile pharmaceutical": "nile",
    };
    if (aliases[n]) return aliases[n];
    for (const [full, short] of Object.entries(aliases)) {
      if (n.startsWith(full) || n.includes(full)) return short;
    }
    return n;
  };

  const selectWebResult = async (item) => {
    setForm((prev) => {
      const isValidType = item.type && Object.keys(typesWithUnits).includes(item.type);
      return {
        ...prev,
        name: item.name,
        type: automise && isValidType ? item.type : prev.type,
        details: automise ? item.details || "" : prev.details,
        unitConversion: "",
        purchasePrice: item.purchasePrice || prev.purchasePrice,
        salePrice: item.salePrice || prev.salePrice,
      };
    });
    if (item.company && automise) {
      const normalizedTarget = normalizeName(item.company);
      const existing = companies.find((c) => normalizeName(c.name) === normalizedTarget);
      if (existing) setSelectedCompany(existing.name);
      else await handleCreateCompany(item.company);
    }
    clearResults();
    toast.success("تم تطبيق البيانات المقترحة ✨");
  };

  /* ── product list operations ── */
  const handleAddToList = () => {
    let finalCompany = creationMode === "invoice" ? form.supplier : selectedCompany;
    if (!finalCompany) {
      toast.warning(
        creationMode === "invoice" ? "يرجى إدخال اسم المورد" : "يرجى اختيار الشركة المصنعة"
      );
      return;
    }
    const errors = {};
    if (!form.name.trim()) errors.name = "يرجى إدخال اسم الدواء";
    if (!form.type) errors.type = "يرجى اختيار نوع الدواء";
    if (!form.barcode.trim()) errors.barcode = "يرجى إدخال الباركود";
    if (form.purchasePrice === "" || parseFloat(form.purchasePrice) < 0)
      errors.purchasePrice = "سعر الشراء غير صالح";
    if (form.salePrice === "" || parseFloat(form.salePrice) <= 0)
      errors.salePrice = "سعر البيع يجب أن يكون أكبر من صفر";
    if (form.quantity === "" || parseFloat(form.quantity) <= 0)
      errors.quantity = "الكمية يجب أن تكون أكبر من صفر";
    const activeType = treatmentTypes.find((t) => t.name === form.type);
    if (
      activeType?.hasConversion &&
      (!form.unitConversion || parseFloat(form.unitConversion) <= 0)
    )
      errors.unitConversion = "يرجى إدخال معامل التحويل";
    if (form.expiryDate) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (new Date(form.expiryDate) < today)
        errors.expiryDate = "تاريخ الانتهاء لا يمكن أن يكون في الماضي";
    }
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      toast.warning("يرجى تصحيح الأخطاء الموضحة");
      return;
    }
    setValidationErrors({});
    const newProduct = {
      ...form,
      name: form.name.trim(),
      purchasePrice: parseFloat(form.purchasePrice),
      salePrice: parseFloat(form.salePrice),
      quantity: parseFloat(form.quantity),
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      unitConversion: activeType?.hasConversion ? parseFloat(form.unitConversion) : null,
      company: finalCompany,
      supplier: form.supplier,
      invoiceNumber: form.invoiceNumber,
    };
    setProductList((prev) => [...prev, newProduct]);
    resetForm(true);
    clearResults();
    toast.success("تمت إضافة المنتج للقائمة 📝");
  };

  const handleEdit = (index) => {
    const p = productList[index];
    setForm({ ...p, expiryDate: p.expiryDate ? p.expiryDate.split("T")[0] : "" });
    setEditingIndex(index);
    clearResults();
  };

  const cancelEdit = () => {
    setEditingIndex(null);
    setForm((prev) => ({
      name: "",
      type: "",
      purchasePrice: "",
      salePrice: "",
      quantity: "",
      barcode: "",
      expiryDate: "",
      unitConversion: "",
      unit: "",
      details: "",
      supplier: prev.supplier,
      invoiceNumber: prev.invoiceNumber,
    }));
  };

  const handleUpdateListItem = () => {
    if (editingIndex === null) return;
    if (!form.name.trim() || !form.type.trim() || !form.barcode.trim()) {
      toast.warning("يرجى تعبئة الحقول الأساسية");
      return;
    }
    const updatedList = [...productList];
    updatedList[editingIndex] = {
      ...form,
      purchasePrice: parseFloat(form.purchasePrice),
      salePrice: parseFloat(form.salePrice),
      quantity: parseFloat(form.quantity),
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      unitConversion: treatmentTypes.find((t) => t.name === form.type)?.hasConversion
        ? parseFloat(form.unitConversion)
        : null,
      company: creationMode === "invoice" ? form.supplier : selectedCompany,
    };
    setProductList(updatedList);
    cancelEdit();
    toast.success("تم تحديث المنتج في القائمة ✅");
  };

  const handleDirectUpdate = async () => {
    try {
      const token = Cookies.get("token");
      await axios.patch(
        "/api/products",
        {
          mode: "update",
          product: {
            ...editingStockProduct,
            ...form,
            name: form.name.trim(),
            purchasePrice: parseFloat(form.purchasePrice),
            price: parseFloat(form.salePrice),
            quantity: parseFloat(form.quantity),
            conversion: parseFloat(form.unitConversion) || null,
            expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
            company: creationMode === "invoice" ? form.supplier : selectedCompany,
          },
        },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      toast.success("تم تحديث بيانات المنتج بنجاح ✅");
      if (onSuccess) onSuccess();
      setOpenModal(false);
    } catch {
      toast.error("❌ فشل تحديث البيانات");
    }
  };

  const handleSubmit = async () => {
    if (productList.length === 0) return;
    try {
      const token = Cookies.get("token");
      await axios.post("/api/products", productList, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("تمت إضافة المنتجات بنجاح ✅");
      setProductList([]);
      setOpenModal(false);
      if (onSuccess) onSuccess();
    } catch {
      toast.error("فشل في إضافة المنتجات");
    }
  };

  const activeType = treatmentTypes.find((t) => t.name === form.type);

  /* ── render ── */
  return (
<Dialog open={openModal} onOpenChange={setOpenModal}>
  <DialogContent
    className="max-w-[95vw] w-[1180px] h-[90vh] max-h-[90vh] p-0 border-none overflow-hidden rounded-[28px] shadow-2xl !fixed flex flex-col"
    style={{ background: "var(--background)" }}
  >
    {/* ══ Top Accent Bar ══ */}
    <div className="absolute top-0 inset-x-0 h-1 rounded-t-[28px] bg-gradient-to-r from-primary via-[oklch(0.7_0.2_220)] to-[oklch(0.75_0.18_260)]" />

    <div className="flex flex-1 min-h-0" dir="rtl">
      {/* ═══ LEFT PANEL - FORM ═══ */}
      <div className="flex-1 flex flex-col min-h-0">
        {/* Header */}
        <div className="px-8 pt-7 pb-5 border-b border-border/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-black tracking-tight leading-tight">
                {editingStockProduct ? "تعديل المنتج" : "إضافة أدوية جديدة"}
              </h2>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">
                {editingStockProduct ? "Update Stock Record" : "New Inventory Items"}
              </p>
            </div>
          </div>

          {/* Auto-fill Toggle */}
          <div
            onClick={() => setAutomise((v) => !v)}
            className="flex items-center gap-2 px-3 py-2 rounded-2xl border border-border/50 bg-muted/30 hover:border-primary/30 transition-colors cursor-pointer"
          >
            <span className="text-[11px] font-bold opacity-70">إكمال تلقائي</span>
            <div
              className={cn(
                "h-5 w-9 rounded-full transition-all duration-300 relative",
                automise ? "bg-primary" : "bg-muted-foreground/30"
              )}
            >
              <div
                className={cn(
                  "absolute top-0.5 h-4 w-4 rounded-full bg-white shadow transition-all duration-300",
                  automise ? "right-0.5" : "left-0.5"
                )}
              />
            </div>
          </div>
        </div>

        {/* Scrollable Form */}
        <div className="flex-1 overflow-y-auto px-8 py-6 space-y-6 custom-scrollbar">
          {/* Product Identity */}
          <SectionDivider icon={FlaskConical} label="هوية المنتج" />

          {/* Product Name with Search */}
          <FieldWrapper label="اسم الدواء" icon={Tag} error={validationErrors.name}>
            <div className="relative">
              <Input
                placeholder="اسم الدواء (إنجليزي أو عربي)..."
                name="name"
                value={form.name}
                onChange={handleChange}
                className={cn(
                  "h-12 pl-12 pr-4 font-semibold rounded-2xl border-2 bg-muted/20 transition-all",
                  "focus:border-primary/60 focus:bg-background focus:shadow-md focus:shadow-primary/10",
                  validationErrors.name
                    ? "border-destructive/60 bg-destructive/5"
                    : "border-border/40"
                )}
              />

              {/* Web Search Button */}
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => searchInternet(form.name, form.type)}
                      disabled={webLoading || form.name.length < 2}
                      className="absolute left-1.5 top-1.5 h-9 w-9 rounded-xl text-primary hover:bg-primary/10 transition-all hover:scale-105"
                    >
                      {webLoading ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Globe className="h-4 w-4" />
                      )}
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent className="rounded-xl px-3 py-1.5 text-xs font-bold">
                    بحث على الإنترنت 🌐
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {/* Web Results Dropdown */}
              {webResults.length > 0 && (
                <div className="absolute inset-x-0 top-full mt-2 z-50 rounded-2xl border border-primary/20 bg-popover shadow-2xl shadow-primary/10 overflow-hidden animate-in fade-in slide-in-from-top-2 max-h-60 overflow-y-auto">
                  <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/30 bg-primary/5">
                    <Globe className="h-3 w-3 text-primary" />
                    <span className="text-[10px] font-black text-primary uppercase tracking-widest">
                      نتائج مقترحة
                    </span>
                  </div>
                  {webResults.map((item, i) => (
                    <button
                      key={i}
                      onClick={() => selectWebResult(item)}
                      className="w-full text-right px-4 py-3 hover:bg-primary/5 transition-colors border-b border-border/20 last:border-0 group flex items-center gap-3"
                    >
                      <div className="flex-1">
                        <div className="font-bold text-sm group-hover:text-primary transition-colors">
                          {item.name}
                        </div>
                        <div className="text-[10px] text-muted-foreground font-semibold mt-0.5">
                          {item.company || "غير معروف"} — {item.type || "أقراص"}
                        </div>
                      </div>
                      <ChevronRight className="h-3.5 w-3.5 text-muted-foreground/40 group-hover:text-primary transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </FieldWrapper>

          {/* Barcode & Type Row */}
          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="الباركود" icon={Hash} error={validationErrors.barcode}>
              <div className="relative">
                <Input
                  placeholder="الباركود..."
                  name="barcode"
                  value={form.barcode}
                  onChange={handleChange}
                  className={cn(
                    "h-11 pr-10 font-semibold rounded-2xl border-2 bg-muted/20 transition-all",
                    "focus:border-primary/60 focus:bg-background focus:shadow-md focus:shadow-primary/10",
                    validationErrors.barcode
                      ? "border-destructive/60 bg-destructive/5"
                      : "border-border/40"
                  )}
                />
                <ScanBarcode className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
              </div>
            </FieldWrapper>

            <FieldWrapper label="النوع" icon={Layers} error={validationErrors.type}>
              <Select value={form.type} onValueChange={(val) => setForm((p) => ({ ...p, type: val }))}>
                <SelectTrigger
                  className={cn(
                    "h-11 font-semibold rounded-2xl border-2 bg-muted/20 transition-all",
                    "focus:border-primary/60 focus:bg-background",
                    validationErrors.type
                      ? "border-destructive/60 bg-destructive/5"
                      : "border-border/40"
                  )}
                >
                  <SelectValue placeholder="اختر النوع..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-52 overflow-y-auto">
                  {Object.keys(typesWithUnits).map((key) => (
                    <SelectItem key={key} value={key} className="font-semibold">
                      {key}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </FieldWrapper>
          </div>

          {/* Pricing Section */}
          <SectionDivider icon={DollarSign} label="التسعير" />

          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="سعر الشراء" icon={TrendingUp} error={validationErrors.purchasePrice}>
              <div className="relative">
                <Input
                  type="number"
                  name="purchasePrice"
                  value={form.purchasePrice}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={cn(
                    "h-11 pl-14 font-bold rounded-2xl border-2 bg-muted/20 transition-all",
                    "focus:border-primary/60 focus:bg-background focus:shadow-md focus:shadow-primary/10",
                    validationErrors.purchasePrice
                      ? "border-destructive/60 bg-destructive/5"
                      : "border-border/40"
                  )}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-muted-foreground/60 border-r border-border/40 pr-2.5 leading-none">
                  ج.م
                </span>
              </div>
            </FieldWrapper>

            <FieldWrapper label="سعر البيع" icon={DollarSign} error={validationErrors.salePrice}>
              <div className="relative">
                <Input
                  type="number"
                  name="salePrice"
                  value={form.salePrice}
                  onChange={handleChange}
                  placeholder="0.00"
                  className={cn(
                    "h-11 pl-14 font-bold rounded-2xl border-2 bg-primary/5 transition-all",
                    "focus:border-primary/60 focus:bg-background focus:shadow-md focus:shadow-primary/10",
                    validationErrors.salePrice
                      ? "border-destructive/60 bg-destructive/5"
                      : "border-primary/20 text-primary"
                  )}
                />
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-black text-primary/50 border-r border-primary/20 pr-2.5 leading-none">
                  ج.م
                </span>
              </div>
            </FieldWrapper>
          </div>

          {/* Stock Section */}
          <SectionDivider icon={Boxes} label="المخزون" />

          <div className="grid grid-cols-2 gap-4">
            <FieldWrapper label="الكمية" icon={Boxes} error={validationErrors.quantity}>
              <Input
                type="number"
                name="quantity"
                value={form.quantity}
                onChange={handleChange}
                placeholder="الكمية..."
                className={cn(
                  "h-11 font-semibold rounded-2xl border-2 bg-muted/20 transition-all",
                  "focus:border-primary/60 focus:bg-background focus:shadow-md focus:shadow-primary/10",
                  validationErrors.quantity
                    ? "border-destructive/60 bg-destructive/5"
                    : "border-border/40"
                )}
              />
            </FieldWrapper>

            <FieldWrapper label="تاريخ الانتهاء" icon={Calendar} error={validationErrors.expiryDate}>
              <div className="relative">
                <Input
                  type="date"
                  name="expiryDate"
                  value={form.expiryDate}
                  onChange={handleChange}
                  className={cn(
                    "h-11 pr-10 font-semibold rounded-2xl border-2 bg-muted/20 transition-all",
                    "focus:border-primary/60 focus:bg-background focus:shadow-md focus:shadow-primary/10",
                    validationErrors.expiryDate
                      ? "border-destructive/60 bg-destructive/5"
                      : "border-border/40"
                  )}
                />
                <Calendar className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50 pointer-events-none" />
              </div>
            </FieldWrapper>
          </div>

          {/* Conversion Factor */}
          {activeType?.hasConversion && (
            <FieldWrapper
              label="معامل التحويل"
              icon={ArrowRight}
              error={validationErrors.unitConversion}
            >
              <Input
                type="number"
                name="unitConversion"
                value={form.unitConversion}
                onChange={handleChange}
                placeholder="مثال: 20 قرص في العبوة..."
                className={cn(
                  "h-11 font-semibold rounded-2xl border-2 bg-yellow-50/30 border-yellow-400/30 transition-all",
                  "focus:border-yellow-500/60 focus:bg-background focus:shadow-md focus:shadow-yellow-500/10",
                  "dark:bg-yellow-500/5 dark:border-yellow-400/20",
                  validationErrors.unitConversion && "border-destructive/60 bg-destructive/5"
                )}
              />
            </FieldWrapper>
          )}

          {/* Supplier Section */}
          <SectionDivider icon={Building2} label="المورد / الشركة" />

          {creationMode === "manual" ? (
            <div className="space-y-4">
              <Select
                value={selectedCompany}
                onValueChange={(val) => {
                  if (val === "__add__") {
                    const n = prompt("أدخل اسم الشركة الجديدة:");
                    if (n) handleCreateCompany(n);
                  } else setSelectedCompany(val);
                }}
              >
                <SelectTrigger className="h-11 font-semibold rounded-2xl border-2 border-border/40 bg-muted/20 focus:border-primary/60">
                  <SelectValue placeholder="اختر الشركة المصنعة..." />
                </SelectTrigger>
                <SelectContent className="rounded-2xl max-h-52 overflow-y-auto">
                  {companies.map((c) => (
                    <SelectItem key={c._id} value={c.name} className="font-semibold">
                      {c.name}
                    </SelectItem>
                  ))}
                  <SelectItem value="__add__" className="text-primary font-black">
                    ➕ إضافة شركة جديدة
                  </SelectItem>
                </SelectContent>
              </Select>

              <div className="grid grid-cols-2 gap-4">
                <Input
                  placeholder="المورد (اختياري)..."
                  name="supplier"
                  value={form.supplier}
                  onChange={handleChange}
                  className="h-11 font-semibold rounded-2xl border-2 border-border/40 bg-muted/20 focus:border-primary/60 transition-all"
                />
                <div className="relative">
                  <Input
                    placeholder="رقم الفاتورة..."
                    name="invoiceNumber"
                    value={form.invoiceNumber}
                    onChange={handleChange}
                    className="h-11 pr-10 font-semibold rounded-2xl border-2 border-border/40 bg-muted/20 focus:border-primary/60 transition-all"
                  />
                  <Receipt className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Select
                  value={form.supplier}
                  onValueChange={(val) => {
                    setForm((p) => ({ ...p, supplier: val }));
                    checkCompanyWithAI(val);
                  }}
                >
                  <SelectTrigger className="h-11 font-semibold rounded-2xl border-2 border-border/40 bg-muted/20 focus:border-primary/60">
                    <SelectValue placeholder="اختر المورد..." />
                  </SelectTrigger>
                  <SelectContent className="rounded-2xl max-h-52 overflow-y-auto">
                    {companies.map((c) => (
                      <SelectItem key={c._id} value={c.name} className="font-semibold">
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <div className="relative">
                  <Input
                    placeholder="رقم الفاتورة..."
                    name="invoiceNumber"
                    value={form.invoiceNumber}
                    onChange={handleChange}
                    className="h-11 pr-10 font-semibold rounded-2xl border-2 border-border/40 bg-muted/20 focus:border-primary/60 transition-all"
                  />
                  <Receipt className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/40 pointer-events-none" />
                </div>
              </div>

              {/* AI Suggestion Banner */}
              {aiSuggestion && (
                <div className="p-4 rounded-2xl border-2 border-dashed border-primary/30 bg-primary/5 animate-in slide-in-from-top-2 flex items-start gap-3">
                  <div className="h-8 w-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <Sparkles className="h-4 w-4 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[11px] font-black text-primary uppercase tracking-widest mb-1">
                      اقتراح ذكي
                    </p>
                    <p className="text-xs font-semibold leading-relaxed text-foreground/80 mb-2">
                      هل تقصد "{aiSuggestion.existingName}"؟ {aiSuggestion.reason}
                    </p>
                    <Button
                      size="sm"
                      onClick={() => setForm((p) => ({ ...p, supplier: aiSuggestion.existingName }))}
                      className="h-7 rounded-xl text-[10px] font-black px-3"
                    >
                      نعم، استخدم هذا الاسم
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-2 pb-1">
            {editingStockProduct ? (
              <Button
                onClick={handleDirectUpdate}
                className="w-full h-14 rounded-2xl font-black tracking-widest uppercase text-base shadow-xl transition-all hover:shadow-2xl hover:scale-[1.01] bg-gradient-to-r from-emerald-600 to-green-600 text-white"
              >
                <Save className="ml-2 h-5 w-5" /> حفظ التعديلات النهائية
              </Button>
            ) : editingIndex !== null ? (
              <div className="flex gap-3">
                <Button
                  onClick={handleUpdateListItem}
                  className="flex-1 h-12 rounded-2xl font-black uppercase tracking-wide bg-primary text-white hover:bg-primary/90"
                >
                  <CheckCircle2 className="ml-2 h-4 w-4" /> تحديث المنتج
                </Button>
                <Button
                  onClick={cancelEdit}
                  variant="outline"
                  className="flex-1 h-12 rounded-2xl border-2 font-black uppercase"
                >
                  <X className="ml-2 h-4 w-4" /> إلغاء
                </Button>
              </div>
            ) : (
              <Button
                onClick={handleAddToList}
                variant="outline"
                className="w-full h-14 rounded-2xl border-2 border-primary/40 text-primary hover:bg-primary/5 font-black uppercase tracking-widest transition-all hover:scale-[1.01] hover:shadow-lg hover:shadow-primary/10 group"
              >
                <Plus className="ml-2 h-5 w-5 group-hover:scale-125 transition-transform duration-200" />
                إضافة إلى القائمة المؤقتة
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL - QUEUE ═══ */}
      <div
        className="w-[400px] shrink-0 flex flex-col border-r border-border/30 bg-white/50 dark:bg-black/50 backdrop-blur-lg"
      >
        {/* Queue Header */}
        <div className="px-6 pt-7 pb-5 border-b border-border/30 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                <Receipt className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="text-base font-black">القائمة الحالية</h3>
                <p className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest">
                  Pending Submissions
                </p>
              </div>
            </div>
            <div
              className={cn(
                "px-3 py-1 rounded-full text-[11px] font-black transition-all",
                productList.length > 0
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "bg-muted text-muted-foreground"
              )}
            >
              {productList.length} منتج
            </div>
          </div>

          {/* Mode Switch */}
          <div className="flex gap-1 p-1 rounded-2xl bg-muted/60 border border-border/40">
            <button
              onClick={() => setCreationMode("invoice")}
              className={cn(
                "flex-1 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-200",
                creationMode === "invoice"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              بفاتورة
            </button>
            <button
              onClick={() => setCreationMode("manual")}
              className={cn(
                "flex-1 py-2 rounded-xl font-black text-[11px] uppercase tracking-wider transition-all duration-200",
                creationMode === "manual"
                  ? "bg-primary text-primary-foreground shadow-md shadow-primary/30"
                  : "text-muted-foreground hover:bg-muted"
              )}
            >
              يدوي
            </button>
          </div>
        </div>

        {/* Product Cards */}
        <div className="flex-1 overflow-y-auto px-4 py-4 space-y-2.5 custom-scrollbar">
          {productList.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center space-y-3 opacity-25 select-none py-12">
              <PackageSearch className="h-14 w-14" />
              <p className="text-xs font-bold leading-relaxed px-6">
                لا توجد منتجات في القائمة حالياً. يرجى إضافة منتجات لحفظها.
              </p>
            </div>
          ) : (
            productList.map((p, idx) => (
              <div
                key={idx}
                className={cn(
                  "group relative overflow-hidden rounded-2xl border transition-all duration-200",
                  "hover:border-primary/40 hover:shadow-md hover:shadow-primary/5",
                  editingIndex === idx
                    ? "border-primary/50 bg-primary/5 shadow-md shadow-primary/10"
                    : "border-border/40 bg-card"
                )}
              >
                {editingIndex === idx && (
                  <div className="absolute top-0 inset-x-0 h-0.5 bg-primary rounded-t-2xl" />
                )}
                <div className="flex items-center gap-3 p-3.5">
                  {/* Quantity Badge */}
                  <div
                    className="h-11 w-11 rounded-xl flex items-center justify-center shrink-0 font-black text-sm shadow-inner bg-gradient-to-r from-primary to-[oklch(0.7_0.2_220)] text-white"
                  >
                    {p.quantity}
                  </div>

                  {/* Product Info */}
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm truncate leading-tight">{p.name}</div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[9px] font-black text-muted-foreground uppercase bg-muted px-1.5 py-0.5 rounded-md">
                        {p.type}
                      </span>
                      <span className="text-[10px] font-bold text-primary">{p.salePrice} ج.م</span>
                    </div>
                    {p.expiryDate && (
                      <div className="text-[9px] text-muted-foreground/60 font-semibold mt-0.5 flex items-center gap-1">
                        <Calendar className="h-2.5 w-2.5" />
                        {new Date(p.expiryDate).toLocaleDateString("ar-EG")}
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div className="flex flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleEdit(idx)}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-primary/10 hover:text-primary transition-colors text-muted-foreground"
                    >
                      <Edit2 className="h-3 w-3" />
                    </button>
                    <button
                      onClick={() => setProductList((prev) => prev.filter((_, i) => i !== idx))}
                      className="h-7 w-7 rounded-lg flex items-center justify-center hover:bg-destructive/10 hover:text-destructive transition-colors text-muted-foreground"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Submit Button */}
        <div className="px-4 pb-5 pt-3 shrink-0 border-t border-border/30">
          <Button
            disabled={productList.length === 0}
            onClick={handleSubmit}
            className={cn(
              "w-full h-14 rounded-2xl font-black tracking-widest uppercase text-base transition-all duration-300 group",
              productList.length > 0
                ? "shadow-2xl shadow-primary/25 hover:scale-[1.02] hover:shadow-primary/40 bg-gradient-to-r from-primary via-[oklch(0.7_0.2_220)] to-[oklch(0.75_0.18_260)] text-white"
                : "opacity-50 bg-gray-300 text-gray-500"
            )}
          >
            حفظ الكل والمتابعة
            <Save className="mr-2.5 h-5 w-5 group-hover:scale-110 transition-transform" />
          </Button>
        </div>
      </div>
    </div>

    {/* Barcode Scanner */}
    <BarcodeScanner onScan={handleBarcodeScan} />
  </DialogContent>
</Dialog>
  );
};

export default CreateProductForm;
