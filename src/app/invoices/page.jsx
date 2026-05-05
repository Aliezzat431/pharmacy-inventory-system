"use client";

import React, { useEffect, useState } from "react";
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
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    FileText,
    Search,
    Filter,
    Download,
    X,
    Building2,
    ArrowUpDown,
    Hash,
    Activity,
    DollarSign,
    Receipt,
    Wallet,
    Heart,
    Pencil,
    Save
} from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { exportToCSV } from "../lib/exportToCSV";
import { cn } from "@/lib/utils";
import { supabase } from "../lib/supabase";

// Payment methods: only cash (كاش) and sadaqah (صدقة)
const PAYMENT_METHOD_OPTIONS = [
    { value: "cash",    label: "كاش",  icon: Wallet, color: "bg-emerald-500" },
    { value: "sadaqah", label: "صدقة", icon: Heart,  color: "bg-violet-500" },
];

const PaymentMethodBadge = ({ method }) => {
    const opt = PAYMENT_METHOD_OPTIONS.find(o => o.value === method);
    if (!method || !opt) return <span className="text-muted-foreground text-xs font-bold">—</span>;
    const Icon = opt.icon;
    return (
        <Badge className={cn("gap-1.5 border-none text-white font-black text-xs px-3 py-1 rounded-xl shadow-sm", opt.color)}>
            <Icon className="h-3 w-3" />
            {opt.label}
        </Badge>
    );
};

const InvoicesPage = () => {
    const [invoices, setInvoices] = useState([]);
    const [filteredInvoices, setFilteredInvoices] = useState([]);
    const [suppliers, setSuppliers] = useState([]);
    const [stats, setStats] = useState(null);
    const [userRole, setUserRole] = useState("master");
    const [loading, setLoading] = useState(true);

    // Filter states
    const [searchTerm, setSearchTerm] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem("invoices_search_term") || "";
        return "";
    });
    const [selectedSupplier, setSelectedSupplier] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem("invoices_selected_supplier") || "all";
        return "all";
    });
    const [selectedType, setSelectedType] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem("invoices_selected_type") || "all";
        return "all";
    });
    const [selectedPaymentMethod, setSelectedPaymentMethod] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem("invoices_selected_payment_method") || "all";
        return "all";
    });
    const [startDate, setStartDate] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem("invoices_start_date") || "";
        return "";
    });
    const [endDate, setEndDate] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem("invoices_end_date") || "";
        return "";
    });

    // Sort states
    const [orderBy, setOrderBy] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem("invoices_order_by") || "date";
        return "date";
    });
    const [order, setOrder] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem("invoices_order") || "desc";
        return "desc";
    });

    // Sync to localStorage
    useEffect(() => {
        localStorage.setItem("invoices_search_term", searchTerm);
        localStorage.setItem("invoices_selected_supplier", selectedSupplier);
        localStorage.setItem("invoices_selected_type", selectedType);
        localStorage.setItem("invoices_selected_payment_method", selectedPaymentMethod);
        localStorage.setItem("invoices_start_date", startDate);
        localStorage.setItem("invoices_end_date", endDate);
        localStorage.setItem("invoices_order_by", orderBy);
        localStorage.setItem("invoices_order", order);
    }, [searchTerm, selectedSupplier, selectedType, selectedPaymentMethod, startDate, endDate, orderBy, order]);

    // Edit modal states
    const [editInvoice, setEditInvoice] = useState(null);
    const [editPaymentMethod, setEditPaymentMethod] = useState("cash");
    const [editReason, setEditReason] = useState("");
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        fetchInvoices();

        // Real-time subscription for invoice data
        const invoiceChannel = supabase
            .channel('invoices_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
                fetchInvoices();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'invoices' }, () => {
                fetchInvoices();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(invoiceChannel);
        };
    }, []);

    useEffect(() => {
        applyFilters();
    }, [invoices, searchTerm, selectedSupplier, selectedType, selectedPaymentMethod, startDate, endDate]);

    const fetchInvoices = async () => {
        setLoading(true);
        try {
            const token = Cookies.get("token");
            const res = await axios.get("/api/invoices", {
                headers: { Authorization: `Bearer ${token}` },
            });

            if (res.data.success) {
                setInvoices(res.data.invoices);
                setFilteredInvoices(res.data.invoices);
                setSuppliers(res.data.suppliers);
                setStats(res.data.stats);
                setUserRole(res.data.userRole);
            }
        } catch (err) {
            console.error("Error fetching invoices:", err);
            toast.error("فشل في تحميل الفواتير ❌");
        } finally {
            setLoading(false);
        }
    };

    const applyFilters = () => {
        let filtered = [...invoices];

        if (searchTerm) {
            filtered = filtered.filter((inv) =>
                inv.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                inv.reason?.toLowerCase().includes(searchTerm.toLowerCase())
            );
        }

        if (selectedSupplier !== "all") {
            filtered = filtered.filter((inv) => inv.supplier === selectedSupplier);
        }

        if (selectedType !== "all") {
            filtered = filtered.filter((inv) => inv.transactionType === selectedType);
        }

        if (selectedPaymentMethod !== "all") {
            filtered = filtered.filter((inv) => inv.paymentMethod === selectedPaymentMethod);
        }

        if (startDate) {
            filtered = filtered.filter(
                (inv) => new Date(inv.date) >= new Date(startDate)
            );
        }
        if (endDate) {
            filtered = filtered.filter(
                (inv) => new Date(inv.date) <= new Date(endDate)
            );
        }

        setFilteredInvoices(filtered);
    };

    const handleSort = (property) => {
        const isAsc = orderBy === property && order === "asc";
        const newOrder = isAsc ? "desc" : "asc";
        setOrder(newOrder);
        setOrderBy(property);

        const sorted = [...filteredInvoices].sort((a, b) => {
            let aVal = a[property];
            let bVal = b[property];

            if (property === "date") {
                aVal = new Date(aVal);
                bVal = new Date(bVal);
            }

            if (property === "amount") {
                aVal = aVal || 0;
                bVal = bVal || 0;
            }

            if (typeof aVal === "string") {
                aVal = aVal.toLowerCase();
                bVal = bVal?.toLowerCase() || "";
            }

            if (aVal < bVal) return newOrder === "asc" ? -1 : 1;
            if (aVal > bVal) return newOrder === "asc" ? 1 : -1;
            return 0;
        });

        setFilteredInvoices(sorted);
    };

    const handleClearFilters = () => {
        setSearchTerm("");
        setSelectedSupplier("all");
        setSelectedType("all");
        setSelectedPaymentMethod("all");
        setStartDate("");
        setEndDate("");
        setFilteredInvoices(invoices);
    };

    const handleExportCSV = () => {
        const columnConfig = {
            "التاريخ": "date",
            "رقم الفاتورة": "invoiceNumber",
            "المورد": "supplier",
            "النوع": "transactionType",
            "طريقة الدفع": "paymentMethod",
            "السبب": "reason",
        };

        if (userRole === "master") {
            columnConfig["المبلغ"] = "amount";
        }

        const formattedData = filteredInvoices.map((inv) => ({
            ...inv,
            date: new Date(inv.date).toLocaleDateString("ar-EG"),
            transactionType: formatType(inv.transactionType),
            paymentMethod: formatPaymentMethod(inv.paymentMethod),
        }));

        const success = exportToCSV(
            formattedData,
            columnConfig,
            `invoices_${new Date().toISOString().split("T")[0]}.csv`
        );

        if (success) {
            toast.success("تم تصدير الفواتير بنجاح ✅");
        } else {
            toast.error("فشل في تصدير الفواتير ❌");
        }
    };

    const formatType = (type) => {
        if (type === "in") return "إيداع";
        if (type === "out") return "دفع";
        if (type === "suspended") return "معلّق";
        if (type === "sadaqah") return "صدقة";
        if (type === "withdrawal") return "سحب مدير";
        return type;
    };

    const formatPaymentMethod = (method) => {
        if (method === "cash") return "كاش";
        if (method === "sadaqah") return "صدقة";
        return method || "—";
    };

    const formatDate = (dateStr) => {
        return new Date(dateStr).toLocaleDateString("ar-EG", {
            year: "numeric",
            month: "short",
            day: "numeric",
        });
    };

    // ── Edit modal ───────────────────────────────────────────────────────────
    const openEditModal = (invoice) => {
        setEditInvoice(invoice);
        setEditPaymentMethod(invoice.paymentMethod || "cash");
        setEditReason(invoice.reason || "");
    };

    const handleSaveEdit = async () => {
        if (!editInvoice) return;
        setSaving(true);
        try {
            const token = Cookies.get("token");
            const res = await axios.patch(
                "/api/invoices",
                {
                    id: editInvoice.id,
                    paymentMethod: editPaymentMethod,
                    reason: editReason,
                },
                { headers: { Authorization: `Bearer ${token}` } }
            );

            if (res.data.success) {
                toast.success("تم تحديث الفاتورة بنجاح ✅");
                setInvoices(prev =>
                    prev.map(inv =>
                        inv.id === editInvoice.id
                            ? { ...inv, paymentMethod: editPaymentMethod, reason: editReason }
                            : inv
                    )
                );
                setEditInvoice(null);
            } else {
                toast.error(res.data.message || "فشل في التحديث ❌");
            }
        } catch (err) {
            console.error(err);
            toast.error("حدث خطأ أثناء التحديث ❌");
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-screen gap-4">
                <div className="h-16 w-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                <p className="font-black text-primary text-xl animate-pulse">جاري تحميل الفواتير...</p>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-8" dir="rtl">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 p-6 rounded-[32px] shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <FileText className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-primary tracking-tight">الفواتير</h1>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Invoice Management</p>
                    </div>
                </div>

                {stats && (
                    <div className="flex gap-4 w-full md:w-auto">
                        <Card className="glass-morphism p-4 border-none shadow-lg flex items-center gap-4 min-w-[140px]">
                            <div className="h-10 w-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                                <Receipt className="h-5 w-5" />
                            </div>
                            <div>
                                <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Total Invoices</div>
                                <div className="text-lg font-black">{stats.totalInvoices}</div>
                            </div>
                        </Card>

                        {userRole === "master" && stats.totalAmount !== undefined && (
                            <Card className="glass-morphism p-4 border-none shadow-lg flex items-center gap-4 min-w-[200px] bg-secondary/5">
                                <div className="h-10 w-10 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary">
                                    <DollarSign className="h-5 w-5" />
                                </div>
                                <div>
                                    <div className="text-[10px] font-black uppercase text-muted-foreground tracking-widest leading-none">Total Amount</div>
                                    <div className="text-lg font-black text-secondary">{stats.totalAmount.toLocaleString()} <span className="text-xs opacity-50">ج.م</span></div>
                                </div>
                            </Card>
                        )}
                    </div>
                )}
            </div>

            {/* Filters */}
            <Card className="glass-morphism border-none p-6 shadow-xl space-y-6">
                <div className="flex items-center gap-2 mb-2">
                    <Filter className="h-5 w-5 text-primary" />
                    <h2 className="text-xl font-black tracking-tight">فلاتر البحث</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <div className="relative group">
                        <Search className="absolute right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                        <Input
                            placeholder="رقم الفاتورة أو السبب..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-12 pr-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold text-base"
                        />
                    </div>

                    <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                        <SelectTrigger className="h-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold">
                            <SelectValue placeholder="المورد" />
                        </SelectTrigger>
                        <SelectContent className="glass-morphism border-white/10 rounded-2xl">
                            <SelectItem value="all" className="font-bold">عرض الكل</SelectItem>
                            {suppliers.map(s => <SelectItem key={s} value={s} className="font-bold">{s}</SelectItem>)}
                        </SelectContent>
                    </Select>

                    <Select value={selectedType} onValueChange={setSelectedType}>
                        <SelectTrigger className="h-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold">
                            <SelectValue placeholder="نوع العملية" />
                        </SelectTrigger>
                        <SelectContent className="glass-morphism border-white/10 rounded-2xl text-right" dir="rtl">
                            <SelectItem value="all" className="font-bold">عرض الكل</SelectItem>
                            <SelectItem value="in" className="font-bold">إيداع</SelectItem>
                            <SelectItem value="out" className="font-bold">دفع</SelectItem>
                            <SelectItem value="suspended" className="font-bold">معلق</SelectItem>
                        </SelectContent>
                    </Select>

                    <Select value={selectedPaymentMethod} onValueChange={setSelectedPaymentMethod}>
                        <SelectTrigger className="h-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold">
                            <SelectValue placeholder="طريقة الدفع" />
                        </SelectTrigger>
                        <SelectContent className="glass-morphism border-white/10 rounded-2xl text-right" dir="rtl">
                            <SelectItem value="all" className="font-bold">عرض الكل</SelectItem>
                            <SelectItem value="cash" className="font-bold">كاش</SelectItem>
                            <SelectItem value="sadaqah" className="font-bold">صدقة</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1 flex gap-2">
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-black uppercase text-muted-foreground mr-2">من تاريخ</label>
                            <Input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="h-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold" />
                        </div>
                        <div className="flex-1 space-y-1">
                            <label className="text-[10px] font-black uppercase text-muted-foreground mr-2">إلى تاريخ</label>
                            <Input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="h-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold" />
                        </div>
                    </div>

                    <div className="flex items-end gap-2">
                        <Button variant="ghost" onClick={handleClearFilters} className="h-12 px-6 rounded-2xl font-black text-muted-foreground hover:text-primary transition-all">
                            مسح الفلاتر
                        </Button>
                        <Button onClick={handleExportCSV} disabled={filteredInvoices.length === 0} className="h-12 px-8 rounded-2xl premium-gradient text-white font-black shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                            <Download className="ml-2 h-5 w-5" />
                            تصدير CSV
                        </Button>
                    </div>
                </div>
            </Card>

            {/* Table */}
            <Card className="glass-morphism border-none shadow-2xl overflow-hidden rounded-[32px]">
                <div className="p-6 bg-primary/5 border-b border-primary/10 flex justify-between items-center">
                    <h2 className="text-xl font-black tracking-tight flex items-center gap-2">
                        <Activity className="h-5 w-5 text-primary" />
                        قائمة الفواتير
                        <Badge variant="secondary" className="px-3 rounded-md font-black">{filteredInvoices.length}</Badge>
                    </h2>
                </div>

                <Table>
                    <TableHeader className="bg-primary/5">
                        <TableRow className="hover:bg-transparent">
                            <TableHead className="text-right">
                                <Button variant="ghost" onClick={() => handleSort("date")} className="font-black text-primary p-0 h-auto hover:bg-transparent">
                                    التاريخ <ArrowUpDown className="mr-1 h-3 w-3" />
                                </Button>
                            </TableHead>
                            <TableHead className="text-center font-black">رقم الفاتورة</TableHead>
                            <TableHead className="text-center font-black">المورد</TableHead>
                            {userRole === "master" && (
                                <TableHead className="text-center">
                                    <Button variant="ghost" onClick={() => handleSort("amount")} className="font-black text-primary p-0 h-auto hover:bg-transparent">
                                        المبلغ <ArrowUpDown className="mr-1 h-3 w-3" />
                                    </Button>
                                </TableHead>
                            )}
                            <TableHead className="text-center font-black">النوع</TableHead>
                            <TableHead className="text-center font-black">طريقة الدفع</TableHead>
                            <TableHead className="text-right font-black">السبب / الوصف</TableHead>
                            <TableHead className="text-center font-black">تعديل</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {filteredInvoices.length === 0 ? (
                            <TableRow>
                                <TableCell colSpan={8} className="h-40 text-center">
                                    <div className="flex flex-col items-center gap-2 text-muted-foreground">
                                        <X className="h-12 w-12 opacity-10" />
                                        <p className="font-black text-xl">لا توجد فواتير مطابقة</p>
                                    </div>
                                </TableCell>
                            </TableRow>
                        ) : (
                            filteredInvoices.map((invoice) => (
                                <TableRow key={invoice._id} className="hover:bg-primary/5 border-b border-white/5 transition-colors group">

                                    <TableCell className="text-right font-bold py-5 text-muted-foreground group-hover:text-primary transition-colors">
                                        {formatDate(invoice.date)}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <Badge
                                            variant="outline"
                                            className={cn(
                                                "h-8 px-4 border-2 font-black rounded-lg gap-2",
                                                invoice.isVirtualInvoice
                                                    ? "border-blue-500/30 text-blue-500 bg-blue-500/5"
                                                    : "border-emerald-500/30 text-emerald-500 bg-emerald-500/5"
                                            )}
                                            title={invoice.isVirtualInvoice ? "رقم افتراضي (تلقائي)" : "رقم حقيقي (المورد)"}
                                        >
                                            {invoice.isVirtualInvoice ? <Hash className="h-3 w-3" /> : <FileText className="h-3 w-3" />}
                                            #{invoice.invoiceNumber}
                                        </Badge>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <div className="flex items-center justify-center gap-2 text-muted-foreground font-bold">
                                            <Building2 className="h-4 w-4 opacity-40" />
                                            {invoice.supplier}
                                        </div>
                                    </TableCell>

                                    {userRole === "master" && (
                                        <TableCell className="text-center">
                                            <span className="text-lg font-black tracking-tight text-primary">
                                                {invoice.amount?.toLocaleString()} <span className="text-xs opacity-50">ج.م</span>
                                            </span>
                                        </TableCell>
                                    )}

                                    <TableCell className="text-center">
                                        <Badge className={cn(
                                            "border-none font-black text-xs px-4 py-1.5 rounded-xl uppercase tracking-wider shadow-sm",
                                            invoice.transactionType === 'in'         && "bg-emerald-500 text-white",
                                            invoice.transactionType === 'out'        && "bg-red-500 text-white",
                                            invoice.transactionType === 'suspended'  && "bg-amber-500 text-white",
                                            invoice.transactionType === 'sadaqah'    && "bg-blue-500 text-white",
                                            invoice.transactionType === 'withdrawal' && "bg-zinc-800 text-white"
                                        )}>
                                            {formatType(invoice.transactionType)}
                                        </Badge>
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <PaymentMethodBadge method={invoice.paymentMethod} />
                                    </TableCell>

                                    <TableCell className="text-right font-bold opacity-70 group-hover:opacity-100 transition-opacity max-w-[200px] truncate">
                                        {invoice.reason}
                                    </TableCell>

                                    <TableCell className="text-center">
                                        <Button
                                            id={`edit-invoice-${invoice._id}`}
                                            variant="ghost"
                                            size="icon"
                                            onClick={() => openEditModal(invoice)}
                                            className="h-8 w-8 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all"
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                    </TableCell>

                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </Card>

            {/* Edit Invoice Modal */}
            <Dialog open={!!editInvoice} onOpenChange={(val) => !val && setEditInvoice(null)}>
                <DialogContent className="glass-morphism border-none rounded-[32px] p-8 max-w-md shadow-2xl" dir="rtl">
                    <div className="absolute top-0 left-0 right-0 h-1 premium-gradient rounded-t-[32px]" />

                    <DialogHeader className="space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                                <Pencil className="h-5 w-5 text-primary" />
                            </div>
                            <DialogTitle className="text-2xl font-black text-primary">تعديل الفاتورة</DialogTitle>
                        </div>
                        {editInvoice && (
                            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                #{editInvoice.invoiceNumber} · {formatDate(editInvoice.date)}
                            </p>
                        )}
                    </DialogHeader>

                    <div className="space-y-5 pt-4">

                        {/* Payment Method selector */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-primary tracking-widest">طريقة الدفع</label>
                            <div className="grid grid-cols-2 gap-3">
                                {PAYMENT_METHOD_OPTIONS.map((opt) => {
                                    const Icon = opt.icon;
                                    const isSelected = editPaymentMethod === opt.value;
                                    return (
                                        <button
                                            key={opt.value}
                                            id={`payment-method-${opt.value}`}
                                            onClick={() => setEditPaymentMethod(opt.value)}
                                            className={cn(
                                                "flex flex-col items-center gap-2 p-4 rounded-2xl border-2 font-black text-sm transition-all",
                                                isSelected
                                                    ? `${opt.color} text-white border-transparent shadow-lg scale-105`
                                                    : "border-border/40 text-muted-foreground hover:border-primary/40 hover:bg-primary/5 bg-background/40"
                                            )}
                                        >
                                            <Icon className="h-5 w-5" />
                                            {opt.label}
                                        </button>
                                    );
                                })}
                            </div>
                        </div>

                        {/* Reason / Description */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase text-primary tracking-widest">السبب / الوصف</label>
                            <textarea
                                id="edit-invoice-reason"
                                value={editReason}
                                onChange={(e) => setEditReason(e.target.value)}
                                rows={3}
                                className="w-full rounded-2xl bg-background/50 border border-border/40 p-4 font-bold text-sm focus:outline-none focus:border-primary transition-all resize-none"
                                placeholder="وصف العملية..."
                            />
                        </div>
                    </div>

                    <DialogFooter className="flex gap-3 pt-4">
                        <Button
                            id="save-invoice-edit"
                            onClick={handleSaveEdit}
                            disabled={saving}
                            className="flex-1 h-12 rounded-2xl premium-gradient text-white font-black shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all"
                        >
                            <Save className="ml-2 h-4 w-4" />
                            {saving ? "جاري الحفظ..." : "حفظ التعديلات"}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={() => setEditInvoice(null)}
                            className="h-12 px-6 rounded-2xl font-black text-muted-foreground hover:text-primary"
                        >
                            إلغاء
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default InvoicesPage;
