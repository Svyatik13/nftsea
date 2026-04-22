import { useState } from 'react';
import { useStore } from '../store';
import { api } from '../lib/api';

export default function NotificationBell() {
  const { notifications, markNotificationsRead } = useStore();
  const [open, setOpen] = useState(false);
  const unread = notifications.filter(n => !n.read).length;

  const handleOpen = async () => {
    setOpen(o => !o);
    if (unread > 0) {
      await api.post('/notifications/read-all').catch(() => {});
      markNotificationsRead();
    }
  };

  return (
    <div className="bell-wrapper">
      <button className="bell-btn" onClick={handleOpen} aria-label="Notifications">
        🔔
        {unread > 0 && <span className="bell-badge">{unread}</span>}
      </button>
      {open && (
        <div className="notif-dropdown">
          <div className="notif-header">Notifications</div>
          {notifications.length === 0
            ? <p className="notif-empty">All caught up!</p>
            : notifications.slice(0, 20).map((n, i) => (
                <div key={i} className={`notif-item ${n.read ? '' : 'notif-unread'}`}>
                  <span className="notif-msg">{n.message}</span>
                  <span className="notif-time">{new Date(n.created_at).toLocaleTimeString()}</span>
                </div>
              ))
          }
        </div>
      )}
    </div>
  );
}
