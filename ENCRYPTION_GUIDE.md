# 🔐 Guía de Encriptación de Posts - Sistema Avanzado

Este proyecto incluye un sistema profesional de encriptación de posts con **contraseñas individuales** y **modal personalizado** que se integra perfectamente con el tema Chirpy.

## 📋 Índice

- [Características](#características)
- [¿Cómo funciona?](#cómo-funciona)
- [Configuración inicial](#configuración-inicial)
- [Uso](#uso)
- [Pruebas locales](#pruebas-locales)
- [Solución de problemas](#solución-de-problemas)

---

## ✨ Características

### 🎨 Modal Personalizado
- **Modal overlay**: El formulario de contraseña aparece como modal sobre el contenido difuminado
- **Diseño adaptable**: Se integra con los modos claro/oscuro del tema Chirpy
- **UX mejorada**: Animaciones suaves, feedback inmediato, toggle para mostrar contraseña
- **Responsive**: Funciona perfectamente en móviles y escritorio

### 🔒 Contraseñas Individuales
- **Cada post su propia contraseña**: Mayor seguridad y flexibilidad
- **Secrets de GitHub separados**: Un secret por cada post encriptado
- **Gestión independiente**: Puedes compartir diferentes contraseñas con diferentes personas

### 🚀 Optimizado
- **Rápido**: 100,000 iteraciones PBKDF2 (balance seguridad/velocidad)
- **Automático**: Se integra con GitHub Actions
- **Selectivo**: Encripta solo los posts que especifiques

---

## 🔍 ¿Cómo funciona?

1. **Compilación**: Jekyll genera el sitio estático normalmente
2. **Encriptación individual**: El script lee la configuración y encripta cada post con su propia contraseña
3. **Modal personalizado**: Se genera un HTML con modal integrado al tema Chirpy
4. **Despliegue**: El sitio se publica con los posts encriptados

### Experiencia del usuario:

1. Usuario visita un post encriptado
2. Ve el contenido difuminado con un **modal overlay** solicitando contraseña
3. Ingresa la contraseña del post específico
4. El modal se desvanece y se muestra el contenido desencriptado

---

## ⚙️ Configuración inicial

### 1. Generar Contraseñas Fuertes

Para cada post que quieras encriptar, genera una contraseña única y fuerte:

```bash
npm run generate-password
```

Guarda cada contraseña de forma segura (gestor de contraseñas recomendado).

### 2. Configurar Secrets en GitHub

Para **CADA post** encriptado, debes crear un secret en GitHub:

1. Ve a tu repositorio en GitHub
2. Navega a: **Settings** → **Secrets and variables** → **Actions**
3. Haz clic en **New repository secret**
4. **Nombre del secret**: Usa el formato `PASSWORD_NOMBRE` (ej: `PASSWORD_WELCOME`)
5. **Valor**: La contraseña fuerte que generaste para ese post
6. Haz clic en **Add secret**
7. **Repite** para cada post que vayas a encriptar

#### Ejemplo de Secrets:

| Nombre del Secret | Para el Post |
|-------------------|--------------|
| `PASSWORD_WELCOME` | 2025-10-19-welcome |
| `PASSWORD_VENENO` | 2025-11-25-dockerlabs-veneno |
| `PASSWORD_PRIVADO` | 2025-12-01-post-privado |

### 3. Actualizar el Workflow

Edita `.github/workflows/pages-deploy.yml` y añade todos tus secrets:

```yaml
- name: Encrypt protected posts
  run: npm run encrypt-posts
  env:
    PASSWORD_WELCOME: ${{ secrets.PASSWORD_WELCOME }}
    PASSWORD_VENENO: ${{ secrets.PASSWORD_VENENO }}
    PASSWORD_PRIVADO: ${{ secrets.PASSWORD_PRIVADO }}
    # Añade aquí cada secret que hayas creado
```

> ⚠️ **Importante**: Cada vez que encriptes un post nuevo, debes:
> 1. Crear el secret en GitHub
> 2. Añadirlo al workflow

### 4. Instalar dependencias localmente (opcional)

Si quieres probar la encriptación localmente:

```bash
npm install
```

---

## 📝 Uso

### Listar posts disponibles

Para ver todos los posts y sugerencias de nombres de secrets:

```bash
npm run list-posts
```

Salida ejemplo:
```
📝 Posts disponibles para encriptar:

  1. Post: 2025-10-19-welcome
     Secret sugerido: PASSWORD_WELCOME

  2. Post: 2025-11-25-dockerlabs-veneno
     Secret sugerido: PASSWORD_VENENO
```

### Encriptar un post

1. Genera una contraseña fuerte para ese post:
```bash
npm run generate-password
```

2. Crea el secret en GitHub (ej: `PASSWORD_VENENO`)

3. Edita `_data/encrypted_posts.yml`:

```yaml
encrypted_posts:
  - post: 2025-10-19-welcome
    secret: PASSWORD_WELCOME
  
  - post: 2025-11-25-dockerlabs-veneno
    secret: PASSWORD_VENENO
```

4. Actualiza el workflow `.github/workflows/pages-deploy.yml`:

```yaml
env:
  PASSWORD_WELCOME: ${{ secrets.PASSWORD_WELCOME }}
  PASSWORD_VENENO: ${{ secrets.PASSWORD_VENENO }}
```

5. Haz commit y push:

```bash
git add .
git commit -m "Añadir post encriptado: veneno"
git push
```

GitHub Actions se encargará del resto automáticamente.

### Desencriptar un post (hacerlo público)

1. Elimina su entrada de `_data/encrypted_posts.yml`
2. Haz commit y push
3. En el próximo despliegue, el post será público

> 💡 **Nota**: No es necesario eliminar el secret de GitHub si planeas encriptar el post nuevamente en el futuro.

---

## 🧪 Pruebas locales

Para probar la encriptación localmente antes de hacer push:

### 1. Compilar el sitio Jekyll

```bash
bundle exec jekyll build
```

### 2. Configurar variables de entorno

```powershell
# Windows PowerShell
$env:PASSWORD_WELCOME="tu-contraseña-de-prueba-1"
$env:PASSWORD_VENENO="tu-contraseña-de-prueba-2"

# Windows CMD
set PASSWORD_WELCOME=tu-contraseña-de-prueba-1
set PASSWORD_VENENO=tu-contraseña-de-prueba-2

# Linux/Mac
export PASSWORD_WELCOME="tu-contraseña-de-prueba-1"
export PASSWORD_VENENO="tu-contraseña-de-prueba-2"
```

### 3. Ejecutar el script de encriptación

```bash
npm run encrypt-posts
```

### 4. Probar el sitio localmente

```bash
bundle exec jekyll serve --skip-initial-build
```

Visita `http://localhost:4000` y navega a un post encriptado. Deberás ver:

- ✅ Contenido difuminado en el fondo
- ✅ Modal centrado con formulario de contraseña
- ✅ Diseño adaptado al tema claro/oscuro
- ✅ Animaciones suaves al abrir y cerrar

---

## 🔧 Solución de problemas

### El post no se encripta

**Posibles causas:**

1. **Nombre incorrecto**: Verifica que el nombre en `encrypted_posts.yml` coincida exactamente con el archivo (sin `.md`)
2. **Secret no configurado**: Asegúrate de que el secret esté en GitHub
3. **Secret no pasado en el workflow**: Verifica que el secret esté en la sección `env:` del workflow
4. **Error en el formato YAML**: Verifica la indentación en `encrypted_posts.yml`

### La contraseña no funciona

- Verifica que estés usando la contraseña correcta para ese post específico
- Las contraseñas son case-sensitive (distinguen mayúsculas/minúsculas)
- Asegúrate de que el secret en GitHub tenga el valor correcto

### El modal no aparece / se ve mal

- Limpia la caché del navegador (Ctrl+Shift+R)
- Verifica que el template personalizado se esté usando (debe estar en `templates/password_template.html`)
- Recompila el sitio completamente

### Error: "No se encontró la variable de entorno"

Localmente, asegúrate de definir las variables de entorno antes de ejecutar el script.

En GitHub Actions, verifica que:
1. El secret esté creado en GitHub
2. El secret esté en la sección `env:` del workflow

---

## 📦 Archivos del sistema

- **`_data/encrypted_posts.yml`**: Configuración de posts y sus secrets
- **`_includes/encrypted-content.html`**: Template personalizado del modal de encriptación
- **`scripts/encrypt-posts-v2.js`**: Script de encriptación de HTML
- **`scripts/encrypt-markdown.js`**: Script de encriptación de markdown (local)
- **`scripts/decrypt-markdown.js`**: Script de desencriptación de markdown (local)
- **`scripts/list-posts.js`**: Utilidad para listar posts
- **`scripts/generate-password.js`**: Generador de contraseñas
- **`package.json`**: Dependencias y comandos
- **`.github/workflows/pages-deploy.yml`**: Workflow de GitHub Actions

---

## 🔒 Seguridad

### Encriptación Real

- **AES-256-GCM**: Encriptación de nivel militar
- **100,000 iteraciones PBKDF2**: Balance entre seguridad y velocidad
- **Encriptación física**: El HTML completo se encripta, no se ofusca
- **Ilegible sin contraseña**: El contenido es completamente indescifrable

### Contraseñas Individuales

**Ventajas:**
- ✅ Mayor seguridad: Si una contraseña se compromete, solo afecta a un post
- ✅ Flexibilidad: Puedes compartir diferentes contraseñas con diferentes personas
- ✅ Control granular: Revoca acceso a posts específicos cambiando solo una contraseña

### ⚠️ Recomendaciones Críticas

**DEBES usar contraseñas MUY fuertes:**

#### ❌ NO uses:
- `password123`
- `mipost2024`
- Cualquier palabra del diccionario
- Contraseñas cortas (<20 caracteres)

#### ✅ SÍ usa:
```bash
# Genera contraseñas de 32 caracteres:
npm run generate-password

# Ejemplo de contraseña fuerte:
Sb9-EUM_.pHl%azTbAy|tL6E|)vduGf&
```

### Limitaciones

⚠️ **Importante entender**:
- El contenido encriptado está en GitHub (repositorio público)
- Con recursos suficientes, alguien podría intentar ataques de fuerza bruta
- **SOLUCIÓN**: Contraseñas de 32+ caracteres con alta entropía

### Para Contenido Extremadamente Sensible

Si necesitas proteger información muy confidencial:
- Considera usar un sistema de autenticación completo (backend + BD)
- O simplemente **no publiques** ese contenido en un sitio estático público
- Los sitios estáticos tienen limitaciones inherentes de seguridad

---

## 💡 Tips y Mejores Prácticas

### 1. Organización de Secrets

Usa un patrón consistente para nombres de secrets:
```
PASSWORD_WELCOME
PASSWORD_VENENO  
PASSWORD_TUTORIAL_AVANZADO
```

### 2. Gestión de Contraseñas

- Usa un gestor de contraseñas (1Password, Bitwarden, LastPass)
- Crea una categoría "Blog Posts Encriptados"
- Guarda cada contraseña con el nombre del post

### 3. Compartir Contraseñas

Para compartir contraseñas de forma segura:
- ✅ Usa servicios de compartición encriptada (PrivateBin, OneTi meShare)
- ✅ Envía por canales seguros (Signal, WhatsApp con desaparición)
- ❌ NO las compartas en redes sociales públicas
- ❌ NO las pongas en el contenido del blog

### 4. Documentación Personal

Mantén un documento privado con:
- Lista de posts encriptados
- Nombre del secret asociado
- Fecha de encriptación
- Personas con acceso

### 5. Renovación de Contraseñas

Considera cambiar las contraseñas periódicamente:
1. Genera nueva contraseña
2. Actualiza el secret en GitHub
3. Recompila y despliega
4. Notifica a las personas con acceso

---

## 📝 Comandos Disponibles

```bash
# Instalación
npm install                # Instalar dependencias de Node.js
bundle install             # Instalar dependencias de Ruby

# Desarrollo
bundle exec jekyll serve   # Iniciar servidor de desarrollo
bundle exec jekyll build   # Compilar el sitio

# Encriptación
npm run generate-password  # Generar contraseña fuerte (RECOMENDADO)
npm run list-posts         # Listar posts con sugerencias de secrets
npm run encrypt-posts      # Encriptar posts (requiere variables de entorno)
```

---

## 📚 Referencias

- [CryptoJS en GitHub](https://github.com/brix/crypto-js)
- [Documentación de Jekyll](https://jekyllrb.com/docs/)
- [GitHub Actions Secrets](https://docs.github.com/en/actions/security-guides/encrypted-secrets)
- [AES-256 Encryption](https://en.wikipedia.org/wiki/Advanced_Encryption_Standard)
- [Tema Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy/)

---

## 🎨 Personalización del Modal

Si quieres personalizar el aspecto del modal, edita:
- **`_includes/encrypted-content.html`**: HTML, CSS y JavaScript del modal
- **Colores**: Variables CSS en la sección `:root` y `@media (prefers-color-scheme: dark)`
- **Textos**: Modificar el HTML directamente en el archivo de include

---

**¡Listo!** Ahora tienes un sistema profesional de encriptación de posts con contraseñas individuales y modal personalizado. 🎉
