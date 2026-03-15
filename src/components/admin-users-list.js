import { LitElement, html, css } from 'lit';
import { fetchAllUsers, updateUserRole, updateUserStatus } from '../lib/firebase/users.js';
import { fetchAllCohorts } from '../lib/firebase/cohorts.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { exportCsv } from '../lib/csv-export.js';
import { filterBySearch } from '../lib/search-filter.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element admin-users-list
 * Displays a table of all users with role management.
 */
export class AdminUsersList extends LitElement {
  static properties = {
    _users: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _searchQuery: { type: String, state: true },
    _activeTab: { type: String, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      background: var(--color-bg-white, #fff);
      border-radius: 0.75rem;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    th, td {
      padding: 0.875rem 1rem;
      text-align: left;
    }

    th {
      background: var(--color-bg-slate-50, #f8fafc);
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: var(--color-text-secondary, #475569);
      border-bottom: 1px solid var(--color-border, #e2e8f0);
    }

    td {
      border-bottom: 1px solid var(--color-bg-slate-50, #f1f5f9);
      font-size: 0.875rem;
      color: var(--color-text-primary, #0f172a);
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: var(--color-bg-slate-50, #f8fafc);
    }

    .role-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .role-badge--admin {
      background: var(--color-error-bg, #fef2f2);
      color: var(--color-error-text, #991b1b);
    }

    .role-badge--student {
      background: var(--color-success-bg, #f0fdf4);
      color: var(--color-success-text, #166534);
    }

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.625rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge--pending {
      background: var(--color-warning-bg, #fef3c7);
      color: var(--color-warning-text, #92400e);
    }

    .status-badge--active {
      background: var(--color-success-bg, #f0fdf4);
      color: var(--color-success-text, #166534);
    }

    .status-badge--inactive {
      background: var(--color-error-bg, #fef2f2);
      color: var(--color-error-text, #991b1b);
    }

    .role-select {
      padding: 0.375rem 0.5rem;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 0.375rem;
      font-size: 0.813rem;
      font-family: inherit;
      cursor: pointer;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1rem;
      font-size: 0.875rem;
      color: var(--color-text-secondary, #475569);
    }

    .export-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background: var(--color-bg-slate-50, #f1f5f9);
      color: var(--color-text-secondary, #334155);
      border: none;
      border-radius: 0.5rem;
      font-size: 0.813rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .export-btn:hover {
      background: var(--color-border, #e2e8f0);
    }

    .export-btn .material-symbols-outlined {
      font-size: 1rem;
    }

    .search-bar {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      margin-bottom: 1rem;
    }

    .search-input {
      flex: 1;
      height: 2.5rem;
      padding: 0 0.75rem;
      border: 1px solid var(--color-border, #e2e8f0);
      border-radius: 0.5rem;
      font-size: 0.875rem;
      font-family: inherit;
    }

    .search-input:focus {
      outline: none;
      border-color: #84cc16;
      box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.1);
    }

    .no-results {
      text-align: center;
      padding: 2rem;
      color: var(--color-text-muted, #94a3b8);
      font-size: 0.875rem;
      background: var(--color-bg-white, #fff);
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .loading, .error {
      text-align: center;
      padding: 3rem;
      color: var(--color-text-secondary, #475569);
    }

    .error {
      color: var(--color-error-text, #991b1b);
    }

    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 3px solid var(--color-border, #e2e8f0);
      border-top-color: #84cc16;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .tabs {
      display: flex;
      gap: 0;
      border-bottom: 2px solid var(--color-border, #e2e8f0);
      margin-bottom: 1rem;
    }

    .tab {
      padding: 0.75rem 1.5rem;
      font-size: 0.875rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      background: transparent;
      border-bottom: 2px solid transparent;
      margin-bottom: -2px;
      color: var(--color-text-secondary, #475569);
      font-family: inherit;
      transition: color 0.15s;
    }

    .tab:hover {
      color: var(--color-text-primary, #0f172a);
    }

    .tab--active {
      border-bottom-color: #84cc16;
      color: #84cc16;
    }

    .tab-count {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      margin-left: 0.375rem;
      min-width: 1.25rem;
      height: 1.25rem;
      padding: 0 0.25rem;
      border-radius: 9999px;
      font-size: 0.688rem;
      font-weight: 700;
      background: var(--color-bg-slate-50, #f1f5f9);
      color: var(--color-text-secondary, #475569);
    }

    .tab--active .tab-count {
      background: rgba(132, 204, 22, 0.15);
      color: #84cc16;
    }

    .actions-cell {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
    }

    .btn-action {
      display: inline-flex;
      align-items: center;
      gap: 0.25rem;
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      font-weight: 600;
      cursor: pointer;
      border: none;
      font-family: inherit;
    }

    .btn-action--validate {
      background: #84cc16;
      color: var(--color-bg-white, #fff);
    }

    .btn-action--reject {
      background: var(--color-bg-slate-50, #f1f5f9);
      color: var(--color-error-text, #991b1b);
      border: 1px solid var(--color-border, #e2e8f0);
    }

    .btn-action--deactivate {
      background: var(--color-bg-slate-50, #f1f5f9);
      color: var(--color-text-secondary, #475569);
      border: 1px solid var(--color-border, #e2e8f0);
    }

    .btn-action--reactivate {
      background: #84cc16;
      color: var(--color-bg-white, #fff);
    }

    @media (max-width: 768px) {
      .hide-mobile {
        display: none;
      }
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
    this._users = [];
    this._cohortMap = {};
    this._loading = true;
    this._error = '';
    this._searchQuery = '';
    this._activeTab = 'active';
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => this._loadUsers());
  }

  async _loadUsers() {
    this._loading = true;
    this._error = '';

    const [usersResult, cohortsResult] = await Promise.all([
      fetchAllUsers(),
      fetchAllCohorts(),
    ]);

    this._loading = false;
    if (usersResult.success) {
      this._users = usersResult.users;
    } else {
      this._error = usersResult.error;
      return;
    }

    if (cohortsResult.success) {
      this._cohortMap = {};
      for (const c of cohortsResult.cohorts) {
        this._cohortMap[c.id] = c.name;
      }
    }
  }

  _exportCsv() {
    const headers = ['Email', 'Nombre', 'Rol', 'Convocatoria'];
    const rows = this._users.map((u) => [
      u.email,
      u.displayName || '',
      u.role,
      this._cohortMap[u.cohortId] || u.cohortId || '',
    ]);
    exportCsv(headers, rows, 'usuarios.csv');
  }

  /** @param {Event} e */
  async _handleRoleChange(e) {
    const select = /** @type {HTMLSelectElement} */ (e.target);
    const uid = select.dataset.uid;
    const newRole = select.value;

    const result = await updateUserRole(uid, newRole);
    if (result.success) {
      this._users = this._users.map((u) =>
        u.uid === uid ? { ...u, role: newRole } : u
      );
    }
  }

  /** @param {string} uid @param {string} newStatus */
  async _handleStatusChange(uid, newStatus) {
    const result = await updateUserStatus(uid, newStatus);
    if (result.success) {
      this._users = this._users.map((u) =>
        u.uid === uid ? { ...u, status: newStatus } : u
      );
    }
  }

  /** @param {string} status @returns {string} */
  _getStatusLabel(status) {
    if (status === 'pending') return 'Pendiente';
    if (status === 'inactive') return 'Inactivo';
    return 'Activo';
  }

  /** @param {string|undefined} status @returns {boolean} */
  _isActiveUser(status) {
    return !status || status === 'active';
  }

  render() {
    if (this._loading) {
      return html`
        <div class="loading" role="status">
          <div class="spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      `;
    }

    if (this._error) {
      return html`<div class="error">${this._error}</div>`;
    }

    const activeUsers = this._users.filter((u) => this._isActiveUser(u.status));
    const pendingUsers = this._users.filter((u) => u.status === 'pending');
    const inactiveUsers = this._users.filter((u) => u.status === 'inactive');

    const tabUsers = this._activeTab === 'pending'
      ? pendingUsers
      : this._activeTab === 'inactive'
        ? inactiveUsers
        : activeUsers;

    const tabLabel = this._activeTab === 'pending'
      ? 'pendientes'
      : this._activeTab === 'inactive'
        ? 'inactivos'
        : 'activos';

    const filtered = filterBySearch(tabUsers, ['email', 'displayName', 'role'], this._searchQuery);

    return html`
      ${materialIconsLink}
      <div class="toolbar">
        <span>${tabUsers.length} usuarios ${tabLabel}</span>
        <button class="export-btn" @click=${this._exportCsv}>
          <span class="material-symbols-outlined">download</span>
          Exportar CSV
        </button>
      </div>
      <div class="tabs">
        <button
          class="tab ${this._activeTab === 'active' ? 'tab--active' : ''}"
          @click=${() => { this._activeTab = 'active'; }}
        >
          Activos
          <span class="tab-count">${activeUsers.length}</span>
        </button>
        <button
          class="tab ${this._activeTab === 'pending' ? 'tab--active' : ''}"
          @click=${() => { this._activeTab = 'pending'; }}
        >
          Pendientes
          <span class="tab-count">${pendingUsers.length}</span>
        </button>
        <button
          class="tab ${this._activeTab === 'inactive' ? 'tab--active' : ''}"
          @click=${() => { this._activeTab = 'inactive'; }}
        >
          Inactivos
          <span class="tab-count">${inactiveUsers.length}</span>
        </button>
      </div>
      <div class="search-bar">
        <input
          class="search-input"
          type="text"
          aria-label="Buscar usuarios"
          placeholder="Buscar por email, nombre o rol..."
          .value=${this._searchQuery}
          @input=${(e) => { this._searchQuery = e.target.value; }}
        />
      </div>
      ${filtered.length === 0
        ? html`<div class="no-results">Sin resultados. Prueba con otro término de búsqueda.</div>`
        : html`
          <table class="users-table" aria-label="Lista de usuarios">
            <thead>
              <tr>
                <th>Email</th>
                <th class="hide-mobile">Nombre</th>
                <th>Rol</th>
                <th class="hide-mobile">Convocatoria</th>
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              ${filtered.map(
                (user) => html`
                  <tr>
                    <td>${user.email}</td>
                    <td class="hide-mobile">${user.displayName || '-'}</td>
                    <td>
                      <span class="role-badge role-badge--${user.role}">
                        ${user.role}
                      </span>
                    </td>
                    <td class="hide-mobile">${this._cohortMap[user.cohortId] || user.cohortId || '-'}</td>
                    <td>
                      <span class="status-badge status-badge--${user.status || 'active'}">
                        ${this._getStatusLabel(user.status)}
                      </span>
                    </td>
                    <td>
                      <div class="actions-cell">
                        <select
                          class="role-select"
                          aria-label="Cambiar rol de ${user.email}"
                          data-uid=${user.uid}
                          .value=${user.role}
                          @change=${this._handleRoleChange}
                        >
                          <option value="student">student</option>
                          <option value="admin">admin</option>
                        </select>
                        ${this._activeTab === 'pending' ? html`
                          <button
                            class="btn-action btn-action--validate"
                            aria-label="Validar usuario ${user.email}"
                            @click=${() => this._handleStatusChange(user.uid, 'active')}
                          >Validar</button>
                          <button
                            class="btn-action btn-action--reject"
                            aria-label="Rechazar usuario ${user.email}"
                            @click=${() => this._handleStatusChange(user.uid, 'inactive')}
                          >Rechazar</button>
                        ` : ''}
                        ${this._activeTab === 'active' ? html`
                          <button
                            class="btn-action btn-action--deactivate"
                            aria-label="Desactivar usuario ${user.email}"
                            @click=${() => this._handleStatusChange(user.uid, 'inactive')}
                          >Desactivar</button>
                        ` : ''}
                        ${this._activeTab === 'inactive' ? html`
                          <button
                            class="btn-action btn-action--reactivate"
                            aria-label="Reactivar usuario ${user.email}"
                            @click=${() => this._handleStatusChange(user.uid, 'active')}
                          >Reactivar</button>
                        ` : ''}
                      </div>
                    </td>
                  </tr>
                `
              )}
            </tbody>
          </table>
        `}
    `;
  }
}

customElements.define('admin-users-list', AdminUsersList);
