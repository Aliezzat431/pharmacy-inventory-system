'use client';

import React, { useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import axios from 'axios';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, ShieldCheck, User as UserIcon, Lock } from "lucide-react";

const Login = () => {
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [pharmacyId, setPharmacyId] = useState('1');
  const [loading, setLoading] = useState(false);
  const [registerBlocked, setRegisterBlocked] = useState(false);
  const [pharmacyName, setPharmacyName] = useState("Smart Pharma");
  const [masterPin, setMasterPin] = useState('');
  const [isMasterRequested, setIsMasterRequested] = useState(false);

  React.useEffect(() => {
    const saved = localStorage.getItem("pharmacy-info");
    if (saved) {
      const info = JSON.parse(saved);
      if (info.name) setPharmacyName(info.name);
    }
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!username.trim() || !password.trim()) {
      toast.error('الرجاء إدخال اسم المستخدم وكلمة المرور');
      return;
    }

    const endpoint = isRegister ? '/api/register' : '/api/login';
    const payload = isRegister
      ? { username, password, pharmacyId, masterPin }
      : { username, password, pharmacyId };

    setLoading(true);
    try {
      const res = await axios.post(endpoint, payload);

      if (res.data.success) {
        toast.success(isRegister ? '✅ تم التسجيل بنجاح' : '✅ تم تسجيل الدخول بنجاح');
        setTimeout(() => window.location.reload(), 1500);
      } else {
        const msg = res.data.message || 'حدث خطأ غير معروف';
        if (isRegister && msg.includes('User limit reached')) {
          setRegisterBlocked(true);
          setIsRegister(false);
          toast.error('🚫 لا يمكن إنشاء مستخدمين جدد. الرجاء التواصل مع المسؤول.');
        } else {
          toast.error(msg);
        }
      }
    } catch (err) {
      const serverMessage = err?.response?.data?.message || 'حدث خطأ أثناء الاتصال بالخادم';
      if (isRegister && serverMessage.includes('User limit reached')) {
        setRegisterBlocked(true);
        setIsRegister(false);
        toast.error('🚫 لا يمكن إنشاء مستخدمين جدد. الرجاء التواصل مع المسؤول.');
      } else {
        toast.error(serverMessage);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background/50 backdrop-blur-sm">
      <Card className="w-full max-w-md glass-morphism border-none shadow-2xl relative overflow-hidden">
        {/* Top Decorative Gradient */}
        <div className="absolute top-0 left-0 right-0 h-1.5 premium-gradient" />

        <CardHeader className="text-center space-y-4 pt-8">
          <div className="mx-auto flex justify-center items-center h-20 w-20 rounded-3xl bg-primary/10 border border-primary/20 shadow-inner">
            <Image
              src="/شعار صيدلية عصري وبسيط بالأزرق والأخضر.gif"
              alt="Logo"
              width={64}
              height={64}
              className="drop-shadow-lg"
            />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-black tracking-tight text-primary uppercase">
              {pharmacyName}
            </CardTitle>
            <CardDescription className="text-xs font-bold uppercase tracking-widest opacity-70">
              نظام إدارة الصيدلية المتكامل
            </CardDescription>
          </div>
        </CardHeader>

        <CardContent className="space-y-6 pt-2 pb-8 px-8">
          <div className="text-center">
            <h3 className="text-lg font-bold">
              {isRegister ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}
            </h3>
          </div>

          {!registerBlocked && (
            <form onSubmit={handleSubmit} className="space-y-4" dir="rtl">
              <div className="space-y-2">
                <div className="relative">
                  <UserIcon className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="اسم المستخدم"
                    className="pr-10 h-12 bg-muted/30 border-muted-foreground/20 focus:border-primary transition-all rounded-xl font-bold"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <div className="relative">
                  <Lock className="absolute right-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="password"
                    placeholder="كلمة المرور"
                    className="pr-10 h-12 bg-muted/30 border-muted-foreground/20 focus:border-primary transition-all rounded-xl font-bold"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Select
                  value={pharmacyId}
                  onValueChange={setPharmacyId}
                >
                  <SelectTrigger className="h-12 bg-muted/30 border-muted-foreground/20 rounded-xl font-bold">
                    <SelectValue placeholder="اختر الصيدلية" />
                  </SelectTrigger>
                  <SelectContent className="glass-morphism rounded-xl border-border/50">
                    <SelectItem value="1" className="font-bold">صيدلية 1 (الرئيسية)</SelectItem>
                    <SelectItem value="2" className="font-bold">صيدلية 2 (الفرعية)</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {isRegister && (
                <div className="space-y-4 pt-2">
                  <div className="flex items-center space-x-2 space-x-reverse">
                    <input
                      type="checkbox"
                      id="master-check"
                      checked={isMasterRequested}
                      onChange={(e) => setIsMasterRequested(e.target.checked)}
                      className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
                    />
                    <label
                      htmlFor="master-check"
                      className="text-xs font-bold cursor-pointer select-none opacity-80"
                    >
                      التسجيل كمسؤول للمجال (Master)
                    </label>
                  </div>

                  {isMasterRequested && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300">
                      <Input
                        type="password"
                        placeholder="رقم الماستر السري"
                        className="h-12 bg-muted/30 border-muted-foreground/20 rounded-xl font-bold"
                        value={masterPin}
                        onChange={(e) => setMasterPin(e.target.value)}
                      />
                      <p className="text-[10px] text-muted-foreground mt-1 mr-1 font-bold">
                        أدخل الكود السري للحصول على كامل الصلاحيات
                      </p>
                    </div>
                  )}
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-sm font-black uppercase tracking-widest rounded-xl premium-gradient shadow-lg shadow-primary/25 hover:shadow-primary/40 transition-all duration-300 group"
                disabled={loading}
              >
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    {isRegister ? 'تسجيل' : 'دخول'}
                    <ShieldCheck className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                  </>
                )}
              </Button>
            </form>
          )}
        </CardContent>

        {!registerBlocked && (
          <CardFooter className="pb-8 pt-0 flex flex-col space-y-4">
            <div className="w-full h-px bg-gradient-to-r from-transparent via-border/50 to-transparent" />
            <button
              onClick={() => setIsRegister(!isRegister)}
              className="text-xs font-bold text-primary hover:underline transition-all"
            >
              {isRegister
                ? 'هل لديك حساب؟ تسجيل الدخول'
                : 'ليس لديك حساب؟ إنشاء حساب جديد'}
            </button>
          </CardFooter>
        )}
      </Card>
    </div>
  );
};

export default Login;
