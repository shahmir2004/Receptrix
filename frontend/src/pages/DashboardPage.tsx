import { useState, useCallback, createContext, useContext } from 'react';
import { LayoutDashboard, Calendar, PhoneIncoming, Mic, Settings } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';
import { useToast } from '@/lib/toast-context';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { StatsCards } from '@/components/dashboard/StatsCards';
import { TodaysSchedule } from '@/components/dashboard/TodaysSchedule';
import { RecentCalls } from '@/components/dashboard/RecentCalls';
import { SetupBanner } from '@/components/dashboard/SetupBanner';
import { AppointmentsTable } from '@/components/appointments/AppointmentsTable';
import { CallLogsTable } from '@/components/calls/CallLogsTable';
import { VoiceTestPanel } from '@/components/voice-test/VoiceTestPanel';
import { ProfileForm, PasswordForm, BusinessInfoForm, WorkingHoursForm, ServicesEditor } from '@/components/settings';
import { VoiceProviderCard } from '@/components/settings/VoiceProviderCard';

// Context for child tab components to trigger data refresh
interface DashboardRefreshContextValue {
  refreshDashboard: () => void;
}

const DashboardRefreshContext = createContext<DashboardRefreshContextValue | null>(null);

export function useDashboardRefresh() {
  const ctx = useContext(DashboardRefreshContext);
  if (!ctx) throw new Error('useDashboardRefresh must be used within DashboardPage');
  return ctx;
}

const restrictedTabs = new Set(['appointments', 'calls', 'chat']);

export default function DashboardPage() {
  const { hasActiveBusinessContext } = useAuth();
  const toast = useToast();

  const needsSetup = !hasActiveBusinessContext();
  const [activeTab, setActiveTab] = useState(needsSetup ? 'settings' : 'dashboard');
  const [refreshKey, setRefreshKey] = useState(0);

  const refreshDashboard = useCallback(() => {
    setRefreshKey((k) => k + 1);
  }, []);

  const handleTabChange = useCallback(
    (tab: string) => {
      if (restrictedTabs.has(tab) && !hasActiveBusinessContext()) {
        toast.show('Create your business in Settings to unlock this section.', 'info');
        setActiveTab('settings');
        return;
      }
      setActiveTab(tab);
    },
    [hasActiveBusinessContext, toast]
  );

  return (
    <DashboardRefreshContext.Provider value={{ refreshDashboard }}>
      <DashboardLayout activeTab={activeTab} onTabChange={handleTabChange}>
        {/* Dashboard Tab */}
        {activeTab === 'dashboard' && (
          <div className="space-y-6">
            {/* Page header */}
            <div>
              <div className="flex items-center gap-2.5">
                <LayoutDashboard className="h-6 w-6 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">Dashboard</h1>
              </div>
              <p className="mt-1 text-sm text-white/50">
                Overview of your AI receptionist activity
              </p>
            </div>

            {needsSetup && <SetupBanner onGoToSettings={() => setActiveTab('settings')} />}

            <StatsCards refreshKey={refreshKey} />

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
              <TodaysSchedule refreshKey={refreshKey} />
              <RecentCalls refreshKey={refreshKey} />
            </div>
          </div>
        )}

        {/* Appointments Tab */}
        {activeTab === 'appointments' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2.5">
                <Calendar className="h-6 w-6 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">Appointments</h1>
              </div>
              <p className="mt-1 text-sm text-white/50">Manage your scheduled appointments</p>
            </div>
            <AppointmentsTable />
          </div>
        )}

        {/* Call Logs Tab */}
        {activeTab === 'calls' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2.5">
                <PhoneIncoming className="h-6 w-6 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">Call Logs</h1>
              </div>
              <p className="mt-1 text-sm text-white/50">Review all incoming call activity</p>
            </div>
            <CallLogsTable />
          </div>
        )}

        {/* Voice Test Tab */}
        {activeTab === 'chat' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2.5">
                <Mic className="h-6 w-6 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">Voice Test</h1>
              </div>
              <p className="mt-1 text-sm text-white/50">Test your AI receptionist in real time</p>
            </div>
            <VoiceTestPanel />
          </div>
        )}

        {/* Settings Tab */}
        {activeTab === 'settings' && (
          <div className="space-y-6">
            <div>
              <div className="flex items-center gap-2.5">
                <Settings className="h-6 w-6 text-indigo-400" />
                <h1 className="text-2xl font-bold text-white">Settings</h1>
              </div>
              <p className="mt-1 text-sm text-white/50">Configure your account and business</p>
            </div>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <ProfileForm />
              <PasswordForm />
              <BusinessInfoForm />
              <WorkingHoursForm />
              <ServicesEditor />
              <VoiceProviderCard />
            </div>
          </div>
        )}
      </DashboardLayout>
    </DashboardRefreshContext.Provider>
  );
}
