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
  log('ℹ️  No hay posts configurados.', 'cyan');
  process.exit(0);
}

log('\n🔓 Desencriptando archivos markdown...', 'cyan');
log(`📝 Posts a desencriptar: ${config.encrypted_posts.length}`, 'cyan');

const postsDir = path.join(__dirname, '..', '_posts');

if (!fs.existsSync(postsDir)) {
  log('❌ Error: El directorio _posts no existe.', 'red');
  process.exit(1);
}

let decryptedCount = 0;
let errorCount = 0;
let notEncryptedCount = 0;

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
    log(`   Define: export ${secretName}="tu-contraseña"`, 'yellow');
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
    log(`\n🔓 Procesando: ${postName}`, 'cyan');
    
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
    const encryptedContent = frontMatterMatch[2];

    // Parsear el front matter
    let frontMatter;
    try {
      frontMatter = yaml.load(frontMatterText);
    } catch (e) {
      log(`⚠️  Error al parsear front matter: ${e.message}`, 'yellow');
      errorCount++;
      return;
    }

    // Verificar si está encriptado
    if (frontMatter.encrypted !== true) {
      log(`   ℹ️  No está encriptado, omitiendo...`, 'cyan');
      notEncryptedCount++;
      return;
    }

    // Extraer el contenido encriptado (entre los comentarios)
    const encryptedMatch = encryptedContent.match(/<!-- ENCRYPTED CONTENT.*?-->\r?\n([\s\S]*?)\r?\n<!-- END ENCRYPTED CONTENT -->/);
    
    if (!encryptedMatch) {
      log(`⚠️  No se pudo encontrar el contenido encriptado en: ${postName}`, 'yellow');
      errorCount++;
      return;
    }

    const encryptedData = encryptedMatch[1].trim();

    // Crear backup
    const backupPath = `${postPath}.backup`;
    fs.copyFileSync(postPath, backupPath);

    // Desencriptar el contenido
    let decryptedContent;
    try {
      const decrypted = CryptoJS.AES.decrypt(encryptedData, password);
      decryptedContent = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedContent || decryptedContent.length === 0) {
        throw new Error('La contraseña es incorrecta o el contenido está corrupto');
      }
    } catch (e) {
      log(`   ❌ Error al desencriptar (contraseña incorrecta?)`, 'red');
      errorCount++;
      fs.unlinkSync(backupPath);
      return;
    }

    // Actualizar front matter
    delete frontMatter.encrypted;

    // Generar el nuevo archivo markdown
    const newFrontMatter = yaml.dump(frontMatter, { lineWidth: -1 });
    const newContent = `---\n${newFrontMatter}---\n\n${decryptedContent}`;

    // Guardar el archivo
    fs.writeFileSync(postPath, newContent, 'utf8');

    // Eliminar backup
    fs.unlinkSync(backupPath);

    log(`   ✅ Desencriptado exitosamente`, 'green');
    decryptedCount++;
  } catch (error) {
    log(`❌ Error al desencriptar ${postName}: ${error.message}`, 'red');
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
log(`✅ Posts desencriptados: ${decryptedCount}`, 'green');
if (notEncryptedCount > 0) {
  log(`ℹ️  No encriptados: ${notEncryptedCount}`, 'cyan');
}
if (errorCount > 0) {
  log(`⚠️  Errores: ${errorCount}`, 'yellow');
}
log('='.repeat(50) + '\n', 'cyan');

if (errorCount > 0 && decryptedCount === 0) {
  process.exit(1);
}

