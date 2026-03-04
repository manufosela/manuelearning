# ManuElearning

Plataforma de formación online de Mánu Fosela.

## 🎯 Contexto

**ManuElearning** es una plataforma propia tipo LMS diseñada para gestionar cursos de formación online. Sustituye el flujo anterior (videos privados en YouTube + Google Forms) con una experiencia integrada que incluye tracking de progreso, quizzes y sesiones síncronas.

El desarrollo se realiza con agentes de IA para acelerar el proceso de implementación.

## 🚀 Demo

Firebase project: `manu-elearning`

## 📚 Módulos Principales

### 1. Gestión de Usuarios y Registro
- Landing page de registro activable/desactivable
- Registro cerrado o por invitación
- Gestión de roles: estudiante, administrador
- Sin plataforma de pago (fase inicial)

### 2. Gestión de Cursos por Cohortes
- Organización por sesiones/cohortes con formato año-mes (ej: 2026-01, 2026-06)
- Fechas de inicio y caducidad configurables por cohorte
- Posibilidad de acceso vitalicio para personas específicas
- Reutilización del mismo material en diferentes ediciones

### 3. Contenido y Learning Path
- Estructura de clases con sección de documentación + sección de video
- Videos embebidos desde YouTube (sin migración a S3 por ahora)
- Clases grabadas (<30 min) disponibles inmediatamente, sin calendarizar
- Sesiones síncronas/presenciales calendarizadas (semanales, Q&A del material de la semana anterior)

### 4. Tracking y Progreso
- Seguimiento detallado: clases vistas, porcentaje de avance por módulo
- Trazabilidad completa del estudiante a lo largo del curso
- Identificación de estudiantes que se dispersan o abandonan
- Generación de certificado al finalizar el curso

### 5. Quizzes / Interacción Pre-clase
- Sistema que permita crear formulario previo a una sesión de preguntas y respuestas
- Preguntas que el estudiante debe responder antes de la sesión síncrona
- Sistema que permita crear las sesiones síncronas, calendarizadas y un enlace al que se tienen que conectar para esa sesión síncrona (enlace de Zoom)
- Objetivo: asegurar que el material se revise antes del día de discusión

### 6. Sistema de Preguntas y Respuestas Integrado
- Los usuarios pueden dejar preguntas dentro del capítulo/clase que están viendo (no foro abierto)
- Notificación al administrador por email/alerta
- Panel para que el admin gestione y responda las preguntas

## 🛠️ Stack Tecnológico

- **Framework**: Astro
- **Base de datos**: Firebase
- **Componentes**: Lit (Web Components)
- **Lenguajes**: JavaScript vanilla, HTML y CSS vanilla

## 🎨 Diseño

- **Colores**: Rojo, blanco y gris
- **Videos**: Enlazados desde YouTube, no alojados en el servidor

## 🚀 Desarrollo

### Instalación

```bash
npm install
```

### Desarrollo local

```bash
npm run dev
```

### Build

```bash
npm run build
```

### Preview

```bash
npm run preview
```

### Tests

```bash
# Ejecutar tests
npm run test

# Tests en modo watch
npm run test:watch

# Tests con cobertura
npm run test:coverage
```

## 📝 Licencia

Este proyecto es de código cerrado y propiedad de Mánu Fosela.
