import { LitElement, html, css } from 'lit';
import {
  fetchAllCohorts,
  createCohort,
  updateCohort,
} from '../lib/firebase/cohorts.js';
import { validateCohort, getCohortStatus } from '../lib/cohort-utils.js';
import {
  fetchCodesByCohort,
  createInvitationCode,
  toggleCodeActive,
} from '../lib/firebase/invitation-codes.js';
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
    _expandedCohort: { type: String, state: true },
    _codes: { type: Array, state: true },
    _codesLoading: { type: Boolean, state: true },
    _codeMaxUses: { type: Number, state: true },
    _creatingCode: { type: Boolean, state: true },
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

    .codes-panel {
      background: #f8fafc;
      padding: 1rem 1.25rem;
      border-top: 1px solid #e2e8f0;
    }

    .codes-panel__header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 0.75rem;
    }

    .codes-panel__header h4 {
      margin: 0;
      font-size: 0.813rem;
      font-weight: 700;
      color: #334155;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .codes-panel__create {
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }

    .codes-panel__create input {
      width: 5rem;
      padding: 0.25rem 0.5rem;
      border: 1px solid #e2e8f0;
      border-radius: 0.375rem;
      font-size: 0.813rem;
      font-family: inherit;
    }

    .codes-list {
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }

    .code-item {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 0.75rem;
      background: #fff;
      padding: 0.5rem 0.75rem;
      border-radius: 0.375rem;
      border: 1px solid #e2e8f0;
      font-size: 0.813rem;
    }

    .code-item__code {
      font-family: monospace;
      font-weight: 700;
      letter-spacing: 0.05em;
      color: #0f172a;
    }

    .code-item__uses {
      color: #64748b;
    }

    .code-item--inactive {
      opacity: 0.5;
    }

    .code-item--inactive .code-item__code {
      text-decoration: line-through;
    }

    .codes-empty {
      font-size: 0.813rem;
      color: #94a3b8;
      text-align: center;
      padding: 0.5rem;
    }

    .expand-btn {
      background: none;
      border: none;
      cursor: pointer;
      color: #64748b;
      padding: 0.25rem;
      display: inline-flex;
      align-items: center;
    }

    .expand-btn:hover {
      color: #84cc16;
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
    this._expandedCohort = null;
    this._codes = [];
    this._codesLoading = false;
    this._codeMaxUses = 10;
    this._creatingCode = false;
  }

  connectedCallback() {
    super.connectedCallback();
    waitForAuth().then(() => this._loadCohorts());
  }

  _emptyForm() {
    return { name: '', code: '', startDate: '', expiryDate: '' };
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

  /** @param {{ id: string, name: string, code: string, startDate: string, expiryDate: string }} cohort */
  _openEdit(cohort) {
    this._editingId = cohort.id;
    this._formData = {
      name: cohort.name,
      code: cohort.code,
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
                  <th></th>
                  <th>Nombre</th>
                  <th>Codigo</th>
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
                      <td>
                        <button class="expand-btn" @click=${() => this._toggleCodes(c.id)}>
                          <span class="material-symbols-outlined">
                            ${this._expandedCohort === c.id ? 'expand_less' : 'expand_more'}
                          </span>
                        </button>
                      </td>
                      <td>${c.name}</td>
                      <td>${c.code}</td>
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
                    ${this._expandedCohort === c.id
                      ? html`
                        <tr>
                          <td colspan="7" style="padding:0;">
                            ${this._renderCodesPanel(c.id)}
                          </td>
                        </tr>`
                      : ''}
                  `}
                )}
              </tbody>
            </table>
          `}

      ${this._showForm ? this._renderForm() : ''}
    `;
  }

  async _toggleCodes(cohortId) {
    if (this._expandedCohort === cohortId) {
      this._expandedCohort = null;
      return;
    }

    this._expandedCohort = cohortId;
    this._codesLoading = true;
    this._codes = [];

    const result = await fetchCodesByCohort(cohortId);
    this._codesLoading = false;
    if (result.success) {
      this._codes = result.codes;
    }
  }

  async _createCode(cohortId) {
    this._creatingCode = true;
    const result = await createInvitationCode(cohortId, this._codeMaxUses);
    this._creatingCode = false;

    if (result.success) {
      const refreshResult = await fetchCodesByCohort(cohortId);
      if (refreshResult.success) {
        this._codes = refreshResult.codes;
      }
    }
  }

  async _toggleCodeActive(codeId, currentActive) {
    const result = await toggleCodeActive(codeId, !currentActive);
    if (result.success) {
      this._codes = this._codes.map((c) =>
        c.id === codeId ? { ...c, active: !currentActive } : c
      );
    }
  }

  _renderCodesPanel(cohortId) {
    if (this._codesLoading) {
      return html`<div class="codes-panel"><div class="spinner"></div></div>`;
    }

    return html`
      <div class="codes-panel">
        <div class="codes-panel__header">
          <h4>Codigos de invitacion</h4>
          <div class="codes-panel__create">
            <label for="maxUses" style="font-size:0.75rem;color:#64748b;">Max usos:</label>
            <input
              id="maxUses"
              type="number"
              min="1"
              .value=${String(this._codeMaxUses)}
              @input=${(e) => { this._codeMaxUses = parseInt(e.target.value) || 10; }}
            />
            <button
              class="btn btn--primary btn--small"
              @click=${() => this._createCode(cohortId)}
              ?disabled=${this._creatingCode}
            >
              ${this._creatingCode ? 'Creando...' : 'Crear codigo'}
            </button>
          </div>
        </div>

        ${this._codes.length === 0
          ? html`<p class="codes-empty">No hay códigos para esta convocatoria</p>`
          : html`
            <div class="codes-list">
              ${this._codes.map((code) => html`
                <div class="code-item ${!code.active ? 'code-item--inactive' : ''}">
                  <span class="code-item__code">${code.code}</span>
                  <span class="code-item__uses">${code.usedCount}/${code.maxUses} usos</span>
                  <span class="status-badge status-badge--${code.active ? 'active' : 'inactive'}">
                    ${code.active ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    class="btn btn--secondary btn--small"
                    @click=${() => this._toggleCodeActive(code.id, code.active)}
                  >
                    ${code.active ? 'Desactivar' : 'Activar'}
                  </button>
                </div>
              `)}
            </div>
          `}
      </div>
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
            <div class="form-group">
              <label for="cohort-code">Código (YYYY-MM)</label>
              <input
                id="cohort-code"
                name="code"
                type="text"
                .value=${this._formData.code}
                @input=${this._handleInput}
                placeholder="2026-03"
                pattern="\\d{4}-\\d{2}"
                required
              />
            </div>
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
