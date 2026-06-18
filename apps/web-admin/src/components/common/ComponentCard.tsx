import type { ReactNode } from "react";

type ComponentCardProps = {
  title?: string;
  children: ReactNode;
};

export default function ComponentCard({ title, children }: ComponentCardProps) {
  return (
    <section className="rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-800 dark:bg-white/[0.03]">
      {title ? (
        <h3 className="mb-4 text-base font-semibold text-gray-900 dark:text-white">
          {title}
        </h3>
      ) : null}
      {children}
    </section>
  );
}