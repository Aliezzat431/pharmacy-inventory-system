"use client";

import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
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
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
    FileText,
    RefreshCw,
    Printer,
    Download,
    AlertCircle,
    Clock,
    Ban,
    Building2,
    Calendar,
    X,
    PieChart,
    Filter
} from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";
import ShortcomingInvoiceModal from "@/app/components/shortcomingInvoiceModal";

const InventoryReport = () => {
    const [tab, setTab] = useState("shortcomings");
    const [loading, setLoading] = useState(true);
    const [reportData, setReportData] = useState({
        shortcomings: [],
        expiringSoon: [],
        expired: [],
        threshold: 5
    });
    const [companies, setCompanies] = useState([]);
    const [filteredCompany, setFilteredCompany] = useState("all");
    const [invoiceOpen, setInvoiceOpen] = useState(false);
    const [pharmacyInfo, setPharmacyInfo] = useState({});

    const fetchData = async () => {
        setLoading(true);
        try {
            const token = Cookies.get("token");
            const [reportRes, companiesRes, settingsRes] = await Promise.all([
                axios.get("/api/reports/inventory", {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("/api/companies", {
                    headers: { Authorization: `Bearer ${token}` }
                }),
                axios.get("/api/settings", {
                    headers: { Authorization: `Bearer ${token}` }
                })
            ]);

            if (reportRes.data.success) {
                setReportData(reportRes.data.data);
            }
            setCompanies(companiesRes.data || []);
            if (settingsRes.data.success) {
                setPharmacyInfo(settingsRes.data.settings);
            }
        } catch (err) {
            console.error(err);
            toast.error("فشل في تحميل تقارير المخزون ❌");
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const activeList = useMemo(() => {
        const list = tab === "shortcomings" ? reportData.shortcomings : tab === "expiringSoon" ? reportData.expiringSoon : reportData.expired;
        if (filteredCompany === "all") return list;
        return list.filter(p => p.company === filteredCompany);
    }, [tab, reportData, filteredCompany]);

    const handleExport = (data, filename) => {
        const headers = ["الاسم", "الكمية", "الوحدة", "تاريخ الانتهاء", "الشركة"];
        const csvContent = [
            headers.join(","),
            ...data.map(p => [
                p.name,
                p.quantity,
                p.unit,
                p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("ar-EG") : "-",
                p.company || "-"
            ].join(","))
        ].join("\n");

        const blob = new Blob(["\ufeff" + csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${filename}.csv`;
        link.click();
        toast.success("تم تصدير التقرير بنجاح ✅");
    };

    const handlePrint = () => {
        setInvoiceOpen(true);
    };

    const renderTable = (data, type) => (
        <Card className="glass-morphism border-none shadow-2xl overflow-hidden rounded-[28px] animate-in fade-in slide-in-from-bottom-4 duration-500">
            <Table>
                <TableHeader className="bg-primary/5">
                    <TableRow className="hover:bg-transparent border-b border-primary/10">
                        <TableHead className="text-right font-black">المنتج</TableHead>
                        <TableHead className="text-center font-black">الكمية المتبقية</TableHead>
                        <TableHead className="text-center font-black">الحالة</TableHead>
                        <TableHead className="text-center font-black">تاريخ الانتهاء</TableHead>
                        <TableHead className="text-center font-black">الشركة</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {data.map((p) => (
                        <TableRow key={p._id} className="hover:bg-primary/5 transition-colors group border-b border-white/5 last:border-0">
                            <TableCell className="font-black text-lg py-5 italic opacity-80 group-hover:opacity-100 transition-opacity">
                                {p.name}
                            </TableCell>
                            <TableCell className="text-center">
                                <span className={cn(
                                    "font-black text-xl tracking-tighter",
                                    type === 'short' ? "text-red-500" : "text-primary"
                                )}>
                                    {p.quantity} <span className="text-[10px] italic opacity-60 font-bold uppercase tracking-widest">{p.unit}</span>
                                </span>
                            </TableCell>
                            <TableCell className="text-center">
                                {type === 'short' ? (
                                    <Badge className="bg-red-500 text-white font-black px-3 py-1 rounded-lg shadow-lg shadow-red-500/20">نقص مخزون</Badge>
                                ) : type === 'expired' ? (
                                    <Badge className="bg-destructive text-white font-black px-3 py-1 rounded-lg">منتهي الصلاحية</Badge>
                                ) : (
                                    <Badge className="bg-amber-500 text-white font-black px-3 py-1 rounded-lg">ينتهي قريباً</Badge>
                                )}
                            </TableCell>
                            <TableCell className="text-center">
                                <div className="flex items-center justify-center gap-2 text-sm font-bold opacity-60">
                                    <Calendar className="h-3 w-3" />
                                    {p.expiryDate ? new Date(p.expiryDate).toLocaleDateString("ar-EG") : "—"}
                                </div>
                            </TableCell>
                            <TableCell className="text-center font-bold text-muted-foreground">
                                {p.company || "—"}
                            </TableCell>
                        </TableRow>
                    ))}
                    {data.length === 0 && (
                        <TableRow>
                            <TableCell colSpan={5} className="h-60 text-center">
                                <div className="flex flex-col items-center gap-4 opacity-20">
                                    <X className="h-16 w-16" />
                                    <p className="font-black text-2xl uppercase tracking-[0.2em] italic">No Data Available</p>
                                </div>
                            </TableCell>
                        </TableRow>
                    )}
                </TableBody>
            </Table>
        </Card>
    );

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="h-20 w-20 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="font-black text-primary text-xl animate-pulse italic tracking-widest uppercase">Analyzing Inventory...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-8 no-print" dir="rtl">
            {/* Header Area */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-8 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 p-8 rounded-[40px] shadow-2xl">
                <div className="flex items-center gap-6">
                    <div className="h-16 w-16 rounded-[22px] premium-gradient flex items-center justify-center text-white shadow-2xl shadow-primary/30">
                        <PieChart className="h-8 w-8" />
                    </div>
                    <div>
                        <h1 className="text-4xl font-black text-primary tracking-tighter leading-none mb-2">تقارير المخزون والنواقص</h1>
                        <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40 italic">Inventory Intelligence Report</p>
                    </div>
                </div>

                <div className="flex flex-wrap gap-4 w-full xl:w-auto">
                    <Button
                        onClick={fetchData}
                        variant="ghost"
                        className="h-14 w-14 rounded-2xl bg-white/50 dark:bg-zinc-800 p-0 hover:rotate-180 transition-transform duration-500"
                    >
                        <RefreshCw className="h-6 w-6 text-primary" />
                    </Button>

                    <Button
                        variant="ghost"
                        onClick={handlePrint}
                        className="h-14 px-8 rounded-2xl bg-white/50 dark:bg-zinc-800 border-2 border-primary/20 hover:border-primary font-black text-lg transition-all"
                    >
                        <Printer className="ml-2 h-5 w-5" />
                        طباعة الطلبية (PDF)
                    </Button>

                    <Button
                        onClick={() => handleExport(activeList, "inventory_report")}
                        className="h-14 px-10 rounded-2xl premium-gradient text-white font-black text-lg shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                    >
                        <Download className="ml-2 h-5 w-5" />
                        تصدير البيانات (CSV)
                    </Button>
                </div>
            </div>

            {/* Sub Header / Filters */}
            <Card className="glass-morphism border-none p-6 shadow-xl flex flex-col md:flex-row items-center gap-6">
                <div className="flex items-center gap-4 flex-1 w-full">
                    <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary shrink-0">
                        <Filter className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                        <Select value={filteredCompany} onValueChange={setFilteredCompany}>
                            <SelectTrigger className="h-12 w-full max-w-sm rounded-[14px] bg-white/50 dark:bg-zinc-800/50 border-white/20 dark:border-zinc-800 font-black text-md">
                                <div className="flex items-center gap-2">
                                    <Building2 className="h-4 w-4 opacity-40 shrink-0" />
                                    <SelectValue placeholder="فلترة حسب المورد..." />
                                </div>
                            </SelectTrigger>
                            <SelectContent className="glass-morphism border-white/10 rounded-2xl">
                                <SelectItem value="all" className="font-black">كل الشركات والموردين</SelectItem>
                                {companies.map(c => (
                                    <SelectItem key={c._id} value={c.name} className="font-bold">{c.name}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <div className="h-10 w-px bg-white/10 hidden md:block" />

                <div className="flex items-center gap-4 mr-auto">
                    <div className="text-left">
                        <p className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Filtered Results</p>
                        <p className="text-2xl font-black text-primary italic leading-none">{activeList.length}</p>
                    </div>
                </div>
            </Card>

            {/* Modern Category Selector */}
            <div className="relative flex flex-wrap justify-center gap-4 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-2xl p-3 shadow-2xl rounded-full border border-white/20 dark:border-zinc-800/50 max-w-fit mx-auto overflow-hidden">
                {[
                    { id: "shortcomings", label: "النواقص", count: reportData.shortcomings.length, icon: AlertCircle, color: "text-red-500", bgActive: "bg-gradient-to-tr from-red-600 to-red-400", shadow: "shadow-red-500/40" },
                    { id: "expiringSoon", label: "توشك على الانتهاء", count: reportData.expiringSoon.length, icon: Clock, color: "text-amber-500", bgActive: "bg-gradient-to-tr from-amber-500 to-orange-400", shadow: "shadow-amber-500/40" },
                    { id: "expired", label: "منتهية الصلاحية", count: reportData.expired.length, icon: Ban, color: "text-zinc-800 dark:text-zinc-200", bgActive: "bg-gradient-to-tr from-zinc-800 to-zinc-600 dark:from-zinc-200 dark:to-zinc-400 dark:text-zinc-900 text-white", shadow: "shadow-black/20 dark:shadow-white/20" },
                ].map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setTab(item.id)}
                        className={cn(
                            "relative flex items-center justify-center gap-3 px-8 py-4 rounded-full font-black text-lg transition-all duration-500 ease-out z-10",
                            tab === item.id 
                                ? cn("scale-105", item.id === "expired" ? "text-white dark:text-zinc-900" : "text-white") 
                                : `text-muted-foreground hover:bg-white/50 dark:hover:bg-zinc-800/50 hover:scale-105 hover:${item.color}`
                        )}
                    >
                        {tab === item.id && (
                            <div className={cn("absolute inset-0 rounded-full shadow-2xl -z-10", item.bgActive, item.shadow)} />
                        )}
                        <item.icon className="h-6 w-6" />
                        {item.label}
                        <Badge variant="outline" className={cn(
                            "ml-2 px-2 py-0.5 rounded-full border text-xs font-black transition-colors duration-500",
                            tab === item.id ? "border-white/30 bg-white/20 text-current" : "border-primary/20 bg-primary/5 text-primary"
                        )}>
                            {item.count}
                        </Badge>
                    </button>
                ))}
            </div>

            <div className="mt-8 transition-all duration-700 ease-in-out animate-in fade-in slide-in-from-bottom-8">
                {tab === "shortcomings" && renderTable(activeList, "short")}
                {tab === "expiringSoon" && renderTable(activeList, "soon")}
                {tab === "expired" && renderTable(activeList, "expired")}
            </div>

            <ShortcomingInvoiceModal
                open={invoiceOpen}
                onClose={() => setInvoiceOpen(false)}
                items={activeList}
                pharmacyInfo={pharmacyInfo}
                companyName={filteredCompany}
            />
        </div>
    );
};

export default InventoryReport;
