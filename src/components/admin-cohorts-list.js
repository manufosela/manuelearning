import { LitElement, html, css } from 'lit';
import {
  fetchAllCohorts,
  createCohort,
  updateCohort,
} from '../lib/firebase/cohorts.js';
import { validateCohort, getCohortStatus } from '../lib/cohort-utils.js';
import { waitForAuth } from '../lib/auth-ready.js';
import { materialIconsLink } from './shared/material-icons.js';

/**
 * @element admin-cohorts-list
 * Admin panel for CRUD management of cohorts.
 */
export class AdminCohortsList extends LitElement {
  static properties = {
    _cohorts: { type: Array, state: true },
    _loading: { type: Boolean, state: true },
    _error: { type: String, state: true },
    _showForm: { type: Boolean, state: true },
    _editingId: { type: String, state: true },
    _formData: { type: Object, state: true },
    _formError: { type: String, state: true },
    _saving: { type: Boolean, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .toolbar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
    }

    .btn {
      display: inline-flex;
      align-items: center;
      gap: 0.375rem;
      padding: 0.5rem 1rem;
      border: none;
      border-radius: 0.5rem;
      font-size: 0.813rem;
      font-weight: 600;
      font-family: inherit;
      cursor: pointer;
      transition: background-color 0.15s;
    }

    .btn--primary {
      background: #84cc16;
      color: #fff;
    }

    .btn--primary:hover {
      background: #d11111;
    }

    .btn--secondary {
      background: #f1f5f9;
      color: #334155;
    }

    .btn--secondary:hover {
      background: #e2e8f0;
    }

    .btn--small {
      padding: 0.375rem 0.75rem;
      font-size: 0.75rem;
    }

    .btn:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .cohorts-table {
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

    .status-badge {
      display: inline-flex;
      align-items: center;
      padding: 0.25rem 0.75rem;
      border-radius: 9999px;
      font-size: 0.75rem;
      font-weight: 600;
    }

    .status-badge--active {
      background: #f0fdf4;
      color: #166534;
    }

    .status-badge--inactive {
      background: #fef2f2;
      color: #991b1b;
    }

    .status-badge--expired {
      background: #fef3c7;
      color: #92400e;
    }

    .row--expired td {
      opacity: 0.65;
    }

    .actions {
      display: flex;
      gap: 0.5rem;
    }

    /* Form overlay */
    .form-overlay {
      position: fixed;
      inset: 0;
      background: rgba(0, 0, 0, 0.4);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 100;
    }

    .form-card {
      background: #fff;
      border-radius: 0.75rem;
      padding: 2rem;
      width: 100%;
      max-width: 480px;
      box-shadow: 0 25px 50px -12px rgb(0 0 0 / 0.25);
    }

    .form-card h3 {
      margin: 0 0 1.5rem;
      font-size: 1.125rem;
      font-weight: 700;
      color: #0f172a;
    }

    .form-group {
      margin-bottom: 1rem;
    }

    .form-group label {
      display: block;
      font-size: 0.813rem;
      font-weight: 600;
      color: #334155;
      margin-bottom: 0.375rem;
    }

    .form-group input {
      width: 100%;
      padding: 0.5rem 0.75rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-size: 0.875rem;
      font-family: inherit;
      box-sizing: border-box;
    }

    .form-group input:focus {
      outline: none;
      border-color: #84cc16;
      box-shadow: 0 0 0 3px rgba(132, 204, 22, 0.1);
    }

    .form-error {
      color: #991b1b;
      font-size: 0.813rem;
      margin-bottom: 1rem;
    }

    .form-actions {
      display: flex;
      justify-content: flex-end;
      gap: 0.5rem;
      margin-top: 1.5rem;
    }

    .loading, .error-msg {
      text-align: center;
      padding: 3rem;
      color: #475569;
    }

    .error-msg {
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

    .empty-state {
      text-align: center;
      padding: 3rem;
      color: #64748b;
    }

    .empty-state .material-symbols-outlined {
      font-size: 3rem;
      color: #cbd5e1;
      margin-bottom: 0.75rem;
    }

    .slug-display {
      font-family: monospace;
      font-size: 0.813rem;
      color: #64748b;
      background: #f1f5f9;
      padding: 0.375rem 0.75rem;
      border-radius: 0.375rem;
      display: block;
    }

    @media (max-width: 768px) {
      .hide-mobile {
        display: none;
      }
    }
  `;

  constructor() {
    super();
    this._cohorts = [];
    this._loading = true;
    this._error = '';
    this._showForm = false;
    this._editingId = null;
    this._formData = this._emptyForm();
    this._formError = '';
    this._saving = false;
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => this._loadCohorts());
  }

  _emptyForm() {
    return { name: '', startDate: '', expiryDate: '' };
  }

  async _loadCohorts() {
    this._loading = true;
    this._error = '';

    const result = await fetchAllCohorts();

    this._loading = false;
    if (result.success) {
      this._cohorts = result.cohorts;
    } else {
      this._error = result.error;
    }
  }

  _openCreate() {
    this._editingId = null;
    this._formData = this._emptyForm();
    this._formError = '';
    this._showForm = true;
  }

  /** @param {{ id: string, name: string, slug?: string, code?: string, startDate: string, expiryDate: string }} cohort */
  _openEdit(cohort) {
    this._editingId = cohort.id;
    this._formData = {
      name: cohort.name,
      slug: cohort.slug || cohort.code || cohort.id,
      startDate: cohort.startDate,
      expiryDate: cohort.expiryDate,
    };
    this._formError = '';
    this._showForm = true;
  }

  _closeForm() {
    this._showForm = false;
    this._editingId = null;
    this._formError = '';
  }

  /** @param {Event} e */
  _handleInput(e) {
    const input = /** @type {HTMLInputElement} */ (e.target);
    this._formData = { ...this._formData, [input.name]: input.value };
  }

  async _handleSubmit(e) {
    e.preventDefault();
    this._formError = '';

    const validation = validateCohort(this._formData);
    if (!validation.valid) {
      this._formError = validation.error;
      return;
    }

    this._saving = true;

    if (this._editingId) {
      const result = await updateCohort(this._editingId, this._formData);
      this._saving = false;
      if (result.success) {
        this._closeForm();
        await this._loadCohorts();
      } else {
        this._formError = result.error;
      }
    } else {
      const result = await createCohort(this._formData);
      this._saving = false;
      if (result.success) {
        this._closeForm();
        await this._loadCohorts();
      } else {
        this._formError = result.error;
      }
    }
  }

  /** @param {string} id @param {boolean} active */
  async _toggleActive(id, active) {
    const result = await updateCohort(id, { active: !active });
    if (result.success) {
      this._cohorts = this._cohorts.map((c) =>
        c.id === id ? { ...c, active: !active } : c
      );
    }
  }

  render() {
    if (this._loading) {
      return html`
        <div class="loading">
          <div class="spinner"></div>
          <p>Cargando convocatorias...</p>
        </div>
      `;
    }

    if (this._error) {
      return html`<div class="error-msg">${this._error}</div>`;
    }

    return html`
      ${materialIconsLink}
      <div class="toolbar">
        <span>${this._cohorts.length} convocatoria${this._cohorts.length !== 1 ? 's' : ''}</span>
        <button class="btn btn--primary" @click=${this._openCreate}>
          <span class="material-symbols-outlined">add</span>
          Nueva convocatoria
        </button>
      </div>

      ${this._cohorts.length === 0
        ? html`
            <div class="empty-state">
              <span class="material-symbols-outlined">school</span>
              <p>No hay convocatorias registradas</p>
            </div>
          `
        : html`
            <table class="cohorts-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>ID</th>
                  <th class="hide-mobile">Inicio</th>
                  <th class="hide-mobile">Fin</th>
                  <th>Estado</th>
                  <th>Acciones</th>
                </tr>
              </thead>
              <tbody>
                ${this._cohorts.map(
                  (c) => {
                    const status = getCohortStatus(c);
                    const statusLabels = { active: 'Activa', expired: 'Expirada', inactive: 'Inactiva' };
                    return html`
                    <tr class="${status === 'expired' ? 'row--expired' : ''}">
                      <td>${c.name}</td>
                      <td>${c.slug || c.code || c.id}</td>
                      <td class="hide-mobile">${c.startDate}</td>
                      <td class="hide-mobile">${c.expiryDate}</td>
                      <td>
                        <span class="status-badge status-badge--${status}">
                          ${statusLabels[status]}
                        </span>
                      </td>
                      <td>
                        <div class="actions">
                          <button
                            class="btn btn--secondary btn--small"
                            @click=${() => this._openEdit(c)}
                          >Editar</button>
                          <button
                            class="btn btn--secondary btn--small"
                            @click=${() => this._toggleActive(c.id, c.active)}
                          >${c.active ? 'Desactivar' : 'Activar'}</button>
                        </div>
                      </td>
                    </tr>
                  `}
                )}
              </tbody>
            </table>
          `}

      ${this._showForm ? this._renderForm() : ''}
    `;
  }

  _renderForm() {
    const title = this._editingId ? 'Editar convocatoria' : 'Nueva convocatoria';

    return html`
      <div class="form-overlay" @click=${this._closeForm}>
        <div class="form-card" @click=${(e) => e.stopPropagation()}>
          <h3>${title}</h3>
          <form @submit=${this._handleSubmit}>
            <div class="form-group">
              <label for="cohort-name">Nombre</label>
              <input
                id="cohort-name"
                name="name"
                type="text"
                .value=${this._formData.name}
                @input=${this._handleInput}
                placeholder="Convocatoria Marzo 2026"
                required
              />
            </div>
            ${this._editingId ? html`
            <div class="form-group">
              <label>ID (no editable)</label>
              <span class="slug-display">${this._formData.slug}</span>
            </div>
            ` : ''}
            <div class="form-group">
              <label for="cohort-start">Fecha de inicio</label>
              <input
                id="cohort-start"
                name="startDate"
                type="date"
                .value=${this._formData.startDate}
                @input=${this._handleInput}
                required
              />
            </div>
            <div class="form-group">
              <label for="cohort-expiry">Fecha de caducidad</label>
              <input
                id="cohort-expiry"
                name="expiryDate"
                type="date"
                .value=${this._formData.expiryDate}
                @input=${this._handleInput}
                required
              />
            </div>

            ${this._formError ? html`<div class="form-error">${this._formError}</div>` : ''}

            <div class="form-actions">
              <button type="button" class="btn btn--secondary" @click=${this._closeForm}>
                Cancelar
              </button>
              <button type="submit" class="btn btn--primary" ?disabled=${this._saving}>
                ${this._saving ? 'Guardando...' : this._editingId ? 'Guardar' : 'Crear'}
              </button>
            </div>
          </form>
        </div>
      </div>
    `;
  }
}

customElements.define('admin-cohorts-list', AdminCohortsList);
