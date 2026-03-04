import { LitElement, html, css } from 'lit';
import { countUnreadNotifications } from '../lib/firebase/notifications.js';
import { waitForAuth } from '../lib/auth-ready.js';

/**
 * @element admin-notifications-badge
 * Displays a badge with unread notifications count in the admin sidebar.
 */
export class AdminNotificationsBadge extends LitElement {
  static properties = {
    _count: { type: Number, state: true },
  };

  static styles = css`
    :host { display: inline-flex; }

    .badge {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.375rem;
      background: #ec1313;
      color: #fff;
      border-radius: 9999px;
      font-size: 0.688rem;
      font-weight: 700;
      line-height: 1;
    }

    .hidden { display: none; }
  `;

  constructor() {
    super();
    this._count = 0;
    this._interval = null;
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => {
      this._loadCount();
      this._interval = setInterval(() => this._loadCount(), 30000);
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._interval) clearInterval(this._interval);
  }

  async _loadCount() {
    const result = await countUnreadNotifications();
    if (result.success) {
      this._count = result.count;
    } else {
      console.warn('admin-notifications-badge: failed to load count', result.error);
    }
  }

  render() {
    return html`
      <span class="badge ${this._count === 0 ? 'hidden' : ''}">${this._count}</span>
    `;
  }
}

customElements.define('admin-notifications-badge', AdminNotificationsBadge);
