import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Toaster } from 'react-hot-toast';

export function AppLayout() {
  return (
    <div className="min-h-screen bg-slate-50 flex">
      <Sidebar />
      <main className="flex-1 ml-[260px] min-h-screen">
        <div className="max-w-[1400px] mx-auto px-8 py-8">
          <Outlet />
        </div>
      </main>
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 3000,
          style: {
            background: '#0F172A',
            color: '#fff',
            borderRadius: '10px',
          },
          success: {
            iconTheme: { primary: '#F97316', secondary: '#fff' },
          },
        }}
      />
    </div>
  );
}
