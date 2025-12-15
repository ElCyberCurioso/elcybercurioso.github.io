#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const glob = require('glob');

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

// Función para mejorar el HTML generado con estilos del modal
function enhanceEncryptedHTML(filePath) {
  let html = fs.readFileSync(filePath, 'utf8');
  
  // CSS personalizado para integrar con el tema Chirpy
  const customCSS = `
    <style>
      /* Integración con tema Chirpy */
      :root {
        --modal-bg: #ffffff;
        --modal-text: #333333;
        --modal-border: #e0e0e0;
        --backdrop-color: rgba(0, 0, 0, 0.7);
      }
      
      @media (prefers-color-scheme: dark) {
        :root {
          --modal-bg: #1e1e1e;
          --modal-text: #e0e0e0;
          --modal-border: #404040;
          --backdrop-color: rgba(0, 0, 0, 0.85);
        }
      }
      
      [data-mode="dark"] {
        --modal-bg: #1e1e1e;
        --modal-text: #e0e0e0;
        --modal-border: #404040;
        --backdrop-color: rgba(0, 0, 0, 0.85);
      }
      
      [data-mode="light"] {
        --modal-bg: #ffffff;
        --modal-text: #333333;
        --modal-border: #e0e0e0;
        --backdrop-color: rgba(0, 0, 0, 0.7);
      }
      
      /* Contenedor del body con blur */
      body {
        position: relative;
        margin: 0;
        padding: 0;
      }
      
      /* Contenido protegido difuminado */
      #staticrypt {
        backdrop-filter: blur(8px);
        -webkit-backdrop-filter: blur(8px);
      }
      
      /* Overlay con backdrop */
      #staticrypt::before {
        content: '';
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: var(--backdrop-color);
        backdrop-filter: blur(4px);
        -webkit-backdrop-filter: blur(4px);
        z-index: 9998;
      }
      
      /* Centrar el formulario como modal */
      #staticrypt {
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 9999;
        animation: fadeIn 0.3s ease;
      }
      
      @keyframes fadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      
      /* Formulario como modal */
      #staticrypt_form {
        position: relative;
        background: var(--modal-bg) !important;
        color: var(--modal-text) !important;
        border: 1px solid var(--modal-border);
        border-radius: 12px;
        padding: 2.5rem;
        max-width: 450px;
        width: 90%;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.3);
        animation: slideIn 0.4s ease;
        z-index: 10000;
      }
      
      @keyframes slideIn {
        from {
          opacity: 0;
          transform: translateY(-30px);
        }
        to {
          opacity: 1;
          transform: translateY(0);
        }
      }
      
      /* Estilos del formulario */
      #staticrypt_form h1 {
        color: var(--modal-text) !important;
        font-size: 1.75rem;
        font-weight: 600;
        text-align: center;
        margin-bottom: 0.5rem;
      }
      
      #staticrypt_form p {
        color: var(--modal-text) !important;
        opacity: 0.7;
        font-size: 0.95rem;
        text-align: center;
        margin-bottom: 1.5rem;
      }
      
      #staticrypt_form input[type="password"] {
        width: 100%;
        padding: 0.875rem 1rem;
        font-size: 1rem;
        color: var(--modal-text) !important;
        background: var(--modal-bg) !important;
        border: 2px solid var(--modal-border) !important;
        border-radius: 8px;
        transition: all 0.3s ease;
        margin-bottom: 1rem;
      }
      
      #staticrypt_form input[type="password"]:focus {
        border-color: #4CAF50 !important;
        box-shadow: 0 0 0 3px rgba(76, 175, 80, 0.1);
        outline: none;
      }
      
      #staticrypt_form button {
        width: 100%;
        padding: 0.875rem 1.5rem;
        font-size: 1rem;
        font-weight: 600;
        color: white !important;
        background: #4CAF50 !important;
        border: none !important;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        text-transform: uppercase;
        letter-spacing: 0.5px;
      }
      
      #staticrypt_form button:hover {
        background: #45a049 !important;
        transform: translateY(-1px);
        box-shadow: 0 4px 12px rgba(76, 175, 80, 0.3);
      }
      
      #staticrypt_form button:active {
        transform: translateY(0);
      }
      
      /* Error message */
      .staticrypt-error {
        padding: 0.875rem 1rem;
        background: #ffebee;
        border: 1px solid #ef5350;
        border-radius: 8px;
        color: #c62828;
        font-size: 0.9rem;
        text-align: center;
        margin-bottom: 1rem;
        animation: shake 0.4s ease;
      }
      
      [data-mode="dark"] .staticrypt-error {
        background: #4a1616;
        color: #ff8a80;
      }
      
      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        25% { transform: translateX(-10px); }
        75% { transform: translateX(10px); }
      }
      
      /* Icono del candado */
      #staticrypt_form::before {
        content: '🔒';
        font-size: 3rem;
        display: block;
        text-align: center;
        margin-bottom: 1rem;
      }
    </style>
  `;
  
  // Inyectar el CSS antes del </head>
  html = html.replace('</head>', customCSS + '</head>');
  
  // Guardar el archivo modificado
  fs.writeFileSync(filePath, html, 'utf8');
}

// Leer la configuración de posts encriptados
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

log('\n🔐 Iniciando proceso de encriptación de posts...', 'cyan');
log(`📝 Posts a encriptar: ${config.encrypted_posts.length}`, 'cyan');

// Directorio del sitio generado
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

  // Obtener la contraseña del entorno
  const password = process.env[secretName];

  if (!password) {
    log(`⚠️  No se encontró la variable de entorno ${secretName} para el post ${postName}`, 'yellow');
    log(`   Define: export ${secretName}="tu-contraseña"`, 'yellow');
    errorCount++;
    return;
  }

  // Jekyll genera los posts sin la fecha en el nombre del directorio
  // Por ejemplo: 2025-10-19-welcome.md -> _site/posts/welcome/index.html
  
  // Primero intentar con el nombre completo
  let postPath = path.join(siteDir, 'posts', `${postName}`, 'index.html');
  
  // Si no existe, quitar la fecha del inicio (patrón YYYY-MM-DD-)
  if (!fs.existsSync(postPath)) {
    const nameWithoutDate = postName.replace(/^\d{4}-\d{2}-\d{2}-/, '');
    postPath = path.join(siteDir, 'posts', nameWithoutDate, 'index.html');
  }
  
  // Si aún no existe, buscar en todo el directorio
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
    log(`   Buscado en: ${postPath}`, 'yellow');
    errorCount++;
    return;
  }

  try {
    log(`\n🔒 Encriptando: ${postName}`, 'cyan');
    log(`   Secret: ${secretName}`, 'cyan');
    
    // Crear una copia de respaldo
    const backupPath = `${postPath}.backup`;
    fs.copyFileSync(postPath, backupPath);

    // Crear un directorio temporal para la salida de staticrypt
    const tempDir = path.join(path.dirname(postPath), 'temp_encrypted');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Encriptar el archivo usando staticrypt
    let command = `npx staticrypt "${postPath}" -p "${password}" -c false -d "${tempDir}" --short --remember 0`;
    
    // Opciones de personalización
    command += ` --crypto-iterations 100000`;
    command += ` --template-title "🔒 Contenido Protegido"`;
    command += ` --template-instructions "Este post está encriptado. Ingresa la contraseña para acceder."`;
    command += ` --template-button "DESBLOQUEAR"`;
    command += ` --template-error "❌ Contraseña incorrecta"`;
    command += ` --template-placeholder "Contraseña"`;
    command += ` --template-color-primary "#4CAF50"`;
    command += ` --template-color-secondary "#2a2a2a"`;

    execSync(command, { stdio: 'pipe' });

    // Mover el archivo encriptado al lugar original
    const encryptedFile = path.join(tempDir, path.basename(postPath));
    if (fs.existsSync(encryptedFile)) {
      fs.copyFileSync(encryptedFile, postPath);
      fs.unlinkSync(encryptedFile);
      
      // Mejorar el HTML con estilos personalizados
      enhanceEncryptedHTML(postPath);
    } else {
      throw new Error('El archivo encriptado no se generó correctamente');
    }

    // Limpiar directorio temporal
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }

    // Eliminar el backup si todo salió bien
    fs.unlinkSync(backupPath);
    
    log(`✅ Post encriptado exitosamente: ${postName}`, 'green');
    encryptedCount++;
  } catch (error) {
    log(`❌ Error al encriptar ${postName}: ${error.message}`, 'red');
    errorCount++;
    
    // Restaurar desde el backup si existe
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
