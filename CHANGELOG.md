# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

<!-- CHANGELOG_ENTRIES -->
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
