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

import { Search, Plus, Trash2, AlertTriangle, X } from "lucide-react";
import Cookies from "js-cookie";

import CreateProductForm from "../components/createProduct";
import BarcodeScanner from "../components/BarcodeScanner";
import BatchEntryDialog from "../components/BatchEntryDialog";

/* ================= SAFE ================= */
const safeArray = (data) => {
  if (Array.isArray(data)) return data;
  if (data && typeof data === "object") return Object.values(data);
  return [];
};

const Stock = () => {
  const [batches, setBatches] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [deleteId, setDeleteId] = useState(null);
  const [openModal, setOpenModal] = useState(false);
  const [editingStockProduct, setEditingStockProduct] = useState(null);
  const [expandedProducts, setExpandedProducts] = useState(new Set());
  const [errors, setErrors] = useState([]);

  const pushError = (msg) => setErrors((p) => [msg, ...p].slice(0, 3));

  /* ================= FETCH ================= */

  const fetchSuppliers = async () => {
    try {
      const token = Cookies.get("token");

      const res = await axios.get("/api/suppliers", {
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("SUPPLIERS:", res.data);

      setSuppliers(safeArray(res.data?.suppliers || res.data));
    } catch (err) {
      console.error(err);
      pushError("خطأ في تحميل الموردين");
      setSuppliers([]);
    }
  };

  const fetchBatches = async () => {
    try {
      const token = Cookies.get("token");

      const res = await axios.get("/api/search", {
        params: { q: searchTerm },
        headers: { Authorization: `Bearer ${token}` },
      });

      console.log("BATCH RESPONSE:", res.data);

      const products = safeArray(res.data?.products || res.data);

      setBatches(
        products.map((b) => ({
          ...b,
          batchId: b.batchId || b._id,
        }))
      );
    } catch (err) {
      console.error(err);
      pushError("خطأ في تحميل البيانات");
      setBatches([]);
    }
  };

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    const t = setTimeout(fetchBatches, 300);
    return () => clearTimeout(t);
  }, [searchTerm]);

  /* ================= SAFE GROUP ================= */

  const groupedProducts = useMemo(() => {
    const grouped = {};

    safeArray(batches).forEach((b) => {
      if (!b) return;

      const id = b.productId || b._id;

      if (!grouped[id]) {
        grouped[id] = {
          productId: id,
          name: b.name || "بدون اسم",
          totalQuantity: 0,
          batches: [],
        };
      }

      grouped[id].totalQuantity += Number(b.quantity || 0);
      grouped[id].batches.push(b);
    });

    return Object.values(grouped);
  }, [batches]);

  const toggleProduct = (id) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const handleDelete = async () => {
    try {
      const token = Cookies.get("token");

      await axios.delete(`/api/products?id=${deleteId.productId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setDeleteId(null);
      fetchBatches();
    } catch (err) {
      pushError("فشل الحذف");
    }
  };

  /* ================= UI ================= */

  return (
    <div className="p-4 flex flex-col gap-4" dir="rtl">

      {/* ERRORS */}
      {errors.length > 0 && (
        <div className="bg-red-50 p-3 rounded-md border">
          {errors.map((e, i) => (
            <div key={i} className="text-red-600 text-xs">
              {e}
            </div>
          ))}
          <Button size="sm" onClick={() => setErrors([])}>
            <X className="h-3 w-3" />
          </Button>
        </div>
      )}

      {/* SEARCH */}
      <div className="flex gap-2">
        <Input
          placeholder="بحث..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <Button onClick={() => setOpenModal(true)}>
          <Plus className="h-4 w-4 ml-2" />
          جديد
        </Button>
      </div>

      {/* TABLE */}
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>اسم المنتج</TableHead>
            <TableHead>الكمية</TableHead>
            <TableHead>تحكم</TableHead>
          </TableRow>
        </TableHeader>

        <TableBody>
          {safeArray(groupedProducts).map((p) => (
            <React.Fragment key={p.productId}>

              <TableRow onClick={() => toggleProduct(p.productId)}>
                <TableCell>{p.name}</TableCell>
                <TableCell>{p.totalQuantity}</TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
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
                safeArray(p.batches).map((b) => (
                  <TableRow key={b.batchId}>
                    <TableCell className="text-sm text-gray-500 pr-8">
                      دفعة
                    </TableCell>
                    <TableCell>{b.quantity}</TableCell>
                    <TableCell />
                  </TableRow>
                ))}
            </React.Fragment>
          ))}
        </TableBody>
      </Table>

      {/* DELETE */}
      <Dialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <DialogContent>
          <AlertTriangle className="text-yellow-500" />
          <Button onClick={handleDelete}>تأكيد الحذف</Button>
        </DialogContent>
      </Dialog>

      {/* MODAL */}
      <CreateProductForm
        openModal={openModal}
        setOpenModal={setOpenModal}
        editingStockProduct={editingStockProduct}
        setEditingStockProduct={setEditingStockProduct}
        onSuccess={fetchBatches}
      />

      <BarcodeScanner onScan={(c) => setSearchTerm(c)} />
    </div>
  );
};

export default Stock;
