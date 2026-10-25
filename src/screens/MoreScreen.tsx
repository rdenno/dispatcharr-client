import { useState } from 'react';
import { ExternalLink, LogOut } from 'lucide-react';
import { logout } from '../api/client';
import { useMe, useVersion } from '../api/hooks';
import { Button, Toggle, TopBar } from '../components/ui';

// nginx reads this cookie to decide whether phones opening Dispatcharr get this UI
const UI_COOKIE = 'dispatcharr_ui';

function getUiPreference() {
  return document.cookie.split('; ').find((c) => c.startsWith(`${UI_COOKIE}=`))?.split('=')[1] ?? 'mobile';
}

function setUiPreference(value: 'mobile' | 'desktop') {
  const secure = location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${UI_COOKIE}=${value}; Path=/; Max-Age=31536000; SameSite=Lax${secure}`;
}

export default function MoreScreen() {
  const me = useMe();
  const version = useVersion();
  const [preferMobile, setPreferMobile] = useState(getUiPreference() !== 'desktop');

  return (
    <>
      <TopBar title="More" />
      <div className="space-y-4 p-3">
        <section className="rounded-xl bg-surface p-3 ring-1 ring-line">
          <p className="text-sm text-muted">Signed in as</p>
          <p className="font-medium">{me.data?.username ?? '…'}</p>
          {version.data && <p className="mt-2 text-xs text-muted">Dispatcharr {version.data.version}</p>}
        </section>

        <section className="space-y-3 rounded-xl bg-surface p-3 ring-1 ring-line">
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Open this app on phones</p>
              <p className="text-xs text-muted">
                When off, opening Dispatcharr on this phone shows the full desktop interface.
              </p>
            </div>
            <Toggle
              label="Open this app on phones"
              checked={preferMobile}
              onChange={(v) => {
                setPreferMobile(v);
                setUiPreference(v ? 'mobile' : 'desktop');
              }}
            />
          </div>
          <Button
            variant="secondary"
            className="w-full"
            onClick={() => {
              // Skip the phone redirect for this visit and later ones, until switched back here
              setUiPreference('desktop');
              location.href = '/';
            }}
          >
            <ExternalLink size={18} /> Open full Dispatcharr
          </Button>
          <p className="text-xs text-muted">
            The full interface covers everything this app doesn't yet: EPG mapping, DVR, VOD, plugins, users, logos and
            backups. To come back, open <span className="font-mono">/m/</span>.
          </p>
        </section>

        <Button variant="danger" className="w-full" onClick={() => logout()}>
          <LogOut size={18} /> Sign out
        </Button>
      </div>
    </>
  );
}
