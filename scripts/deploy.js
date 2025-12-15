#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function exec(command, options = {}) {
  try {
    const result = execSync(command, { 
      stdio: options.silent ? 'pipe' : 'inherit',
      ...options 
    });
    return result ? result.toString().trim() : '';
  } catch (error) {
    if (!options.allowError) {
      throw error;
    }
    return null;
  }
}

log('\n🚀 Iniciando proceso de deploy...', 'cyan');
log('═══════════════════════════════════════════════════════════════\n', 'cyan');

// Verificar que estamos en la rama correcta
const currentBranch = exec('git branch --show-current', { silent: true });
log(`📍 Rama actual: ${currentBranch}`, 'cyan');

// Verificar que no hay cambios sin commitear
const status = exec('git status --porcelain', { silent: true });
if (status && status.length > 0) {
  log('\n⚠️  Tienes cambios sin commitear:', 'yellow');
  log(status, 'yellow');
  log('\n❌ Haz commit de tus cambios antes de hacer deploy', 'red');
  process.exit(1);
}

// 1. Compilar el sitio con Jekyll
log('\n1️⃣  Compilando sitio con Jekyll...', 'cyan');
try {
  exec('bundle exec jekyll build');
  log('✅ Sitio compilado exitosamente\n', 'green');
} catch (error) {
  log('❌ Error al compilar el sitio', 'red');
  process.exit(1);
}

// 2. Encriptar posts
log('2️⃣  Encriptando posts protegidos...', 'cyan');
try {
  exec('npm run encrypt-posts');
  log('✅ Posts encriptados exitosamente\n', 'green');
} catch (error) {
  log('⚠️  Advertencia: Error al encriptar posts', 'yellow');
  log('   Continúa de todas formas...\n', 'yellow');
}

// 3. Preparar deploy
log('3️⃣  Preparando deploy a gh-pages...', 'cyan');

const siteDir = path.join(__dirname, '..', '_site');
if (!fs.existsSync(siteDir)) {
  log('❌ Error: No se encontró el directorio _site', 'red');
  process.exit(1);
}

// 4. Hacer deploy a gh-pages
log('4️⃣  Haciendo deploy a GitHub Pages...', 'cyan');

try {
  // Guardar el directorio actual
  const originalDir = process.cwd();
  
  // Ir al directorio _site
  process.chdir(siteDir);
  
  // Inicializar git si no existe
  if (!fs.existsSync('.git')) {
    exec('git init');
    exec('git checkout -b gh-pages');
  } else {
    // Si ya existe, asegurarse de estar en gh-pages
    const branch = exec('git branch --show-current', { silent: true, allowError: true });
    if (branch !== 'gh-pages') {
      exec('git checkout gh-pages', { allowError: true });
      if (!exec('git branch --show-current', { silent: true }) === 'gh-pages') {
        exec('git checkout -b gh-pages');
      }
    }
  }
  
  // Añadir archivos
  exec('git add -A');
  
  // Verificar si hay cambios
  const hasChanges = exec('git status --porcelain', { silent: true });
  
  if (!hasChanges || hasChanges.length === 0) {
    log('ℹ️  No hay cambios para desplegar', 'cyan');
    process.chdir(originalDir);
    log('\n✨ Proceso completado (sin cambios)\n', 'cyan');
    process.exit(0);
  }
  
  // Commit
  const timestamp = new Date().toISOString();
  exec(`git commit -m "Deploy: ${timestamp}"`);
  
  // Obtener el remote origin
  let remoteUrl = exec('git remote get-url origin', { silent: true, allowError: true });
  
  if (!remoteUrl) {
    // Si no existe remote, usar el del repositorio principal
    process.chdir(originalDir);
    remoteUrl = exec('git remote get-url origin', { silent: true });
    process.chdir(siteDir);
    exec(`git remote add origin ${remoteUrl}`);
  }
  
  log('\n📤 Haciendo push a gh-pages...', 'cyan');
  exec('git push origin gh-pages --force');
  
  // Volver al directorio original
  process.chdir(originalDir);
  
  log('\n✅ Deploy completado exitosamente!', 'green');
  
} catch (error) {
  log('\n❌ Error durante el deploy:', 'red');
  log(error.message, 'red');
  process.exit(1);
}

// Resumen
log('\n═══════════════════════════════════════════════════════════════', 'cyan');
log('✨ Deploy completado', 'bold');
log('═══════════════════════════════════════════════════════════════\n', 'cyan');

log('📝 Próximos pasos:', 'cyan');
log('   1. Ve a GitHub → Settings → Pages', 'cyan');
log('   2. Source: Deploy from a branch', 'cyan');
log('   3. Branch: gh-pages / (root)', 'cyan');
log('   4. Espera unos minutos y visita tu sitio\n', 'cyan');

