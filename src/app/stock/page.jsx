"use client";

import React, { useEffect, useState, useMemo } from "react";
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
import { Button } from "@/components/ui/button";

import {
  Dialog,
  DialogContent,
} from "@/components/ui/dialog";

import {
  Search,
  Plus,
  Trash2,
  AlertTriangle,
  X,
} from "lucide-react";

import { toast } from "sonner"; // Kept for success messages only
import Cookies from "js-cookie";

import { supabase } from "../lib/supabase";
import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";
import BatchEntryDialog from "../components/BatchEntryDialog";

/* =========================================================
   SAFE ARRAY
========================================================= */
const safeArray = (value) => {
  try {
    if (Array.isArray(value)) return value;
    if (value && typeof value === "object") return Object.values(value);
    return [];
  } catch {
    return [];
  }
};

/* =========================================================
   MAIN COMPONENT
========================================================= */
const Stock = () => {
  const [batches, setBatches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode] = useState("all");
  const [deleteId, setDeleteId] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [editingStockProduct, setEditingStockProduct] = useState(null);
  const [batchEntryTarget, setBatchEntryTarget] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  
  // State for top-of-page error messages
  const [errors, setErrors] = useState([]);

  const pushError = (msg) => {
    setErrors((prev) => {
      const updated = [msg, ...prev];
      return updated.slice(0, 5); // Keep last 5 errors
    });
  };

  const clearErrors = () => setErrors([]);

  /* =========================================================
     FETCH SUPPLIERS
  ========================================================= */
  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const token = Cookies.get("token");
        const res = await axios.get("/api/suppliers", {
          headers: { Authorization: `Bearer ${token}` },
        });
        setSuppliers(safeArray(res.data?.suppliers));
      } catch (err) {
        pushError("حدث خطأ أثناء تحميل بيانات الموردين.");
        setSuppliers([]);
      }
    };
    fetchSuppliers();
  }, []);

  /* =========================================================
     FETCH BATCHES
  ========================================================= */
  const fetchBatches = async (query = "", mode = "all") => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/search", {
        params: { q: query, mode },
        headers: { Authorization: `Bearer ${token}` },
      });

      const products = safeArray(res.data?.products);
      setBatches(
        products.map((b) => ({
          ...b,
          batchId: b.batchId || b._id,
        }))
      );
    } catch (err) {
      pushError("تعذر تحديث قائمة المنتجات. يرجى التحقق من الاتصال.");
      setBatches([]);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => {
      fetchBatches(searchTerm, searchMode);
    }, 300);
    return () => clearTimeout(t);
  }, [searchTerm, searchMode]);

  /* =========================================================
     REALTIME
  ========================================================= */
  useEffect(() => {
    const channel = supabase
      .channel("stock_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products" },
        () => fetchBatches(searchTerm, searchMode)
      )
      .subscribe();

    return () => supabase.removeChannel(channel);
  }, [searchTerm, searchMode]);

  const groupedProducts = useMemo(() => {
    const groups = {};
    safeArray(batches).forEach((b) => {
      if (!groups[b._id]) {
        groups[b._id] = {
          productId: b._id,
          name: b.name,
          batches: [],
          totalQuantity: 0,
        };
      }
      groups[b._id].batches.push(b);
      groups[b._id].totalQuantity += Number(b.quantity || 0);
    });
    return Object.values(groups);
  }, [batches]);

  const updateBatchState = (id, changes) => {
    setBatches((prev) =>
      safeArray(prev).map((b) =>
        b.batchId === id ? { ...b, ...changes } : b
      )
    );
  };

  const toggleProduct = (id) => {
    setExpandedProducts((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleDelete = async () => {
    try {
      const token = Cookies.get("token");
      await axios.delete(`/api/products?id=${deleteId.productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("تم حذف المنتج بنجاح"); // Success toasts are usually fine
      setDeleteId(null);
      fetchBatches(searchTerm, searchMode);
    } catch (err) {
      pushError("فشل حذف المنتج. يرجى المحاولة مرة أخرى.");
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4" dir="rtl">
      
      {/* ERRORS SECTION (TEXT AT TOP) */}
      {errors.length > 0 && (
        <div className="relative bg-red-50 border-r-4 border-red-500 p-4 rounded shadow-sm animate-in fade-in slide-in-from-top-2">
          <div className="flex justify-between items-start">
            <div className="flex gap-2 text-red-800">
              <AlertTriangle className="h-5 w-5 flex-shrink-0" />
              <div className="flex flex-col gap-1">
                {errors.map((e, i) => (
                  <p key={i} className="text-sm font-medium">{e}</p>
                ))}
              </div>
            </div>
            <Button 
              variant="ghost" 
              size="icon" 
              onClick={clearErrors}
              className="h-6 w-6 text-red-500 hover:bg-red-100"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* SEARCH & ACTIONS */}
      <div className="flex gap-2 items-center">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground h-4 w-4" />
          <Input 
            className="pr-10" 
            placeholder="بحث..."
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <Button onClick={() => setOpenModal(true)} className="gap-2">
          <Plus className="h-4 w-4" /> منتج جديد
        </Button>
      </div>

      {/* TABLE */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader className="bg-muted/50">
            <TableRow>
              <TableHead className="text-right">المنتج</TableHead>
              <TableHead className="text-right">إجمالي الكمية</TableHead>
              <TableHead className="text-center w-[100px]">إجراءات</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {groupedProducts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-center py-10 text-muted-foreground">
                  لا توجد نتائج بحث
                </TableCell>
              </TableRow>
            ) : (
              groupedProducts.map((p) => (
                <React.Fragment key={p.productId}>
                  <TableRow 
                    className="cursor-pointer hover:bg-muted/30 transition-colors"
                    onClick={() => toggleProduct(p.productId)}
                  >
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>{p.totalQuantity}</TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-red-500 hover:text-red-700 hover:bg-red-50"
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteId({ productId: p.productId });
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>

                  {expandedProducts.has(p.productId) &&
                    p.batches.map((b) => (
                      <TableRow key={b.batchId} className="bg-slate-50/50">
                        <TableCell className="pr-8 text-sm text-muted-foreground">
                          — دفعة (Batch)
                        </TableCell>
                        <TableCell>
                          <Input
                            type="number"
                            className="w-24 h-8"
                            value={b.quantity || ""}
                            onChange={(e) =>
                              updateBatchState(b.batchId, {
                                quantity: e.target.value,
                              })
                            }
                          />
                        </TableCell>
                        <TableCell />
                      </TableRow>
                    ))}
                </React.Fragment>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* DELETE DIALOG */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent className="sm:max-w-[425px]">
          <div className="flex flex-col items-center gap-4 py-4">
            <div className="p-3 bg-red-100 rounded-full text-red-600">
              <AlertTriangle className="h-6 w-6" />
            </div>
            <h3 className="text-lg font-semibold">هل أنت متأكد من الحذف؟</h3>
            <p className="text-sm text-muted-foreground text-center">
              سيتم حذف المنتج وجميع البيانات المتعلقة به بشكل نهائي.
            </p>
          </div>
          <div className="flex gap-3 justify-center">
            <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
            <Button variant="destructive" onClick={handleDelete}>تأكيد الحذف</Button>
          </div>
        </DialogContent>
      </Dialog>

      <CreateProductForm
        openModal={openModal}
        setOpenModal={setOpenModal}
        editingStockProduct={editingStockProduct}
        setEditingStockProduct={setEditingStockProduct}
        onSuccess={() => fetchBatches(searchTerm, searchMode)}
      />

      <BarcodeScanner onScan={(code) => setSearchTerm(code)} />

      {batchEntryTarget && (
        <BatchEntryDialog
          open={!!batchEntryTarget}
          onClose={() => setBatchEntryTarget(null)}
          productName={batchEntryTarget?.name}
          productId={batchEntryTarget?.productId}
          suppliers={suppliers}
        />
      )}
    </div>
  );
};

export default Stock;
