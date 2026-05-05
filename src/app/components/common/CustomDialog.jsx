"use client";

import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import { cn } from "@/lib/utils";

const CustomDialog = ({ open, onClose, title, message, type = 'error', onConfirm }) => {
    const isError = type === 'error';

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-md p-8 border-none overflow-hidden rounded-[32px] glass-morphism shadow-2xl" dir="rtl">
                <div className={cn(
                    "absolute top-0 left-0 right-0 h-1",
                    isError ? "bg-destructive" : "bg-primary"
                )} />

                <DialogHeader className="flex flex-col items-center gap-4 text-center">
                    <div className={cn(
                        "h-16 w-16 rounded-2xl flex items-center justify-center border-2 animate-in zoom-in-50",
                        isError ? "bg-destructive/10 border-destructive/20 text-destructive" : "bg-primary/10 border-primary/20 text-primary"
                    )}>
                        {isError ? <AlertCircle className="h-8 w-8" /> : <CheckCircle2 className="h-8 w-8" />}
                    </div>
                    <DialogTitle className={cn(
                        "text-2xl font-black uppercase tracking-tight",
                        isError ? "text-destructive" : "text-primary"
                    )}>
                        {title}
                    </DialogTitle>
                </DialogHeader>

                <div className="py-6 text-center">
                    <p className="text-sm font-bold text-muted-foreground leading-relaxed">
                        {message}
                    </p>
                </div>

                <DialogFooter className="flex gap-3 mt-4">
                    <Button
                        onClick={onConfirm || onClose}
                        className={cn(
                            "flex-1 h-12 rounded-xl font-black uppercase tracking-widest shadow-lg",
                            isError ? "bg-destructive hover:bg-destructive/90 shadow-destructive/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"
                        )}
                    >
                        {onConfirm ? 'نعم' : 'حسناً'}
                    </Button>
                    {onConfirm && (
                        <Button
                            variant="outline"
                            onClick={onClose}
                            className="flex-1 h-12 rounded-xl border-2 font-black uppercase tracking-widest"
                        >
                            إلغاء
                        </Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};

export default CustomDialog;
