/**
 * Seed script: uploads the Docker course to Firestore.
 *
 * Usage:
 *   node scripts/seed-courses.mjs
 *   node scripts/seed-courses.mjs --dry-run
 *
 * Prerequisites:
 *   - serviceAccountKey.json in project root
 *   - docs/docker/introduccion-docker.md (course material, not tracked in git)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const keyPath = resolve(ROOT, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');

const app = initializeApp({ credential: cert(serviceAccount) });
const db = getFirestore(app);

console.log(`Connected to project: ${serviceAccount.project_id}`);
if (DRY_RUN) console.log('*** DRY RUN — no data will be written ***\n');

// ─── Docker Course ──────────────────────────────────────────

function parseDockerCourse() {
  const md = readFileSync(resolve(ROOT, 'docs/docker/introduccion-docker.md'), 'utf-8');

  // Split by ## headings (level 2)
  const sections = md.split(/\n(?=## )/);
  const intro = sections[0]; // Title + intro paragraph

  const modules = [
    {
      title: 'Introducción a Docker',
      description: 'Conceptos fundamentales de Docker, instalación y comandos básicos',
      order: 0,
      lessons: [],
    },
    {
      title: 'Contenedores en práctica',
      description: 'Crear, lanzar y gestionar contenedores Docker con ejemplos reales',
      order: 1,
      lessons: [],
    },
    {
      title: 'Docker Compose',
      description: 'Orquestación de múltiples contenedores con docker-compose',
      order: 2,
      lessons: [],
    },
    {
      title: 'Arquitectura completa con Nginx',
      description: 'Servir estáticos y APIs con Nginx como reverse proxy',
      order: 3,
      lessons: [],
    },
  ];

  // Map sections to modules/lessons
  for (const section of sections) {
    const titleMatch = section.match(/^##\s+(.+)/);
    if (!titleMatch) {
      // Intro section - add as first lesson
      modules[0].lessons.push({
        title: 'Introducción',
        description: 'Qué es Docker y por qué usarlo',
        documentation: intro.trim(),
        order: 0,
      });
      continue;
    }

    const title = titleMatch[1].trim();

    // Module 0: Intro & basics
    if (title.includes('Qué es docker')) {
      modules[0].lessons.push({
        title: '¿Qué es Docker?',
        description: 'Imágenes, contenedores y conceptos fundamentales',
        documentation: section.trim(),
        order: 1,
      });
    } else if (title.includes('Instalación')) {
      modules[0].lessons.push({
        title: 'Instalación de Docker en Ubuntu',
        description: 'Cómo instalar Docker y docker-compose',
        documentation: section.trim(),
        order: 2,
      });
    } else if (title.includes('Comandos Docker')) {
      modules[0].lessons.push({
        title: 'Comandos Docker',
        description: 'Referencia de comandos esenciales',
        documentation: section.trim(),
        order: 3,
      });
    }
    // Module 1: Containers in practice
    else if (title.includes('Pasos para crear')) {
      modules[1].lessons.push({
        title: 'Pasos para crear un contenedor',
        description: 'Workflow paso a paso para crear y lanzar contenedores',
        documentation: section.trim(),
        order: 0,
      });
    } else if (title.includes('Creando un contenedor nginx')) {
      modules[1].lessons.push({
        title: 'Ejemplo: Contenedor Nginx',
        description: 'Levantar Nginx con volúmenes y puertos',
        documentation: section.trim(),
        order: 1,
      });
    } else if (title.includes('Ejercicios')) {
      modules[1].lessons.push({
        title: 'Ejercicios prácticos',
        description: 'Ejercicios para practicar con contenedores',
        documentation: section.trim(),
        order: 2,
      });
    }
    // Module 2: Docker Compose
    else if (title.includes('Haciendo más cosas')) {
      modules[2].lessons.push({
        title: 'Node + Express + MongoDB',
        description: 'Crear un API con Express y conectar con MongoDB usando Docker',
        documentation: section.trim(),
        order: 0,
      });
    } else if (title.includes('Docker-compose') || title.includes('docker-compose')) {
      modules[2].lessons.push({
        title: 'Docker Compose',
        description: 'Orquestar múltiples contenedores con docker-compose.yml',
        documentation: section.trim(),
        order: 1,
      });
    }
    // Module 3: Nginx architecture
    else if (title.includes('Nginx para servir')) {
      modules[3].lessons.push({
        title: 'Nginx como reverse proxy',
        description: 'Configurar Nginx para servir estáticos y hacer proxy al API',
        documentation: section.trim(),
        order: 0,
      });
    } else if (title.includes('Resumen')) {
      modules[3].lessons.push({
        title: 'Resumen y referencia',
        description: 'Resumen de herramientas y conceptos clave',
        documentation: section.trim(),
        order: 1,
      });
    } else if (title.includes('Bonus')) {
      modules[3].lessons.push({
        title: 'Bonus: Trucos Docker',
        description: 'Comandos útiles y trucos avanzados',
        documentation: section.trim(),
        order: 2,
      });
    }
  }

  return modules;
}

// ─── Upload to Firestore ────────────────────────────────────

async function uploadCourse(courseName, modules) {
  console.log(`\nUploading course: ${courseName}`);
  console.log(`  ${modules.length} modules, ${modules.reduce((a, m) => a + m.lessons.length, 0)} lessons total`);

  if (DRY_RUN) {
    for (const mod of modules) {
      console.log(`  [DRY] Module "${mod.title}" (${mod.lessons.length} lessons)`);
      for (const lesson of mod.lessons) {
        console.log(`    [DRY] Lesson "${lesson.title}" (${lesson.documentation?.length || 0} chars)`);
      }
    }
    return;
  }

  for (const mod of modules) {
    console.log(`  Creating module: ${mod.title}`);

    const moduleRef = await db.collection('modules').add({
      title: mod.title,
      description: mod.description || '',
      order: mod.order,
      course: courseName,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`    → Module ID: ${moduleRef.id}`);

    for (const lesson of mod.lessons) {
      const lessonRef = await db
        .collection('modules')
        .doc(moduleRef.id)
        .collection('lessons')
        .add({
          title: lesson.title,
          description: lesson.description || '',
          order: lesson.order,
          videoUrl: lesson.videoUrl || '',
          documentation: lesson.documentation || '',
          createdAt: FieldValue.serverTimestamp(),
        });

      console.log(`    → Lesson: "${lesson.title}" (${lessonRef.id})`);
    }
  }

  console.log(`  ✓ ${courseName} uploaded successfully`);
}

// ─── Main ───────────────────────────────────────────────────

async function main() {
  try {
    console.log('\n═══ DOCKER COURSE ═══');
    const dockerModules = parseDockerCourse();
    await uploadCourse('docker', dockerModules);

    console.log('\n✓ Course uploaded successfully');
  } catch (err) {
    console.error('\nError:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
