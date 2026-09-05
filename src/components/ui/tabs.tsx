// Tabs — pemisah isi halaman. Dipakai untuk memisahkan alur yang berbeda
// dalam satu halaman (contoh: uang masuk vs uang keluar di Kas).
// Dependensi: @radix-ui/react-tabs

"use client";

import * as React from "react";
import * as TabsPrimitive from "@radix-ui/react-tabs";
import { cn } from "@/lib/utils";

export const Tabs = TabsPrimitive.Root;

export function TabsList({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.List>) {
  return (
    <TabsPrimitive.List
      className={cn(
        "inline-flex w-full gap-1 rounded-xl border p-1 sm:w-auto",
        "border-gray-200 bg-gray-100",
        "dark:border-zinc-700 dark:bg-zinc-800",
        className
      )}
      {...props}
    />
  );
}

export function TabsTrigger({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        "flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2",
        "text-sm font-medium transition-colors sm:flex-none",
        "text-gray-600 hover:text-gray-900",
        "dark:text-gray-400 dark:hover:text-gray-100",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500",
        "dark:focus-visible:ring-blue-400",
        "data-[state=active]:bg-white data-[state=active]:text-gray-900",
        "data-[state=active]:shadow-sm",
        "dark:data-[state=active]:bg-zinc-900 dark:data-[state=active]:text-gray-50",
        className
      )}
      {...props}
    />
  );
}

export function TabsContent({
  className,
  ...props
}: React.ComponentPropsWithoutRef<typeof TabsPrimitive.Content>) {
  return (
    <TabsPrimitive.Content
      className={cn(
        "space-y-4 focus-visible:outline-none",
        "data-[state=inactive]:hidden",
        className
      )}
      {...props}
    />
  );
}
