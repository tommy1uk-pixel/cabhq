import { ReactNode } from 'react';
import SuperAdminSidebar from './SuperAdminSidebar';

export default function SuperAdminShell({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-slate-900 text-white">
      <div className="flex min-h-screen">
        <SuperAdminSidebar />
        <main className="flex-1 p-6">{children}</main>
      </div>
    </div>
  );
}