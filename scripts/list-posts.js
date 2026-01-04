#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

const postsDir = path.join(__dirname, '..', '_posts');

if (!fs.existsSync(postsDir)) {
  log('❌ Error: No se encontró el directorio _posts', 'red');
  process.exit(1);
}

log('\n📝 Posts disponibles para encriptar:\n', 'cyan');
log('Añade al archivo _data/encrypted_posts.yml con el formato:\n', 'yellow');
log('  - post: nombre-del-post', 'yellow');
log('    secret: PASSWORD_NOMBRE_SECRET\n', 'yellow');

const posts = fs.readdirSync(postsDir)
  .filter(file => file.endsWith('.md'))
  .sort()
  .reverse(); // Más recientes primero

posts.forEach((post, index) => {
  const postName = post.replace('.md', '');
  // Generar sugerencia de nombre de secret
  const secretName = 'PASSWORD_' + postName
    .replace(/^\d{4}-\d{2}-\d{2}-/, '') // Quitar fecha
    .replace(/-/g, '_') // Reemplazar guiones con guiones bajos
    .toUpperCase();
  
  log(`  ${index + 1}. Post: ${postName}`, 'green');
  log(`     Secret sugerido: ${secretName}\n`, 'cyan');
});

log(`✨ Total: ${posts.length} posts\n`, 'cyan');

