#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
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

log('\n🔐 Encriptando archivos markdown...', 'cyan');
log(`📝 Posts a encriptar: ${config.encrypted_posts.length}`, 'cyan');

const postsDir = path.join(__dirname, '..', '_posts');

if (!fs.existsSync(postsDir)) {
  log('❌ Error: El directorio _posts no existe.', 'red');
  process.exit(1);
}

let encryptedCount = 0;
let errorCount = 0;
let alreadyEncryptedCount = 0;

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
    log(`   Define: $env:${secretName}="tu-contraseña"`, 'yellow');
    errorCount++;
    return;
  }

  // Buscar el archivo markdown
  const postPath = path.join(postsDir, `${postName}.md`);

  if (!fs.existsSync(postPath)) {
    log(`⚠️  No se encontró el archivo: ${postName}.md`, 'yellow');
    errorCount++;
    return;
  }

  try {
    log(`\n🔒 Procesando: ${postName}`, 'cyan');
    
    // Leer el archivo markdown
    const content = fs.readFileSync(postPath, 'utf8');
    
    // Separar front matter del contenido (soporta \n y \r\n)
    const frontMatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/);
    
    if (!frontMatterMatch) {
      log(`⚠️  No se pudo extraer el front matter de: ${postName}`, 'yellow');
      errorCount++;
      return;
    }

    const frontMatterText = frontMatterMatch[1];
    const postContent = frontMatterMatch[2];

    // Parsear el front matter
    let frontMatter;
    try {
      frontMatter = yaml.load(frontMatterText);
    } catch (e) {
      log(`⚠️  Error al parsear front matter: ${e.message}`, 'yellow');
      errorCount++;
      return;
    }

    // Verificar si ya está encriptado
    if (frontMatter.encrypted === true) {
      log(`   ℹ️  Ya está encriptado, omitiendo...`, 'cyan');
      alreadyEncryptedCount++;
      return;
    }

    // Crear backup
    const backupPath = `${postPath}.backup`;
    fs.copyFileSync(postPath, backupPath);

    // Encriptar el contenido
    const encryptedContent = CryptoJS.AES.encrypt(postContent.trim(), password).toString();

    // Actualizar front matter
    frontMatter.encrypted = true;

    // Generar el nuevo archivo markdown
    const newFrontMatter = yaml.dump(frontMatter, { lineWidth: -1 });
    const newContent = `---\n${newFrontMatter}---\n\n<!-- ENCRYPTED CONTENT - DO NOT EDIT MANUALLY -->\n${encryptedContent}\n<!-- END ENCRYPTED CONTENT -->`;

    // Guardar el archivo
    fs.writeFileSync(postPath, newContent, 'utf8');

    // Eliminar backup
    fs.unlinkSync(backupPath);

    log(`   ✅ Encriptado exitosamente`, 'green');
    encryptedCount++;
  } catch (error) {
    log(`❌ Error al encriptar ${postName}: ${error.message}`, 'red');
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
if (alreadyEncryptedCount > 0) {
  log(`ℹ️  Ya encriptados: ${alreadyEncryptedCount}`, 'cyan');
}
if (errorCount > 0) {
  log(`⚠️  Errores: ${errorCount}`, 'yellow');
}
log('='.repeat(50) + '\n', 'cyan');

if (encryptedCount > 0 || alreadyEncryptedCount > 0) {
  log('💡 Siguiente paso:', 'cyan');
  log('   git add _posts/', 'cyan');
  log('   git commit -m "Añadir/actualizar posts encriptados"', 'cyan');
  log('   git push', 'cyan');
  log('   → GitHub Actions se encargará del resto\n', 'cyan');
}

if (errorCount > 0 && encryptedCount === 0) {
  process.exit(1);
}

