import { Suspense } from 'react';
import { Outlet } from 'react-router-dom';
import { LoadingList, Page } from '@/components/ui';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

export function AppLayout() {
  return (
    <div className="flex h-dvh overflow-hidden">
      <Sidebar />
      <div className="relative flex flex-col flex-1 min-w-0 overflow-y-auto overflow-x-hidden">
        <Header />
        <main className="grow">
          <Suspense
            fallback={
              <Page>
                <LoadingList />
              </Page>
            }
          >
            <Outlet />
          </Suspense>
        </main>
      </div>
    </div>
  );
}
