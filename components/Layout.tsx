import React from 'react';
import {
  Briefcase,
  FileText,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Menu,
  Upload,
  User,
  X,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail?: string;
  isDemoMode?: boolean;
  onLogout: () => Promise<void> | void;
}

export const Layout: React.FC<LayoutProps> = ({
  children,
  activeTab,
  setActiveTab,
  userEmail,
  isDemoMode,
  onLogout,
}) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: '成长轨迹', sub: 'Growth Tracking', icon: LayoutDashboard },
    { id: 'upload', label: '成果上传', sub: 'Sync Achievements', icon: Upload },
    { id: 'resume', label: '个性化实习履历', sub: 'Internship Resume', icon: FileText },
    { id: 'jobs', label: '精准实习匹配', sub: 'Internship Match', icon: Briefcase },
  ];

  const accountName = isDemoMode ? '游客模式' : userEmail?.split('@')[0] || '学生用户';

  const handleLogoutClick = async () => {
    const confirmed = window.confirm(
      isDemoMode ? '确定退出演示模式吗？' : '确定退出当前账号吗？',
    );
    if (!confirmed) {
      return;
    }

    setIsMobileMenuOpen(false);
    await onLogout();
  };

  const NavContent = () => (
    <div className="flex h-full w-full flex-col border-r border-slate-100 bg-white text-[#1D1D1F] lg:w-72">
      <div className="flex items-center gap-4 px-6 pb-6 pt-8 sm:px-8 lg:px-10">
        <div className="rounded-2xl bg-blue-600 p-3 shadow-lg shadow-blue-200">
          <GraduationCap className="h-7 w-7 text-white" />
        </div>
        <div className="flex flex-col">
          <span className="text-2xl font-black tracking-tight text-slate-900">青网站</span>
          <span className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-400">
            Student OS
          </span>
        </div>
      </div>

      <nav className="flex-1 space-y-2 px-4 pb-6 sm:px-5">
        {navItems.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => {
              setActiveTab(item.id);
              setIsMobileMenuOpen(false);
            }}
            className={`group flex w-full items-center gap-4 rounded-[24px] px-5 py-4 text-left transition-all ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-100'
                : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'
            }`}
          >
            <item.icon
              className={`h-5 w-5 transition-transform ${
                activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'
              }`}
            />
            <div className="flex min-w-0 flex-col">
              <span className="truncate text-sm font-black">{item.label}</span>
              <span
                className={`text-[9px] font-bold uppercase tracking-[0.22em] ${
                  activeTab === item.id ? 'text-blue-200' : 'text-slate-300'
                }`}
              >
                {item.sub}
              </span>
            </div>
          </button>
        ))}
      </nav>

      <div className="border-t border-slate-100 p-5 sm:p-6">
        <div className="mb-4 rounded-[24px] bg-slate-50 p-4">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-slate-200 bg-white shadow-sm">
              <User className="h-5 w-5 text-slate-300" />
            </div>
            <div className="min-w-0">
              <p className="mb-1 text-[10px] font-black uppercase tracking-[0.22em] text-slate-400">
                {isDemoMode ? 'Demo Visitor' : 'Verified Student'}
              </p>
              <p className="truncate text-sm font-black text-slate-900">{accountName}</p>
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={handleLogoutClick}
          className="flex w-full items-center justify-center gap-3 rounded-[20px] px-4 py-3 text-[11px] font-black uppercase tracking-[0.22em] text-slate-400 transition-all hover:bg-red-50 hover:text-red-500"
        >
          <LogOut className="h-4 w-4" />
          {isDemoMode ? '退出演示' : '退出登录'}
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen bg-[#F5F5F7] no-print">
      <aside className="hidden shrink-0 lg:block">
        <div className="sticky top-0 h-screen">
          <NavContent />
        </div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <div className="fixed inset-x-0 top-0 z-40 border-b border-slate-100 bg-white/85 px-4 py-4 backdrop-blur-2xl sm:px-6 lg:hidden">
          <div className="flex items-center justify-between gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <GraduationCap className="h-7 w-7 shrink-0 text-blue-600" />
              <span className="truncate text-xl font-black tracking-tight text-slate-900">
                青网站
              </span>
            </div>
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen((current) => !current)}
              className="rounded-2xl bg-slate-50 p-3 text-slate-500"
            >
              {isMobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-30 lg:hidden">
            <button
              type="button"
              aria-label="Close menu"
              onClick={() => setIsMobileMenuOpen(false)}
              className="absolute inset-0 bg-slate-900/20"
            />
            <div className="absolute bottom-4 left-4 right-4 top-[84px] overflow-hidden rounded-[32px] shadow-2xl">
              <NavContent />
            </div>
          </div>
        )}

        <main className="min-w-0 flex-1 overflow-y-auto pt-[84px] lg:pt-0">
          <div className="mx-auto max-w-[1280px] px-4 pb-8 pt-4 sm:px-6 sm:pb-10 sm:pt-6 lg:px-10 lg:py-12 xl:px-16 xl:py-16">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};
