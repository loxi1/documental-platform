// src/layout/DefaultLayout.tsx
import AppSidebar from "./AppSidebar";
import AppHeader from "./AppHeader";
import TopProgress from "@/components/common/TopProgress";
//import { getSessionUser } from "@/lib/auth-session";

export default async function DefaultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  //const session = await getSessionUser(); // { cod } | null
  //const userCod = session?.cod ?? null;
  const userCod = 'Loxi1';

  return (
    <div className="min-h-screen bg-gray-50 text-gray-800 dark:bg-[#0B1221] dark:text-white">
      {/* Sidebar fijo a la izquierda */}
      <AppSidebar userCod={userCod} />

      {/* Contenido principal: reserva el ancho del sidebar en desktop */}
      <main className="min-h-screen lg:pl-64">
        {/* Barra superior (una sola vez) */}
        <AppHeader userCod={userCod} />
        <TopProgress />
        {/* Contenedor de página */}
        <div className="mx-auto max-w-7xl p-6">{children}</div>
      </main>
    </div>
  );
}