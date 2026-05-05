"use client";

import React, { useEffect, useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
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
import { Trash2, Plus, Receipt, PackageSearch } from "lucide-react";
import { typesWithUnits, getMultiplier } from "../lib/unitOptions";
import { cn } from "@/lib/utils";

const ProductsTable = ({ items, setItems, setShowSearch, onDelete }) => {
  const [deleteIndex, setDeleteIndex] = useState(null);
  const [dragOverRow, setDragOverRow] = useState(null);

  const knownUnits = {
    ...typesWithUnits,
    agel: ["جنيه"],
  };



  const recalculateItem = (item) => {
    const full = item.fullProduct || {};
    const type = item.type || full.type;
    const price = parseFloat(item.price ?? full.price ?? 0);
    const quantity = parseFloat(item.quantity ?? 0);
    const unit = item.unit;
    const pillsPerStrip = Number(item.pillsPerStrip || 10);

    if (type === "agel") {
      return { ...item, total: quantity * price, remaining: "-" };
    }

    const originalQuantity = parseFloat(full.quantity ?? 0);
    const multiplier = getMultiplier(full, unit, pillsPerStrip);

    const sold = quantity / multiplier;
    const remainingQty = Math.max(0, originalQuantity - sold);

    const basePrice = parseFloat(full.price || 0);
    const unitPrice = basePrice / multiplier;

    const total = quantity * unitPrice;
    const remaining = `${remainingQty.toFixed(2)}`;

    return { ...item, total, remaining };
  };

  const recalcAndSet = (updatedItems) => {
    const recalculated = updatedItems.map(recalculateItem);
    setItems(recalculated);
  };

  const handleQuantityChange = (index, newQuantity) => {
    const qty = Number(newQuantity);
    if (qty < 0) return;

    const updated = [...items];
    updated[index] = { ...updated[index], quantity: qty };
    recalcAndSet(updated);
  };

  const handleUnitChange = (index, newUnit) => {
    const updated = [...items];
    updated[index] = { ...updated[index], unit: newUnit };
    recalcAndSet(updated);
  };

  const handlePillsChange = (index, val) => {
    const qty = Number(val);
    if (qty <= 0) return;
    const updated = [...items];
    updated[index] = { ...updated[index], pillsPerStrip: qty };
    recalcAndSet(updated);
  };

  const confirmDelete = () => {
    onDelete(deleteIndex);
    setDeleteIndex(null);
  };

  const handleRowDragStart = (e, draggedIndex) => {
    e.dataTransfer.setData("application/json", JSON.stringify({ draggedIndex }));
  };

  const handleRowDragOver = (e, targetIndex) => {
    e.preventDefault();
    setDragOverRow(targetIndex);
  };

  const handleRowDrop = (e, targetIndex) => {
    e.preventDefault();
    setDragOverRow(null);

    try {
      const droppedData = JSON.parse(e.dataTransfer.getData("application/json"));
      const draggedIndex = droppedData.draggedIndex;

      if (draggedIndex === targetIndex) return;

      const draggedItem = items[draggedIndex];
      const targetItem = items[targetIndex];

      const sameName = draggedItem.name === targetItem.name;
      const sameExpiry =
        (draggedItem.expiry ? new Date(draggedItem.expiry).toISOString().slice(0, 10) : "") ===
        (targetItem.expiry ? new Date(targetItem.expiry).toISOString().slice(0, 10) : "");

      if (sameName && sameExpiry) {
        const targetConversion = parseFloat(targetItem.fullProduct?.unitConversion ?? targetItem.unitConversion ?? 1);
        const draggedConversion = parseFloat(draggedItem.fullProduct?.unitConversion ?? draggedItem.unitConversion ?? 1);

        const targetInBoxes = targetItem.unit === "شريط"
          ? parseFloat(targetItem.quantity) / targetConversion
          : parseFloat(targetItem.quantity);

        const draggedInBoxes = draggedItem.unit === "شريط"
          ? parseFloat(draggedItem.quantity) / draggedConversion
          : parseFloat(draggedItem.quantity);

        const newTotalBoxes = targetInBoxes + draggedInBoxes;

        const updatedItems = [...items];
        updatedItems[targetIndex] = {
          ...updatedItems[targetIndex],
          quantity: newTotalBoxes,
          unit: "علبة"
        };

        updatedItems.splice(draggedIndex, 1);
        recalcAndSet(updatedItems);
      }
    } catch (err) {
      console.error("Invalid row drop data", err);
    }
  };

  useEffect(() => {
    recalcAndSet(items);
  }, []);

  return (
    <div className="glass-morphism rounded-[32px] p-6 mb-6 mt-4 border-none shadow-2xl relative overflow-hidden">
      <div className="absolute top-0 left-0 right-0 h-1 premium-gradient opacity-50" />

      <div className="flex items-center justify-between mb-8">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-primary/10 border border-primary/20">
            <Receipt className="h-6 w-6 text-primary" />
          </div>
          <div>
            <h2 className="text-xl font-black tracking-tight uppercase">🧾 فاتورة المبيعات</h2>
            <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">
              Sales Invoice Management
            </p>
          </div>
        </div>
        <div className="px-4 py-2 rounded-full bg-muted/50 border border-border/50 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          {items.length} Products
        </div>
      </div>

      <div className="rounded-2xl border border-border/40 overflow-hidden bg-background/30 backdrop-blur-md">
        <Table className="relative">
          <TableHeader className="bg-muted/50">
            <TableRow className="hover:bg-transparent border-border/40">
              {["المنتج", "سعر الوحدة", "الكمية", "الوحدة", "الصلاحية", "المخزون", "الإجمالي", ""].map((h, i) => (
                <TableHead key={i} className="text-center font-black text-[11px] uppercase tracking-wider text-primary py-4">
                  {h}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item, i) => {
              const full = item.fullProduct || {};
              const recalculated = recalculateItem(item);
              const remainingNumber = parseFloat(recalculated.remaining);
              const isLowStock = !isNaN(remainingNumber) && remainingNumber < 5;

              const unitOptions =
                item.unitOptions?.map((u) => (typeof u === "string" ? u : u.value)) ||
                full.unitOptions?.map((u) => (typeof u === "string" ? u : u.value)) ||
                (full.unit ? [full.unit] : []);

              return (
                <TableRow
                  key={i}
                  draggable
                  onDragStart={(e) => handleRowDragStart(e, i)}
                  onDragOver={(e) => handleRowDragOver(e, i)}
                  onDrop={(e) => handleRowDrop(e, i)}
                  className={cn(
                    "transition-all duration-300 border-border/20 group",
                    dragOverRow === i ? "bg-primary/10" : "hover:bg-muted/30"
                  )}
                >
                  <TableCell className="font-bold text-sm py-4">{item.name}</TableCell>

                  <TableCell className="text-center font-bold text-muted-foreground/80">
                    {(recalculated.total / (item.quantity || 1)).toFixed(2)}
                  </TableCell>

                  <TableCell className="text-center">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleQuantityChange(i, e.target.value)}
                      className="w-20 mx-auto text-center h-9 font-black bg-muted/20 border-border/30 rounded-lg focus:border-primary transition-all"
                    />
                  </TableCell>

                  <TableCell className="text-center align-top relative py-4">
                    <Select
                      value={item.unit}
                      onValueChange={(val) => handleUnitChange(i, val)}
                    >
                      <SelectTrigger className="w-24 mx-auto h-9 font-bold bg-muted/20 border-border/30 rounded-lg">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="glass-morphism rounded-xl">
                        {unitOptions.map((u, idx) => (
                          <SelectItem key={idx} value={u} className="font-bold">{u}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    
                    {["قرص", "كبسولة", "قطعة", "لبوسة"].includes(item.unit) && (
                      <div className="flex items-center justify-center gap-1 mt-2">
                        <Input
                          type="number"
                          value={item.pillsPerStrip || 10}
                          onChange={(e) => handlePillsChange(i, e.target.value)}
                          className="w-12 h-6 text-center text-[10px] font-black bg-muted/20 border-border/30 rounded focus:border-primary p-0"
                          title="عدد الأقراص في الشريط الواحد"
                        />
                        <span className="text-[9px] text-muted-foreground font-bold">قرص/شريط</span>
                      </div>
                    )}
                  </TableCell>

                  <TableCell className="text-center text-[11px] font-bold text-muted-foreground/70">
                    {item.expiry ? new Date(item.expiry).toLocaleDateString("ar-EG") : "—"}
                  </TableCell>

                  <TableCell className="text-center">
                    <span className={cn(
                      "px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-tight",
                      isLowStock ? "bg-destructive/10 text-destructive border border-destructive/20" : "bg-primary/10 text-primary border border-primary/20"
                    )}>
                      {recalculated.remaining}
                    </span>
                  </TableCell>

                  <TableCell className="text-center font-black text-primary text-base">
                    {recalculated.total.toFixed(2)}
                  </TableCell>

                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setDeleteIndex(i)}
                      className="h-8 w-8 text-destructive/50 hover:text-destructive hover:bg-destructive/10 rounded-lg transition-all"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}

            <TableRow
              onClick={() => setShowSearch(true)}
              className="hover:bg-muted/50 transition-colors cursor-pointer border-none"
            >
              <TableCell colSpan={8} className="py-8">
                <div className="flex flex-col items-center justify-center gap-2 group">
                  <div className="h-14 w-14 rounded-full border-2 border-dashed border-primary/30 flex items-center justify-center text-primary/50 group-hover:scale-110 group-hover:border-primary group-hover:text-primary transition-all duration-300 shadow-inner">
                    <Plus className="h-6 w-6" />
                  </div>
                  <span className="text-sm font-black text-primary opacity-60 group-hover:opacity-100 transition-opacity">أضف منتج جديد للقائمة</span>
                </div>
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </div>

      <Dialog open={deleteIndex !== null} onOpenChange={(val) => !val && setDeleteIndex(null)}>
        <DialogContent className="glass-morphism border-none rounded-[32px] p-8 max-w-sm">
          <DialogHeader className="space-y-4 text-center">
            <div className="mx-auto h-16 w-16 rounded-3xl bg-destructive/10 flex items-center justify-center border border-destructive/20">
              <Trash2 className="h-8 w-8 text-destructive" />
            </div>
            <DialogTitle className="text-2xl font-black uppercase tracking-tight">تأكيد الحذف</DialogTitle>
            <DialogDescription className="text-xs font-bold uppercase tracking-widest opacity-70">
              Are you sure you want to remove this item?
            </DialogDescription>
          </DialogHeader>
          <div className="pt-4 flex gap-3">
            <Button
              variant="destructive"
              className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest shadow-lg shadow-destructive/20"
              onClick={confirmDelete}
            >
              حذف
            </Button>
            <Button
              variant="secondary"
              className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest"
              onClick={() => setDeleteIndex(null)}
            >
              إلغاء
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ProductsTable;
