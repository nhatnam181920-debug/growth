
import React from 'react';
import { LayoutDashboard, Upload, FileText, Briefcase, GraduationCap, Menu, X, LogOut, User } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  userEmail?: string;
}

export const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab, userEmail }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const navItems = [
    { id: 'dashboard', label: '轨迹分析', sub: 'Growth Tracking', icon: LayoutDashboard },
    { id: 'upload', label: '成果上传', sub: 'Sync Achievements', icon: Upload },
    { id: 'resume', label: '智能简历', sub: 'Resume Builder', icon: FileText },
    { id: 'jobs', label: '校招匹配', sub: 'Career Match', icon: Briefcase },
  ];

  const handleLogout = async () => {
    if (confirm('确定要退出登录吗？')) {
      await supabase.auth.signOut();
      window.location.reload();
    }
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-white text-[#1D1D1F] w-72 border-r border-gray-100">
      <div className="p-10 flex items-center gap-4 mb-8">
        <div className="bg-blue-600 p-2.5 rounded-xl shadow-lg shadow-blue-200">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tight italic">UniPath</span>
            <span className="text-[9px] font-black text-gray-400 tracking-[0.3em] uppercase">Student OS</span>
        </div>
      </div>
      
      <nav className="flex-1 px-4 space-y-1">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => {
              setActiveTab(item.id);
              setIsMobileMenuOpen(false);
            }}
            className={`w-full group flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300 ${
              activeTab === item.id
                ? 'bg-blue-600 text-white shadow-xl shadow-blue-100'
                : 'text-gray-400 hover:bg-gray-50 hover:text-[#1D1D1F]'
            }`}
          >
            <item.icon className={`w-5 h-5 transition-transform duration-300 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'}`} />
            <div className="flex flex-col items-start">
                <span className="font-black text-sm">{item.label}</span>
                <span className={`text-[9px] font-bold tracking-widest uppercase ${activeTab === item.id ? 'text-blue-200' : 'text-gray-300'}`}>{item.sub}</span>
            </div>
          </button>
        ))}
      </nav>

      <div className="p-6 border-t border-gray-50">
        <div className="bg-gray-50 rounded-2xl p-5 mb-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-white flex items-center justify-center border border-gray-200 shadow-sm">
              <User size={24} className="text-gray-300" />
            </div>
            <div className="overflow-hidden">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Verified Student</p>
              <p className="text-xs font-black truncate">{userEmail?.split('@')[0] || 'Demo Account'}</p>
            </div>
          </div>
        </div>
        
        <button 
          onClick={handleLogout}
          className="w-full flex items-center justify-center gap-3 px-4 py-4 rounded-2xl text-gray-400 hover:bg-red-50 hover:text-red-500 transition-all font-black text-[10px] tracking-widest uppercase"
        >
          <LogOut className="w-4 h-4" /> Sign Out
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-[#F5F5F7] overflow-hidden no-print">
      <div className="hidden lg:block z-20">
        <NavContent />
      </div>

      <div className="lg:hidden fixed top-0 w-full bg-white/80 backdrop-blur-md z-50 px-8 py-5 flex justify-between items-center border-b border-gray-100">
        <div className="flex items-center gap-3">
           <GraduationCap className="w-7 h-7 text-blue-600" />
           <span className="font-black tracking-tighter text-2xl italic">UniPath</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="p-3 bg-gray-50 rounded-2xl text-gray-400"
        >
          {isMobileMenuOpen ? <X /> : <Menu />}
        </button>
      </div>

      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-white z-40 pt-24 lg:hidden animate-fade-in">
            <NavContent />
        </div>
      )}

      <main className="flex-1 overflow-y-auto pt-24 lg:pt-0 bg-[#F5F5F7]">
        <div className="max-w-[1200px] mx-auto p-8 lg:p-20">
            {children}
        </div>
      </main>
    </div>
  );
};
