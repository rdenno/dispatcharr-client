import React from 'react';
import { SessionProvider, useSession } from './context/SessionContext';
import { LoginScreen } from './screens/LoginScreen';
import { AppScaffold } from './components/layout/AppScaffold';
import { Loader2 } from 'lucide-react';

const RootContent: React.FC = () => {
  const { authState } = useSession();

  if (authState === 'checking') {
    return (
      <div className="h-screen w-screen flex flex-col items-center justify-center bg-zinc-950 text-zinc-100 space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-zinc-900 border border-zinc-800 p-3 shadow-2xl flex items-center justify-center animate-pulse">
          <img src="/logo.png" alt="Dispatcharr Logo" className="w-full h-full object-contain" />
        </div>
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Loader2 className="w-4 h-4 animate-spin text-teal-400" />
          <span>Connecting to Dispatcharr...</span>
        </div>
      </div>
    );
  }

  if (authState === 'loggedOut') {
    return <LoginScreen />;
  }

  return <AppScaffold />;
};

export const App: React.FC = () => {
  return (
    <SessionProvider>
      <RootContent />
    </SessionProvider>
  );
};

export default App;
