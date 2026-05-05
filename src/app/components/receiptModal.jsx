"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { X, Printer, Scissors, Receipt as ReceiptIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const ReceiptModal = ({ open, onClose, items, total, pharmacyInfo }) => {
    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-[380px] p-0 border-none overflow-hidden rounded-[40px] shadow-2xl bg-white" dir="rtl">
                {/* Visual Top Decoration */}
                <div className="bg-primary/5 p-8 pb-4 text-center space-y-2">
                    <div className="mx-auto h-12 w-12 rounded-full bg-white shadow-sm flex items-center justify-center mb-2">
                        <ReceiptIcon className="h-6 w-6 text-primary" />
                    </div>
                    <h2 className="text-xl font-black text-primary tracking-tight">{pharmacyInfo.name || "صيدليتك"}</h2>
                    <div className="space-y-0.5">
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">{pharmacyInfo.address}</p>
                        <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest leading-tight">{pharmacyInfo.phone}</p>
                    </div>
                </div>

                <div className="px-8 pb-8">
                    {/* Header Info */}
                    <div className="flex justify-between items-center py-4 border-y border-dashed border-border/60">
                        <div className="text-[9px] font-black uppercase tracking-tighter text-muted-foreground/60">
                            {new Date().toLocaleString("ar-EG")}
                        </div>
                        <div className="text-[9px] font-black uppercase tracking-widest text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                            رقم الفاتورة: #INV-{Math.floor(Math.random() * 9000) + 1000}
                        </div>
                    </div>

                    {pharmacyInfo.receiptHeader && (
                        <p className="text-xs font-bold text-center italic py-4 opacity-70 leading-relaxed">
                            "{pharmacyInfo.receiptHeader}"
                        </p>
                    )}

                    {/* Items Table */}
                    <div className="py-4">
                        <Table>
                            <TableHeader className="border-b-2 border-primary/10">
                                <TableRow className="hover:bg-transparent border-none">
                                    <TableHead className="text-right h-8 text-[10px] font-black uppercase tracking-widest text-primary p-1">الصنف</TableHead>
                                    <TableHead className="text-center h-8 text-[10px] font-black uppercase tracking-widest text-primary p-1">الكمية</TableHead>
                                    <TableHead className="text-left h-8 text-[10px] font-black uppercase tracking-widest text-primary p-1">الإجمالي</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={index} className="hover:bg-transparent border-border/10">
                                        <TableCell className="text-xs font-bold p-1 py-3">{item.name}</TableCell>
                                        <TableCell className="text-center text-[11px] font-bold p-1 py-3 text-muted-foreground">
                                            {item.quantity} {typeof item.unit === 'object' ? item.unit.label : item.unit}
                                        </TableCell>
                                        <TableCell className="text-left text-[11px] font-black p-1 py-3">
                                            {item.total.toLocaleString()} <span className="text-[8px] opacity-70">ج.م</span>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Total Section */}
                    <div className="py-6 border-t-2 border-dashed border-border/60 mt-4">
                        <div className="flex justify-between items-center">
                            <div className="text-sm font-black text-muted-foreground uppercase tracking-widest">Grand Total</div>
                            <div className="text-2xl font-black text-primary tracking-tighter">
                                {total.toLocaleString()} <span className="text-xs font-bold">ج.م</span>
                            </div>
                        </div>
                    </div>

                    {pharmacyInfo.receiptFooter && (
                        <div className="text-center pt-4 opacity-60">
                            <div className="flex items-center justify-center gap-2 mb-2">
                                <Scissors className="h-3 w-3 rotate-90" />
                                <div className="flex-1 border-t border-dotted border-border/60" />
                            </div>
                            <p className="text-[10px] font-bold leading-relaxed">{pharmacyInfo.receiptFooter}</p>
                        </div>
                    )}
                </div>

                <DialogFooter className="bg-muted/30 p-4 border-t border-border/40 gap-3">
                    <Button variant="outline" className="flex-1 h-12 rounded-2xl font-black uppercase tracking-widest border-2 border-primary/20 text-primary hover:bg-primary/5">
                        <Printer className="h-4 w-4 ml-2" /> طباعة
                    </Button>
                    <Button onClick={onClose} variant="ghost" className="h-12 w-12 rounded-2xl hover:bg-destructive/10 hover:text-destructive">
                        <X className="h-5 w-5" />
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ReceiptModal;
