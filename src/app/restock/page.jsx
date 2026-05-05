"use client";

import React, { useState, useEffect } from "react";
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
    PlusCircle,
    Search,
    Building2,
    FileText,
    Save,
    Trash2,
    PackagePlus,
    ArrowUpCircle,
    History,
    Info,
    ChevronDown,
    Hash,
    Activity,
    Box as BoxIcon
} from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";
import { typesWithUnits } from "../lib/unitOptions";
import { supabase } from "../lib/supabase";

const RestockPage = () => {
    const [searchTerm, setSearchTerm] = useState(() => {
        if (typeof window !== 'undefined') return localStorage.getItem("restock_search_term") || "";
        return "";
    });
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);
    const [restockData, setRestockData] = useState(() => {
        if (typeof window !== 'undefined') {
            const saved = localStorage.getItem("restock_data");
            return saved ? JSON.parse(saved) : {};
        }
        return {};
    });
    const [suppliers, setSuppliers] = useState([]);
    const [isUpdating, setIsUpdating] = useState(null);

    useEffect(() => {
        localStorage.setItem("restock_search_term", searchTerm);
        localStorage.setItem("restock_data", JSON.stringify(restockData));
    }, [searchTerm, restockData]);

    useEffect(() => {
        const fetchSuppliers = async () => {
            try {
                const token = Cookies.get("token");
                const res = await axios.get("/api/suppliers", {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.data.success) {
                    setSuppliers(res.data.suppliers);
                }
            } catch (err) {
                console.error("Failed to fetch suppliers", err);
            }
        };
        fetchSuppliers();
    }, []);

    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            fetchProducts(searchTerm);
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [searchTerm]);

    // Real-time subscription for restock products
    useEffect(() => {
        const channel = supabase
            .channel('restock_realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
                if (searchTerm) fetchProducts(searchTerm);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [searchTerm]);

    const fetchProducts = async (query) => {
        if (!query) {
            setProducts([]);
            return;
        }
        setLoading(true);
        try {
            const token = Cookies.get("token");
            const res = await axios.get("/api/search", {
                params: { q: query },
                headers: { Authorization: `Bearer ${token}` },
            });
            setProducts(res.data.products || []);
        } catch (err) {
            console.error("Error fetching products", err);
            toast.error("فشل في البحث عن المنتجات ❌");
        } finally {
            setLoading(false);
        }
    };

    const handleRestockChange = (id, field, value) => {
        setRestockData((prev) => ({
            ...prev,
            [id]: {
                ...prev[id],
                [field]: value,
            },
        }));
    };

    const handleUpdateStock = async (product) => {
        const updates = restockData[product._id];
        if (!updates || !updates.quantity || parseFloat(updates.quantity) <= 0) {
            toast.error("يرجى إدخال كمية صحيحة ⚠️");
            return;
        }

        setIsUpdating(product._id);
        const qtyToAdd = parseFloat(updates.quantity);
        const selectedUnit = updates.unit || product.unit;

        // Calculate conversion
        const conversion = product.unitConversion || 1;
        let finalQtyToAdd = qtyToAdd;

        if (selectedUnit !== product.unit) {
            if (selectedUnit === "شريط") {
                finalQtyToAdd = qtyToAdd / conversion;
            } else if (selectedUnit === "علبة") {
                finalQtyToAdd = qtyToAdd * conversion;
            }
        }

        try {
            const token = Cookies.get("token");
            const newTotal = parseFloat(product.quantity) + finalQtyToAdd;

            await axios.patch("/api/products", {
                mode: "inventory",
                product: {
                    _id: product._id,
                    quantity: newTotal,
                    invoiceNumber: restockData.invoiceNumber || null,
                    supplier: restockData.supplier || null,
                    expiryDate: updates.expiryDate || null
                }
            }, {
                headers: { Authorization: `Bearer ${token}` }
            });

            toast.success(`تم إضافة ${qtyToAdd} ${selectedUnit} لـ ${product.name} ✅`);
            setRestockData(prev => {
                const newState = { ...prev };
                delete newState[product._id];
                return newState;
            });
            fetchProducts(searchTerm);
        } catch (err) {
            console.error("Failed to update stock", err);
            toast.error("فشل في تحديث الرصيد ❌");
        } finally {
            setIsUpdating(null);
        }
    };

    return (
        <div className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-8" dir="rtl">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 p-6 rounded-[32px] shadow-xl">
                <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-2xl premium-gradient flex items-center justify-center text-white shadow-lg shadow-primary/20">
                        <PackagePlus className="h-6 w-6" />
                    </div>
                    <div>
                        <h1 className="text-3xl font-black text-primary tracking-tight italic">إضافة رصيد (نواقص)</h1>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-none mt-1">Inventory Restocking</p>
                    </div>
                </div>
            </div>

            {/* Quick Invoice Info Card */}
            <Card className="glass-morphism border-none p-8 shadow-2xl space-y-8 rounded-[40px]">
                <div className="flex items-center gap-2 mb-2">
                    <FileText className="h-6 w-6 text-primary" />
                    <h2 className="text-2xl font-black tracking-tight italic">بيانات الفاتورة العامة (اختياري)</h2>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mr-2">اسم المورد</label>
                        <div className="relative group">
                            <Building2 className="absolute left-auto right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="مثال: شركة المتحدة للأدوية..."
                                list="suppliers-list"
                                value={restockData.supplier || ""}
                                onChange={(e) => setRestockData(prev => ({ ...prev, supplier: e.target.value }))}
                                className="h-14 pr-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold text-lg focus-visible:ring-primary"
                            />
                            <datalist id="suppliers-list">
                                {suppliers.map(s => <option key={s} value={s} />)}
                            </datalist>
                        </div>
                    </div>

                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase text-muted-foreground tracking-widest mr-2">رقم الفاتورة</label>
                        <div className="relative group">
                            <Hash className="absolute left-auto right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                            <Input
                                placeholder="مثال: #INV-2024-001"
                                value={restockData.invoiceNumber || ""}
                                onChange={(e) => setRestockData(prev => ({ ...prev, invoiceNumber: e.target.value }))}
                                className="h-14 pr-12 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold text-lg focus-visible:ring-primary"
                            />
                        </div>
                    </div>
                </div>

                <div className="h-px w-full bg-white/10" />

                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase text-primary tracking-widest mr-2">البحث عن منتج</label>
                    <div className="relative group">
                        <Search className="absolute left-auto right-5 top-1/2 -translate-y-1/2 h-7 w-7 text-muted-foreground group-focus-within:text-primary transition-all duration-300" />
                        <Input
                            placeholder="ابحث عن اسم المنتج لإضافة رصيد فوراً..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="h-20 pr-16 rounded-[24px] bg-white/80 dark:bg-zinc-900 border-2 border-primary/20 focus-visible:ring-primary shadow-2xl font-black text-2xl placeholder:opacity-30"
                        />
                    </div>
                </div>
            </Card>

            {/* Results Table */}
            {loading ? (
                <div className="flex flex-col items-center justify-center p-20 gap-4">
                    <div className="h-14 w-14 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                    <p className="font-black text-primary text-xl animate-pulse">Searching Products...</p>
                </div>
            ) : products.length > 0 ? (
                <Card className="glass-morphism border-none shadow-2xl overflow-hidden rounded-[32px] animate-in fade-in slide-in-from-bottom-8 duration-500">
                    <Table>
                        <TableHeader className="bg-primary/5">
                            <TableRow className="hover:bg-transparent border-b border-primary/10">
                                <TableHead className="text-right font-black py-4">المنتج</TableHead>
                                <TableHead className="text-center font-black">الكمية الحالية</TableHead>
                                <TableHead className="text-center font-black">الوحدة</TableHead>
                                <TableHead className="text-center font-black" style={{ width: '140px' }}>الكمية المضافة</TableHead>
                                <TableHead className="text-center font-black" style={{ width: '150px' }}>الوحدة المختارة</TableHead>
                                <TableHead className="text-center font-black" style={{ width: '160px' }}>تاريخ الانتهاء</TableHead>
                                <TableHead className="text-center font-black">إجراء</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {products.map((product) => {
                                const draft = restockData[product._id] || {};
                                const options = product.unitOptions && product.unitOptions.length > 0
                                    ? product.unitOptions
                                    : typesWithUnits[product.type] || [product.unit];

                                return (
                                    <TableRow key={product._id} className="hover:bg-primary/5 transition-all duration-200 border-b border-white/5 last:border-0 group">
                                        <TableCell className="font-black text-xl py-6 italic opacity-80 group-hover:opacity-100 group-hover:text-primary transition-all">
                                            {product.name}
                                            <div className="text-[10px] uppercase font-bold text-muted-foreground italic leading-none mt-1">Prod ID: #{product._id.slice(-6)}</div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <Badge variant="outline" className={cn(
                                                "font-black text-lg px-4 h-10 rounded-xl border-2 tracking-tighter shadow-sm",
                                                product.quantity < 5 ? "border-red-500/30 text-red-500 bg-red-500/5 animate-pulse" : "border-primary/20 text-primary bg-primary/5"
                                            )}>
                                                {Number(product.quantity).toLocaleString()}
                                            </Badge>
                                        </TableCell>

                                        <TableCell className="text-center font-bold text-muted-foreground">
                                            {product.unit}
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <div className="flex justify-center">
                                                <Input
                                                    type="number"
                                                    placeholder="0"
                                                    value={draft.quantity || ""}
                                                    onChange={(e) => handleRestockChange(product._id, "quantity", e.target.value)}
                                                    className="h-12 w-32 rounded-xl bg-white dark:bg-zinc-800 border-none shadow-inner font-black text-center text-lg focus-visible:ring-primary"
                                                />
                                            </div>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <Select
                                                value={draft.unit || product.unit}
                                                onValueChange={(val) => handleRestockChange(product._id, "unit", val)}
                                            >
                                                <SelectTrigger className="h-12 w-full rounded-xl bg-white dark:bg-zinc-800 border-none shadow-inner font-bold">
                                                    <SelectValue />
                                                </SelectTrigger>
                                                <SelectContent className="glass-morphism border-white/10 rounded-xl">
                                                    {options.map(u => (
                                                        <SelectItem key={u} value={u} className="font-bold">{u}</SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <Input
                                                type="date"
                                                value={draft.expiryDate || ""}
                                                onChange={(e) => handleRestockChange(product._id, "expiryDate", e.target.value)}
                                                className="h-12 w-full rounded-xl bg-white dark:bg-zinc-800 border-none shadow-inner font-bold focus-visible:ring-primary text-sm"
                                            />
                                        </TableCell>

                                        <TableCell className="text-center">
                                            <Button
                                                onClick={() => handleUpdateStock(product)}
                                                disabled={!draft.quantity || isUpdating === product._id}
                                                className="h-12 px-8 rounded-xl premium-gradient text-white font-black shadow-lg shadow-primary/20 hover:scale-[1.05] active:scale-95 transition-all"
                                            >
                                                {isUpdating === product._id ? (
                                                    <div className="h-4 w-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <PlusCircle className="ml-2 h-5 w-5" />
                                                        إضافة
                                                    </>
                                                )}
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </Card>
            ) : searchTerm && (
                <div className="flex flex-col items-center justify-center p-20 gap-4 opacity-30">
                    <div className="h-24 w-24 rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center">
                        <Search className="h-12 w-12" />
                    </div>
                    <p className="font-black text-3xl uppercase tracking-[0.3em] italic">No Matches Found</p>
                </div>
            )}
        </div>
    );
};

export default RestockPage;
