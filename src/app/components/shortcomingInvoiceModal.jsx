"use client";

import React from "react";
import {
    Dialog,
    DialogContent,
    DialogFooter,
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
import { Button } from "@/components/ui/button";
import { X, Printer, FileText, ClipboardList, Scissors, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

const ShortcomingInvoiceModal = ({ open, onClose, items, pharmacyInfo, companyName }) => {
    const handlePrint = () => {
        window.print();
    };

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-4xl h-[90vh] p-0 border-none overflow-hidden rounded-[32px] glass-morphism shadow-2xl flex flex-col" dir="rtl">
                <style>
                    {`
                        @media print {
                            @page {
                                size: portrait;
                                margin: 10mm;
                            }
                            body * { visibility: hidden; }
                            #invoice-printable, #invoice-printable * { visibility: visible; }
                            #invoice-printable {
                                position: absolute;
                                left: 0;
                                top: 0;
                                width: 100% !important;
                                padding: 0 !important;
                                margin: 0 !important;
                                direction: rtl;
                            }
                            .no-print-action { display: none !important; }
                        }
                    `}
                </style>

                <DialogHeader className="p-8 pb-4 premium-gradient text-white rounded-t-[32px] no-print-action">
                    <div className="flex items-center justify-between">
                        <DialogTitle className="text-2xl font-black flex items-center gap-3">
                            <ClipboardList className="h-6 w-6" />
                            معاينة فاتورة النواقص
                        </DialogTitle>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-white hover:bg-white/20 rounded-xl">
                            <X className="h-5 w-5" />
                        </Button>
                    </div>
                </DialogHeader>

                <DialogContent id="invoice-printable" className="flex-1 p-12 overflow-y-auto space-y-8 custom-scrollbar bg-white" dir="rtl">
                    {/* Header */}
                    <div className="flex justify-between items-start border-b-4 border-primary/20 pb-8">
                        <div className="space-y-2">
                            <h1 className="text-3xl font-black text-primary tracking-tight">
                                {pharmacyInfo.name || "صيدليتك"}
                            </h1>
                            <div className="space-y-0.5 text-muted-foreground font-bold text-sm">
                                <p>{pharmacyInfo.address}</p>
                                <p>{pharmacyInfo.phone}</p>
                            </div>
                        </div>
                        <div className="text-left space-y-2">
                            <div className="bg-primary/10 text-primary px-4 py-2 rounded-2xl inline-block">
                                <h2 className="text-xl font-black uppercase tracking-widest">طلب شراء / نواقص</h2>
                            </div>
                            <div className="space-y-0.5 font-bold text-sm text-muted-foreground uppercase tracking-widest">
                                <p>التاريخ: {new Date().toLocaleDateString("ar-EG")}</p>
                                {companyName !== "all" && (
                                    <p className="text-primary font-black">الشركة: {companyName}</p>
                                )}
                            </div>
                        </div>
                    </div>

                    <p className="text-center font-bold text-muted-foreground italic tracking-wide">
                        {pharmacyInfo.receiptHeader || "قائمة المنتجات المطلوب توفيرها للمخزون"}
                    </p>

                    {/* Table */}
                    <div className="rounded-[24px] border-2 border-border/40 overflow-hidden shadow-sm">
                        <Table className="border-collapse">
                            <TableHeader className="bg-muted/50">
                                <TableRow className="hover:bg-transparent border-b-2 border-border/60">
                                    <TableHead className="text-right w-12 font-black text-xs uppercase tracking-widest py-4 border-l border-border/40">م</TableHead>
                                    <TableHead className="text-right font-black text-xs uppercase tracking-widest border-l border-border/40">اسم المنتج</TableHead>
                                    <TableHead className="text-center w-24 font-black text-xs uppercase tracking-widest border-l border-border/40 text-primary">الكمية</TableHead>
                                    <TableHead className="text-center w-24 font-black text-xs uppercase tracking-widest border-l border-border/40">الوحدة</TableHead>
                                    <TableHead className="text-center font-black text-xs uppercase tracking-widest border-l border-border/40">الشركة</TableHead>
                                    <TableHead className="text-center w-32 font-black text-xs uppercase tracking-widest">ملاحظات</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {items.map((item, index) => (
                                    <TableRow key={index} className="border-b border-border/30 hover:bg-muted/10 transition-colors">
                                        <TableCell className="font-bold text-xs p-3 text-center border-l border-border/30">{index + 1}</TableCell>
                                        <TableCell className="font-black text-base p-3 border-l border-border/30">{item.name}</TableCell>
                                        <TableCell className="text-center font-black text-lg p-3 border-l border-border/30 text-primary">{item.quantity}</TableCell>
                                        <TableCell className="text-center font-bold text-xs p-3 border-l border-border/30 text-muted-foreground">
                                            {typeof item.unit === 'object' ? item.unit.label : item.unit}
                                        </TableCell>
                                        <TableCell className="text-center font-bold text-xs p-3 border-l border-border/30">{item.company || "—"}</TableCell>
                                        <TableCell className="p-3 bg-muted/5"></TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>

                    {/* Summary & Signatures */}
                    <div className="space-y-8">
                        <div className="flex items-center gap-3 py-4 border-y border-dashed border-border/60">
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                            <span className="text-sm font-black text-primary uppercase tracking-widest">
                                إجمالي عدد الأصناف المطلوبة: {items.length} صنف
                            </span>
                        </div>

                        <div className="grid grid-cols-3 gap-12 pt-8">
                            {[
                                "توقيع الصيدلي المسؤول",
                                "توقيع المدير المسؤول",
                                "توقيع المستلم / المندوب"
                            ].map((label, i) => (
                                <div key={i} className="space-y-12 text-center">
                                    <span className="text-xs font-black uppercase tracking-widest leading-none block">{label}</span>
                                    <div className="border-b-2 border-primary/20 w-full" />
                                </div>
                            ))}
                        </div>

                        {/* Stamp & Footer */}
                        <div className="flex flex-col items-center justify-center pt-8 space-y-6">
                            <div className="h-28 w-28 rounded-full border-4 border-dashed border-border/40 flex items-center justify-center rotate-12 opacity-40">
                                <span className="text-[10px] font-black text-muted-foreground uppercase tracking-tighter text-center">Pharmacy<br />Official<br />Stamp</span>
                            </div>

                            <div className="text-center space-y-2 opacity-70">
                                <p className="text-xs font-bold italic">"{pharmacyInfo.receiptFooter || "نعمل دائماً لخدمتكم وتوفير احتياجاتكم"}"</p>
                                <div className="flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-tighter">
                                    <span>{new Date().toLocaleDateString("ar-EG")}</span>
                                    <span className="h-1 w-1 rounded-full bg-primary" />
                                    <span>نظام إدارة الصيدلية الرقمي</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </DialogContent>

                <DialogFooter className="p-6 bg-muted/10 border-t border-border/20 gap-4 no-print-action">
                    <Button onClick={handlePrint} className="flex-1 h-14 rounded-2xl premium-gradient font-black tracking-widest uppercase shadow-xl shadow-primary/20">
                        <Printer className="ml-3 h-5 w-5" /> تأكيد وحفظ للطباعة
                    </Button>
                    <Button onClick={onClose} variant="outline" className="flex-1 h-14 rounded-2xl border-2 font-black uppercase tracking-widest">إغلاق المعاينة</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default ShortcomingInvoiceModal;
