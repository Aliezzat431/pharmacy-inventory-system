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

import { Dialog, DialogContent } from "@/components/ui/dialog";

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
   ERROR HANDLING (UI BASED INSTEAD OF ALERTS)
========================================================= */

const Stock = () => {
  const [batches, setBatches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [searchMode, setSearchMode] = useState("all");
  const [selectedBatchIds] = useState([]);
  const [deleteId, setDeleteId] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [editingStockProduct, setEditingStockProduct] = useState(null);
  const [batchEntryTarget, setBatchEntryTarget] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [errors, setErrors] = useState([]);

  const pushError = (msg) => {
    setErrors((prev) => [msg, ...prev].slice(0, 5));
  };

  /* =========================================================
     SAFE ARRAY
  ========================================================= */

  const safeArray = (value) => {
    try {
      if (Array.isArray(value)) return value;
      if (value && typeof value === "object") return Object.values(value);
      return [];
    } catch (e) {
      pushError("safeArray error");
      return [];
    }
  };

  /* =========================================================
     EXPIRY
  ========================================================= */

  const getExpiryStatus = (expiryDate) => {
    if (!expiryDate) return "none";

    try {
      const now = new Date();
      const exp = new Date(expiryDate);

      const daysLeft = Math.ceil(
        (exp - now) / (1000 * 60 * 60 * 24)
      );

      if (daysLeft < 0) return "expired";
      if (daysLeft <= 30) return "critical";
      if (daysLeft <= 90) return "warning";
      return "ok";
    } catch {
      pushError("expiry calc error");
      return "none";
    }
  };

  const ExpiryBadge = ({ expiryDate }) => {
    const status = getExpiryStatus(expiryDate);

    if (status === "none") return <span>—</span>;

    const exp = new Date(expiryDate);
    const daysLeft = Math.ceil((exp - new Date()) / (1000 * 60 * 60 * 24));

    const map = {
      expired: "red",
      critical: "orange",
      warning: "yellow",
      ok: "green",
    };

    return (
      <span className={cn("text-xs font-bold", `text-${map[status]}-500`)}>
        {exp.toLocaleDateString()} ({daysLeft}d)
      </span>
    );
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
      } catch (e) {
        pushError("failed to load suppliers");
        setSuppliers([]);
      }
    };

    fetchSuppliers();
  }, []);

  /* =========================================================
     FETCH BATCHES
  ========================================================= */

  const fetchBatches = async (q = "", mode = "all") => {
    try {
      const token = Cookies.get("token");

      const res = await axios.get("/api/search", {
        params: { q, mode },
        headers: { Authorization: `Bearer ${token}` },
      });

      const products = safeArray(res.data?.products);

      setBatches(
        products.map((b) => ({
          ...b,
          batchId: b.batchId || b._id,
        }))
      );
    } catch (e) {
      pushError("failed to fetch products");
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
     GROUPING
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
     UPDATE
  ========================================================= */

  const updateBatchState = (id, changes) => {
    setBatches((prev) =>
      safeArray(prev).map((b) =>
        b.batchId === id ? { ...b, ...changes } : b
      )
    );
  };

  /* =========================================================
     TOGGLE
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

      toast.success("Deleted");
      setDeleteId(null);
      fetchBatches(searchTerm, searchMode);
    } catch {
      pushError("delete failed");
    }
  };

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="p-4 flex flex-col gap-4" dir="rtl">

      {/* ERRORS TOP BAR */}
      {errors.length > 0 && (
        <div className="bg-red-100 border border-red-400 p-2 rounded">
          {errors.map((e, i) => (
            <div key={i} className="text-red-600 text-sm">
              {e}
            </div>
          ))}
        </div>
      )}

      <div className="flex gap-2">
        <Search />
        <Input value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        <Button onClick={() => setOpenModal(true)}>
          <Plus /> جديد
        </Button>
      </div>

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
                  <Button onClick={(e) => {
                    e.stopPropagation();
                    setDeleteId({ productId: p.productId });
                  }}>
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
                    <TableCell>
                      <ExpiryBadge expiryDate={b.expiryDate} />
                    </TableCell>
                  </TableRow>
                ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* DELETE */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <AlertTriangle />
          <Button onClick={handleDelete}>Delete</Button>
        </DialogContent>
      </Dialog>

      <CreateProductForm
        openModal={openModal}
        setOpenModal={setOpenModal}
      />

      <BarcodeScanner
        onScan={(code) => setSearchTerm(code)}
      />

      {batchEntryTarget && (
        <BatchEntryDialog
          open={!!batchEntryTarget}
          onClose={() => setBatchEntryTarget(null)}
        />
      )}
    </div>
  );
};

export default Stock;
