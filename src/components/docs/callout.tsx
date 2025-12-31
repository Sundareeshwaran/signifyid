"use client";

import { cn } from "@/lib/utils";
import { AlertTriangle, Info, Lightbulb, XCircle } from "lucide-react";

type CalloutVariant = "info" | "warning" | "tip" | "danger";

interface CalloutProps {
  variant?: CalloutVariant;
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const variants: Record<
  CalloutVariant,
  {
    icon: React.ElementType;
    containerClass: string;
    iconClass: string;
  }
> = {
  info: {
    icon: Info,
    containerClass: "border-blue-500/30 bg-blue-500/5 dark:bg-blue-500/10",
    iconClass: "text-blue-500",
  },
  warning: {
    icon: AlertTriangle,
    containerClass: "border-accent bg-accent/30 dark:bg-accent/20",
    iconClass: "text-accent-foreground",
  },
  tip: {
    icon: Lightbulb,
    containerClass:
      "border-emerald-500/30 bg-emerald-500/5 dark:bg-emerald-500/10",
    iconClass: "text-emerald-500",
  },
  danger: {
    icon: XCircle,
    containerClass: "border-red-500/30 bg-red-500/5 dark:bg-red-500/10",
    iconClass: "text-red-500",
  },
};

export function Callout({
  variant = "info",
  title,
  children,
  className,
}: CalloutProps) {
  const { icon: Icon, containerClass, iconClass } = variants[variant];

  return (
    <div
      className={cn(
        "my-6 flex gap-4 rounded-xl border p-4",
        containerClass,
        className
      )}
    >
      <Icon className={cn("h-5 w-5 flex-shrink-0 mt-0.5", iconClass)} />
      <div className="flex-1 min-w-0">
        {title && <p className="font-semibold text-foreground mb-1">{title}</p>}
        <div className="text-muted-foreground text-sm leading-relaxed [&>p]:mb-2 [&>p:last-child]:mb-0">
          {children}
        </div>
      </div>
    </div>
  );
}
