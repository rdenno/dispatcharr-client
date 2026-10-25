import React, { useState } from 'react';
import {
  List,
  Film,
  PlayCircle,
  LayoutGrid,
  HardDrive,
  BarChart3,
  Puzzle,
  Laptop,
  Users,
  Image as ImageIcon,
  Webhook,
  FileCode,
  Settings,
  User as UserIcon,
  Info,
  LogOut,
  Menu,
  X,
  ChevronDown,
  ChevronUp,
  Tv,
} from 'lucide-react';
import { useSession } from '../../context/SessionContext';
import { NotificationBell } from '../common/NotificationBell';
import { VideoPlayerModal } from '../common/VideoPlayerModal';

// Screens
import { ChannelsScreen } from '../../screens/ChannelsScreen';
import { GuideScreen } from '../../screens/GuideScreen';
import { DvrScreen } from '../../screens/DvrScreen';
import { SourcesScreen } from '../../screens/SourcesScreen';
import { VodsScreen } from '../../screens/VodsScreen';
import { StatsScreen } from '../../screens/StatsScreen';
import { PluginsScreen } from '../../screens/PluginsScreen';
import { UsersScreen } from '../../screens/UsersScreen';
import { LogosScreen } from '../../screens/LogosScreen';
import { ConnectScreen } from '../../screens/ConnectScreen';
import { LogsScreen } from '../../screens/LogsScreen';
import { SettingsScreen } from '../../screens/SettingsScreen';
import { AccountScreen } from '../../screens/AccountScreen';
import { AboutScreen } from '../../screens/AboutScreen';

export type RouteId =
  | 'channels'
  | 'vods'
  | 'sources'
  | 'guide'
  | 'dvr'
  | 'stats'
  | 'plugins'
  | 'users'
  | 'logos'
  | 'connect'
  | 'logs'
  | 'settings'
  | 'account'
  | 'about';

export const AppScaffold: React.FC = () => {
  const {
    user,
    isAdmin,
    canViewDvr,
    canViewVod,
    serverUrl,
    isDemoMode,
    logout,
    activePlayer,
    closePlayer,
  } = useSession();

  const [currentRoute, setCurrentRoute] = useState<RouteId>('channels');
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [systemExpanded, setSystemExpanded] = useState(false);

  const navigateTo = (route: RouteId) => {
    setCurrentRoute(route);
    setMobileDrawerOpen(false);
  };

  const navItems = [
    { id: 'channels' as RouteId, label: 'Channels', icon: <List className="w-4 h-4" />, visible: true },
    { id: 'vods' as RouteId, label: 'VODs', icon: <Film className="w-4 h-4" />, visible: canViewVod },
    { id: 'sources' as RouteId, label: 'M3U & EPG Manager', icon: <PlayCircle className="w-4 h-4" />, visible: isAdmin },
    { id: 'guide' as RouteId, label: 'TV Guide', icon: <LayoutGrid className="w-4 h-4" />, visible: true },
    { id: 'dvr' as RouteId, label: 'DVR Manager', icon: <HardDrive className="w-4 h-4" />, visible: canViewDvr },
    { id: 'stats' as RouteId, label: 'Server Stats', icon: <BarChart3 className="w-4 h-4" />, visible: isAdmin },
    { id: 'plugins' as RouteId, label: 'Plugins', icon: <Puzzle className="w-4 h-4" />, visible: isAdmin },
  ];

  const systemSubItems = [
    { id: 'users' as RouteId, label: 'Users', icon: <Users className="w-4 h-4" /> },
    { id: 'logos' as RouteId, label: 'Logo Manager', icon: <ImageIcon className="w-4 h-4" /> },
    { id: 'connect' as RouteId, label: 'Connect & Webhooks', icon: <Webhook className="w-4 h-4" /> },
    { id: 'logs' as RouteId, label: 'Diagnostic Logs', icon: <FileCode className="w-4 h-4" /> },
    { id: 'settings' as RouteId, label: 'Settings', icon: <Settings className="w-4 h-4" /> },
  ];

  const renderActiveScreen = () => {
    switch (currentRoute) {
      case 'channels':
        return <ChannelsScreen />;
      case 'guide':
        return <GuideScreen />;
      case 'dvr':
        return <DvrScreen />;
      case 'sources':
        return <SourcesScreen />;
      case 'vods':
        return <VodsScreen />;
      case 'stats':
        return <StatsScreen />;
      case 'plugins':
        return <PluginsScreen />;
      case 'users':
        return <UsersScreen />;
      case 'logos':
        return <LogosScreen />;
      case 'connect':
        return <ConnectScreen />;
      case 'logs':
        return <LogsScreen />;
      case 'settings':
        return <SettingsScreen />;
      case 'account':
        return <AccountScreen />;
      case 'about':
        return <AboutScreen />;
      default:
        return <ChannelsScreen />;
    }
  };

  const NavContent = () => (
    <div className="flex flex-col h-full bg-zinc-900 border-r border-zinc-800 text-sm select-none">
      {/* Brand Header */}
      <div className="flex items-center gap-3 p-4 border-b border-zinc-800">
        <div className="w-9 h-9 rounded-xl bg-zinc-800 border border-zinc-700/80 flex items-center justify-center p-1.5 shadow-md">
          <img src="/logo.png" alt="Dispatcharr" className="w-full h-full object-contain" />
        </div>
        <div className="min-w-0">
          <div className="font-bold text-white text-base leading-tight tracking-tight">Dispatcharr</div>
          <div className="text-[11px] text-zinc-400 truncate max-w-[170px]" title={serverUrl}>
            {isDemoMode ? 'Demo Standalone' : serverUrl.replace(/^https?:\/\//, '')}
          </div>
        </div>
      </div>

      {/* Nav List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {navItems
          .filter((item) => item.visible)
          .map((item) => {
            const active = currentRoute === item.id;
            return (
              <button
                key={item.id}
                onClick={() => navigateTo(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
                  active
                    ? 'bg-teal-600/20 text-teal-300 font-semibold border border-teal-500/30'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                }`}
              >
                <span className={active ? 'text-teal-400' : 'text-zinc-400'}>{item.icon}</span>
                <span>{item.label}</span>
              </button>
            );
          })}

        {/* System Group (Admin) */}
        {isAdmin && (
          <div className="pt-2">
            <button
              onClick={() => setSystemExpanded(!systemExpanded)}
              className="w-full flex items-center justify-between px-3.5 py-2 rounded-xl text-xs font-medium text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60 transition"
            >
              <div className="flex items-center gap-3">
                <Laptop className="w-4 h-4 text-zinc-400" />
                <span>System</span>
              </div>
              {systemExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {systemExpanded && (
              <div className="ml-5 pl-2 border-l border-zinc-800 space-y-1 pt-1">
                {systemSubItems.map((sub) => {
                  const active = currentRoute === sub.id;
                  return (
                    <button
                      key={sub.id}
                      onClick={() => navigateTo(sub.id)}
                      className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition ${
                        active
                          ? 'bg-teal-600/20 text-teal-300 font-semibold border border-teal-500/30'
                          : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
                      }`}
                    >
                      <span className={active ? 'text-teal-400' : 'text-zinc-400'}>{sub.icon}</span>
                      <span>{sub.label}</span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {!isAdmin && (
          <button
            onClick={() => navigateTo('settings')}
            className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-medium text-xs transition ${
              currentRoute === 'settings'
                ? 'bg-teal-600/20 text-teal-300 font-semibold border border-teal-500/30'
                : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/60'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Settings</span>
          </button>
        )}
      </div>

      {/* Footer Profile */}
      <div className="p-3 border-t border-zinc-800 space-y-1">
        <button
          onClick={() => navigateTo('account')}
          className={`w-full flex items-center justify-between p-2.5 rounded-xl text-left transition ${
            currentRoute === 'account' ? 'bg-zinc-800 text-white' : 'hover:bg-zinc-800/60 text-zinc-300'
          }`}
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700 flex items-center justify-center shrink-0 text-teal-400">
              <UserIcon className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-zinc-100 truncate">{user?.username || 'Account'}</div>
              <div className="text-[10px] text-zinc-400">
                {isAdmin ? 'Administrator' : 'Standard User'}
              </div>
            </div>
          </div>
        </button>

        <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-zinc-400">
          <button
            onClick={() => navigateTo('about')}
            className="flex items-center gap-1.5 hover:text-zinc-200 transition p-1"
          >
            <Info className="w-3.5 h-3.5" />
            About v0.1.0
          </button>
          <button
            onClick={logout}
            className="flex items-center gap-1.5 text-zinc-500 hover:text-red-400 transition p-1"
            title="Log Out"
          >
            <LogOut className="w-3.5 h-3.5" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-zinc-900 text-zinc-100 font-sans">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 flex-col shrink-0">
        <NavContent />
      </aside>

      {/* Mobile Drawer */}
      {mobileDrawerOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div className="fixed inset-0 bg-black/70 backdrop-blur-xs" onClick={() => setMobileDrawerOpen(false)} />
          <div className="relative w-72 max-w-[80vw] h-full z-10 animate-in slide-in-from-left duration-200">
            <NavContent />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top Bar */}
        <header className="h-14 bg-zinc-900/90 backdrop-blur-md border-b border-zinc-800 flex items-center justify-between px-4 sm:px-6 shrink-0 z-20">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setMobileDrawerOpen(true)}
              className="md:hidden p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2">
              <span className="font-semibold text-sm text-zinc-200 capitalize">
                {currentRoute.replace('_', ' ')}
              </span>
              {isDemoMode && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 border border-teal-500/20">
                  Demo Mode
                </span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationBell />
          </div>
        </header>

        {/* Screen Content */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          {renderActiveScreen()}
        </main>
      </div>

      {/* Global Video Player Modal */}
      {activePlayer && (
        <VideoPlayerModal
          isOpen={!!activePlayer}
          onClose={closePlayer}
          url={activePlayer.url}
          title={activePlayer.title}
          live={activePlayer.live}
        />
      )}
    </div>
  );
};
