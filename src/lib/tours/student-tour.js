// Steps of the student's first-visit tour of /dashboard.

export const STUDENT_TOUR_ID = 'student-dashboard';

/**
 * @param {HTMLElement} view the student-dashboard-view, whose sections live in its shadow root
 */
export function studentTourSteps(view) {
  const inView = (selector) => () => view.shadowRoot?.querySelector(selector) ?? null;
  return [
    {
      popover: {
        title: 'Bienvenida a tu dashboard',
        description: 'En un minuto te enseño dónde está cada cosa. Puedes salir cuando quieras.',
      },
    },
    {
      element: inView('.stats-grid'),
      popover: { title: 'Tu avance', description: 'Porcentaje global, clases completadas y cursos en los que estás.' },
    },
    {
      element: inView('.streak-card'),
      popover: { title: 'Tu racha', description: 'Días seguidos estudiando. Mantenla para ganar insignias.' },
    },
    {
      element: inView('.global-progress'),
      popover: { title: 'Progreso general', description: 'Cuánto te queda para terminar todo lo que tienes asignado.' },
    },
    {
      element: inView('.course-section'),
      popover: {
        title: 'Tus cursos',
        description: 'Despliega un curso para ver sus módulos y entra en la siguiente clase. Al completarlo podrás descargar el certificado.',
      },
    },
    {
      element: inView('.analytics-section'),
      popover: { title: 'Tu ritmo', description: 'Clases por semana, acierto en los quizzes y fecha estimada para terminar.' },
    },
    {
      element: '#tour-help-btn',
      popover: { title: '¿Lo quieres repetir?', description: 'Pulsa aquí cuando quieras volver a ver este recorrido.' },
    },
  ];
}
