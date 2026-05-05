"use client";

import React from 'react';
import { Loader2, Sparkles } from "lucide-react";

const GlobalLoader = () => {
  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background/80 backdrop-blur-md">
      <div className="relative flex flex-col items-center gap-4">
        <div className="relative">
          <Loader2 className="h-12 w-12 text-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <Sparkles className="h-4 w-4 text-primary opacity-50 animate-pulse" />
          </div>
        </div>
        <div className="flex flex-col items-center gap-1">
          <h3 className="text-sm font-black text-primary uppercase tracking-[0.2em] animate-pulse">
            جاري التحميل
          </h3>
          <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-50">
            Pharmacy System is initializing
          </p>
        </div>
      </div>
    </div>
  );
};

export default GlobalLoader;
