# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- CHANGELOG_ENTRIES -->
## [1.1.1] - 2026-11-11
### Fixes
- fix: la racha cuenta el día en hora local (MEL-BUG-0011)

## [1.1.0] - 2026-11-11
### Features
- feat: tour guiado del admin en /admin con botón de ayuda (MEL-TSK-0109)
- feat: tour guiado del alumno en /dashboard con botón de ayuda (MEL-TSK-0110)
- feat: módulo de tours guiados con driver.js (MEL-TSK-0108)
- feat: página /invitacion para aceptar invitaciones (MEL-TSK-0107)
- feat: componente para aceptar una invitación con google (MEL-TSK-0107)
- feat: invitar desde /admin/users y ver invitaciones en pendientes (MEL-TSK-0107)
- feat: lista de invitaciones pendientes con copiar y revocar (MEL-TSK-0106)
- feat: formulario de invitación con enlace y correo para copiar (MEL-TSK-0106)
- feat: botón de copiar y correo de una invitación guardada (MEL-TSK-0106)
- feat: leer y aceptar una invitación en un único batch (MEL-TSK-0106)
- feat: capa de datos de invitaciones para el admin (MEL-TSK-0106)
- feat: reglas e índice de invitaciones y alta activa invitada (MEL-TSK-0106)
- feat: helpers de invitaciones, enlace, mensaje y validez (MEL-TSK-0106)
- feat: certificado y título real de cada curso en el dashboard (MEL-TSK-0096)
- feat: certificado ligado al curso completado (MEL-TSK-0096)
- feat: preguntas abiertas en el quiz de la lección (MEL-TSK-0101)
- feat: helpers puros del quiz de lección con preguntas abiertas (MEL-TSK-0101)
- feat: material del formador visible solo para admins en temario y lección (MEL-TSK-0095)
- feat: audiencia de lección en el panel de módulos (MEL-TSK-0095)
- feat: audiencia de lección con reglas e índice para el material del formador (MEL-TSK-0095)
- feat: enlaces de cursos del pie desde la colección courses (MEL-TSK-0100)
- feat: catálogo /cursos alimentado por la colección courses (MEL-TSK-0100)
- feat: saveCourse y deleteCourse en el servicio de cursos (MEL-TSK-0092)
- feat: colección courses con servicio, reglas e índice (MEL-TSK-0092)
- feat: script import-course.mjs que sube un curso desde su manifiesto (MEL-TSK-0091)
- feat: lógica de manifiesto de curso para importar desde markdown (MEL-TSK-0091)
- feat: retirar el curso demo de javascript (MEL-TSK-0090)
### Fixes
- fix: heatmap en día local, orden válido finito y cursos en orden español (MEL-BUG-0010)
- fix: impedir crear el propio perfil como admin o activo (MEL-BUG-0009)
- fix: desactivar usuario desde el admin y bloquear a los inactivos (MEL-BUG-0008)
- fix: permitir la verificación pública de certificados (MEL-BUG-0007)
- fix: sacar el email de contacto del repositorio público (MEL-TSK-0098)
- fix: navegación de la lección limitada al curso actual (MEL-BUG-0006)
- fix: estilos del pie para los enlaces de curso generados por lit (MEL-TSK-0100)

## [1.0.55] - 2026-03-15
- fix: comprehensive UI audit — dark mode, accessibility, responsive and performance

## [1.0.53] - 2026-03-11
- feat: add status tabs and validation actions to admin users panel

## [1.0.51] - 2026-03-11
- feat: block dashboard access for pending users until admin validates

## [1.0.48] - 2026-03-10 — Sprint 8: Gamificación, Analytics y UX Avanzada
- feat: badge system for module and course completion (MEL-TSK-0074)
- feat: daily activity streak with fire counter (MEL-TSK-0075)
- feat: GitHub-style activity heatmap in profile (MEL-TSK-0076)
- feat: personal learning analytics dashboard (MEL-TSK-0077)
- feat: video player speed controls, bookmarks and position (MEL-TSK-0078)
- feat: certificate QR verification and LinkedIn sharing (MEL-TSK-0079)
- feat: admin lesson difficulty heatmap and dropout analysis (MEL-TSK-0080)
- feat: threaded Q&A with voting and teacher badge (MEL-TSK-0081)
- feat: weekly email digest with progress summary (MEL-TSK-0082)
- feat: dark mode with persistent toggle (MEL-TSK-0083)

## [1.0.46] - 2026-03-10
- feat: add threaded replies and voting to lesson Q&A

## [1.0.44] - 2026-03-10
- feat: add video speed controls, position persistence and bookmarks

## [1.0.43] - 2026-03-10
- feat: MEL-TSK-0077: Analytics de progreso personalizado para el estudiante. Ad

## [1.0.38] - 2026-03-10
- feat: add QR verification and LinkedIn sharing to certificates

## [1.0.37] - 2026-03-10
- chore: clean up obsolete remote branches from completed sprints
- fix: show all users in retention dashboard including admins

## [1.0.35] - 2026-03-08
- feat: add configurable retention algorithm panel in admin dashboard

## [1.0.34] - 2026-03-08
- feat: add engagement scoring algorithm and churn prediction to retention dashboard

## [1.0.27] - 2026-03-08
- feat: support 1-3 questions per quiz in admin module form

## [1.0.25] - 2026-03-08
- fix: prevent markdown preview from collapsing textarea in grid

## [1.0.23] - 2026-03-08
- fix: restore quiz gate on lesson complete button

## [1.0.23] - 2026-03-08
- chore: remove .kj/run.log from tracking and add .kj/ to gitignore

## [1.0.21] - 2026-03-08
- feat: MEL-TSK-0050: Create legal pages (privacy policy, terms of service, cook

## [1.0.21] - 2026-03-08
- feat: MEL-TSK-0049: Create "Sobre Mánu" about page. Two things needed: 1) Upda

## [1.0.20] - 2026-03-06
- feat: add quiz editing capability for admin

## [1.0.18] - 2026-03-05
- refactor: rename "cohortes" to "convocatorias" across platform

## [1.0.16] - 2026-03-05
- feat: add visibility toggle button in admin questions panel

## [1.0.15] - 2026-03-05
- feat: add public field to questions model for privacy by default

## [1.0.13] - 2026-03-05
- fix: Material icons in Shadow DOM, auth header visibility, course links

## [1.0.12] - 2026-03-04
- feat: fix student dashboard - icons, auth header, course grouping

## [1.0.9] - 2026-03-04
- chore: add docs/ to gitignore for binary course materials

## [1.0.7] - 2026-03-04
- feat: apply lime-to-orange gradient as primary color system

## [1.0.6] - 2026-03-04
- feat: add access request page and simplify home layout

## [1.0.5] - 2026-03-04
- feat: show three experience stats as separate badges

## [1.0.4] - 2026-03-04
- fix: update stat to +25 years developing software

## [1.0.3] - 2026-03-04
- feat: update color palette to lime green primary and cyan secondary

## [1.0.2] - 2026-03-04
- feat: update home page texts for ManuElearning rebrand

## [1.0.1] - 2026-03-04
- chore: setup auto-versioning and changelog generation


## [1.0.0] - 2026-03-04

### Added
- Push notifications with student notification center (#13)
- PWA support with service worker and offline fallback (#12)
- Module and lesson reordering with up/down buttons (#11)
- Cohort expiration management with visual indicators (#10)
- Firestore composite indexes for all compound queries (#9)
- Consistent loading, empty, and error states with retry (#8)
- Search filters to admin users and modules panels (#7)
- CSV export for users and quiz responses (#6)
- Quiz results page for students (#5)
- Admin dashboard with platform metrics (#4)
- User profile page with display name editing (#3)
- Invitation code management in admin cohorts panel (#2)
- Google Sign-In authentication (#1)
- Initial project setup and rebranding to ManuElearning
