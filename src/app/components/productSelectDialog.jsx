"use client";

import React, { useState, useMemo, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search, X, Package, Layers, Calendar, ShoppingCart, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/card";
const ProductSelectDialog = ({
  open,
  onClose,
  products = [],
  searchResults = [],
  setSearchResults,
  selectedProduct,
  setSelectedProduct,
  tempQuantity,
  setTempQuantity,
  tempUnit,
  setTempUnit,
  tempExpiry,
  setTempExpiry,
  tempPillsPerStrip,
  setTempPillsPerStrip,
  variants,
  setVariants,
  handleAddProduct,
  aiMacro,
  setAiMacro,
}) => {
  const baseList = Array.isArray(products) ? products : [];

  useEffect(() => {
    console.log(products);
  }, [products]);

  useEffect(() => {
    if (!aiMacro || !open) return;

    let timer1, timer2, timer3;

    const runMacro = async () => {
      const { productName, matches } = aiMacro;
      
      const elSearch = document.getElementById("ai-search-input");
      
      // Step 1: Type text visually
      let currentText = "";
      for (let i = 0; i < productName.length; i++) {
        currentText += productName[i];
        if (elSearch) elSearch.value = currentText;
        handleSearchChange({ target: { value: currentText } });
        await new Promise(r => setTimeout(r, 60)); // typing speed
      }

      timer1 = setTimeout(() => {
        // Step 2: Auto-select earliest match
        const variantsList = grouped[matches[0].name] || [matches[0]];
        const earliest = [...variantsList].sort((a, b) => {
           const dA = a.expiryDate ? new Date(a.expiryDate) : new Date(8640000000000000);
           const dB = b.expiryDate ? new Date(b.expiryDate) : new Date(8640000000000000);
           return dA - dB;
        })[0];

        // Set product + expiry first (triggers info panel to appear with defaults)
        setVariants(variantsList);
        setSelectedProduct(earliest);
        setTempExpiry(earliest.expiryDate ?? "no-expiry");
        setTempPillsPerStrip(10);
        // NOTE: intentionally NOT setting tempUnit/tempQuantity here.
        // The page.jsx variants effect is guarded by !aiMacro, so defaults won't fire.
        // We set AI's choices in timer2 after the panel has rendered.

        timer2 = setTimeout(() => {
          // Step 3: Apply AI's unit & quantity AFTER info panel is visible.
          // This guarantees our values win over any default-setting logic.
          setTempUnit(aiMacro.unit || earliest.unitOptions?.[0] || earliest.unit || "\u0639\u0644\u0628\u0629");
          setTempQuantity(aiMacro.quantity || 1);

          // Highlight the Add button
          const addBtn = document.getElementById("ai-add-btn");
          if (addBtn) addBtn.classList.add("scale-95", "ring-4", "ring-violet-500", "shadow-[0_0_20px_theme('colors.violet.500')]");

          timer3 = setTimeout(() => {
            // Step 4: Click the add button – uses the CURRENT render's onClick closure
            const btn = document.getElementById("ai-add-btn");
            if (btn) {
              btn.click();
            } else {
              validateAndAdd(); // fallback if button isn't in DOM yet
            }
            setAiMacro(null); // finish macro
          }, 500); // allow re-render with new unit/qty before clicking
        }, 800); // wait for info panel to slide in
      }, 500); // wait after typing
    };

    runMacro();

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [aiMacro, open]);

  const getBaseQuantity = (product, quantity, unit) => {
    if (!product) return quantity;
    if (product.isBaseUnit) return quantity;
    if (unit === product.unit) return quantity;
    const conv = Number(product.unitConversion || 1);
    if (conv && conv > 0) return quantity / conv;
    return quantity;
  };

  const handleSearchChange = (e) => {
    const q = (e.target.value || "").toLowerCase();
    if (!q.trim()) {
      setSearchResults(baseList);
      return;
    }
    setSearchResults(
      baseList.filter(
        (p) =>
          (p.name || "").toLowerCase().includes(q) ||
          (p.barcode && p.barcode.toString().includes(q))
      )
    );
  };

  const resultsArray = Array.isArray(searchResults)
    ? searchResults
    : baseList;

  const grouped = useMemo(() => {
    return resultsArray.reduce((acc, product) => {
      if (!acc[product.name]) acc[product.name] = [];
      acc[product.name].push(product);
      return acc;
    }, {});
  }, [resultsArray]);

 const validateAndAdd = () => {
  if (!selectedProduct) {
    toast.error("الرجاء اختيار منتج أولاً.");
    return;
  }

  const qty = Number(tempQuantity);

  if (!qty || qty < 1) {
    toast.error("الكمية يجب أن تكون 1 أو أكثر.");
    return;
  }

  // ✅ استخدم نفس نظام التحويل المستخدم في checkout
  const multiplier = (() => {
    if (tempUnit === "علبة") return 1;

    if (
      ["شريط", "strip"].includes(tempUnit?.toLowerCase?.())
    ) {
      return Number(selectedProduct.stripsPerBox || 1);
    }

    if (
      ["قرص", "كبسولة", "قطعة", "لبوسة"].includes(tempUnit)
    ) {
      const strips = Number(selectedProduct.stripsPerBox || 1);
      const pills = Number(tempPillsPerStrip || 1);

      return strips * pills;
    }

    return 1;
  })();

  // ✅ حول المطلوب لوحدة التخزين الأساسية (علبة)
  const requiredBoxes = qty / multiplier;

  // ✅ الكمية الحالية بالمخزن (علب)
  const availableBoxes = Number(selectedProduct.quantity || 0);

  if (availableBoxes <= 0) {
    toast.error("المنتج غير متوفر في المخزون.");
    return;
  }

  // ✅ مقارنة صحيحة بعد التحويل
  if (requiredBoxes > availableBoxes) {
    toast.error(
      `الكمية المطلوبة (${qty} ${tempUnit}) أكبر من المتوفرة`
    );
    return;
  }

  try {
    if (typeof handleAddProduct === "function") {
      handleAddProduct(selectedProduct, {
        unit: tempUnit,
        quantity: qty,
        expiry: tempExpiry === "no-expiry" ? null : tempExpiry,
      });

      setTempQuantity(1);

      toast.success("تمت إضافة المنتج بنجاح 🛍️");
    } else {
      toast.error("خطأ تقني: لم يتم العثور على معالج الإضافة.");
    }
  } catch (err) {
    console.error("خطأ عند إضافة المنتج:", err);
    toast.error("حدث خطأ أثناء إضافة المنتج، حاول مجددًا.");
  }
};

  return (
    <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
      <DialogContent className="max-w-4xl p-0 border-none overflow-hidden rounded-[32px] glass-morphism shadow-2xl" dir="rtl">
        <div className="absolute top-0 left-0 right-0 h-1 premium-gradient" />

        <DialogHeader className="p-8 pb-4">
          <DialogTitle className="text-2xl font-black text-primary flex items-center gap-3">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
              <Search className="h-5 w-5" />
            </div>
            البحث عن دواء
          </DialogTitle>
        </DialogHeader>

        <div className="px-8 pb-8 space-y-6">
          <div className="relative">
            <Input
              id="ai-search-input"
              placeholder="اكتب اسم الدواء أو الباركود..."
              onChange={handleSearchChange}
              className="h-14 pr-12 font-bold rounded-2xl bg-muted/20 border-border/50 focus:border-primary transition-all shadow-inner text-lg"
            />
            <Search className="absolute right-4 top-4.5 h-5 w-5 text-muted-foreground opacity-50" />
          </div>

          <div className="rounded-[24px] border border-border/40 overflow-hidden bg-background/30 backdrop-blur-md max-h-[400px] overflow-y-auto custom-scrollbar">
            <Table>
              <TableHeader className="bg-muted/50 sticky top-0 z-10">
                <TableRow className="hover:bg-transparent border-border/40">
                  <TableHead className="text-right font-black text-[11px] uppercase tracking-wider text-primary py-4">الاسم</TableHead>
                  <TableHead className="text-center font-black text-[11px] uppercase tracking-wider text-primary">باركود</TableHead>
                  <TableHead className="text-center font-black text-[11px] uppercase tracking-wider text-primary">الكمية</TableHead>
                  <TableHead className="text-center font-black text-[11px] uppercase tracking-wider text-primary">السعر</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Object.entries(grouped).map(([name, variantsList]) => {
                  const earliest = [...variantsList]
                    .sort((a, b) => {
                      const dateA = a.expiryDate ? new Date(a.expiryDate) : new Date(8640000000000000);
                      const dateB = b.expiryDate ? new Date(b.expiryDate) : new Date(8640000000000000);
                      return dateA - dateB;
                    })[0];

                  const isSelected = selectedProduct?.name === name;

                  return (
                    <TableRow
                      key={name}
                      onClick={() => {
                        setVariants(variantsList);
                        setSelectedProduct(earliest);
                        setTempUnit(earliest.unitOptions?.[0] ?? earliest.unit ?? "علبة");
                        setTempExpiry(earliest.expiryDate ?? "no-expiry");
                        setTempPillsPerStrip(10);
                        setTempQuantity(1);
                      }}
                      className={cn(
                        "cursor-pointer transition-all border-border/20 group",
                        isSelected ? "bg-primary/10" : "hover:bg-muted/30"
                      )}
                    >
                      <TableCell className={cn("font-bold text-sm py-4", isSelected && "text-primary")}>
                        {name}
                      </TableCell>
                      <TableCell className="text-center text-[11px] font-bold text-muted-foreground/70">
                        {earliest.barcode}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className={cn(
                          "px-2 py-0.5 rounded-full text-[10px] font-black",
                          earliest.quantity < 5 ? "bg-destructive/10 text-destructive" : "bg-muted/50 text-muted-foreground"
                        )}>
                          {earliest.quantity}
                        </span>
                      </TableCell>
                      <TableCell className="text-center font-black text-primary">
                        {earliest.price}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>

          {selectedProduct && (
            <Card className="glass-morphism border-primary/20 bg-primary/5 rounded-[28px] p-6 animate-in slide-in-from-bottom-2">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Layers className="h-3 w-3 text-primary" />
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">الكمية</label>
                  </div>
                  <Input
                    type="number"
                    value={tempQuantity}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      setTempQuantity(val < 1 ? 1 : val);
                    }}
                    className="h-11 font-black text-center bg-background rounded-xl border-border/40"
                  />
                </div>

                <div className="space-y-2">
                  <div className="flex items-center gap-2 mb-1">
                    <Package className="h-3 w-3 text-primary" />
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">الوحدة</label>
                  </div>
                  <Select value={tempUnit} onValueChange={setTempUnit}>
                    <SelectTrigger className="h-11 font-bold bg-background rounded-xl border-border/40">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="glass-morphism rounded-xl">
                      {(selectedProduct?.unitOptions || ["علبة"]).map((u, i) => (
                        <SelectItem key={i} value={typeof u === 'string' ? u : u.value} className="font-bold">
                          {typeof u === 'string' ? u : u.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {["قرص", "كبسولة", "قطعة", "لبوسة"].includes(tempUnit) && (
                    <div className="flex items-center gap-2 mt-2 bg-primary/5 p-2 rounded-xl">
                      <label className="text-[10px] font-black uppercase text-primary tracking-widest whitespace-nowrap">عدد الأقراص في الشريط</label>
                      <Input
                        type="number"
                        value={tempPillsPerStrip}
                        onChange={(e) => {
                          const val = Number(e.target.value);
                          setTempPillsPerStrip(val < 1 ? 1 : val);
                        }}
                        className="h-8 font-black text-center bg-background rounded-lg border-border/40 p-0 text-xs w-16"
                      />
                    </div>
                  )}
                </div>

                {selectedProduct?._id !== "agel" && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="h-3 w-3 text-primary" />
                      <label className="text-[10px] font-black uppercase text-primary tracking-widest leading-none">الصلاحية</label>
                    </div>
                    <Select value={tempExpiry} onValueChange={(val) => {
                      const newVariant = variants.find(v => (v.expiryDate ?? "no-expiry") === val);
                      if (newVariant) {
                        setSelectedProduct(newVariant);
                        setTempExpiry(newVariant.expiryDate ?? "no-expiry");
                        setTempUnit(newVariant.unitOptions?.[0] ?? newVariant.unit ?? "علبة");
                        setTempPillsPerStrip(10);
                        setTempQuantity(1);
                      }
                    }}>
                      <SelectTrigger className="h-11 font-bold bg-background rounded-xl border-border/40">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-morphism rounded-xl">
                        {variants.map((v, i) => (
                          <SelectItem key={i} value={v.expiryDate ?? "no-expiry"} className="font-bold">
                            {v.expiryDate ? new Date(v.expiryDate).toLocaleDateString("en-GB") : "بدون صلاحية"}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <Button
                  id="ai-add-btn"
                  onClick={validateAndAdd}
                  className="h-12 rounded-xl premium-gradient font-black tracking-widest uppercase shadow-lg shadow-primary/20 transition-all"
                >
                  <ShoppingCart className="ml-2 h-4 w-4" /> إضافة
                </Button>
              </div>
            </Card>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ProductSelectDialog;
