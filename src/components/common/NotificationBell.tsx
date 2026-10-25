import React, { useState, useEffect } from 'react';
import { Bell, CheckCheck, X, AlertCircle, Info, CheckCircle2 } from 'lucide-react';
import { api } from '../../services/api';
import { SystemNotification } from '../../types/dispatcharr';
import { Fmt } from '../../utils/format';
import { Modal } from './Modal';

export const NotificationBell: React.FC = () => {
  const [unreadCount, setUnreadCount] = useState<number>(0);
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<SystemNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchCount = async () => {
    try {
      const res = await api.get('/api/core/notifications/count/');
      setUnreadCount(res?.unread ?? res?.count ?? 0);
    } catch {
      // ignore
    }
  };

  const fetchNotifications = async () => {
    setLoading(true);
    try {
      const list = await api.get('/api/core/notifications/');
      setNotifications(Array.isArray(list) ? list : []);
    } catch {
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCount();
    const interval = setInterval(fetchCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleOpen = () => {
    setIsOpen(true);
    fetchNotifications();
  };

  const handleDismiss = async (id: string | number) => {
    try {
      await api.post(`/api/core/notifications/${id}/dismiss/`);
      setNotifications((prev) => prev.filter((n) => n.id !== id));
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch {
      // ignore
    }
  };

  const handleDismissAll = async () => {
    try {
      await api.post('/api/core/notifications/dismiss-all/');
      setNotifications([]);
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  return (
    <>
      <button
        onClick={handleOpen}
        title="Notifications"
        className="relative p-2 rounded-lg text-zinc-300 hover:text-white hover:bg-zinc-800 transition"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex items-center justify-center min-w-4 h-4 px-1 text-[10px] font-bold text-white bg-red-600 rounded-full animate-pulse">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Notifications"
        subtitle={`${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`}
        maxWidth="md"
        actions={
          notifications.length > 0 ? (
            <button
              onClick={handleDismissAll}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-teal-300 hover:bg-teal-500/20 transition"
            >
              <CheckCheck className="w-4 h-4" />
              Dismiss All
            </button>
          ) : undefined
        }
      >
        {loading ? (
          <div className="py-8 text-center text-zinc-400 text-sm">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="py-10 text-center text-zinc-400">
            <Bell className="w-8 h-8 mx-auto mb-2 opacity-30" />
            <p className="text-sm">No unread notifications</p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {notifications.map((n) => {
              const icon = {
                success: <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />,
                warning: <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />,
                error: <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />,
                info: <Info className="w-4 h-4 text-blue-400 shrink-0" />,
              }[n.level || 'info'];

              return (
                <div
                  key={n.id}
                  className="p-3 bg-zinc-900 border border-zinc-700/60 rounded-lg flex items-start justify-between gap-3"
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{icon}</div>
                    <div>
                      <div className="font-medium text-sm text-zinc-200">{n.title}</div>
                      <div className="text-xs text-zinc-400 mt-0.5 leading-relaxed">{n.message}</div>
                      <div className="text-[10px] text-zinc-500 mt-1">{Fmt.relative(n.timestamp)}</div>
                    </div>
                  </div>
                  <button
                    onClick={() => handleDismiss(n.id)}
                    title="Dismiss"
                    className="text-zinc-500 hover:text-zinc-300 p-1 hover:bg-zinc-800 rounded transition"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </>
  );
};
