"use client";

import React, { useState, useRef, useCallback } from "react";
import axios from "axios";
import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";
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
  Plus,
  Trash2,
  Save,
  Layers,
  ScanBarcode,
  Calendar,
  DollarSign,
  Boxes,
  Receipt,
  Building2,
  CheckCircle2,
  X,
  ArrowDown,
  Copy,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";

/* ─── Empty batch template ─── */
const emptyBatch = () => ({
  id: crypto.randomUUID(),
  barcode: "",
  quantity: "",
  purchasePrice: "",
  salePrice: "",
  expiryDate: "",
  supplier: "",
  invoiceNumber: "",
});

/* ─── Tiny cell editor ─── */
const Cell = ({ value, onChange, type = "text", placeholder = "", className, onKeyDown, inputRef }) => (
  <Input
    ref={inputRef}
    type={type}
    value={value}
    onChange={(e) => onChange(e.target.value)}
    onKeyDown={onKeyDown}
    placeholder={placeholder}
    className={cn(
      "h-9 border-transparent bg-transparent hover:bg-muted/40 focus:bg-background focus:border-primary/40 rounded-xl font-semibold text-sm transition-all text-center",
      className
    )}
  />
);

/* ─── Main Component ─── */
const BatchEntryDialog = ({ open, onClose, productName, productId, onSuccess, suppliers = [] }) => {
  const [batches, setBatches] = useState([emptyBatch()]);
  const [submitting, setSubmitting] = useState(false);
  const lastRowRef = useRef(null);

  /* ── batch row ops ── */
  const updateBatch = useCallback((id, field, value) => {
    setBatches(prev => prev.map(b => b.id === id ? { ...b, [field]: value } : b));
  }, []);

  const addRow = useCallback((copyFrom = null) => {
    const newRow = copyFrom
      ? { ...emptyBatch(), supplier: copyFrom.supplier, invoiceNumber: copyFrom.invoiceNumber, purchasePrice: copyFrom.purchasePrice, salePrice: copyFrom.salePrice, expiryDate: copyFrom.expiryDate }
      : emptyBatch();
    setBatches(prev => [...prev, newRow]);
    // Focus the barcode field of the new row after render
    setTimeout(() => lastRowRef.current?.focus(), 50);
  }, []);

  const removeRow = useCallback((id) => {
    setBatches(prev => prev.length > 1 ? prev.filter(b => b.id !== id) : prev);
  }, []);

  const duplicateRow = useCallback((batch) => {
    addRow(batch);
  }, [addRow]);

  /* ── keyboard nav: Enter moves to next cell / adds row ── */
  const handleKeyDown = useCallback((e, batchId, field, fieldOrder) => {
    if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      const fields = ["barcode", "quantity", "purchasePrice", "salePrice", "expiryDate", "supplier", "invoiceNumber"];
      const currentIdx = fields.indexOf(field);
      if (currentIdx < fields.length - 1) {
        // Move to next field in same row
        const nextField = fields[currentIdx + 1];
        document.querySelector(`[data-batch="${batchId}"][data-field="${nextField}"]`)?.focus();
      } else {
        // Last field → add a new row
        addRow(batches.find(b => b.id === batchId));
      }
    }
  }, [addRow, batches]);

  /* ── validate ── */
  const validate = () => {
    for (let i = 0; i < batches.length; i++) {
      const b = batches[i];
      if (!b.barcode.trim()) { toast.error(`الدفعة ${i + 1}: الباركود مطلوب`); return false; }
      if (!b.quantity || parseFloat(b.quantity) <= 0) { toast.error(`الدفعة ${i + 1}: الكمية يجب أن تكون أكبر من صفر`); return false; }
      if (b.purchasePrice === "" || parseFloat(b.purchasePrice) < 0) { toast.error(`الدفعة ${i + 1}: سعر الشراء غير صالح`); return false; }
      if (!b.salePrice || parseFloat(b.salePrice) <= 0) { toast.error(`الدفعة ${i + 1}: سعر البيع مطلوب`); return false; }
      // Check duplicate barcodes within list
      const dupes = batches.filter(x => x.barcode.trim() === b.barcode.trim() && x.id !== b.id);
      if (dupes.length > 0) { toast.error(`الدفعة ${i + 1}: الباركود "${b.barcode}" مكرر`); return false; }
    }
    return true;
  };

  /* ── submit ── */
  const handleSubmit = async () => {
    if (!validate()) return;
    setSubmitting(true);
    try {
      const token = Cookies.get("token");

      // Build the payload: each batch sent as a separate POST (addBatch mode)
      // The API's POST handler will find-or-create the product by name then addBatch
      const payload = batches.map(b => ({
        name: productName,
        // If we have a productId, also send it so the API can find by ID
        ...(productId ? { _id: productId } : {}),
        barcode: b.barcode.trim(),
        quantity: parseFloat(b.quantity),
        purchasePrice: parseFloat(b.purchasePrice),
        salePrice: parseFloat(b.salePrice),
        expiryDate: b.expiryDate ? new Date(b.expiryDate).toISOString() : null,
        supplier: b.supplier.trim() || null,
        invoiceNumber: b.invoiceNumber.trim() || null,
      }));

      await axios.post("/api/products", payload, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success(`تمت إضافة ${batches.length} دفعة بنجاح ✅`);
      setBatches([emptyBatch()]);
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      const msg = err?.response?.data?.error || "فشل في إضافة الدفعات";
      toast.error(`❌ ${msg}`);
    } finally {
      setSubmitting(false);
    }
  };

  /* ── summary stats ── */
  const totalQty = batches.reduce((s, b) => s + (parseFloat(b.quantity) || 0), 0);
  const totalCost = batches.reduce((s, b) => s + (parseFloat(b.quantity) || 0) * (parseFloat(b.purchasePrice) || 0), 0);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent
        className="max-w-[98vw] w-[1100px] max-h-[90vh] p-0 border-none overflow-hidden rounded-[28px] shadow-2xl flex flex-col"
        dir="rtl"
      >
        {/* ── top accent ── */}
        <div className="absolute top-0 inset-x-0 h-1 rounded-t-[28px] bg-gradient-to-r from-primary via-[oklch(0.7_0.2_220)] to-[oklch(0.75_0.18_260)]" />

        {/* ── Header ── */}
        <div className="px-6 pt-6 pb-4 border-b border-border/30 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center shadow-inner">
              <Layers className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-black tracking-tight leading-tight">إدخال الدفعات</h2>
              <p className="text-[11px] font-bold text-primary/70 mt-0.5 flex items-center gap-1.5">
                <span className="inline-block px-2 py-0.5 rounded-full bg-primary/10 border border-primary/20 text-primary font-black">{productName}</span>
                <span className="text-muted-foreground/60">·</span>
                <span className="text-muted-foreground/60">{batches.length} دفعة</span>
              </p>
            </div>
          </div>

          {/* Summary pills */}
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
              <Boxes className="h-3.5 w-3.5 text-emerald-500" />
              <span className="text-xs font-black text-emerald-600 dark:text-emerald-400">{totalQty.toLocaleString("ar-EG")} وحدة</span>
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-blue-500/10 border border-blue-500/20">
              <DollarSign className="h-3.5 w-3.5 text-blue-500" />
              <span className="text-xs font-black text-blue-600 dark:text-blue-400">{totalCost.toFixed(2)} ج.م</span>
            </div>
            <button
              onClick={onClose}
              className="h-8 w-8 rounded-xl hover:bg-muted/60 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* ── Table ── */}
        <div className="flex-1 overflow-auto min-h-0">
          <table className="w-full text-sm border-collapse">
            <thead className="sticky top-0 z-10 bg-background/80 backdrop-blur-xl">
              <tr className="border-b border-border/30">
                <th className="w-8 px-2 py-3 text-center text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">#</th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">
                  <span className="flex items-center justify-center gap-1"><Hash className="h-3 w-3" /> الباركود</span>
                </th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">
                  <span className="flex items-center justify-center gap-1"><Boxes className="h-3 w-3" /> الكمية</span>
                </th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">
                  <span className="flex items-center justify-center gap-1"><DollarSign className="h-3 w-3" /> شراء</span>
                </th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest text-primary/80">
                  <span className="flex items-center justify-center gap-1"><DollarSign className="h-3 w-3 text-primary" /> بيع</span>
                </th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">
                  <span className="flex items-center justify-center gap-1"><Calendar className="h-3 w-3" /> الانتهاء</span>
                </th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">
                  <span className="flex items-center justify-center gap-1"><Building2 className="h-3 w-3" /> المورد</span>
                </th>
                <th className="px-3 py-3 text-center text-[10px] font-black text-muted-foreground/70 uppercase tracking-widest">
                  <span className="flex items-center justify-center gap-1"><Receipt className="h-3 w-3" /> الفاتورة</span>
                </th>
                <th className="w-20 px-2 py-3 text-center text-[10px] font-black text-muted-foreground/50 uppercase tracking-widest">إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {batches.map((batch, idx) => {
                const isLast = idx === batches.length - 1;
                const rowCost = (parseFloat(batch.quantity) || 0) * (parseFloat(batch.purchasePrice) || 0);
                return (
                  <tr
                    key={batch.id}
                    className={cn(
                      "border-b border-border/15 transition-colors group hover:bg-primary/3",
                      idx % 2 === 0 ? "bg-transparent" : "bg-muted/10"
                    )}
                  >
                    {/* Row number */}
                    <td className="px-2 py-1.5 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-[11px] font-black text-primary/50 w-6 h-6 rounded-lg bg-primary/8 flex items-center justify-center">
                          {idx + 1}
                        </span>
                      </div>
                    </td>

                    {/* Barcode */}
                    <td className="px-1.5 py-1.5">
                      <div className="relative">
                        <Input
                          data-batch={batch.id}
                          data-field="barcode"
                          ref={isLast ? lastRowRef : undefined}
                          value={batch.barcode}
                          onChange={(e) => updateBatch(batch.id, "barcode", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, batch.id, "barcode")}
                          placeholder="باركود الدفعة..."
                          className="h-9 pr-8 border-transparent hover:border-border/40 hover:bg-muted/40 focus:bg-background focus:border-primary/50 rounded-xl font-mono text-sm transition-all"
                        />
                        <ScanBarcode className="absolute right-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/30" />
                      </div>
                    </td>

                    {/* Quantity */}
                    <td className="px-1.5 py-1.5">
                      <Input
                        data-batch={batch.id}
                        data-field="quantity"
                        type="number"
                        value={batch.quantity}
                        onChange={(e) => updateBatch(batch.id, "quantity", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, batch.id, "quantity")}
                        placeholder="0"
                        className="h-9 border-transparent hover:border-border/40 hover:bg-muted/40 focus:bg-background focus:border-primary/50 rounded-xl font-black text-center text-primary transition-all"
                      />
                    </td>

                    {/* Purchase price */}
                    <td className="px-1.5 py-1.5">
                      <Input
                        data-batch={batch.id}
                        data-field="purchasePrice"
                        type="number"
                        value={batch.purchasePrice}
                        onChange={(e) => updateBatch(batch.id, "purchasePrice", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, batch.id, "purchasePrice")}
                        placeholder="0.00"
                        className="h-9 border-transparent hover:border-border/40 hover:bg-muted/40 focus:bg-background focus:border-border/50 rounded-xl font-bold text-center text-xs transition-all"
                      />
                    </td>

                    {/* Sale price */}
                    <td className="px-1.5 py-1.5">
                      <div className="relative">
                        <Input
                          data-batch={batch.id}
                          data-field="salePrice"
                          type="number"
                          value={batch.salePrice}
                          onChange={(e) => updateBatch(batch.id, "salePrice", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, batch.id, "salePrice")}
                          placeholder="0.00"
                          className="h-9 border-transparent bg-primary/5 hover:bg-primary/8 focus:bg-primary/10 focus:border-primary/30 rounded-xl font-black text-center text-sm text-primary transition-all"
                        />
                      </div>
                    </td>

                    {/* Expiry */}
                    <td className="px-1.5 py-1.5">
                      <Input
                        data-batch={batch.id}
                        data-field="expiryDate"
                        type="date"
                        value={batch.expiryDate}
                        onChange={(e) => updateBatch(batch.id, "expiryDate", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, batch.id, "expiryDate")}
                        className="h-9 border-transparent hover:border-border/40 hover:bg-muted/40 focus:bg-background focus:border-border/50 rounded-xl font-semibold text-xs transition-all"
                      />
                    </td>

                    {/* Supplier */}
                    <td className="px-1.5 py-1.5">
                      {suppliers.length > 0 ? (
                        <Select
                          value={batch.supplier}
                          onValueChange={(v) => updateBatch(batch.id, "supplier", v)}
                        >
                          <SelectTrigger className="h-9 border-transparent hover:border-border/40 bg-transparent hover:bg-muted/40 rounded-xl text-xs font-semibold">
                            <SelectValue placeholder="المورد..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {suppliers.map(s => (
                              <SelectItem key={s} value={s} className="text-xs font-semibold">{s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      ) : (
                        <Input
                          data-batch={batch.id}
                          data-field="supplier"
                          value={batch.supplier}
                          onChange={(e) => updateBatch(batch.id, "supplier", e.target.value)}
                          onKeyDown={(e) => handleKeyDown(e, batch.id, "supplier")}
                          placeholder="المورد..."
                          className="h-9 border-transparent hover:border-border/40 hover:bg-muted/40 focus:bg-background focus:border-border/50 rounded-xl font-semibold text-xs transition-all"
                        />
                      )}
                    </td>

                    {/* Invoice */}
                    <td className="px-1.5 py-1.5">
                      <Input
                        data-batch={batch.id}
                        data-field="invoiceNumber"
                        value={batch.invoiceNumber}
                        onChange={(e) => updateBatch(batch.id, "invoiceNumber", e.target.value)}
                        onKeyDown={(e) => handleKeyDown(e, batch.id, "invoiceNumber")}
                        placeholder="رقم الفاتورة..."
                        className="h-9 border-transparent hover:border-border/40 hover:bg-muted/40 focus:bg-background focus:border-border/50 rounded-xl font-semibold text-xs transition-all"
                      />
                    </td>

                    {/* Actions */}
                    <td className="px-2 py-1.5">
                      <div className="flex items-center justify-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        {/* Duplicate (copy invoice/price into new row) */}
                        <button
                          onClick={() => duplicateRow(batch)}
                          className="h-7 w-7 rounded-lg hover:bg-primary/15 text-muted-foreground hover:text-primary transition-all flex items-center justify-center"
                          title="تكرار الدفعة"
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </button>
                        {/* Delete */}
                        <button
                          onClick={() => removeRow(batch.id)}
                          disabled={batches.length === 1}
                          className="h-7 w-7 rounded-lg hover:bg-destructive/15 text-muted-foreground hover:text-destructive transition-all flex items-center justify-center disabled:opacity-30 disabled:cursor-not-allowed"
                          title="حذف الدفعة"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                      {/* Row cost pill */}
                      {rowCost > 0 && (
                        <div className="text-[9px] font-black text-muted-foreground/30 text-center mt-0.5">
                          {rowCost.toFixed(0)} ج
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* ── Footer ── */}
        <div className="px-6 py-4 border-t border-border/30 flex items-center justify-between shrink-0 bg-muted/5">
          {/* Add row button */}
          <button
            onClick={() => addRow(batches[batches.length - 1])}
            className="flex items-center gap-2 h-9 px-4 rounded-2xl border-2 border-dashed border-primary/30 text-primary/70 hover:border-primary/60 hover:text-primary hover:bg-primary/5 transition-all text-xs font-black"
          >
            <Plus className="h-4 w-4" />
            إضافة دفعة جديدة
            <span className="text-[10px] opacity-50 font-semibold">(Enter)</span>
          </button>

          {/* Shortcut hint */}
          <div className="hidden md:flex items-center gap-1.5 text-[10px] font-semibold text-muted-foreground/40">
            <ArrowDown className="h-3 w-3" />
            <span>Enter للتنقل بين الحقول · آخر حقل ينشئ صف جديد</span>
          </div>

          {/* Submit */}
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              onClick={onClose}
              className="h-10 px-5 rounded-2xl font-black text-muted-foreground hover:text-foreground"
              disabled={submitting}
            >
              إلغاء
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={submitting || batches.every(b => !b.barcode.trim())}
              className="h-10 px-6 rounded-2xl premium-gradient text-white font-black shadow-lg shadow-primary/25 hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-2"
            >
              {submitting ? (
                <span className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="h-4 w-4" />
              )}
              حفظ {batches.length} دفعة
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BatchEntryDialog;
