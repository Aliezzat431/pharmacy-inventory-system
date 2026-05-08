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

import { toast } from "sonner"; 
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
  
  // Internal state for text-only error reporting
  const [errors, setErrors] = useState([]);

  // Silent error handler: no toasts, no global flags
  const pushError = (msg) => {
    setErrors((prev) => [msg, ...prev].slice(0, 3));
  };

  /* =========================================================
     FETCH DATA (SILENT CATCH)
  ========================================================= */
  const fetchSuppliers = async () => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });
      setSuppliers(safeArray(res.data?.suppliers));
    } catch (err) {
      pushError("فشل في مزامنة الموردين");
    }
  };

  const fetchBatches = async (query = "", mode = "all") => {
    try {
      const token = Cookies.get("token");
      const res = await axios.get("/api/search", {
        params: { q: query, mode },
        headers: { Authorization: `Bearer ${token}` },
      });
      const products = safeArray(res.data?.products);
      setBatches(products.map(b => ({ ...b, batchId: b.batchId || b._id })));
    } catch (err) {
      pushError("خطأ في تحديث البيانات المنعكسة");
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const t = setTimeout(() => fetchBatches(searchTerm, searchMode), 300);
    return () => clearTimeout(t);
  }, [searchTerm, searchMode]);

  /* =========================================================
     ACTIONS
  ========================================================= */
  const updateBatchState = (id, changes) => {
    try {
      setBatches((prev) =>
        safeArray(prev).map((b) =>
          b.batchId === id ? { ...b, ...changes } : b
        )
      );
    } catch (e) {
      pushError("تعذر تحديث الحقل محلياً");
    }
  };

  const handleDelete = async () => {
    try {
      const token = Cookies.get("token");
      await axios.delete(`/api/products?id=${deleteId.productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setDeleteId(null);
      fetchBatches(searchTerm, searchMode);
    } catch (err) {
      pushError("لم يتم الحذف - خطأ في الطلب");
    }
  };

  return (
    <div className="p-4 flex flex-col gap-4" dir="rtl">
      
      {/* IN-PAGE TEXT ERRORS (Replaces Pop-ups) */}
      {errors.length > 0 && (
        <div className="bg-red-50/50 border border-red-100 p-3 rounded-md">
          <div className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              {errors.map((e, i) => (
                <div key={i} className="text-red-600 text-xs flex items-center gap-2">
                  <span className="w-1 h-1 bg-red-400 rounded-full" />
                  {e}
                </div>
              ))}
            </div>
            <Button variant="ghost" size="sm" onClick={() => setErrors([])} className="h-6 w-6 p-0">
              <X className="h-3 w-3" />
            </Button>
          </div>
        </div>
      )}

      {/* SEARCH AREA */}
      <div className="flex gap-2">
        <div className="relative flex-1">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
          <Input 
            className="pr-10" 
            placeholder="بحث في المخزون..."
            value={searchTerm} 
            onChange={(e) => setSearchTerm(e.target.value)} 
          />
        </div>
        <Button onClick={() => setOpenModal(true)} variant="default">
          <Plus className="ml-2 h-4 w-4" /> جديد
        </Button>
      </div>

      {/* MAIN DATA TABLE */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow className="bg-gray-50/50">
              <TableHead className="text-right">اسم المنتج</TableHead>
              <TableHead className="text-right">الكمية المتوفرة</TableHead>
              <TableHead className="text-center">تحكم</TableHead>
            </TableRow>
          </TableHeader>

          <TableBody>
            {groupedProducts.map((p) => (
              <React.Fragment key={p.productId}>
                <TableRow 
                  className="cursor-pointer hover:bg-gray-50 transition-colors"
                  onClick={() => toggleProduct(p.productId)}
                >
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell>{p.totalQuantity}</TableCell>
                  <TableCell className="text-center">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteId({ productId: p.productId });
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </TableCell>
                </TableRow>

                {expandedProducts.has(p.productId) &&
                  p.batches.map((b) => (
                    <TableRow key={b.batchId} className="bg-gray-50/30">
                      <TableCell className="pr-10 text-sm text-gray-500">تفاصيل الدفعة</TableCell>
                      <TableCell>
                        <Input
                          type="number"
                          className="w-20 h-8"
                          value={b.quantity || ""}
                          onChange={(e) => updateBatchState(b.batchId, { quantity: e.target.value })}
                        />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))}
              </React.Fragment>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* CONFIRMATION DIALOG */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <div className="flex flex-col items-center gap-3 text-center">
            <AlertTriangle className="h-10 w-10 text-amber-500" />
            <h2 className="text-lg font-bold">تأكيد الحذف</h2>
            <p className="text-sm text-gray-500">لا يمكن التراجع عن هذه الخطوة.</p>
            <div className="flex gap-2 mt-4">
              <Button variant="outline" onClick={() => setDeleteId(null)}>إلغاء</Button>
              <Button variant="destructive" onClick={handleDelete}>تأكيد</Button>
            </div>
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
