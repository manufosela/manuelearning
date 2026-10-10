import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const mockFetchPublishedCourses = vi.fn();
const mockFetchAllModules = vi.fn();

vi.mock('../src/lib/firebase/courses.js', () => ({
  fetchPublishedCourses: (...a) => mockFetchPublishedCourses(...a),
}));
vi.mock('../src/lib/firebase/modules.js', () => ({
  fetchAllModules: (...a) => mockFetchAllModules(...a),
}));

const { countModulesByCourse } = await import('../src/components/course-list.js');

const docker = { slug: 'docker', title: 'Docker desde cero', description: 'Contenedores', icon: 'deployed_code', color: '#0db7ed' };
const karajan = { slug: 'karajan-v4', title: 'Karajan v4', description: 'Gobernanza', icon: 'policy', color: '#7c3aed' };

/**
 * Mount a custom element and wait until its async load has rendered.
 * @param {string} tag
 * @returns {Promise<HTMLElement>}
 */
async function mount(tag) {
  const el = document.createElement(tag);
  document.body.appendChild(el);
  await new Promise((r) => setTimeout(r, 0));
  await el.updateComplete;
  return el;
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('countModulesByCourse', () => {
  it('counts modules per course slug and ignores modules without course', () => {
    const counts = countModulesByCourse([{ course: 'docker' }, { course: 'docker' }, { course: 'karajan-v4' }, {}]);
    expect(counts.get('docker')).toBe(2);
    expect(counts.get('karajan-v4')).toBe(1);
    expect(counts.size).toBe(2);
  });
});

describe('course-list', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders one card per published course with its real module count', async () => {
    mockFetchPublishedCourses.mockResolvedValue({ success: true, courses: [docker, karajan] });
    mockFetchAllModules.mockResolvedValue({
      success: true,
      modules: [{ course: 'docker' }, { course: 'docker' }, { course: 'karajan-v4' }],
    });

    const el = await mount('course-list');
    expect(el.shadowRoot).toBeNull();
    const cards = el.querySelectorAll('.course-card');
    expect(cards).toHaveLength(2);
    expect(cards[0].getAttribute('href')).toBe('/curso?c=docker');
    expect(cards[0].querySelector('.course-card__title').textContent).toBe('Docker desde cero');
    expect(cards[0].querySelector('.course-card__meta').textContent).toContain('2 módulos');
    expect(cards[1].querySelector('.course-card__meta').textContent).toContain('1 módulo');
  });

  it('shows the error when courses cannot be loaded', async () => {
    mockFetchPublishedCourses.mockResolvedValue({ success: false, error: 'Error al cargar los cursos' });
    mockFetchAllModules.mockResolvedValue({ success: true, modules: [] });

    const el = await mount('course-list');
    const error = el.querySelector('.courses-state--error');
    expect(error.getAttribute('role')).toBe('alert');
    expect(error.textContent).toContain('Error al cargar los cursos');
  });

  it('shows an empty state when no course is published', async () => {
    mockFetchPublishedCourses.mockResolvedValue({ success: true, courses: [] });
    mockFetchAllModules.mockResolvedValue({ success: true, modules: [] });

    const el = await mount('course-list');
    expect(el.querySelector('.courses-state').textContent).toContain('Todavía no hay cursos publicados');
  });

  it('still renders cards with 0 modules when modules fail to load', async () => {
    mockFetchPublishedCourses.mockResolvedValue({ success: true, courses: [docker] });
    mockFetchAllModules.mockResolvedValue({ success: false, error: 'boom' });

    const el = await mount('course-list');
    expect(el.querySelector('.course-card__meta').textContent).toContain('0 módulos');
  });
});
