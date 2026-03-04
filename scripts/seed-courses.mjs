/**
 * Seed script: uploads Docker and JavaScript courses to Firestore.
 *
 * Usage:
 *   node scripts/seed-courses.mjs
 *   node scripts/seed-courses.mjs --docker-only
 *   node scripts/seed-courses.mjs --js-only
 *   node scripts/seed-courses.mjs --dry-run
 *
 * Prerequisites:
 *   - serviceAccountKey.json in project root
 *   - npm install mammoth (for docx conversion)
 */

import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { readFileSync, readdirSync } from 'fs';
import { resolve, dirname, basename } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const keyPath = resolve(ROOT, 'serviceAccountKey.json');
const serviceAccount = JSON.parse(readFileSync(keyPath, 'utf-8'));

const args = process.argv.slice(2);
const DRY_RUN = args.includes('--dry-run');
const DOCKER_ONLY = args.includes('--docker-only');
const JS_ONLY = args.includes('--js-only');

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

// ─── JavaScript Course ──────────────────────────────────────

const JS_MODULE_MAP = [
  {
    title: 'Fundamentos de JavaScript',
    description: 'Conceptos básicos, variables, scope y tipos de datos',
    order: 0,
    prefixes: ['BASICO', 'BÁSICO'],
    extraFiles: [
      '✨♻️ JavaScript Visualized.docx',
      'OPINION TypeScript vs JavaScript.docx',
    ],
  },
  {
    title: 'Variables y Scope',
    description: 'Variables, closures, hoisting, TDZ y scope',
    order: 1,
    prefixes: ['VARIABLES'],
  },
  {
    title: 'Funciones',
    description: 'Funciones, callbacks, arrow functions y funciones de orden superior',
    order: 2,
    prefixes: ['FUNCIONES', 'CALLBACKS'],
  },
  {
    title: 'Objetos y Clases',
    description: 'Objetos, clases, herencia prototípica y polimorfismo',
    order: 3,
    prefixes: ['OBJETOS', 'CLASES'],
  },
  {
    title: 'Arrays y Strings',
    description: 'Métodos de arrays, strings y manipulación de datos',
    order: 4,
    prefixes: ['ARRAYS', 'STRINGS'],
  },
  {
    title: 'Bucles e Iteraciones',
    description: 'For...of, iteradores y procesamiento inmutable de datos',
    order: 5,
    prefixes: ['BUCLES', 'AVANAZADO'],
  },
  {
    title: 'JavaScript Avanzado',
    description: 'Proxies, Web Workers, SharedArrayBuffers y metaprogramación',
    order: 13,
    prefixes: ['AVANZADO'],
  },
  {
    title: 'Conceptos Avanzados',
    description: 'Currying, memoization, proxies, programación funcional',
    order: 6,
    prefixes: ['CONCEPTOS'],
  },
  {
    title: 'Asincronía y Promesas',
    description: 'Event loop, callbacks, promesas, async/await',
    order: 7,
    prefixes: ['PROMESAS', 'EVENT LOOP'],
  },
  {
    title: 'Fetch y HTTP',
    description: 'Fetch API, JSON, CORS y peticiones HTTP',
    order: 8,
    prefixes: ['FETCH'],
  },
  {
    title: 'Módulos e Imports',
    description: 'ECMAScript modules, import/export, Node.js modules',
    order: 9,
    prefixes: ['IMPORT', 'IMPORTS'],
  },
  {
    title: 'Patrones de Diseño',
    description: 'Patrones de diseño esenciales en JavaScript',
    order: 10,
    prefixes: ['PATRONES'],
  },
  {
    title: 'Testing',
    description: 'Conceptos de testing, TDD y herramientas',
    order: 11,
    prefixes: ['TESTS'],
  },
  {
    title: 'Extras y Herramientas',
    description: 'TypeScript, Big O, PRPL, HTML avanzado, Curl y más',
    order: 12,
    prefixes: ['EXTRA', 'TYPESCRIPT', 'ARQUITECTURA'],
    extraFiles: [
      'Opciones para eliminar oyentes de eventos.docx',
    ],
  },
];

async function convertDocxToMarkdown(filePath) {
  try {
    const mammoth = await import('mammoth');
    const result = await mammoth.default.convertToMarkdown({ path: filePath });
    let md = result.value;
    // Strip base64 embedded images (can be megabytes)
    md = md.replace(/!\[([^\]]*)\]\(data:image\/[^)]+\)/g, '*[imagen]*');
    // Remove excessive whitespace
    md = md.replace(/\n{4,}/g, '\n\n\n');
    return md;
  } catch (err) {
    console.error(`  Error converting ${basename(filePath)}: ${err.message}`);
    return null;
  }
}

function cleanTitle(filename) {
  // Remove .docx extension
  let name = filename.replace(/\.docx$/i, '');
  // Remove leading category prefixes like "BASICO ", "ARRAYS ", etc.
  name = name.replace(/^(BÁSICO|BASICO|ARRAYS|STRINGS|FUNCIONES|CALLBACKS|CLASES|OBJETOS|BUCLES|CONCEPTOS|PROMESAS|FETCH|IMPORT|IMPORTS|PATRONES|TESTS|EXTRA|TYPESCRIPT|ARQUITECTURA|AVANZADO|AVANAZADO|EVENT LOOP|OPINION|VARIABLES)[.:_ ]+/i, '');
  // Clean up dots and underscores at start
  name = name.replace(/^[._ ]+/, '').trim();
  // Remove trailing underscores
  name = name.replace(/_+$/, '').trim();
  return name || filename.replace(/\.docx$/i, '');
}

function getModuleForFile(filename) {
  const upper = filename.toUpperCase();

  for (const mod of JS_MODULE_MAP) {
    // Check extra files first
    if (mod.extraFiles && mod.extraFiles.some(f => filename === f)) {
      return mod;
    }
    // Check prefixes
    for (const prefix of mod.prefixes) {
      if (upper.startsWith(prefix)) {
        return mod;
      }
    }
  }

  // Default to Extras
  return JS_MODULE_MAP[JS_MODULE_MAP.length - 1];
}

async function parseJavaScriptCourse() {
  const themesDir = resolve(ROOT, 'docs/javascript/Temas de Javascript');
  const extraDir = resolve(ROOT, 'docs/javascript');

  const modules = JS_MODULE_MAP.map(m => ({
    ...m,
    lessons: [],
  }));

  // Process theme files
  const themeFiles = readdirSync(themesDir)
    .filter(f => f.endsWith('.docx') && !f.startsWith('__'))
    .sort();

  console.log(`  Found ${themeFiles.length} theme files to process`);

  for (const file of themeFiles) {
    const mod = getModuleForFile(file);
    const moduleData = modules.find(m => m.title === mod.title);
    const filePath = resolve(themesDir, file);

    console.log(`  Converting: ${file} → ${mod.title}`);
    const markdown = await convertDocxToMarkdown(filePath);
    if (!markdown) continue;

    moduleData.lessons.push({
      title: cleanTitle(file),
      description: '',
      documentation: markdown,
      order: moduleData.lessons.length,
    });
  }

  // Process extra root-level docx files
  const extraFiles = readdirSync(extraDir)
    .filter(f => f.endsWith('.docx'))
    .sort();

  console.log(`  Found ${extraFiles.length} extra files`);

  for (const file of extraFiles) {
    const mod = getModuleForFile(file);
    const moduleData = modules.find(m => m.title === mod.title);
    const filePath = resolve(extraDir, file);

    console.log(`  Converting extra: ${file} → ${mod.title}`);
    const markdown = await convertDocxToMarkdown(filePath);
    if (!markdown) continue;

    moduleData.lessons.push({
      title: cleanTitle(file),
      description: '',
      documentation: markdown,
      order: moduleData.lessons.length,
    });
  }

  // Filter out empty modules
  return modules.filter(m => m.lessons.length > 0);
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
    if (!JS_ONLY) {
      console.log('\n═══ DOCKER COURSE ═══');
      const dockerModules = parseDockerCourse();
      await uploadCourse('docker', dockerModules);
    }

    if (!DOCKER_ONLY) {
      console.log('\n═══ JAVASCRIPT COURSE ═══');
      const jsModules = await parseJavaScriptCourse();
      await uploadCourse('javascript', jsModules);
    }

    console.log('\n✓ All courses uploaded successfully');
  } catch (err) {
    console.error('\nError:', err.message);
    process.exit(1);
  }

  process.exit(0);
}

main();
