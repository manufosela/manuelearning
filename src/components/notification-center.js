import { LitElement, html, css } from 'lit';
import {
  fetchUserNotifications,
  countUnreadUserNotifications,
  markUserNotificationAsRead,
  markAllUserNotificationsAsRead,
} from '../lib/firebase/user-notifications.js';
import {
  requestNotificationPermission,
  getNotificationPermission,
  showBrowserNotification,
  formatNotification,
} from '../lib/notification-utils.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element notification-center
 * Student notification center showing recent notifications with push permission toggle.
 */
export class NotificationCenter extends LitElement {
  static properties = {
    _notifications: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _unreadCount: { type: Number, state: true },
    _expanded: { type: Boolean, state: true },
    _pushPermission: { type: String, state: true },
    _userId: { type: String, state: true },
  };

  static styles = css`
    :host { display: block; }

    .notif-card {
      background: var(--color-bg-white, #fff);
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgb(0 0 0 / 0.1);
      margin-bottom: 1.5rem;
    }

    .notif-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 1rem 1.25rem;
      cursor: pointer;
      transition: background 0.15s;
      border-radius: 0.75rem;
    }

    .notif-header:hover { background: var(--color-bg-slate-50, #f8fafc); }

    .notif-header-left {
      display: flex;
      align-items: center;
      gap: 0.75rem;
    }

    .notif-icon {
      position: relative;
      font-size: 1.5rem;
      color: var(--color-text-muted, #64748b);
    }

    .notif-badge {
      position: absolute;
      top: -4px;
      right: -6px;
      min-width: 16px;
      height: 16px;
      background: #84cc16;
      color: #fff;
      font-size: 0.625rem;
      font-weight: 700;
      border-radius: 9999px;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 0 3px;
      font-family: inherit;
    }

    .notif-title {
      font-size: 0.938rem;
      font-weight: 700;
      color: var(--color-text-primary, #0f172a);
    }

    .notif-actions {
      display: flex;
      gap: 0.5rem;
      align-items: center;
    }

    .btn-text {
      background: none;
      border: none;
      font-size: 0.75rem;
      font-weight: 600;
      color: #84cc16;
      cursor: pointer;
      font-family: inherit;
      padding: 0.25rem 0.5rem;
      border-radius: 0.25rem;
    }

    .btn-text:hover { background: var(--color-bg-slate-50, #f8fafc); }

    .notif-list {
      border-top: 1px solid var(--color-bg-slate-100, #f1f5f9);
      max-height: 320px;
      overflow-y: auto;
    }

    .notif-item {
      display: flex;
      align-items: flex-start;
      gap: 0.75rem;
      padding: 0.75rem 1.25rem;
      transition: background 0.1s;
    }

    .notif-item:not(:last-child) {
      border-bottom: 1px solid var(--color-bg-slate-50, #f8fafc);
    }

    .notif-item--unread {
      background: var(--color-bg-slate-50, #f8fafc);
    }

    .notif-item-icon {
      color: var(--color-text-muted, #94a3b8);
      font-size: 1.25rem;
      flex-shrink: 0;
      margin-top: 0.125rem;
    }

    .notif-item--unread .notif-item-icon { color: #84cc16; }

    .notif-item-content {
      flex: 1;
      min-width: 0;
    }

    .notif-item-message {
      font-size: 0.813rem;
      color: var(--color-text-body, #334155);
      line-height: 1.4;
    }

    .notif-item--unread .notif-item-message {
      font-weight: 600;
    }

    .notif-item-time {
      font-size: 0.688rem;
      color: var(--color-text-muted, #94a3b8);
      margin-top: 0.125rem;
    }

    .notif-item-mark {
      background: none;
      border: none;
      cursor: pointer;
      color: var(--color-text-muted, #94a3b8);
      padding: 0.25rem;
      border-radius: 0.25rem;
      font-size: 1rem;
      flex-shrink: 0;
    }

    .notif-item-mark:hover { color: #84cc16; background: var(--color-bg-white, #fff); }

    .notif-empty {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-muted, #94a3b8);
      font-size: 0.813rem;
    }

    .push-toggle {
      border-top: 1px solid var(--color-bg-slate-100, #f1f5f9);
      padding: 0.75rem 1.25rem;
      display: flex;
      align-items: center;
      justify-content: space-between;
      font-size: 0.75rem;
      color: var(--color-text-muted, #64748b);
    }

    .push-btn {
      background: var(--color-bg-slate-100, #f1f5f9);
      border: none;
      border-radius: 0.375rem;
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      font-family: inherit;
      color: var(--color-text-body, #334155);
    }

    .push-btn:hover { background: var(--color-border, #e2e8f0); }
    .push-btn--active { background: var(--color-success-bg, #f0fdf4); color: var(--color-success-text, #166534); }

    .spinner {
      width: 1rem;
      height: 1rem;
      border: 2px solid var(--color-border, #e2e8f0);
      border-top-color: #84cc16;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 1.5rem auto;
    }

    @keyframes spin { to { transform: rotate(360deg); } }

    @media (max-width: 640px) {
      .notif-header { flex-direction: column; gap: 0.5rem; align-items: stretch; }
      .notif-item { padding: 0.75rem; }
    }

    /* Focus indicators */
    button:focus-visible,
    a:focus-visible,
    select:focus-visible,
    input:focus-visible,
    textarea:focus-visible {
      outline: 3px solid var(--color-primary, #84cc16);
      outline-offset: 2px;
    }
  `;

  constructor() {
    super();
    this._notifications = [];
    this._loading = true;
    this._unreadCount = 0;
    this._expanded = false;
    this._pushPermission = getNotificationPermission();
    this._userId = null;
    this._pollInterval = null;
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then((user) => {
      this._userId = user.uid;
      this._loadNotifications();
      this._pollInterval = setInterval(() => this._loadUnreadCount(), 60000);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._pollInterval) clearInterval(this._pollInterval);
  }

  async _loadNotifications() {
    this._loading = true;
    const [notifResult, countResult] = await Promise.all([
      fetchUserNotifications(this._userId),
      countUnreadUserNotifications(this._userId),
    ]);
    this._loading = false;

    if (notifResult.success) this._notifications = notifResult.notifications;
    if (countResult.success) this._unreadCount = countResult.count;
  }

  async _loadUnreadCount() {
    const result = await countUnreadUserNotifications(this._userId);
    if (result.success) {
      const prev = this._unreadCount;
      this._unreadCount = result.count;

      if (result.count > prev && this._pushPermission === 'granted') {
        showBrowserNotification('ManuElearning', {
          body: 'Tienes nuevas notificaciones',
          tag: 'new-notif',
        });
      }
    }
  }

  _toggleExpand() {
    this._expanded = !this._expanded;
    if (this._expanded && this._notifications.length === 0) {
      this._loadNotifications();
    }
  }

  async _markAsRead(notifId) {
    const result = await markUserNotificationAsRead(notifId);
    if (result.success) {
      this._notifications = this._notifications.map((n) =>
        n.id === notifId ? { ...n, read: true } : n
      );
      this._unreadCount = Math.max(0, this._unreadCount - 1);
    }
  }

  async _markAllAsRead() {
    const result = await markAllUserNotificationsAsRead(this._userId);
    if (result.success) {
      this._notifications = this._notifications.map((n) => ({ ...n, read: true }));
      this._unreadCount = 0;
    }
  }

  async _togglePush() {
    if (this._pushPermission === 'granted') return;
    const permission = await requestNotificationPermission();
    this._pushPermission = permission;
  }

  render() {
    return html`
      ${materialIconsLink}
      <div class="notif-card">
        <div class="notif-header" @click=${this._toggleExpand}>
          <div class="notif-header-left">
            <span class="notif-icon">
              <span class="material-symbols-outlined">notifications</span>
              ${this._unreadCount > 0
                ? html`<span class="notif-badge">${this._unreadCount}</span>`
                : ''}
            </span>
            <span class="notif-title">Notificaciones</span>
          </div>
          <div class="notif-actions">
            ${this._unreadCount > 0
              ? html`<button class="btn-text" @click=${(e) => { e.stopPropagation(); this._markAllAsRead(); }}>Marcar todas</button>`
              : ''}
            <span class="material-symbols-outlined">
              ${this._expanded ? 'expand_less' : 'expand_more'}
            </span>
          </div>
        </div>

        ${this._expanded ? html`
          <div class="notif-list" role="list" aria-label="Notificaciones">
            ${this._loading
              ? html`<div class="spinner" role="status"></div>`
              : this._notifications.length === 0
                ? html`<div class="notif-empty">No tienes notificaciones</div>`
                : this._notifications.map((n) => this._renderNotification(n))}
          </div>
          <div class="push-toggle">
            <span>Notificaciones del navegador</span>
            ${this._pushPermission === 'granted'
              ? html`<span class="push-btn push-btn--active">Activadas</span>`
              : this._pushPermission === 'denied'
                ? html`<span class="push-btn">Bloqueadas por el navegador</span>`
                : html`<button class="push-btn" @click=${this._togglePush}>Activar</button>`}
          </div>
        ` : ''}
      </div>
    `;
  }

  _renderNotification(n) {
    const { icon, timeAgo } = formatNotification(n);
    return html`
      <div class="notif-item ${n.read ? '' : 'notif-item--unread'}" role="listitem">
        <span class="material-symbols-outlined notif-item-icon">${icon}</span>
        <div class="notif-item-content">
          <div class="notif-item-message">${n.message}</div>
          ${timeAgo ? html`<div class="notif-item-time">${timeAgo}</div>` : ''}
        </div>
        ${!n.read ? html`
          <button class="notif-item-mark" aria-label="Marcar como leída" @click=${() => this._markAsRead(n.id)} title="Marcar como leída">
            <span class="material-symbols-outlined">check</span>
          </button>
        ` : ''}
      </div>
    `;
  }
}

customElements.define('notification-center', NotificationCenter);
