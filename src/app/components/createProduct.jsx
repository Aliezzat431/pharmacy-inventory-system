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

import {
  typesWithUnits,
  treatmentTypes,
} from "../lib/unitOptions";

import { useInternetSearch } from "../hooks/useInternetSearch";

import { toast } from "sonner";
import Cookies from "js-cookie";

import { cn } from "@/lib/utils";

/* =========================================================
   SAFE ARRAY
========================================================= */

const safeArray = (value) => {
  try {
    if (Array.isArray(value)) return value;

    if (value && typeof value === "object") {
      return Object.values(value);
    }

    return [];
  } catch {
    return [];
  }
};

/* =========================================================
   HELPERS
========================================================= */

const FieldWrapper = ({
  label,
  icon: Icon,
  error,
  children,
  className,
}) => (
  <div className={cn("space-y-1.5", className)}>
    <label className="flex items-center gap-1.5 text-[11px] font-bold text-muted-foreground uppercase tracking-widest">
      {Icon && <Icon className="h-3 w-3 text-primary/70" />}
      {label}
    </label>

    {children}

    {error && (
      <p className="text-[10px] text-destructive font-semibold flex items-center gap-1">
        <X className="h-2.5 w-2.5" />
        {error}
      </p>
    )}
  </div>
);

const SectionDivider = ({ icon: Icon, label }) => (
  <div className="flex items-center gap-3 py-1">
    <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 shadow-sm">
      <Icon className="h-3.5 w-3.5 text-primary" />

      <span className="text-[10px] font-black text-primary uppercase tracking-widest">
        {label}
      </span>
    </div>

    <div className="flex-1 h-px bg-gradient-to-r from-primary/20 to-transparent" />
  </div>
);

/* =========================================================
   COMPONENT
========================================================= */

const CreateProductForm = ({
  openModal,
  setOpenModal,
  editingStockProduct,
  setEditingStockProduct,
  onSuccess,
}) => {
  /* =========================================================
     STATES
  ========================================================= */

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

  const [companies, setCompanies] = useState(() => []);
  const [creationMode, setCreationMode] = useState("invoice");
  const [automise, setAutomise] = useState(true);

  const [productList, setProductList] = useState(() => []);

  const [editingIndex, setEditingIndex] = useState(null);

  const [selectedCompany, setSelectedCompany] = useState("");

  const [aiSuggestion, setAiSuggestion] = useState(null);

  const [checkingAi, setCheckingAi] = useState(false);

  const [validationErrors, setValidationErrors] = useState({});

  const {
    results: webResults,
    loading: webLoading,
    searchInternet,
    clearResults,
  } = useInternetSearch();

  /* =========================================================
     EFFECTS
  ========================================================= */

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

      setCreationMode(
        editingStockProduct.supplier ? "invoice" : "manual"
      );

      if (editingStockProduct.company) {
        setSelectedCompany(editingStockProduct.company);
      }
    } else if (!openModal) {
      resetForm();
    }
  }, [editingStockProduct, openModal]);

  /* =========================================================
     FETCH COMPANIES
  ========================================================= */

  useEffect(() => {
    const fetchCompanies = async () => {
      try {
        const token = Cookies.get("token");

        const res = await axios.get("/api/companies", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const companiesData = Array.isArray(res.data)
          ? res.data
          : Array.isArray(res.data?.companies)
          ? res.data.companies
          : [];

        setCompanies(companiesData);
      } catch (err) {
        console.error("Failed to fetch companies:", err);

        setCompanies([]);
      }
    };

    fetchCompanies();
  }, []);

  /* =========================================================
     HELPERS
  ========================================================= */

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

    setForm((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  /* =========================================================
     COMPANY CREATE
  ========================================================= */

  const handleCreateCompany = async (name) => {
    if (!name.trim()) return;

    try {
      const token = Cookies.get("token");

      const res = await axios.post(
        "/api/companies",
        { name: name.trim() },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      const companyData = res.data?.company || res.data;

      setCompanies((prev) => [
        ...safeArray(prev),
        companyData,
      ]);

      setSelectedCompany(companyData.name);

      toast.success(`تمت إضافة شركة ${name} بنجاح`);
    } catch (err) {
      console.error(err);

      toast.error("فشل إنشاء الشركة");
    }
  };

  /* =========================================================
     AI CHECK
  ========================================================= */

  const checkCompanyWithAI = async (name) => {
    if (!name || name.trim().length < 2) return;

    setCheckingAi(true);

    setAiSuggestion(null);

    try {
      const token = Cookies.get("token");

      const res = await axios.post(
        "/api/ai/company-suggestions",
        {
          companyName: name.trim(),
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (
        res.data?.isDuplicate &&
        res.data?.existingName !== name.trim()
      ) {
        setAiSuggestion(res.data);
      }
    } catch (err) {
      console.error("AI check failed", err);
    } finally {
      setCheckingAi(false);
    }
  };

  /* =========================================================
     BARCODE
  ========================================================= */

  const handleBarcodeScan = (scanned) => {
    setForm((prev) => ({
      ...prev,
      barcode: scanned,
    }));

    toast.success("تم مسح الباركود بنجاح 📸");
  };

  /* =========================================================
     NORMALIZE COMPANY NAME
  ========================================================= */

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
      if (n.startsWith(full) || n.includes(full)) {
        return short;
      }
    }

    return n;
  };

  /* =========================================================
     WEB RESULT SELECT
  ========================================================= */

  const selectWebResult = async (item) => {
    try {
      setForm((prev) => {
        const isValidType =
          item?.type &&
          Object.keys(typesWithUnits).includes(item.type);

        return {
          ...prev,
          name: item?.name || "",
          type:
            automise && isValidType
              ? item.type
              : prev.type,
          details: automise
            ? item?.details || ""
            : prev.details,
          unitConversion: "",
          purchasePrice:
            item?.purchasePrice || prev.purchasePrice,
          salePrice:
            item?.salePrice || prev.salePrice,
        };
      });

      if (item?.company && automise) {
        const normalizedTarget = normalizeName(
          item.company
        );

        const existing = safeArray(companies).find(
          (c) =>
            normalizeName(c?.name) === normalizedTarget
        );

        if (existing) {
          setSelectedCompany(existing.name);
        } else {
          await handleCreateCompany(item.company);
        }
      }

      clearResults();

      toast.success("تم تطبيق البيانات المقترحة ✨");
    } catch (err) {
      console.error(err);
    }
  };

  /* =========================================================
     ADD PRODUCT
  ========================================================= */

  const handleAddToList = () => {
    let finalCompany =
      creationMode === "invoice"
        ? form.supplier
        : selectedCompany;

    if (!finalCompany) {
      toast.warning(
        creationMode === "invoice"
          ? "يرجى إدخال اسم المورد"
          : "يرجى اختيار الشركة المصنعة"
      );

      return;
    }

    const errors = {};

    if (!form.name.trim()) {
      errors.name = "يرجى إدخال اسم الدواء";
    }

    if (!form.type) {
      errors.type = "يرجى اختيار نوع الدواء";
    }

    if (!form.barcode.trim()) {
      errors.barcode = "يرجى إدخال الباركود";
    }

    if (
      form.purchasePrice === "" ||
      parseFloat(form.purchasePrice) < 0
    ) {
      errors.purchasePrice = "سعر الشراء غير صالح";
    }

    if (
      form.salePrice === "" ||
      parseFloat(form.salePrice) <= 0
    ) {
      errors.salePrice =
        "سعر البيع يجب أن يكون أكبر من صفر";
    }

    if (
      form.quantity === "" ||
      parseFloat(form.quantity) <= 0
    ) {
      errors.quantity =
        "الكمية يجب أن تكون أكبر من صفر";
    }

    const activeType = treatmentTypes.find(
      (t) => t.name === form.type
    );

    if (
      activeType?.hasConversion &&
      (!form.unitConversion ||
        parseFloat(form.unitConversion) <= 0)
    ) {
      errors.unitConversion =
        "يرجى إدخال معامل التحويل";
    }

    if (form.expiryDate) {
      const today = new Date();

      today.setHours(0, 0, 0, 0);

      if (new Date(form.expiryDate) < today) {
        errors.expiryDate =
          "تاريخ الانتهاء لا يمكن أن يكون في الماضي";
      }
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

      expiryDate: form.expiryDate
        ? new Date(form.expiryDate).toISOString()
        : null,

      unitConversion: activeType?.hasConversion
        ? parseFloat(form.unitConversion)
        : null,

      company: finalCompany,

      supplier: form.supplier,

      invoiceNumber: form.invoiceNumber,
    };

    setProductList((prev) => [
      ...safeArray(prev),
      newProduct,
    ]);

    resetForm(true);

    clearResults();

    toast.success("تمت إضافة المنتج للقائمة 📝");
  };

  /* =========================================================
     EDIT
  ========================================================= */

  const handleEdit = (index) => {
    const p = safeArray(productList)[index];

    if (!p) return;

    setForm({
      ...p,
      expiryDate: p.expiryDate
        ? p.expiryDate.split("T")[0]
        : "",
    });

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

  /* =========================================================
     UPDATE LIST ITEM
  ========================================================= */

  const handleUpdateListItem = () => {
    if (editingIndex === null) return;

    if (
      !form.name.trim() ||
      !form.type.trim() ||
      !form.barcode.trim()
    ) {
      toast.warning("يرجى تعبئة الحقول الأساسية");

      return;
    }

    const updatedList = [...safeArray(productList)];

    updatedList[editingIndex] = {
      ...form,

      purchasePrice: parseFloat(form.purchasePrice),

      salePrice: parseFloat(form.salePrice),

      quantity: parseFloat(form.quantity),

      expiryDate: form.expiryDate
        ? new Date(form.expiryDate).toISOString()
        : null,

      unitConversion: treatmentTypes.find(
        (t) => t.name === form.type
      )?.hasConversion
        ? parseFloat(form.unitConversion)
        : null,

      company:
        creationMode === "invoice"
          ? form.supplier
          : selectedCompany,
    };

    setProductList(updatedList);

    cancelEdit();

    toast.success("تم تحديث المنتج في القائمة ✅");
  };

  /* =========================================================
     UPDATE PRODUCT
  ========================================================= */

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

            purchasePrice: parseFloat(
              form.purchasePrice
            ),

            price: parseFloat(form.salePrice),

            quantity: parseFloat(form.quantity),

            conversion:
              parseFloat(form.unitConversion) || null,

            expiryDate: form.expiryDate
              ? new Date(form.expiryDate).toISOString()
              : null,

            company:
              creationMode === "invoice"
                ? form.supplier
                : selectedCompany,
          },
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("تم تحديث بيانات المنتج بنجاح ✅");

      onSuccess?.();

      setOpenModal(false);
    } catch (err) {
      console.error(err);

      toast.error("❌ فشل تحديث البيانات");
    }
  };

  /* =========================================================
     SUBMIT
  ========================================================= */

  const handleSubmit = async () => {
    if (safeArray(productList).length === 0) return;

    try {
      const token = Cookies.get("token");

      await axios.post(
        "/api/products",
        safeArray(productList),
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      toast.success("تمت إضافة المنتجات بنجاح ✅");

      setProductList([]);

      setOpenModal(false);

      onSuccess?.();
    } catch (err) {
      console.error(err);

      toast.error("فشل في إضافة المنتجات");
    }
  };

  /* =========================================================
     ACTIVE TYPE
  ========================================================= */

  const activeType = treatmentTypes.find(
    (t) => t.name === form.type
  );

  /* =========================================================
     RENDER
  ========================================================= */

  return (
    <Dialog
      open={openModal}
      onOpenChange={setOpenModal}
    >
      <DialogContent className="max-w-[95vw] w-[1180px] h-[90vh] max-h-[90vh] p-0 border-none overflow-hidden rounded-[28px] shadow-2xl !fixed flex flex-col">
        <div className="flex flex-1 min-h-0">
          {/* LEFT */}

          <div className="flex-1 overflow-y-auto p-6 space-y-5">
            <SectionDivider
              icon={FlaskConical}
              label="المنتج"
            />

            <FieldWrapper
              label="اسم المنتج"
              icon={Tag}
              error={validationErrors.name}
            >
              <div className="relative">
                <Input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="اسم المنتج..."
                />

                <Button
                  size="icon"
                  variant="ghost"
                  className="absolute left-2 top-2"
                  onClick={() =>
                    searchInternet(form.name, form.type)
                  }
                >
                  {webLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Globe className="h-4 w-4" />
                  )}
                </Button>

                {safeArray(webResults).length > 0 && (
                  <div className="absolute top-full inset-x-0 bg-background border rounded-xl mt-2 z-50 shadow-lg overflow-hidden">
                    {safeArray(webResults).map(
                      (item, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() =>
                            selectWebResult(item)
                          }
                          className="w-full text-right px-4 py-3 hover:bg-muted transition"
                        >
                          <div className="font-bold">
                            {item?.name}
                          </div>

                          <div className="text-xs text-muted-foreground">
                            {item?.company}
                          </div>
                        </button>
                      )
                    )}
                  </div>
                )}
              </div>
            </FieldWrapper>

            {/* TYPES */}

            <div className="grid grid-cols-2 gap-4">
              <FieldWrapper
                label="الباركود"
                icon={Hash}
                error={validationErrors.barcode}
              >
                <Input
                  name="barcode"
                  value={form.barcode}
                  onChange={handleChange}
                />
              </FieldWrapper>

              <FieldWrapper
                label="النوع"
                icon={Layers}
                error={validationErrors.type}
              >
                <Select
                  value={form.type}
                  onValueChange={(val) =>
                    setForm((p) => ({
                      ...p,
                      type: val,
                    }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="اختر النوع" />
                  </SelectTrigger>

                  <SelectContent>
                    {safeArray(
                      Object.keys(typesWithUnits)
                    ).map((key) => (
                      <SelectItem
                        key={key}
                        value={key}
                      >
                        {key}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </FieldWrapper>
            </div>

            {/* PRODUCTS */}

            <Button
              onClick={handleAddToList}
              className="w-full"
            >
              <Plus className="ml-2 h-4 w-4" />
              إضافة للقائمة
            </Button>
          </div>

          {/* RIGHT */}

          <div className="w-[380px] border-r overflow-y-auto p-4 space-y-3">
            {safeArray(productList).length === 0 ? (
              <div className="text-center text-muted-foreground py-20">
                لا توجد منتجات
              </div>
            ) : (
              safeArray(productList).map((p, idx) => (
                <div
                  key={idx}
                  className="border rounded-2xl p-4"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="font-bold">
                        {p?.name}
                      </h3>

                      <p className="text-xs text-muted-foreground">
                        {p?.type}
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() =>
                          handleEdit(idx)
                        }
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>

                      <button
                        onClick={() =>
                          setProductList((prev) =>
                            safeArray(prev).filter(
                              (_, i) => i !== idx
                            )
                          )
                        }
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}

            <Button
              disabled={
                safeArray(productList).length === 0
              }
              onClick={handleSubmit}
              className="w-full"
            >
              <Save className="ml-2 h-4 w-4" />
              حفظ الكل
            </Button>
          </div>
        </div>

        <BarcodeScanner
          onScan={handleBarcodeScan}
        />
      </DialogContent>
    </Dialog>
  );
};

export default CreateProductForm;
