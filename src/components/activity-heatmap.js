import { LitElement, html, css } from 'lit';
import { getUserProgress } from '../lib/firebase/progress.js';

/**
 * @element activity-heatmap
 * GitHub-style activity heatmap showing lesson completions over the last 12 months.
 * Renders a grid of day cells colored by activity intensity.
 *
 * @property {string} userId - The user ID to load activity data for
 */
export class ActivityHeatmap extends LitElement {
  static properties = {
    userId: { type: String },
    _activityMap: { type: Object, state: true },
    _loading: { type: Boolean, state: true },
    _tooltip: { type: Object, state: true },
    _totalActivities: { type: Number, state: true },
  };

  static styles = css`
    :host {
      display: block;
    }

    .heatmap-card {
      background: var(--color-bg-white, #fff);
      border-radius: 0.75rem;
      box-shadow: 0 4px 6px -1px rgb(0 0 0 / 0.1);
      padding: 1.5rem;
    }

    .heatmap-title {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text-primary, #0f172a);
      margin: 0 0 0.25rem;
    }

    .heatmap-subtitle {
      font-size: 0.813rem;
      color: var(--color-text-muted, #64748b);
      margin: 0 0 1rem;
    }

    .heatmap-scroll {
      overflow-x: auto;
    }

    .heatmap-container {
      display: inline-grid;
      grid-template-rows: repeat(7, 13px);
      grid-auto-flow: column;
      grid-auto-columns: 13px;
      gap: 3px;
    }

    .heatmap-cell {
      width: 13px;
      height: 13px;
      border-radius: 2px;
      cursor: pointer;
      position: relative;
    }

    .heatmap-cell--0 { background: #ebedf0; }
    .heatmap-cell--1 { background: #9be9a8; }
    .heatmap-cell--2 { background: #40c463; }
    .heatmap-cell--3 { background: #30a14e; }
    .heatmap-cell--4 { background: #216e39; }

    .months-row {
      display: flex;
      font-size: 0.688rem;
      color: var(--color-text-muted, #64748b);
      margin-bottom: 0.375rem;
      padding-left: 2px;
    }

    .month-label {
      text-align: left;
    }

    .days-labels {
      display: grid;
      grid-template-rows: repeat(7, 13px);
      gap: 3px;
      margin-right: 6px;
      font-size: 0.625rem;
      color: var(--color-text-muted, #64748b);
    }

    .days-labels span {
      display: flex;
      align-items: center;
      height: 13px;
      line-height: 1;
    }

    .heatmap-grid-wrapper {
      display: flex;
    }

    .legend {
      display: flex;
      align-items: center;
      gap: 0.375rem;
      margin-top: 0.75rem;
      font-size: 0.688rem;
      color: var(--color-text-muted, #64748b);
    }

    .legend-cell {
      width: 11px;
      height: 11px;
      border-radius: 2px;
    }

    .tooltip {
      position: fixed;
      background: #1f2937;
      color: #fff;
      padding: 0.375rem 0.625rem;
      border-radius: 0.375rem;
      font-size: 0.75rem;
      pointer-events: none;
      white-space: nowrap;
      z-index: 1000;
      box-shadow: 0 2px 8px rgba(0, 0, 0, 0.25);
    }

    .tooltip::after {
      content: '';
      position: absolute;
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border: 5px solid transparent;
      border-top-color: #1f2937;
    }

    .loading-text {
      color: var(--color-text-muted, #64748b);
      font-size: 0.875rem;
      text-align: center;
      padding: 2rem 0;
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
    this.userId = '';
    this._activityMap = {};
    this._loading = true;
    this._tooltip = null;
    this._totalActivities = 0;
  }

  willUpdate(changed) {
    if (changed.has('userId') && this.userId) {
      this._loadActivity();
    }
  }

  async _loadActivity() {
    this._loading = true;
    const result = await getUserProgress(this.userId);
    this._loading = false;

    if (!result.success || !result.completedLessons) {
      this._activityMap = {};
      this._totalActivities = 0;
      return;
    }

    const map = {};
    let total = 0;
    for (const lesson of result.completedLessons) {
      if (!lesson.completedAt) continue;
      const date = lesson.completedAt.toDate
        ? lesson.completedAt.toDate()
        : new Date(lesson.completedAt);
      const key = date.toISOString().slice(0, 10);
      map[key] = (map[key] || 0) + 1;
      total += 1;
    }

    this._activityMap = map;
    this._totalActivities = total;
  }

  /**
   * Build the array of day cells covering the last ~12 months,
   * aligned so the last column ends on today's week.
   */
  _buildCells() {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const dayOfWeek = today.getDay(); // 0=Sun
    const endDate = new Date(today);

    // Go back ~52 weeks (364 days) from the start of the current week column
    const startDate = new Date(endDate);
    startDate.setDate(startDate.getDate() - (52 * 7) - dayOfWeek);

    const cells = [];
    const cursor = new Date(startDate);

    while (cursor <= endDate) {
      const key = cursor.toISOString().slice(0, 10);
      const count = this._activityMap[key] || 0;
      cells.push({ date: key, count, level: this._getLevel(count) });
      cursor.setDate(cursor.getDate() + 1);
    }

    return cells;
  }

  _getLevel(count) {
    if (count === 0) return 0;
    if (count <= 1) return 1;
    if (count <= 3) return 2;
    if (count <= 5) return 3;
    return 4;
  }

  /**
   * Build month labels positioned above their corresponding week columns.
   */
  _buildMonthLabels(cells) {
    const weeks = Math.ceil(cells.length / 7);
    const labels = [];
    let lastMonth = -1;

    for (let w = 0; w < weeks; w++) {
      const cellIndex = w * 7;
      if (cellIndex >= cells.length) break;
      const d = new Date(cells[cellIndex].date + 'T00:00:00');
      const month = d.getMonth();

      if (month !== lastMonth) {
        const name = d.toLocaleDateString('es-ES', { month: 'short' });
        labels.push({ week: w, name: name.charAt(0).toUpperCase() + name.slice(1) });
        lastMonth = month;
      }
    }

    return { labels, weeks };
  }

  _showTooltip(e, cell) {
    const rect = e.target.getBoundingClientRect();
    const d = new Date(cell.date + 'T00:00:00');
    const formatted = d.toLocaleDateString('es-ES', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
    const text = cell.count === 0
      ? `Sin actividad el ${formatted}`
      : `${cell.count} ${cell.count === 1 ? 'leccion' : 'lecciones'} el ${formatted}`;

    this._tooltip = {
      text,
      x: rect.left + rect.width / 2,
      y: rect.top - 8,
    };
  }

  _hideTooltip() {
    this._tooltip = null;
  }

  render() {
    if (this._loading) {
      return html`
        <div class="heatmap-card">
          <p class="loading-text" role="status">Cargando actividad...</p>
        </div>
      `;
    }

    const cells = this._buildCells();
    const { labels, weeks } = this._buildMonthLabels(cells);

    const colWidth = 13 + 3; // cell + gap
    const dayLabels = ['Dom', '', 'Mar', '', 'Jue', '', 'Sab'];

    return html`
      <div class="heatmap-card">
        <h3 class="heatmap-title">Actividad de aprendizaje</h3>
        <p class="heatmap-subtitle">
          ${this._totalActivities} ${this._totalActivities === 1 ? 'leccion completada' : 'lecciones completadas'} en el ultimo ano
        </p>

        <div class="heatmap-scroll">
          <div class="months-row" style="padding-left: 30px;">
            ${labels.map((l, i) => {
              const nextWeek = i < labels.length - 1 ? labels[i + 1].week : weeks;
              const span = nextWeek - l.week;
              return html`<span class="month-label" style="width: ${span * colWidth}px">${l.name}</span>`;
            })}
          </div>

          <div class="heatmap-grid-wrapper">
            <div class="days-labels">
              ${dayLabels.map((d) => html`<span>${d}</span>`)}
            </div>
            <div class="heatmap-container" role="img" aria-label="Mapa de actividad">
              ${cells.map(
                (cell) => html`
                  <div
                    class="heatmap-cell heatmap-cell--${cell.level}"
                    @mouseenter=${(e) => this._showTooltip(e, cell)}
                    @mouseleave=${this._hideTooltip}
                  ></div>
                `,
              )}
            </div>
          </div>
        </div>

        <div class="legend">
          <span>Menos</span>
          ${[0, 1, 2, 3, 4].map(
            (l) => html`<div class="legend-cell heatmap-cell--${l}"></div>`,
          )}
          <span>Mas</span>
        </div>

        ${this._tooltip
          ? html`
              <div
                class="tooltip"
                style="left: ${this._tooltip.x}px; top: ${this._tooltip.y}px; transform: translate(-50%, -100%)"
              >
                ${this._tooltip.text}
              </div>
            `
          : ''}
      </div>
    `;
  }
}

customElements.define('activity-heatmap', ActivityHeatmap);
