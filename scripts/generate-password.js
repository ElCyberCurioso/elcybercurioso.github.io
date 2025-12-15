#!/usr/bin/env node

const crypto = require('crypto');

// Colores para la consola
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  bold: '\x1b[1m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function generateStrongPassword(length = 32) {
  // Conjuntos de caracteres
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const numbers = '0123456789';
  const symbols = '!@#$%^&*()_+-=[]{}|;:,.<>?';
  
  const allChars = uppercase + lowercase + numbers + symbols;
  
  let password = '';
  
  // Asegurar que la contraseña tenga al menos un carácter de cada tipo
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += symbols[crypto.randomInt(symbols.length)];
  
  // Rellenar el resto con caracteres aleatorios
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }
  
  // Mezclar la contraseña
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

function calculateStrength(password) {
  let strength = 0;
  
  if (password.length >= 20) strength += 25;
  else if (password.length >= 16) strength += 15;
  else if (password.length >= 12) strength += 10;
  
  if (/[a-z]/.test(password)) strength += 20;
  if (/[A-Z]/.test(password)) strength += 20;
  if (/[0-9]/.test(password)) strength += 20;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
  
  return strength;
}

console.log('');
log('🔐 Generador de Contraseñas Fuertes', 'bold');
log('═══════════════════════════════════════════════════════════════', 'cyan');
console.log('');

// Generar 3 opciones
for (let i = 1; i <= 3; i++) {
  const password = generateStrongPassword(32);
  const strength = calculateStrength(password);
  
  log(`Opción ${i}:`, 'cyan');
  log(`  ${password}`, 'green');
  
  let strengthColor = 'red';
  let strengthText = 'Débil';
  if (strength >= 90) {
    strengthColor = 'green';
    strengthText = 'Muy Fuerte 💪';
  } else if (strength >= 70) {
    strengthColor = 'yellow';
    strengthText = 'Fuerte';
  }
  
  log(`  Nivel: ${strengthText} (${strength}/100)`, strengthColor);
  console.log('');
}

log('═══════════════════════════════════════════════════════════════', 'cyan');
log('💡 Recomendaciones:', 'yellow');
console.log('  • Copia una de estas contraseñas y guárdala en un lugar seguro');
console.log('  • Úsala para el secret ENCRYPTION_PASSWORD en GitHub');
console.log('  • NO la compartas públicamente');
console.log('  • Considera usar un gestor de contraseñas (1Password, Bitwarden, etc.)');
console.log('');


