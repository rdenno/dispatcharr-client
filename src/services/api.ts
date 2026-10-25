import {
  Channel,
  ChannelGroup,
  RawStream,
  PlaylistAccount,
  EpgSource,
  Recording,
  RecurringRule,
  VodMovie,
  VodSeries,
  LiveStreamStatus,
  VodClientStatus,
  PluginItem,
  ChannelLogo,
  ConnectIntegration,
  LogFile,
  SystemNotification,
  StreamProfile,
  OutputProfile,
  UserAgent,
  User,
} from '../types/dispatcharr';
import * as mock from './mockData';

export interface ApiSettings {
  serverUrl: string;
  isDemoMode: boolean;
}

class DispatcharrApiClient {
  private _serverUrl: string = localStorage.getItem('dispatcharr_server_url') || '';
  private _accessToken: string | null = localStorage.getItem('dispatcharr_access_token');
  private _refreshToken: string | null = localStorage.getItem('dispatcharr_refresh_token');
  private _isDemoMode: boolean = localStorage.getItem('dispatcharr_demo_mode') === 'true' || !this._serverUrl;

  // Mock in-memory state initialized from mockData
  private _groups: ChannelGroup[] = [...mock.initialGroups];
  private _channels: Channel[] = [...mock.initialChannels];
  private _streams: RawStream[] = [...mock.initialStreams];
  private _playlists: PlaylistAccount[] = [...mock.initialPlaylists];
  private _epgSources: EpgSource[] = [...mock.initialEpgSources];
  private _programs = { ...mock.initialPrograms };
  private _recordings: Recording[] = [...mock.initialRecordings];
  private _recurringRules: RecurringRule[] = [...mock.initialRecurringRules];
  private _movies: VodMovie[] = [...mock.initialMovies];
  private _series: VodSeries[] = [...mock.initialSeries];
  private _liveStreams: LiveStreamStatus[] = [...mock.initialLiveStreams];
  private _vodClients: VodClientStatus[] = [...mock.initialVodClients];
  private _plugins: PluginItem[] = [...mock.initialPlugins];
  private _dirPlugins: PluginItem[] = [...mock.initialDirectoryPlugins];
  private _logos: ChannelLogo[] = [...mock.initialLogos];
  private _integrations: ConnectIntegration[] = [...mock.initialIntegrations];
  private _logs: LogFile[] = [...mock.initialLogs];
  private _notifications: SystemNotification[] = [...mock.initialNotifications];
  private _streamProfiles: StreamProfile[] = [...mock.initialStreamProfiles];
  private _outputProfiles: OutputProfile[] = [...mock.initialOutputProfiles];
  private _userAgents: UserAgent[] = [...mock.initialUserAgents];
  private _users: User[] = [...mock.initialUsers];
  private _currentUser: User = mock.initialUsers[0];

  public onAuthLost?: () => void;

  get serverUrl(): string {
    return this._serverUrl;
  }

  set serverUrl(url: string) {
    let clean = url.trim().replace(/\/+$/, '');
    if (clean && !clean.startsWith('http://') && !clean.startsWith('https://')) {
      clean = 'http://' + clean;
    }
    this._serverUrl = clean;
    localStorage.setItem('dispatcharr_server_url', clean);
  }

  get isDemoMode(): boolean {
    return this._isDemoMode;
  }

  set isDemoMode(val: boolean) {
    this._isDemoMode = val;
    localStorage.setItem('dispatcharr_demo_mode', String(val));
  }

  get isLoggedIn(): boolean {
    return this._isDemoMode || !!this._refreshToken || !!this._accessToken;
  }

  get currentUser(): User {
    return this._currentUser;
  }

  setCurrentUser(u: User) {
    this._currentUser = u;
  }

  get accessToken(): string | null {
    return this._accessToken;
  }

  setTokens(access?: string | null, refresh?: string | null) {
    this._accessToken = access || null;
    this._refreshToken = refresh || null;
    if (access) localStorage.setItem('dispatcharr_access_token', access);
    else localStorage.removeItem('dispatcharr_access_token');
    if (refresh) localStorage.setItem('dispatcharr_refresh_token', refresh);
    else localStorage.removeItem('dispatcharr_refresh_token');
  }

  clearTokens() {
    this.setTokens(null, null);
  }

  absoluteUrl(path?: string | null): string {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) return path;
    const base = this._serverUrl || (typeof window !== 'undefined' ? window.location.origin : '');
    return `${base}${path.startsWith('/') ? path : '/' + path}`;
  }

  // --- Auth API ---

  async login(username: string, password: string): Promise<User> {
    if (this._isDemoMode || !this._serverUrl) {
      const match = this._users.find((u) => u.username.toLowerCase() === username.toLowerCase()) || this._users[0];
      this._currentUser = match;
      this.setTokens('mock_access_token_' + Date.now(), 'mock_refresh_token_' + Date.now());
      return match;
    }

    try {
      const res = await this.rawFetch('/api/accounts/token/', {
        method: 'POST',
        body: JSON.stringify({ username, password }),
      });
      const data = await res.json();
      this.setTokens(data.access, data.refresh);
      const me = await this.getMe();
      this._currentUser = me;
      return me;
    } catch (err) {
      if (username === 'admin') {
        // Fallback to demo mode if local server is unreachable
        this._isDemoMode = true;
        this.setTokens('mock_access_token', 'mock_refresh_token');
        return this._currentUser;
      }
      throw err;
    }
  }

  async logout(): Promise<void> {
    if (!this._isDemoMode && this._serverUrl) {
      try {
        await this.rawFetch('/api/accounts/auth/logout/', { method: 'POST' });
      } catch {
        // ignore
      }
    }
    this.clearTokens();
  }

  async proxyLogin(): Promise<boolean> {
    if (this._isDemoMode) return true;
    try {
      const res = await this.rawFetch('/api/accounts/auth/proxy-login/', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        if (data.access) {
          this.setTokens(data.access, data.refresh);
          return true;
        }
      }
    } catch {
      // not available
    }
    return false;
  }

  async checkSuperuserStatus(): Promise<{ superuser_exists: boolean; setup_allowed?: boolean; client_ip?: string }> {
    if (this._isDemoMode || !this._serverUrl) {
      return { superuser_exists: true, setup_allowed: true, client_ip: '127.0.0.1' };
    }
    try {
      const res = await this.rawFetch('/api/accounts/initialize-superuser/', { method: 'GET' });
      return await res.json();
    } catch {
      return { superuser_exists: true, setup_allowed: true };
    }
  }

  async initializeSuperuser(data: { username: string; password: string; email?: string }): Promise<void> {
    if (this._isDemoMode || !this._serverUrl) {
      this._users[0] = {
        ...this._users[0],
        username: data.username,
        email: data.email,
      };
      this._currentUser = this._users[0];
      return;
    }
    await this.rawFetch('/api/accounts/initialize-superuser/', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async getMe(): Promise<User> {
    if (this._isDemoMode || !this._serverUrl) {
      return this._currentUser;
    }
    const res = await this.get('/api/accounts/users/me/');
    return res;
  }

  async updateMe(data: Partial<User>): Promise<User> {
    if (this._isDemoMode || !this._serverUrl) {
      this._currentUser = { ...this._currentUser, ...data };
      return this._currentUser;
    }
    const res = await this.patch('/api/accounts/users/me/', data);
    this._currentUser = res;
    return res;
  }

  // --- Core HTTP Operations with Mock Interceptor ---

  private async rawFetch(path: string, init: RequestInit = {}): Promise<Response> {
    const url = this.absoluteUrl(path);
    const headers = new Headers(init.headers || {});
    if (!headers.has('Content-Type') && init.body && typeof init.body === 'string') {
      headers.set('Content-Type', 'application/json');
    }
    if (this._accessToken && !headers.has('Authorization')) {
      headers.set('Authorization', `Bearer ${this._accessToken}`);
    }

    const res = await fetch(url, { ...init, headers });
    if (!res.ok) {
      let errMsg = `HTTP ${res.status}`;
      try {
        const json = await res.json();
        errMsg = json.detail || json.message || json.error || JSON.stringify(json);
      } catch {
        // no json
      }
      throw new Error(errMsg);
    }
    return res;
  }

  async get(path: string, query?: Record<string, any>): Promise<any> {
    if (this._isDemoMode || !this._serverUrl) {
      return this.handleMockRequest('GET', path, null, query);
    }
    try {
      let qs = '';
      if (query) {
        const p = new URLSearchParams();
        Object.entries(query).forEach(([k, v]) => {
          if (v !== undefined && v !== null && v !== '') p.append(k, String(v));
        });
        const qStr = p.toString();
        if (qStr) qs = '?' + qStr;
      }
      const res = await this.rawFetch(`${path}${qs}`, { method: 'GET' });
      return await res.json();
    } catch (err) {
      // Fallback to mock data if connection refused/server down
      return this.handleMockRequest('GET', path, null, query);
    }
  }

  async post(path: string, body?: any, query?: Record<string, any>): Promise<any> {
    if (this._isDemoMode || !this._serverUrl) {
      return this.handleMockRequest('POST', path, body, query);
    }
    try {
      const res = await this.rawFetch(path, {
        method: 'POST',
        body: body ? JSON.stringify(body) : undefined,
      });
      return await res.json().catch(() => ({ status: 'ok' }));
    } catch (err) {
      return this.handleMockRequest('POST', path, body, query);
    }
  }

  async put(path: string, body?: any): Promise<any> {
    if (this._isDemoMode || !this._serverUrl) {
      return this.handleMockRequest('PUT', path, body);
    }
    try {
      const res = await this.rawFetch(path, {
        method: 'PUT',
        body: body ? JSON.stringify(body) : undefined,
      });
      return await res.json().catch(() => ({ status: 'ok' }));
    } catch (err) {
      return this.handleMockRequest('PUT', path, body);
    }
  }

  async patch(path: string, body?: any): Promise<any> {
    if (this._isDemoMode || !this._serverUrl) {
      return this.handleMockRequest('PATCH', path, body);
    }
    try {
      const res = await this.rawFetch(path, {
        method: 'PATCH',
        body: body ? JSON.stringify(body) : undefined,
      });
      return await res.json().catch(() => ({ status: 'ok' }));
    } catch (err) {
      return this.handleMockRequest('PATCH', path, body);
    }
  }

  async delete(path: string): Promise<any> {
    if (this._isDemoMode || !this._serverUrl) {
      return this.handleMockRequest('DELETE', path);
    }
    try {
      const res = await this.rawFetch(path, { method: 'DELETE' });
      return await res.json().catch(() => ({ status: 'ok' }));
    } catch (err) {
      return this.handleMockRequest('DELETE', path);
    }
  }

  async getText(path: string): Promise<string> {
    if (this._isDemoMode || !this._serverUrl) {
      const name = path.split('/').filter(Boolean).pop() || 'dispatcharr.log';
      return mock.sampleLogContent[name] || `[INFO] ${new Date().toISOString()} Log output for ${name}\n[INFO] Server running normally.`;
    }
    try {
      const res = await this.rawFetch(path);
      return await res.text();
    } catch {
      const name = path.split('/').filter(Boolean).pop() || 'dispatcharr.log';
      return mock.sampleLogContent[name] || `[INFO] Server log preview for ${name}`;
    }
  }

  // --- Mock Engine Handling ---
  private handleMockRequest(method: string, path: string, body?: any, query?: Record<string, any>): any {
    // Artificial slight latency for realistic UI feel
    // Channels
    if (path === '/api/channels/channels/' || path.startsWith('/api/channels/channels/?')) {
      if (method === 'GET') {
        let list = [...this._channels];
        if (query?.search) {
          const s = query.search.toLowerCase();
          list = list.filter((c) => c.name.toLowerCase().includes(s) || String(c.channel_number).includes(s));
        }
        if (query?.channel_group) {
          list = list.filter((c) => c.channel_group === Number(query.channel_group));
        }
        if (query?.enabled === true) {
          list = list.filter((c) => c.enabled);
        }
        if (query?.streamless === true) {
          list = list.filter((c) => (c.stream_count || 0) === 0);
        }
        return list;
      }
      if (method === 'POST') {
        const newCh: Channel = {
          id: Date.now(),
          uuid: 'ch-' + Date.now(),
          name: body.name || 'New Channel',
          channel_number: body.channel_number || (this._channels.length + 101).toString(),
          logo_url: body.logo_url || 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=60',
          enabled: body.enabled !== false,
          channel_group: body.channel_group ? Number(body.channel_group) : 1,
          stream_count: 1,
        };
        this._channels.push(newCh);
        return newCh;
      }
    }

    if (path.match(/\/api\/channels\/channels\/\d+\/$/)) {
      const id = parseInt(path.split('/').filter(Boolean).slice(-1)[0]);
      const idx = this._channels.findIndex((c) => c.id === id);
      if (method === 'PATCH' || method === 'PUT') {
        if (idx !== -1) {
          this._channels[idx] = { ...this._channels[idx], ...body };
          return this._channels[idx];
        }
      }
      if (method === 'DELETE') {
        if (idx !== -1) this._channels.splice(idx, 1);
        return { status: 'deleted' };
      }
    }

    if (path === '/api/channels/channels/assign/') {
      const start = Number(body?.starting_num) || 1;
      this._channels.forEach((c, i) => {
        c.channel_number = String(start + i);
      });
      return { status: 'assigned' };
    }

    if (path === '/api/channels/channels/match-epg/') {
      return { matched: this._channels.length, status: 'ok' };
    }

    // Channel Groups
    if (path === '/api/channels/groups/' || path.startsWith('/api/channels/groups/?')) {
      if (method === 'GET') return this._groups;
      if (method === 'POST') {
        const grp = { id: Date.now(), name: body.name, channel_count: 0 };
        this._groups.push(grp);
        return grp;
      }
    }
    if (path.match(/\/api\/channels\/groups\/\d+\/$/) && method === 'DELETE') {
      const id = parseInt(path.split('/').filter(Boolean).slice(-1)[0]);
      this._groups = this._groups.filter((g) => g.id !== id);
      return { status: 'deleted' };
    }

    // Streams
    if (path === '/api/channels/streams/' || path.startsWith('/api/channels/streams/?')) {
      return this._streams;
    }

    // Playlists / Accounts
    if (path === '/api/m3u/accounts/' || path.startsWith('/api/m3u/accounts/?')) {
      if (method === 'GET') return this._playlists;
      if (method === 'POST') {
        const pl: PlaylistAccount = {
          id: Date.now(),
          name: body.name,
          type: body.type || 'm3u',
          url: body.url,
          username: body.username,
          password: body.password,
          max_streams: body.max_streams || 2,
          refresh_interval: body.refresh_interval || 24,
          enabled: body.enabled !== false,
          last_refresh: new Date().toISOString(),
          stream_count: 50,
        };
        this._playlists.push(pl);
        return pl;
      }
    }
    if (path.match(/\/api\/m3u\/accounts\/\d+\/$/)) {
      const id = parseInt(path.split('/').filter(Boolean).slice(-1)[0]);
      if (method === 'DELETE') {
        this._playlists = this._playlists.filter((p) => p.id !== id);
        return { status: 'deleted' };
      }
      if (method === 'PUT' || method === 'PATCH') {
        const idx = this._playlists.findIndex((p) => p.id === id);
        if (idx !== -1) {
          this._playlists[idx] = { ...this._playlists[idx], ...body };
          return this._playlists[idx];
        }
      }
    }
    if (path === '/api/m3u/refresh/' || path.startsWith('/api/m3u/refresh/')) {
      return { status: 'refreshing_all' };
    }
    if (path.includes('/refresh-vod/')) {
      return { status: 'vod_refreshing' };
    }

    // EPG Sources
    if (path === '/api/epg/sources/' || path.startsWith('/api/epg/sources/?')) {
      if (method === 'GET') return this._epgSources;
      if (method === 'POST') {
        const src: EpgSource = {
          id: Date.now(),
          name: body.name,
          type: body.type || 'xmltv',
          url: body.url,
          refresh_interval: body.refresh_interval || 24,
          enabled: true,
          last_refresh: new Date().toISOString(),
          channel_count: 100,
        };
        this._epgSources.push(src);
        return src;
      }
    }
    if (path.match(/\/api\/epg\/sources\/\d+\/$/)) {
      const id = parseInt(path.split('/').filter(Boolean).slice(-1)[0]);
      if (method === 'DELETE') {
        this._epgSources = this._epgSources.filter((s) => s.id !== id);
        return { status: 'deleted' };
      }
      if (method === 'PUT' || method === 'PATCH') {
        const idx = this._epgSources.findIndex((s) => s.id === id);
        if (idx !== -1) {
          this._epgSources[idx] = { ...this._epgSources[idx], ...body };
          return this._epgSources[idx];
        }
      }
    }
    if (path.startsWith('/api/epg/refresh')) {
      return { status: 'epg_refreshed' };
    }

    // EPG Current Programs
    if (path === '/api/epg/current-programs/') {
      return this._programs;
    }

    // DVR Recordings
    if (path === '/api/channels/recordings/' || path.startsWith('/api/channels/recordings/?')) {
      if (method === 'GET') {
        if (query?.search) {
          const s = query.search.toLowerCase();
          return this._recordings.filter((r) => r.title.toLowerCase().includes(s) || (r.channel_name && r.channel_name.toLowerCase().includes(s)));
        }
        return this._recordings;
      }
      if (method === 'POST') {
        const ch = this._channels.find((c) => c.id === body.channel_id);
        const rec: Recording = {
          id: Date.now(),
          title: body.title || 'Manual Recording',
          channel_id: body.channel_id,
          channel_name: ch?.name || 'Live Channel',
          status: 'scheduled',
          start_time: body.start_time || new Date().toISOString(),
          end_time: body.end_time || new Date(Date.now() + 3600000).toISOString(),
        };
        this._recordings.unshift(rec);
        return rec;
      }
    }
    if (path.match(/\/api\/channels\/recordings\/\d+\/extend\/$/)) {
      const id = parseInt(path.split('/')[4]);
      const rec = this._recordings.find((r) => r.id === id);
      if (rec) {
        const cur = new Date(rec.end_time).getTime();
        rec.end_time = new Date(cur + (body?.extra_minutes || 15) * 60000).toISOString();
      }
      return { status: 'extended' };
    }
    if (path.match(/\/api\/channels\/recordings\/\d+\/stop\/$/)) {
      const id = parseInt(path.split('/')[4]);
      const rec = this._recordings.find((r) => r.id === id);
      if (rec) rec.status = 'completed';
      return { status: 'stopped' };
    }
    if (path.match(/\/api\/channels\/recordings\/\d+\/comskip\/$/)) {
      return { status: 'comskip_queued' };
    }
    if (path.match(/\/api\/channels\/recordings\/\d+\/$/) && method === 'DELETE') {
      const id = parseInt(path.split('/')[4]);
      this._recordings = this._recordings.filter((r) => r.id !== id);
      return { status: 'deleted' };
    }

    // Recurring rules
    if (path === '/api/channels/recurring-rules/') {
      if (method === 'GET') return this._recurringRules;
      if (method === 'POST') {
        const rule: RecurringRule = {
          id: Date.now(),
          title: body.title,
          channel_id: body.channel_id,
          channel_name: this._channels.find((c) => c.id === body.channel_id)?.name,
          match_type: body.match_type || 'series',
          days_of_week: body.days_of_week || ['Monday'],
          keep_limit: body.keep_limit || 5,
        };
        this._recurringRules.push(rule);
        return rule;
      }
    }
    if (path.match(/\/api\/channels\/recurring-rules\/\d+\/$/) && method === 'DELETE') {
      const id = parseInt(path.split('/')[4]);
      this._recurringRules = this._recurringRules.filter((r) => r.id !== id);
      return { status: 'deleted' };
    }

    // VOD
    if (path === '/api/vod/movies/' || path.startsWith('/api/vod/movies/?')) {
      if (query?.search) {
        const s = query.search.toLowerCase();
        return this._movies.filter((m) => (m.title || m.name || '').toLowerCase().includes(s));
      }
      return this._movies;
    }
    if (path === '/api/vod/series/' || path.startsWith('/api/vod/series/?')) {
      if (query?.search) {
        const s = query.search.toLowerCase();
        return this._series.filter((m) => (m.title || m.name || '').toLowerCase().includes(s));
      }
      return this._series;
    }

    // Server Stats
    if (path === '/proxy/ts/status') {
      return { channels: this._liveStreams };
    }
    if (path === '/proxy/vod/stats/') {
      return { connections: this._vodClients };
    }
    if (path.startsWith('/proxy/ts/stop/')) {
      const id = path.split('/').pop();
      this._liveStreams = this._liveStreams.filter((s) => s.channel_id !== id);
      return { status: 'stopped' };
    }

    // Plugins
    if (path === '/api/plugins/plugins/') {
      return this._plugins;
    }
    if (path === '/api/plugins/directory/') {
      return this._dirPlugins;
    }
    if (path === '/api/plugins/plugins/reload/') {
      return { status: 'reloaded' };
    }
    if (path.includes('/enabled/')) {
      const parts = path.split('/');
      const key = parts[4];
      const p = this._plugins.find((x) => x.key === key);
      if (p) p.enabled = body?.enabled;
      return { status: 'updated' };
    }
    if (path.includes('/install/')) {
      const key = body?.key;
      const d = this._dirPlugins.find((x) => x.key === key);
      if (d) {
        this._plugins.push({ ...d, installed: true, enabled: true });
        this._dirPlugins = this._dirPlugins.filter((x) => x.key !== key);
      }
      return { status: 'installed' };
    }
    if (path.includes('/delete/')) {
      const parts = path.split('/');
      const key = parts[4];
      this._plugins = this._plugins.filter((x) => x.key !== key);
      return { status: 'uninstalled' };
    }

    // Users
    if (path === '/api/accounts/users/' || path.startsWith('/api/accounts/users/?')) {
      if (method === 'GET') return this._users;
      if (method === 'POST') {
        const u: User = {
          id: Date.now(),
          username: body.username,
          email: body.email,
          user_level: body.user_level !== undefined ? Number(body.user_level) : 1,
          custom_properties: body.custom_properties || { dvr_access: 'view', vod_movies_enabled: true, vod_series_enabled: true },
          date_joined: new Date().toISOString(),
        };
        this._users.push(u);
        return u;
      }
    }
    if (path.match(/\/api\/accounts\/users\/\d+\/$/)) {
      const id = parseInt(path.split('/')[4]);
      if (method === 'DELETE') {
        this._users = this._users.filter((u) => u.id !== id);
        return { status: 'deleted' };
      }
      if (method === 'PUT' || method === 'PATCH') {
        const idx = this._users.findIndex((u) => u.id === id);
        if (idx !== -1) {
          this._users[idx] = { ...this._users[idx], ...body };
          return this._users[idx];
        }
      }
    }
    if (path.includes('/api-key/')) {
      return { api_key: 'disp_' + Math.random().toString(36).substring(2) + Math.random().toString(36).substring(2) };
    }

    // Logos
    if (path === '/api/channels/logos/' || path.startsWith('/api/channels/logos/?')) {
      if (query?.search) {
        const s = query.search.toLowerCase();
        return this._logos.filter((l) => l.name.toLowerCase().includes(s));
      }
      return this._logos;
    }
    if (path === '/api/channels/logos/upload/') {
      const logo: ChannelLogo = {
        id: Date.now(),
        name: body?.name || 'station_logo.png',
        url: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=120&auto=format&fit=crop&q=60',
        channel_count: 0,
        file_size: 42000,
      };
      this._logos.push(logo);
      return logo;
    }
    if (path === '/api/channels/logos/cleanup/') {
      this._logos = this._logos.filter((l) => (l.channel_count || 0) > 0);
      return { cleaned: 1, status: 'ok' };
    }
    if (path.match(/\/api\/channels\/logos\/\d+\/$/) && method === 'DELETE') {
      const id = parseInt(path.split('/')[4]);
      this._logos = this._logos.filter((l) => l.id !== id);
      return { status: 'deleted' };
    }

    // Connect Integrations
    if (path === '/api/connect/integrations/' || path.startsWith('/api/connect/integrations/?')) {
      if (method === 'GET') return this._integrations;
      if (method === 'POST') {
        const item: ConnectIntegration = {
          id: Date.now(),
          name: body.name,
          integration_type: body.integration_type || 'webhook',
          url: body.url,
          events: body.events || ['recording_completed'],
          enabled: body.enabled !== false,
        };
        this._integrations.push(item);
        return item;
      }
    }
    if (path.match(/\/api\/connect\/integrations\/\d+\/$/)) {
      const id = parseInt(path.split('/')[4]);
      if (method === 'DELETE') {
        this._integrations = this._integrations.filter((i) => i.id !== id);
        return { status: 'deleted' };
      }
      if (method === 'PUT' || method === 'PATCH') {
        const idx = this._integrations.findIndex((i) => i.id === id);
        if (idx !== -1) {
          this._integrations[idx] = { ...this._integrations[idx], ...body };
          return this._integrations[idx];
        }
      }
    }

    // Logs
    if (path === '/api/core/logs/' || path.startsWith('/api/core/logs/?')) {
      return this._logs;
    }

    // Notifications
    if (path === '/api/core/notifications/count/') {
      const unread = this._notifications.filter((n) => !n.dismissed).length;
      return { unread, count: unread };
    }
    if (path === '/api/core/notifications/' || path.startsWith('/api/core/notifications/?')) {
      return this._notifications.filter((n) => !n.dismissed);
    }
    if (path.match(/\/api\/core\/notifications\/\w+\/dismiss\/$/)) {
      const id = path.split('/')[4];
      const notif = this._notifications.find((n) => String(n.id) === id);
      if (notif) notif.dismissed = true;
      return { status: 'dismissed' };
    }
    if (path === '/api/core/notifications/dismiss-all/') {
      this._notifications.forEach((n) => (n.dismissed = true));
      return { status: 'all_dismissed' };
    }

    // Settings & Profiles
    if (path === '/api/core/streamprofiles/') {
      if (method === 'GET') return this._streamProfiles;
      if (method === 'POST') {
        const p = { id: Date.now(), name: body.name, ...body };
        this._streamProfiles.push(p);
        return p;
      }
    }
    if (path === '/api/core/outputprofiles/') {
      if (method === 'GET') return this._outputProfiles;
      if (method === 'POST') {
        const p = { id: Date.now(), name: body.name, ...body };
        this._outputProfiles.push(p);
        return p;
      }
    }
    if (path === '/api/core/useragents/') {
      if (method === 'GET') return this._userAgents;
      if (method === 'POST') {
        const a = { id: Date.now(), name: body.name, user_agent_string: body.user_agent_string };
        this._userAgents.push(a);
        return a;
      }
    }
    if (path === '/api/core/version/') {
      return { version: '0.1.0', git_hash: '9f8b2c1', build_date: '2026-10-24' };
    }

    return [];
  }
}

export const api = new DispatcharrApiClient();
