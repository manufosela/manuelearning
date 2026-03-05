import { LitElement, html, css } from 'lit';
import { fetchAllUsers, updateUserRole } from '../lib/firebase/users.js';
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
  };

  static styles = css`
    :host {
      display: block;
    }

    .users-table {
      width: 100%;
      border-collapse: collapse;
      background: #fff;
      border-radius: 0.75rem;
      overflow: hidden;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
    }

    th, td {
      padding: 0.875rem 1rem;
      text-align: left;
    }

    th {
      background: #f8fafc;
      font-size: 0.75rem;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      border-bottom: 1px solid #e2e8f0;
    }

    td {
      border-bottom: 1px solid #f1f5f9;
      font-size: 0.875rem;
      color: #0f172a;
    }

    tr:last-child td {
      border-bottom: none;
    }

    tr:hover td {
      background: #f8fafc;
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
      background: #fef2f2;
      color: #991b1b;
    }

    .role-badge--student {
      background: #f0fdf4;
      color: #166534;
    }

    .role-select {
      padding: 0.375rem 0.5rem;
      border: 1px solid #e2e8f0;
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
      color: #475569;
    }

    .export-btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      background: #f1f5f9;
      color: #334155;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.813rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .export-btn:hover {
      background: #e2e8f0;
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
      border: 1px solid #e2e8f0;
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
      color: #94a3b8;
      font-size: 0.875rem;
      background: #fff;
      border-radius: 0.75rem;
      box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
    }

    .loading, .error {
      text-align: center;
      padding: 3rem;
      color: #475569;
    }

    .error {
      color: #991b1b;
    }

    .spinner {
      width: 1.5rem;
      height: 1.5rem;
      border: 3px solid #e2e8f0;
      border-top-color: #84cc16;
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
      margin: 0 auto 0.75rem;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    @media (max-width: 768px) {
      .hide-mobile {
        display: none;
      }
    }
  `;

  constructor() {
    super();
    this._users = [];
    this._cohortMap = {};
    this._loading = true;
    this._error = '';
    this._searchQuery = '';
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

  render() {
    if (this._loading) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          <p>Cargando usuarios...</p>
        </div>
      `;
    }

    if (this._error) {
      return html`<div class="error">${this._error}</div>`;
    }

    const filtered = filterBySearch(this._users, ['email', 'displayName', 'role'], this._searchQuery);

    return html`
      ${materialIconsLink}
      <div class="toolbar">
        <span>${this._users.length} usuarios</span>
        <button class="export-btn" @click=${this._exportCsv}>
          <span class="material-symbols-outlined">download</span>
          Exportar CSV
        </button>
      </div>
      <div class="search-bar">
        <input
          class="search-input"
          type="text"
          placeholder="Buscar por email, nombre o rol..."
          .value=${this._searchQuery}
          @input=${(e) => { this._searchQuery = e.target.value; }}
        />
      </div>
      ${filtered.length === 0
        ? html`<div class="no-results">Sin resultados. Prueba con otro término de búsqueda.</div>`
        : html`
          <table class="users-table">
            <thead>
              <tr>
                <th>Email</th>
                <th class="hide-mobile">Nombre</th>
                <th>Rol</th>
                <th class="hide-mobile">Convocatoria</th>
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
                      <select
                        class="role-select"
                        data-uid=${user.uid}
                        .value=${user.role}
                        @change=${this._handleRoleChange}
                      >
                        <option value="student">student</option>
                        <option value="admin">admin</option>
                      </select>
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
