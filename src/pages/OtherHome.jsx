import React, { useEffect } from 'react';
import { Plus, FolderKanban, Target, TrendingUp, BarChart3 } from 'lucide-react';

export default function Home() {
  // 自動注入 Tailwind CSS，確保沒有外部設定檔也能呈現完美 UI
  useEffect(() => {
    const script = document.createElement('script');
    script.src = 'https://cdn.tailwindcss.com';
    document.head.appendChild(script);

    // 可以在這裡進行 Tailwind 自訂設定
    script.onload = () => {
      window.tailwind.config = {
        theme: {
          extend: {
            fontFamily: {
              sans: ['ui-sans-serif', 'system-ui', 'sans-serif'],
            }
          }
        }
      }
    };

    return () => {
      document.head.removeChild(script);
    };
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-100 selection:text-blue-900 flex flex-col">
      {/* Navigation / Header */}
      <header className="px-6 py-4 flex items-center justify-between border-b border-slate-200 bg-white/80 backdrop-blur-md sticky top-0 z-10">
        <div className="flex items-center gap-2 font-bold text-xl tracking-tight text-slate-800">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white">
            <Target size={20} />
          </div>
          OGSM<span className="text-blue-600">Planner</span>
        </div>
      </header>

      {/* Main Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 py-20 relative overflow-hidden">
        {/* Subtle background decoration */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] bg-blue-100/40 rounded-full blur-3xl -z-10 opacity-60 pointer-events-none"></div>
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-indigo-50/50 rounded-full blur-3xl -z-10 opacity-60 translate-x-1/3 -translate-y-1/3 pointer-events-none"></div>

        <div className="max-w-4xl mx-auto text-center space-y-8">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-600 text-sm font-medium mb-2 shadow-sm">
            <span className="flex h-2 w-2 rounded-full bg-blue-500 animate-pulse"></span>
            全新 AI 輔助策略規劃工具
          </div>

          <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight text-slate-900 leading-[1.1]">
            Strategic <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-600">
              OGSM Planner.
            </span>
          </h1>

          <p className="text-lg md:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed">
            利用 OGSM 框架與 AI 技術，將您的願景轉化為具體的執行計畫。
            精確定義目標 (Objective)、策略 (Strategy) 與衡量指標 (Measure)。
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-6">
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-blue-600 text-white px-8 py-4 rounded-lg font-semibold text-lg hover:bg-blue-700 hover:shadow-lg hover:shadow-blue-600/20 transition-all active:scale-[0.98]">
              <Plus size={20} />
              新增專案
            </button>
            <button className="w-full sm:w-auto flex items-center justify-center gap-2 bg-white text-slate-700 border border-slate-200 px-8 py-4 rounded-lg font-semibold text-lg hover:bg-slate-50 hover:border-slate-300 shadow-sm transition-all active:scale-[0.98]">
              <FolderKanban size={20} />
              管理專案
            </button>
          </div>
          
          {/* Feature Highlights */}
          <div className="pt-16 grid grid-cols-1 md:grid-cols-3 gap-6 text-left max-w-4xl mx-auto">
             <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-blue-50 flex items-center justify-center text-blue-600 mb-5">
                  <Target size={24} />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">明確願景目標</h3>
                <p className="text-slate-600 text-sm leading-relaxed">將抽象的企業願景轉化為具體、可衡量的最終目標 (Objective)，凝聚團隊共識。</p>
             </div>
             <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600 mb-5">
                  <TrendingUp size={24} />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">制定致勝策略</h3>
                <p className="text-slate-600 text-sm leading-relaxed">運用 AI 輔助分析，找出達成目標的最佳策略路徑 (Strategy) 與具體行動方案。</p>
             </div>
             <div className="p-6 rounded-2xl bg-white border border-slate-100 shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 rounded-xl bg-sky-50 flex items-center justify-center text-sky-600 mb-5">
                  <BarChart3 size={24} />
                </div>
                <h3 className="font-semibold text-slate-900 text-lg mb-2">追蹤衡量指標</h3>
                <p className="text-slate-600 text-sm leading-relaxed">設定關鍵績效指標 (Measure)，透過數據儀表板隨時掌握專案執行進度與成效。</p>
             </div>
          </div>
        </div>
      </main>
    </div>
  );
}