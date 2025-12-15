#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const glob = require('glob');
const CryptoJS = require('crypto-js');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

// Función para encriptar con AES (usando CryptoJS para compatibilidad)
function encryptContent(content, password) {
  // Encriptar usando CryptoJS (mismo método que se usa en el navegador)
  const encrypted = CryptoJS.AES.encrypt(content, password);
  return encrypted.toString();
}

// Leer el include de encrypted-content
const encryptedContentHTML = fs.readFileSync(
  path.join(__dirname, '..', '_includes', 'encrypted-content.html'),
  'utf8'
);

// Leer la configuración
const configPath = path.join(__dirname, '..', '_data', 'encrypted_posts.yml');

if (!fs.existsSync(configPath)) {
  log('❌ Error: No se encontró el archivo _data/encrypted_posts.yml', 'red');
  process.exit(1);
}

let config;
try {
  config = yaml.load(fs.readFileSync(configPath, 'utf8'));
} catch (e) {
  log(`❌ Error al leer el archivo de configuración: ${e.message}`, 'red');
  process.exit(1);
}

if (!config || !config.encrypted_posts || config.encrypted_posts.length === 0) {
  log('ℹ️  No hay posts configurados para encriptar.', 'cyan');
  process.exit(0);
}

log('\n🔐 Iniciando proceso de encriptación de posts (v2)...', 'cyan');
log(`📝 Posts a encriptar: ${config.encrypted_posts.length}`, 'cyan');

const siteDir = path.join(__dirname, '..', '_site');

if (!fs.existsSync(siteDir)) {
  log('❌ Error: El directorio _site no existe. Asegúrate de compilar el sitio primero.', 'red');
  process.exit(1);
}

let encryptedCount = 0;
let errorCount = 0;

// Procesar cada post
config.encrypted_posts.forEach((postConfig) => {
  const postName = postConfig.post;
  const secretName = postConfig.secret;

  if (!postName || !secretName) {
    log(`⚠️  Configuración inválida para un post (falta 'post' o 'secret')`, 'yellow');
    errorCount++;
    return;
  }

  const password = process.env[secretName];

  if (!password) {
    log(`⚠️  No se encontró la variable de entorno ${secretName} para el post ${postName}`, 'yellow');
    errorCount++;
    return;
  }

  // Buscar el archivo HTML
  let postPath = path.join(siteDir, 'posts', `${postName}`, 'index.html');
  
  if (!fs.existsSync(postPath)) {
    const nameWithoutDate = postName.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    postPath = path.join(siteDir, 'posts', nameWithoutDate, 'index.html');
  }
  
  if (!fs.existsSync(postPath)) {
    const searchPattern = path.join(siteDir, 'posts', '**', 'index.html');
    const files = glob.sync(searchPattern);
    const nameWithoutDate = postName.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    
    for (const file of files) {
      const dirName = path.basename(path.dirname(file));
      if (dirName === postName || dirName === nameWithoutDate) {
        postPath = file;
        break;
      }
    }
  }

  if (!fs.existsSync(postPath)) {
    log(`⚠️  No se encontró el post: ${postName}`, 'yellow');
    errorCount++;
    return;
  }

  try {
    log(`\n🔒 Encriptando: ${postName}`, 'cyan');
    log(`   Secret: ${secretName}`, 'cyan');
    
    // Crear backup
    const backupPath = `${postPath}.backup`;
    fs.copyFileSync(postPath, backupPath);
    
    // Leer el HTML
    let html = fs.readFileSync(postPath, 'utf8');
    
    // Buscar el contenido del article (el post ya procesado como HTML por Jekyll)
    const articleRegex = /<article([^>]*)>([\s\S]*?)<\/article>/;
    const articleMatch = html.match(articleRegex);
    
    if (!articleMatch) {
      log(`⚠️  No se pudo encontrar el elemento <article> en: ${postName}`, 'yellow');
      errorCount++;
      return;
    }
    
    const articleAttrs = articleMatch[1];
    const originalContent = articleMatch[2];
    
    // Encriptar el contenido HTML ya procesado por Jekyll
    const encryptedContent = encryptContent(originalContent, password);
    
    // Crear el HTML del modal con el contenido encriptado
    const modalHTML = encryptedContentHTML.replace(
      '{{ include.encrypted_content }}',
      encryptedContent
    );
    
    // Reemplazar el contenido del <article> con el modal
    const newHTML = html.replace(articleRegex, `<article${articleAttrs}>${modalHTML}</article>`);
    
    // Guardar el archivo
    fs.writeFileSync(postPath, newHTML, 'utf8');
    
    // Eliminar backup
    fs.unlinkSync(backupPath);
    
    log(`✅ Post encriptado exitosamente: ${postName}`, 'green');
    encryptedCount++;
  } catch (error) {
    log(`❌ Error al encriptar ${postName}: ${error.message}`, 'red');
    console.error(error);
    errorCount++;
    
    // Restaurar backup si existe
    const backupPath = `${postPath}.backup`;
    if (fs.existsSync(backupPath)) {
      fs.copyFileSync(backupPath, postPath);
      fs.unlinkSync(backupPath);
    }
  }
});

// Resumen
log('\n' + '='.repeat(50), 'cyan');
log(`✨ Proceso completado`, 'cyan');
log(`✅ Posts encriptados: ${encryptedCount}`, 'green');
if (errorCount > 0) {
  log(`⚠️  Errores: ${errorCount}`, 'yellow');
}
log('='.repeat(50) + '\n', 'cyan');

if (errorCount > 0 && encryptedCount === 0) {
  process.exit(1);
}
