import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, ChannelGroup, PlaylistAccount, EpgSource } from '../types/dispatcharr';
import { api } from '../services/api';

export type AuthState = 'checking' | 'loggedOut' | 'loggedIn';

interface SessionContextType {
  authState: AuthState;
  user: User | null;
  isAdmin: boolean;
  canViewDvr: boolean;
  canManageDvr: boolean;
  canViewVod: boolean;
  vodMoviesEnabled: boolean;
  vodSeriesEnabled: boolean;
  channelGroups: ChannelGroup[];
  playlists: PlaylistAccount[];
  epgSources: EpgSource[];
  serverUrl: string;
  isDemoMode: boolean;
  refreshLookups: () => Promise<void>;
  login: (serverUrl: string, username: string, password?: string) => Promise<void>;
  logout: () => Promise<void>;
  updateUserPreferences: (prefs: Record<string, any>) => Promise<void>;
  setDemoMode: (enabled: boolean) => void;
  openPlayer: (url: string, title: string, live?: boolean) => void;
  activePlayer: { url: string; title: string; live: boolean } | null;
  closePlayer: () => void;
}

const SessionContext = createContext<SessionContextType | null>(null);

export const SessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [authState, setAuthState] = useState<AuthState>('checking');
  const [user, setUser] = useState<User | null>(null);
  const [channelGroups, setChannelGroups] = useState<ChannelGroup[]>([]);
  const [playlists, setPlaylists] = useState<PlaylistAccount[]>([]);
  const [epgSources, setEpgSources] = useState<EpgSource[]>([]);
  const [serverUrl, setServerUrlState] = useState<string>(api.serverUrl);
  const [isDemoMode, setIsDemoModeState] = useState<boolean>(api.isDemoMode);
  const [activePlayer, setActivePlayer] = useState<{ url: string; title: string; live: boolean } | null>(null);

  const refreshLookups = useCallback(async () => {
    try {
      const [groups, pls, epgs] = await Promise.all([
        api.get('/api/channels/groups/'),
        api.get('/api/m3u/accounts/'),
        api.get('/api/epg/sources/'),
      ]);
      setChannelGroups(Array.isArray(groups) ? groups : []);
      setPlaylists(Array.isArray(pls) ? pls : []);
      setEpgSources(Array.isArray(epgs) ? epgs : []);
    } catch {
      // ignore
    }
  }, []);

  const bootstrap = useCallback(async () => {
    setAuthState('checking');
    try {
      if (api.isLoggedIn) {
        const me = await api.getMe();
        setUser(me);
        await refreshLookups();
        setAuthState('loggedIn');
      } else {
        const proxyOk = await api.proxyLogin();
        if (proxyOk) {
          const me = await api.getMe();
          setUser(me);
          await refreshLookups();
          setAuthState('loggedIn');
        } else {
          setAuthState('loggedOut');
        }
      }
    } catch {
      setAuthState('loggedOut');
    }
  }, [refreshLookups]);

  useEffect(() => {
    bootstrap();
    api.onAuthLost = () => {
      setUser(null);
      setAuthState('loggedOut');
    };
  }, [bootstrap]);

  const login = async (newServerUrl: string, username: string, password = '') => {
    api.serverUrl = newServerUrl;
    setServerUrlState(api.serverUrl);
    const u = await api.login(username, password);
    setUser(u);
    await refreshLookups();
    setAuthState('loggedIn');
  };

  const logout = async () => {
    await api.logout();
    setUser(null);
    setAuthState('loggedOut');
  };

  const updateUserPreferences = async (newPrefs: Record<string, any>) => {
    if (!user) return;
    const merged = {
      ...(user.custom_properties || {}),
      ...newPrefs,
    };
    const updated = await api.updateMe({ custom_properties: merged });
    setUser(updated);
  };

  const setDemoMode = (enabled: boolean) => {
    api.isDemoMode = enabled;
    setIsDemoModeState(enabled);
    if (enabled && authState !== 'loggedIn') {
      setUser(api.currentUser);
      setAuthState('loggedIn');
      refreshLookups();
    }
  };

  const openPlayer = (url: string, title: string, live = true) => {
    setActivePlayer({ url, title, live });
  };

  const closePlayer = () => {
    setActivePlayer(null);
  };

  const userLevel = user?.user_level ?? 0;
  const isAdmin = userLevel >= 10;
  const dvrAccess = user?.custom_properties?.dvr_access || (isAdmin ? 'manage' : userLevel >= 1 ? 'view' : 'none');
  const canManageDvr = dvrAccess === 'manage';
  const canViewDvr = dvrAccess !== 'none';

  const vodMoviesEnabled = isAdmin || (userLevel >= 1 && user?.custom_properties?.vod_movies_enabled !== false);
  const vodSeriesEnabled = isAdmin || (userLevel >= 1 && user?.custom_properties?.vod_series_enabled !== false);
  const canViewVod = vodMoviesEnabled || vodSeriesEnabled;

  return (
    <SessionContext.Provider
      value={{
        authState,
        user,
        isAdmin,
        canViewDvr,
        canManageDvr,
        canViewVod,
        vodMoviesEnabled,
        vodSeriesEnabled,
        channelGroups,
        playlists,
        epgSources,
        serverUrl,
        isDemoMode,
        refreshLookups,
        login,
        logout,
        updateUserPreferences,
        setDemoMode,
        openPlayer,
        activePlayer,
        closePlayer,
      }}
    >
      {children}
    </SessionContext.Provider>
  );
};

export const useSession = () => {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSession must be used within SessionProvider');
  return ctx;
};
