import { useEffect, useState } from 'react';
import { NavLink, Navigate, Route, Routes } from 'react-router';
import { useQueryClient } from '@tanstack/react-query';
import { Activity, Menu, Radio, Tv } from 'lucide-react';
import clsx from 'clsx';
import { hasSession, sessionEvents } from './api/client';
import LoginScreen from './screens/LoginScreen';
import ChannelsScreen from './screens/ChannelsScreen';
import ChannelDetailScreen from './screens/ChannelDetailScreen';
import SourcesScreen from './screens/SourcesScreen';
import AccountEditScreen from './screens/AccountEditScreen';
import ActivityScreen from './screens/ActivityScreen';
import MoreScreen from './screens/MoreScreen';

export default function App() {
  const [signedIn, setSignedIn] = useState(hasSession);
  const qc = useQueryClient();

  useEffect(() => {
    const onExpired = () => {
      setSignedIn(false);
      qc.clear();
    };
    sessionEvents.addEventListener('expired', onExpired);
    return () => sessionEvents.removeEventListener('expired', onExpired);
  }, [qc]);

  if (!signedIn) return <LoginScreen onSignedIn={() => setSignedIn(true)} />;

  return (
    <div className="flex h-full flex-col">
      <main className="min-h-0 flex-1 overflow-y-auto">
        <Routes>
          <Route path="/" element={<Navigate to="/channels" replace />} />
          <Route path="/channels" element={<ChannelsScreen />} />
          <Route path="/channels/:id" element={<ChannelDetailScreen />} />
          <Route path="/sources" element={<SourcesScreen />} />
          <Route path="/sources/m3u/:id" element={<AccountEditScreen />} />
          <Route path="/activity" element={<ActivityScreen />} />
          <Route path="/more" element={<MoreScreen />} />
          <Route path="*" element={<Navigate to="/channels" replace />} />
        </Routes>
      </main>
      <BottomNav />
    </div>
  );
}

const tabs = [
  { to: '/channels', label: 'Channels', icon: Tv },
  { to: '/sources', label: 'Sources', icon: Radio },
  { to: '/activity', label: 'Activity', icon: Activity },
  { to: '/more', label: 'More', icon: Menu },
];

function BottomNav() {
  return (
    <nav className="pb-safe border-t border-line bg-surface">
      <div className="grid grid-cols-4">
        {tabs.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              clsx(
                'flex flex-col items-center gap-0.5 pt-2 pb-1 text-[11px] font-medium',
                isActive ? 'text-accent' : 'text-muted',
              )
            }
          >
            <Icon size={22} strokeWidth={2} />
            {label}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
