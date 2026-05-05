"use client";

import React, { useState, useEffect } from "react";
import axios from "axios";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Settings,
  Building2,
  Phone,
  MapPin,
  Coins,
  Receipt,
  Download,
  Upload,
  Trash2,
  Moon,
  Sun,
  Monitor,
  CheckCircle2,
  ShieldCheck,
  AlertTriangle,
  Users,
  MessageSquare,
  Facebook,
  ExternalLink,
  Save,
  Undo,
  Package
} from "lucide-react";
import { toast } from "sonner";
import Cookies from "js-cookie";
import { cn } from "@/lib/utils";

export default function SettingsPage() {
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isWiping, setIsWiping] = useState(false);

  const [pharmacyInfo, setPharmacyInfo] = useState({
    name: "Smart Pharma",
    address: "",
    phone: "",
    currency: "ج.م",
    receiptHeader: "نعتني بصحتكم",
    receiptFooter: "نتمنى لكم الشفاء العاجل",
    lowStockThreshold: 5,
    baseCapital: 100000
  });

  const [options, setOptions] = useState({
    showCheckoutConfirm: true,
    showReturnsConfirm: true,
  });

  const token = Cookies.get("token");

  useEffect(() => {
    loadAllSettings();

    // Load theme
    const savedTheme = localStorage.getItem("theme");
    const initialDarkMode = savedTheme === 'dark';
    setIsDarkMode(initialDarkMode);
    if (initialDarkMode) document.documentElement.classList.add('dark');

    // Load initial options
    const savedOptions = localStorage.getItem("settings-options");
    if (savedOptions) setOptions(JSON.parse(savedOptions));
  }, []);

  const loadAllSettings = async () => {
    try {
      const res = await axios.get('/api/settings', {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success && res.data.settings) {
        setPharmacyInfo(prev => ({ ...prev, ...res.data.settings }));

        const dbOptions = {
          showCheckoutConfirm: res.data.settings.showCheckoutConfirm !== undefined ? (res.data.settings.showCheckoutConfirm === 'true' || res.data.settings.showCheckoutConfirm === true) : options.showCheckoutConfirm,
          showReturnsConfirm: res.data.settings.showReturnsConfirm !== undefined ? (res.data.settings.showReturnsConfirm === 'true' || res.data.settings.showReturnsConfirm === true) : options.showReturnsConfirm,
        };
        setOptions(dbOptions);

        localStorage.setItem("pharmacy-info", JSON.stringify(res.data.settings));
        localStorage.setItem("settings-options", JSON.stringify(dbOptions));
      }
    } catch (err) {
      console.error("Failed to load settings", err);
    }
  };

  const saveSettingToDB = async (key, value) => {
    try {
      await axios.post('/api/settings', { key, value }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      // Simple notification for critical settings
      if (typeof value !== 'boolean' && key !== 'theme') {
        // Maybe debounced? For now we just sync
      }
    } catch (err) {
      console.error("Failed to save setting to DB", err);
      toast.error("فشل في حفظ الإعدادات على الخادم ❌");
    }
  };

  const handleThemeChange = (val) => {
    setIsDarkMode(val);
    localStorage.setItem("theme", val ? 'dark' : 'light');
    if (val) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
    saveSettingToDB('theme', val ? 'dark' : 'light');
  };

  const handleInfoChange = (field, value) => {
    const updated = { ...pharmacyInfo, [field]: value };
    setPharmacyInfo(updated);
    localStorage.setItem("pharmacy-info", JSON.stringify(updated));
    saveSettingToDB(field, value);
    window.dispatchEvent(new Event('storage'));
  };

  const handleOptionChange = (key, val) => {
    const updated = { ...options, [key]: val };
    setOptions(updated);
    localStorage.setItem("settings-options", JSON.stringify(updated));
    saveSettingToDB(key, val);
  };

  const handleExportData = async () => {
    try {
      const [productsRes, winningsRes] = await Promise.all([
        axios.get('/api/products', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('/api/winnings?full=true', { headers: { Authorization: `Bearer ${token}` } })
      ]);

      const backup = {
        date: new Date().toISOString(),
        pharmacy: pharmacyInfo,
        products: productsRes.data,
        winnings: winningsRes.data
      };

      const blob = new Blob([JSON.stringify(backup, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `pharmacy-backup-${new Date().toISOString().split('T')[0]}.json`;
      link.click();
      toast.success("تم تصدير نسخة احتياطية بنجاح ✅");
    } catch {
      toast.error("فشل في تصدير البيانات ❌");
    }
  };

  const handleImportData = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target.result);
        if (!data.products || !data.winnings) {
          throw new Error("تنسيق ملف غير صالح");
        }

        const res = await axios.post('/api/settings/import', data, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (res.data.success) {
          toast.success(res.data.message || "تم استيراد البيانات بنجاح ✅");
          if (data.pharmacy) {
            handleInfoChange('name', data.pharmacy.name || pharmacyInfo.name);
          }
          window.location.reload();
        }
      } catch (err) {
        toast.error("فشل استيراد الملف: تأكد من صحة التنسيق ❌");
      }
    };
    reader.readAsText(file);
  };

  const handleWipeData = async () => {
    setIsWiping(true);
    try {
      const res = await axios.post('/api/settings/wipe', {}, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.data.success) {
        toast.success(res.data.message || "تم تصفير قاعدة البيانات بالكامل ✅");
        setWipeDialogOpen(false);
        setTimeout(() => window.location.reload(), 1500);
      }
    } catch {
      toast.error("فشل في تصفير البيانات ❌");
    } finally {
      setIsWiping(false);
    }
  };

  const teamMembers = [
    { name: "Ali Ezzat", role: "Developer", wa: "https://wa.me/201287664311", fb: "https://www.facebook.com/ali.ezzat.5872682/" },
  ];

  return (
    <div className="p-4 md:p-8 w-full min-h-screen flex flex-col gap-8 no-print" dir="rtl">
      {/* Header Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 bg-white/40 dark:bg-zinc-900/40 backdrop-blur-xl border border-white/20 dark:border-zinc-800/50 p-8 rounded-[40px] shadow-2xl">
        <div className="flex items-center gap-6">
          <div className="h-16 w-16 rounded-[22px] premium-gradient flex items-center justify-center text-white shadow-2xl shadow-primary/30">
            <Settings className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-4xl font-black text-primary tracking-tighter leading-none mb-2">الإعدادات والتحكم</h1>
            <p className="text-xs font-black text-muted-foreground uppercase tracking-[0.3em] opacity-40 italic">System Configuration & Management</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Right Column: Profile & Receipts */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          <Card className="glass-morphism border-none p-8 shadow-xl rounded-[32px] space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Building2 className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight italic">بروفايل الشركة</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase">Pharmacy profile & Identity</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 col-span-full">
                <Label className="font-black text-xs uppercase tracking-widest mr-2 opacity-50">اسم الصيدلية</Label>
                <Input
                  value={pharmacyInfo.name}
                  onChange={(e) => handleInfoChange('name', e.target.value)}
                  className="h-14 rounded-2xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-black text-lg"
                />
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground mr-2">العنوان</label>
                <div className="relative">
                  <MapPin className="absolute left-auto right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={pharmacyInfo.address}
                    onChange={(e) => handleInfoChange('address', e.target.value)}
                    className="h-12 pr-12 rounded-xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground mr-2">رقم الهاتف</label>
                <div className="relative">
                  <Phone className="absolute left-auto right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={pharmacyInfo.phone}
                    onChange={(e) => handleInfoChange('phone', e.target.value)}
                    className="h-12 pr-12 rounded-xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground mr-2">العملة</label>
                <div className="relative">
                  <Coins className="absolute left-auto right-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                  <Input
                    value={pharmacyInfo.currency}
                    onChange={(e) => handleInfoChange('currency', e.target.value)}
                    className="h-12 pr-12 rounded-xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase text-muted-foreground mr-2">حد نقص المخزون</label>
                <Input
                  type="number"
                  value={pharmacyInfo.lowStockThreshold}
                  onChange={(e) => handleInfoChange('lowStockThreshold', parseInt(e.target.value))}
                  className="h-12 rounded-xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold text-center"
                />
              </div>
            </div>
          </Card>

          <Card className="glass-morphism border-none p-8 shadow-xl rounded-[32px] space-y-8">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
                <Receipt className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight italic">تخصيص الفاتورة</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase">Receipt customization</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest mr-2 opacity-50">رأس الفاتورة (Header)</Label>
                <Input
                  value={pharmacyInfo.receiptHeader}
                  onChange={(e) => handleInfoChange('receiptHeader', e.target.value)}
                  className="h-12 rounded-xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-black text-xs uppercase tracking-widest mr-2 opacity-50">ذيل الفاتورة (Footer)</Label>
                <Input
                  value={pharmacyInfo.receiptFooter}
                  onChange={(e) => handleInfoChange('receiptFooter', e.target.value)}
                  className="h-12 rounded-xl bg-white/50 dark:bg-zinc-800/50 border-none shadow-inner font-bold"
                />
              </div>
            </div>
          </Card>

          <Card className="glass-morphism border-none p-8 shadow-xl rounded-[32px] space-y-8 overflow-hidden relative">
            <div className="absolute top-0 left-0 w-full h-1 premium-gradient opacity-50" />
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-500">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight italic">فريق الدعم والبرمجة</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase">The creative team</p>
              </div>
            </div>

            <div className="space-y-4">
              {teamMembers.map((member, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-5 rounded-2xl bg-white/5 dark:bg-zinc-900 border border-white/5 hover:bg-white/10 transition-all group">
                  <div className="flex items-center gap-4">
                    <div className="h-12 w-12 rounded-full premium-gradient flex items-center justify-center text-white font-black text-xl shadow-lg border-2 border-white/20">
                      {member.name[0]}
                    </div>
                    <div>
                      <h4 className="font-black text-lg group-hover:text-primary transition-colors">{member.name}</h4>
                      <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">{member.role}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-4 sm:mt-0">
                    <Button
                      onClick={() => window.open(member.wa, '_blank')}
                      variant="outline"
                      className="h-10 rounded-xl gap-2 font-black border-emerald-500/20 text-emerald-500 hover:bg-emerald-500 hover:text-white transition-all"
                    >
                      <MessageSquare className="h-4 w-4" />
                      تواصل
                    </Button>
                    <Button
                      onClick={() => window.open(member.fb, '_blank')}
                      variant="outline"
                      className="h-10 rounded-xl gap-2 font-black border-blue-500/20 text-blue-500 hover:bg-blue-500 hover:text-white transition-all"
                    >
                      <Facebook className="h-4 w-4" />
                      فيسبوك
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Left Column: Preferences & Data */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          <Card className="glass-morphism border-none p-8 shadow-xl rounded-[32px] space-y-8 overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-amber-500/10 flex items-center justify-center text-amber-500">
                <ShieldCheck className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight italic">تفضيلات النظام</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase">System Preferences</p>
              </div>
            </div>

            <div className="space-y-6">
              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group">
                <div className="flex items-center gap-3">
                  {isDarkMode ? <Moon className="h-5 w-5 text-blue-400" /> : <Sun className="h-5 w-5 text-amber-500" />}
                  <Label className="font-black cursor-pointer group-hover:text-primary transition-colors">الوضع الليلي (Dark Mode)</Label>
                </div>
                <Switch checked={isDarkMode} onCheckedChange={handleThemeChange} />
              </div>

              <div className="h-px w-full bg-white/5" />

              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group">
                <div className="flex items-center gap-3">
                  <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                  <Label className="font-black cursor-pointer group-hover:text-primary transition-colors">طلب تأكيد عند البيع</Label>
                </div>
                <Switch
                  checked={options.showCheckoutConfirm}
                  onCheckedChange={(val) => handleOptionChange('showCheckoutConfirm', val)}
                />
              </div>

              <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 group">
                <div className="flex items-center gap-3">
                  <Undo className="h-5 w-5 text-red-500" />
                  <Label className="font-black cursor-pointer group-hover:text-primary transition-colors">طلب تأكيد عند المرتجع</Label>
                </div>
                <Switch
                  checked={options.showReturnsConfirm}
                  onCheckedChange={(val) => handleOptionChange('showReturnsConfirm', val)}
                />
              </div>
            </div>
          </Card>

          <Card className="glass-morphism border-none p-8 shadow-xl rounded-[32px] space-y-8 bg-primary/5 relative overflow-hidden">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <Package className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-black tracking-tight italic text-primary">إدارة البيانات</h2>
                <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Backup & Recovery</p>
              </div>
            </div>

            <div className="flex flex-col gap-4">
              <Button
                onClick={handleExportData}
                variant="outline"
                className="h-16 rounded-[20px] bg-white dark:bg-black border-2 border-primary/20 hover:border-primary text-primary font-black text-lg gap-3 transition-all group"
              >
                <Download className="h-6 w-6 group-hover:translate-y-1 transition-transform" />
                تصدير نسخة احتياطية (JSON)
              </Button>

                

              <div className="h-px w-full bg-primary/10 my-2" />

              <Dialog open={wipeDialogOpen} onOpenChange={setWipeDialogOpen}>
                <DialogTrigger asChild>
                  <Button
                    variant="destructive"
                    className="h-16 rounded-[20px] font-black text-lg gap-3 shadow-xl hover:scale-105 active:scale-95 transition-all"
                  >
                    <Trash2 className="h-6 w-6" />
                    تصفير قاعدة البيانات
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-md border-none p-8 rounded-[32px] glass-morphism shadow-2xl space-y-6" dir="rtl">
                  <DialogHeader>
                    <div className="h-16 w-16 rounded-2xl bg-red-500/10 flex items-center justify-center text-red-500 mx-auto mb-4">
                      <AlertTriangle className="h-10 w-10 animate-pulse" />
                    </div>
                    <DialogTitle className="text-center text-3xl font-black text-red-500 italic">تأكيد الحذف النهائي</DialogTitle>
                  </DialogHeader>

                  <div className="space-y-4 text-center">
                    <p className="font-bold text-lg leading-relaxed">
                      هل أنت متأكد من رغبتك في حذف <strong>جميع المنتجات وجميع سجلات المبيعات والأرباح</strong>؟
                    </p>
                    <Card className="p-4 bg-red-500/5 border-red-500/20 border-dashed rounded-xl">
                      <p className="font-black text-red-500 uppercase tracking-widest text-xs">⚠️ تحذير خطير</p>
                      <p className="font-bold text-sm text-red-500/80 mt-1">لا يمكن التراجع عن هذه العملية! يرجى تحميل نسخة احتياطية أولاً.</p>
                    </Card>
                  </div>

                  <DialogFooter className="grid grid-cols-2 gap-4 mt-8">
                    <Button
                      variant="outline"
                      onClick={() => setWipeDialogOpen(false)}
                      className="h-14 rounded-2xl font-black border-zinc-200"
                    >
                      إلغاء العملية
                    </Button>
                    <Button
                      variant="destructive"
                      onClick={handleWipeData}
                      disabled={isWiping}
                      className="h-14 rounded-2xl font-black shadow-lg shadow-red-500/20"
                    >
                      {isWiping ? <div className="h-5 w-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : "نعم، احذف الأن"}
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <p className="text-[10px] font-black uppercase text-center text-muted-foreground/40 tracking-[0.2em] italic mt-4">
              Warning: Data operations are irreversible
            </p>
          </Card>
        </div>
      </div>
    </div>
  );
}
