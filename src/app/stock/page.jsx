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
} from "lucide-react";

import { toast } from "sonner";
import Cookies from "js-cookie";

import { supabase } from "../lib/supabase";
import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";
import BatchEntryDialog from "../components/BatchEntryDialog";
import { cn } from "@/lib/utils";

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
  const [errors, setErrors] = useState([]);

  const pushError = (msg) => {
    setErrors((prev) => {
      const updated = [msg, ...prev];
      return updated.slice(0, 4);
    });
  };

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
        pushError("فشل تحميل الموردين");
        setSuppliers([]);
        console.error(err);
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
      pushError("فشل تحميل المنتجات");
      setBatches([]);
      console.error(err);
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

  /* =========================================================
     GROUP PRODUCTS
  ========================================================= */

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

  /* =========================================================
     UPDATE BATCH
  ========================================================= */

  const updateBatchState = (id, changes) => {
    setBatches((prev) =>
      safeArray(prev).map((b) =>
        b.batchId === id ? { ...b, ...changes } : b
      )
    );
  };

  /* =========================================================
     TOGGLE PRODUCT
  ========================================================= */

  const toggleProduct = (id) => {
    setExpandedProducts((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  /* =========================================================
     DELETE
  ========================================================= */

  const handleDelete = async () => {
    try {
      const token = Cookies.get("token");

      await axios.delete(`/api/products?id=${deleteId.productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      toast.success("تم الحذف");
      setDeleteId(null);
      fetchBatches(searchTerm, searchMode);
    } catch (err) {
      pushError("فشل الحذف");
      console.error(err);
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="p-4 flex flex-col gap-4" dir="rtl">

      {/* ERRORS (NON BLOCKING) */}
      {errors.length > 0 && (
        <div className="space-y-2">
          {errors.map((e, i) => (
            <div
              key={i}
              className="bg-red-50 border border-red-200 text-red-700 text-sm p-2 rounded"
            >
              {e}
            </div>
          ))}
        </div>
      )}

      {/* SEARCH */}
      <div className="flex gap-2">
        <Search />
        <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <Button onClick={() => setOpenModal(true)}>
          <Plus /> جديد
        </Button>
      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>المنتج</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>إجراءات</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {groupedProducts.map((p) => (
            <React.Fragment key={p.productId}>
              <TableRow onClick={() => toggleProduct(p.productId)}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.totalQuantity}</TableCell>
                <TableCell>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeleteId({ productId: p.productId });
                    }}
                  >
                    <Trash2 />
                  </Button>
                </TableCell>
              </TableRow>

              {expandedProducts.has(p.productId) &&
                p.batches.map((b) => (
                  <TableRow key={b.batchId}>
                    <TableCell>Batch</TableCell>
                    <TableCell>
                      <Input
                        value={b.quantity || ""}
                        onChange={(e) =>
                          updateBatchState(b.batchId, {
                            quantity: e.target.value,
                          })
                        }
                      />
                    </TableCell>
                  </TableRow>
                ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* DELETE DIALOG (NOT BLOCKING PAGE FLOW) */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <AlertTriangle />
          <Button onClick={handleDelete}>حذف</Button>
        </DialogContent>
      </Dialog>

      <CreateProductForm
        openModal={openModal}
        setOpenModal={setOpenModal}
        editingStockProduct={editingStockProduct}
        setEditingStockProduct={setEditingStockProduct}
        onSuccess={() => fetchBatches(searchTerm, searchMode)}
      />

      <BarcodeScanner
        onScan={(code) => setSearchTerm(code)}
      />

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
