# ElCyberCurioso's Notebook

[![Gem Version](https://img.shields.io/gem/v/jekyll-theme-chirpy)][gem]&nbsp;
[![GitHub license](https://img.shields.io/github/license/cotes2020/chirpy-starter.svg?color=blue)][mit]

Blog personal de ElCyberCurioso con apuntes de hacking y pentesting (Red Team). Este sitio está construido con [Jekyll](https://jekyllrb.com/) usando el tema [Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy/).

## ✨ Características

- 📝 Blog de ciberseguridad y hacking ético
- 🔐 **Sistema de encriptación de posts** con StatiCrypt
- 🎨 Diseño moderno y responsive
- 🌙 Modo oscuro/claro
- 💬 Sistema de comentarios con Giscus
- 🔍 Búsqueda integrada
- 📊 Categorías y etiquetas
- 🚀 Despliegue automático con GitHub Actions

## 🔐 Encriptación de Posts - Sistema Avanzado

Este blog incluye un sistema profesional de encriptación con **contraseñas individuales** y **modal personalizado** integrado con el tema Chirpy.

### ✨ Características

- 🔐 **Encriptación AES-256-GCM**: Seguridad de nivel militar
- 🎨 **Modal personalizado**: Diseño elegante adaptado al tema claro/oscuro
- 🔑 **Contraseñas individuales**: Cada post tiene su propia contraseña
- ⚡ **Optimizado**: 100,000 iteraciones PBKDF2 (rápido pero seguro)
- 🚀 **Automatizado**: Integración completa con GitHub Actions

### 🎨 Experiencia de Usuario

Cuando alguien visita un post encriptado:
1. Ve el contenido **difuminado** en el fondo
2. Aparece un **modal overlay** elegante solicitando contraseña
3. Ingresa la contraseña del post específico
4. El modal se desvanece con animación suave
5. Se muestra el contenido desencriptado

### 🔒 Contraseñas Individuales

**Ventajas:**
- ✅ Mayor seguridad: Si una contraseña se compromete, solo afecta a un post
- ✅ Flexibilidad: Comparte diferentes contraseñas con diferentes personas
- ✅ Control granular: Revoca acceso a posts específicos

### ⚠️ Seguridad Crítica

**CADA post tiene su propia contraseña fuerte (32+ caracteres):**

❌ **NO uses**: `password123`, `mipost2024`  
✅ **SÍ usa**: `Sb9-EUM_.pHl%azTbAy|tL6E|)vduGf&`

Genera contraseñas seguras:
```bash
npm run generate-password
```

### 🚀 Configuración Rápida

1. **Genera contraseña** para cada post: `npm run generate-password`
2. **Crea secrets en GitHub**: `PASSWORD_WELCOME`, `PASSWORD_VENENO`, etc.
3. **Configura posts** en `_data/encrypted_posts.yml`:
```yaml
encrypted_posts:
  - post: 2025-10-19-welcome
    secret: PASSWORD_WELCOME
  - post: 2025-11-25-dockerlabs-veneno
    secret: PASSWORD_VENENO
```
4. **Actualiza workflow** en `.github/workflows/pages-deploy.yml`
5. **Haz push** - GitHub Actions se encarga del resto

📚 **[Ver guía completa de encriptación](ENCRYPTION_GUIDE.md)**

## 🚀 Uso

### Instalación local

```bash
# Instalar dependencias de Ruby
bundle install

# Instalar dependencias de Node.js (para encriptación)
npm install

# Compilar el sitio
bundle exec jekyll build

# Servidor de desarrollo
bundle exec jekyll serve
```

### Despliegue

**Flujo Recomendado: Encriptación Automática con CI/CD**

```bash
# 1. Encriptar markdown localmente
$env:PASSWORD_WELCOME="tu-contraseña"
npm run encrypt-markdown

# 2. Commit y push
git push

# ✅ GitHub Actions automáticamente:
#    - Desencripta markdown
#    - Compila Jekyll (markdown → HTML)
#    - Encripta HTML
#    - Despliega
```

📚 **[Ver guía completa del flujo](WORKFLOW_GUIDE.md)**

**Opciones Alternativas:**

1. **Deploy Manual**: Para máximo control → [DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)
2. **Sin encriptación**: Push directo, despliega automáticamente

## 📝 Comandos Útiles

```bash
# Instalación
npm install                # Instalar dependencias de Node.js
bundle install             # Instalar dependencias de Ruby

# Desarrollo
bundle exec jekyll serve   # Iniciar servidor de desarrollo
bundle exec jekyll build   # Compilar el sitio

# Encriptación de posts
npm run generate-password  # Generar contraseña fuerte (RECOMENDADO)
npm run list-posts         # Listar posts disponibles
npm run encrypt-markdown   # Encriptar markdown (antes de commit)
npm run decrypt-markdown   # Desencriptar markdown (para editar)
npm run deploy             # Deploy manual (opcional)
```

## 🚀 Inicio Rápido

¿Primera vez con posts encriptados?

📚 **[QUICK_START.md](QUICK_START.md)** - Guía rápida de 5 minutos

## 📖 Documentación Completa

- **[WORKFLOW_GUIDE.md](WORKFLOW_GUIDE.md)** - Flujo completo de trabajo
- **[ENCRYPTION_GUIDE.md](ENCRYPTION_GUIDE.md)** - Guía de encriptación detallada
- **[DEPLOY_GUIDE.md](DEPLOY_GUIDE.md)** - Deploy manual alternativo
- [Documentación del tema Chirpy](https://github.com/cotes2020/jekyll-theme-chirpy/wiki)

## Contributing

This repository is automatically updated with new releases from the theme repository. If you encounter any issues or want to contribute to its improvement, please visit the [theme repository][chirpy] to provide feedback.

## License

This work is published under [MIT][mit] License.

[gem]: https://rubygems.org/gems/jekyll-theme-chirpy
[chirpy]: https://github.com/cotes2020/jekyll-theme-chirpy/
[CD]: https://en.wikipedia.org/wiki/Continuous_deployment
[mit]: https://github.com/cotes2020/chirpy-starter/blob/master/LICENSE
