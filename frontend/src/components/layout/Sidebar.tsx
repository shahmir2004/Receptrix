import {
  LayoutDashboard,
  Calendar,
  PhoneIncoming,
  Mic,
  Settings,
  Phone,
  LogOut,
  ArrowLeft,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const navItems = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { id: 'appointments', label: 'Appointments', icon: Calendar },
  { id: 'calls', label: 'Call Logs', icon: PhoneIncoming },
  { id: 'chat', label: 'Voice Test', icon: Mic },
  { id: 'settings', label: 'Settings', icon: Settings },
] as const;

const restrictedTabs = new Set(['appointments', 'calls', 'chat']);

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  const { currentUser, businessMemberships, currentBusinessId, logout, hasActiveBusinessContext } =
    useAuth();
  const toast = useToast();

  const activeBusiness =
    businessMemberships.find((b) => b.business_id === currentBusinessId) ??
    businessMemberships[0] ??
    null;

  const handleNavClick = (tabId: string) => {
    if (restrictedTabs.has(tabId) && !hasActiveBusinessContext()) {
      toast.show('Create your business in Settings to unlock this section.', 'info');
      onTabChange('settings');
      return;
    }
    onTabChange(tabId);
  };

  return (
    <nav className="flex h-full flex-col bg-[#0a0a0a] border-r border-white/[0.07]">
      {/* Header */}
      <div className="px-5 pt-6 pb-4">
        <div className="flex items-center gap-2.5">
          <Phone className="h-5 w-5 text-indigo-400" />
          <span className="text-xl font-bold text-white">Receptrix</span>
        </div>
        <p className="mt-1 text-xs text-white/35">AI Voice Receptionist</p>
      </div>

      {/* Navigation */}
      <ul className="flex-1 space-y-1 px-3 py-2">
        {navItems.map((item) => {
          const isActive = activeTab === item.id;
          const Icon = item.icon;
          return (
            <li key={item.id}>
              <button
                onClick={() => handleNavClick(item.id)}
                className={`
                  flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                  ${
                    isActive
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'text-white/65 hover:bg-white/[0.05] hover:text-white border border-transparent'
                  }
                `}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="border-t border-white/[0.07] p-3 space-y-3">
        {/* User status card */}
        <div className="rounded-lg bg-white/[0.03] border border-white/[0.07] p-3">
          <p className="text-[10px] uppercase tracking-wider text-white/35 mb-1.5">Signed In As</p>
          <p className="text-sm font-medium text-white truncate">
            {currentUser?.full_name || 'Not signed in'}
          </p>
          <p className="text-xs text-white/50 truncate">{currentUser?.email || '-'}</p>
          <p className="mt-1 text-xs text-indigo-400/80 truncate">
            {activeBusiness
              ? `${activeBusiness.business_name || 'Business'} (${activeBusiness.role})`
              : 'No business assigned'}
          </p>
        </div>

        {/* Back to Landing Page */}
        <Link
          to="/"
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/[0.05] hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Home</span>
        </Link>

        {/* Logout */}
        <button
          onClick={logout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2 text-sm text-white/50 hover:bg-white/[0.05] hover:text-red-400 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          <span>Log Out</span>
        </button>
      </div>
    </nav>
  );
}
