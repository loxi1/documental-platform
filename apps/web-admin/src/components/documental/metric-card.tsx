import Link from "next/link";
import type { ReactNode } from "react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  title: string;
  value: string | number;
  description?: string;
  icon?: ReactNode;
  href?: string;
  accent?: "default" | "success" | "warning" | "danger";
  className?: string;
};

const accentClasses = {
  default: "bg-muted/60 text-muted-foreground",
  success: "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
  warning: "bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
  danger: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300",
};

export function MetricCard({
  title,
  value,
  description,
  icon,
  href,
  accent = "default",
  className,
}: MetricCardProps) {
  const content = (
    <Card
      className={cn(
        "group relative overflow-hidden transition-all hover:-translate-y-0.5 hover:shadow-md",
        href ? "cursor-pointer" : "",
        className,
      )}
    >
      <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-foreground/10 via-foreground/20 to-transparent" />
      <CardHeader className="flex flex-row items-center justify-between gap-3 space-y-0 pb-3">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        {icon ? (
          <div className={cn("rounded-xl p-2.5", accentClasses[accent])}>
            {icon}
          </div>
        ) : null}
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold tracking-tight">{value}</div>
        {description ? (
          <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
            {description}
          </p>
        ) : null}
      </CardContent>
    </Card>
  );

  if (!href) return content;

  return (
    <Link href={href} className="block focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2">
      {content}
    </Link>
  );
}

export function MetricCardSkeleton() {
  return (
    <Card>
      <CardHeader className="space-y-0 pb-3">
        <Skeleton className="h-4 w-28" />
      </CardHeader>
      <CardContent className="space-y-3">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-2/3" />
      </CardContent>
    </Card>
  );
}
