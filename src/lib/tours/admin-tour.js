// Steps of the admin's first-visit tour of /admin.

export const ADMIN_TOUR_ID = 'admin-panel';

export function adminTourSteps() {
  return [
    {
      popover: {
        title: 'Bienvenida al panel de administración',
        description: 'Te enseño dónde está cada herramienta. Puedes salir cuando quieras.',
      },
    },
    {
      element: 'admin-dashboard',
      popover: { title: 'Vista general', description: 'Usuarios, actividad y progreso de la plataforma de un vistazo.' },
    },
    {
      element: '.admin-sidebar__nav',
      popover: { title: 'Menú', description: 'Desde aquí llegas a cada sección del panel en cualquier momento.' },
    },
    {
      element: '.shortcut-card[href="/admin/users"]',
      popover: {
        title: 'Usuarios e invitaciones',
        description: 'Aprueba solicitudes, cambia roles, desactiva cuentas e invita por correo con un enlace.',
      },
    },
    {
      element: '.shortcut-card[href="/admin/cohorts"]',
      popover: { title: 'Convocatorias', description: 'Crea convocatorias con sus fechas y los cursos a los que dan acceso.' },
    },
    {
      element: '.shortcut-card[href="/admin/modules"]',
      popover: { title: 'Contenido', description: 'Módulos y clases de cada curso: vídeo, documentación y orden.' },
    },
    {
      element: '.shortcut-card[href="/admin/questions"]',
      popover: { title: 'Preguntas', description: 'Las dudas que dejan los alumnos en las clases, para responderlas.' },
    },
    {
      element: '#admin-tour-help-btn',
      popover: { title: '¿Lo quieres repetir?', description: 'Pulsa aquí cuando quieras volver a ver este recorrido.' },
    },
  ];
}
