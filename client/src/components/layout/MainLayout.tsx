/**
 * MainLayout 컴포넌트 - 메인 레이아웃
 */

'use client';

import { Header } from './Header';
import { Sidebar } from './Sidebar';
import { Footer } from './Footer';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  return (
    <div className="min-h-screen bg-background">
      {/* 헤더 */}
      <Header />

      {/* 메인 콘텐츠 영역 - Header 높이(h-14 = 3.5rem)만큼 padding-top */}
      <div className="flex max-w-[1600px] mx-auto pt-14 w-full">
        {/* 사이드바 */}
        <aside className="w-64 border-r bg-card min-h-[calc(100vh-3.5rem)]">
          <div className="p-4">
            <Sidebar />
          </div>
        </aside>

        {/* 메인 콘텐츠 */}
        <main className="flex-1 min-h-[calc(100vh-3.5rem)] overflow-x-auto">
          <div className="p-6 min-w-0">
            {children}
          </div>
        </main>
      </div>

      {/* 푸터 */}
      <Footer />
    </div>
  );
}