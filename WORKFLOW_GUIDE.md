# 🔄 Guía Completa del Flujo de Trabajo con Encriptación

Esta guía explica el flujo completo del sistema de encriptación automatizado desde el desarrollo local hasta el despliegue.

## 🎯 Resumen del Flujo

```
┌─────────────────────────────────────────────┐
│  LOCAL                                      │
│  1. Escribir post en markdown              │
│  2. Encriptar markdown                     │
│  3. Commit + Push                          │
└──────────────────┬──────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────┐
│  GITHUB ACTIONS                             │
│  4. Desencriptar markdown                  │
│  5. Compilar Jekyll (markdown → HTML)      │
│  6. Encriptar HTML                         │
│  7. Desplegar                              │
└─────────────────────────────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────────┐
│  SITIO PÚBLICO                              │
│  - HTML encriptado                         │
│  - Usuario ingresa contraseña             │
│  - Contenido se desencripta en navegador  │
└─────────────────────────────────────────────┘
```

---

## 📋 Configuración Inicial (Una Vez)

### 1. Configurar Secrets en GitHub

Para cada post encriptado, crea un secret en GitHub:

1. Ve a tu repositorio → **Settings** → **Secrets and variables** → **Actions**
2. Click **New repository secret**
3. **Name**: `PASSWORD_WELCOME` (ejemplo)
4. **Value**: Tu contraseña fuerte
5. **Add secret**

Repite para cada post encriptado.

### 2. Actualizar Workflow

Edita `.github/workflows/pages-deploy.yml` y añade todos tus secrets:

```yaml
- name: Decrypt markdown posts
  run: npm run decrypt-markdown
  env:
    PASSWORD_WELCOME: ${{ secrets.PASSWORD_WELCOME }}
    PASSWORD_VENENO: ${{ secrets.PASSWORD_VENENO }}
    PASSWORD_TUTORIAL: ${{ secrets.PASSWORD_TUTORIAL }}
    # Añade todos tus secrets aquí

- name: Encrypt HTML posts
  run: npm run encrypt-posts
  env:
    PASSWORD_WELCOME: ${{ secrets.PASSWORD_WELCOME }}
    PASSWORD_VENENO: ${{ secrets.PASSWORD_VENENO }}
    PASSWORD_TUTORIAL: ${{ secrets.PASSWORD_TUTORIAL }}
    # Los mismos secrets que arriba
```

---

## 🚀 Flujo de Trabajo Diario

### Caso 1: Crear Post Normal (No Encriptado)

```bash
# 1. Crear post
_posts/2025-12-15-post-publico.md

# 2. Commit y push
git add _posts/2025-12-15-post-publico.md
git commit -m "Añadir post público"
git push

# ✅ GitHub Actions compila y despliega automáticamente
```

### Caso 2: Crear Post Encriptado

```bash
# 1. Crear post normalmente
_posts/2025-12-15-post-privado.md

# 2. Configurar en encrypted_posts.yml
# encrypted_posts:
#   - post: 2025-12-15-post-privado
#     secret: PASSWORD_PRIVADO

# 3. Generar contraseña fuerte
npm run generate-password
# Output: Sb9-EUM_.pHl%azTbAy|tL6E|)vduGf&

# 4. Crear secret en GitHub
# Settings → Secrets → Actions → New secret
# Name: PASSWORD_PRIVADO
# Value: Sb9-EUM_.pHl%azTbAy|tL6E|)vduGf&

# 5. Actualizar workflow con el nuevo secret

# 6. Encriptar el markdown localmente
$env:PASSWORD_PRIVADO="Sb9-EUM_.pHl%azTbAy|tL6E|)vduGf&"
npm run encrypt-markdown

# 7. Commit y push (markdown ya encriptado)
git add _posts/2025-12-15-post-privado.md
git add _data/encrypted_posts.yml
git commit -m "Añadir post privado (encriptado)"
git push

# ✅ GitHub Actions:
#    → Desencripta markdown
#    → Compila Jekyll
#    → Encripta HTML
#    → Despliega
```

### Caso 3: Editar Post Encriptado

```bash
# 1. Desencriptar localmente
$env:PASSWORD_PRIVADO="tu-contraseña"
npm run decrypt-markdown

# 2. Editar el archivo markdown
# _posts/2025-12-15-post-privado.md

# 3. Volver a encriptar
$env:PASSWORD_PRIVADO="tu-contraseña"
npm run encrypt-markdown

# 4. Commit y push
git add _posts/2025-12-15-post-privado.md
git commit -m "Actualizar post privado"
git push

# ✅ GitHub Actions hace el resto
```

---

## 🔍 Detalles del Proceso

### Local: Encriptación de Markdown

**Script**: `scripts/encrypt-markdown.js`

**¿Qué hace?**
1. Lee `_data/encrypted_posts.yml`
2. Para cada post configurado:
   - Verifica que no esté ya encriptado
   - Extrae front matter y contenido
   - Encripta el contenido con CryptoJS
   - Actualiza front matter con `encrypted: true`
   - Guarda el archivo con contenido encriptado

**Resultado**: Archivo markdown con contenido encriptado

**Ejemplo**:
```yaml
---
title: Mi Post Privado
encrypted: true
---

<!-- ENCRYPTED CONTENT - DO NOT EDIT MANUALLY -->
U2FsdGVkX1+... (contenido encriptado)
<!-- END ENCRYPTED CONTENT -->
```

### GitHub Actions: Desencriptación de Markdown

**Script**: `scripts/decrypt-markdown.js`

**¿Qué hace?**
1. Lee `_data/encrypted_posts.yml`
2. Para cada post configurado:
   - Verifica que esté encriptado
   - Extrae el contenido encriptado
   - Desencripta usando la contraseña del secret
   - Restaura el markdown original
   - Quita `encrypted: true` del front matter

**Resultado**: Archivos markdown desencriptados (temporalmente en CI/CD)

### GitHub Actions: Compilación Jekyll

**Comando**: `bundle exec jekyll build`

**¿Qué hace?**
1. Lee los archivos markdown (ya desencriptados)
2. Procesa el markdown a HTML
3. Aplica layouts y templates
4. Genera el sitio estático en `_site/`

**Resultado**: HTML completamente procesado

### GitHub Actions: Encriptación de HTML

**Script**: `scripts/encrypt-posts-v2.js`

**¿Qué hace?**
1. Lee `_data/encrypted_posts.yml`
2. Para cada post configurado:
   - Abre el HTML generado en `_site/`
   - Extrae el contenido del `<article>`
   - Encripta el HTML completo
   - Inyecta el modal de desencriptación
   - Reemplaza el contenido con el modal

**Resultado**: HTML encriptado listo para desplegar

---

## 📊 Comparación de Estados

### Archivo Markdown en GitHub

```yaml
---
title: Post Privado
encrypted: true
---

<!-- ENCRYPTED CONTENT -->
U2FsdGVkX1+abc123...
<!-- END ENCRYPTED CONTENT -->
```

**Estado**: ✅ Encriptado y seguro

### Archivo Markdown durante CI/CD (Temporal)

```yaml
---
title: Post Privado
---

# Mi Post Privado

Este es el contenido real del post...
```

**Estado**: ⚠️ Desencriptado temporalmente solo en CI/CD

### Archivo HTML en Sitio Desplegado

```html
<article>
  <div class="encrypted-modal-overlay">
    <form>
      <input type="password" placeholder="Contraseña">
      <button>Desbloquear</button>
    </form>
  </div>
  
  <div id="encrypted-payload" style="display:none">
    U2FsdGVkX1+xyz789...
  </div>
</article>
```

**Estado**: ✅ HTML encriptado y protegido

---

## 🔐 Seguridad del Sistema

### ¿Qué está Encriptado?

| Ubicación | Estado | Visible Sin Contraseña |
|-----------|--------|------------------------|
| **Local (tu máquina)** | Markdown sin encriptar | ✅ Sí (solo tú) |
| **GitHub (repo)** | Markdown encriptado | ❌ No |
| **CI/CD (temporal)** | Markdown desencriptado | ❌ No (efímero) |
| **Sitio público** | HTML encriptado | ❌ No |

### Nivel de Protección

1. **Muy Bajo**: Markdown sin encriptar en GitHub ❌
2. **Bajo**: Solo HTML encriptado ⚠️
3. **Medio**: Markdown encriptado + HTML encriptado ✅
4. **Alto**: Markdown encriptado + HTML encriptado + Contraseñas fuertes ✅✅ ← **TU SISTEMA**

---

## 🛠️ Comandos Útiles

### Desarrollo Local

```bash
# Generar contraseña fuerte
npm run generate-password

# Listar posts disponibles
npm run list-posts

# Encriptar markdown (antes de commit)
$env:PASSWORD_POST="contraseña"
npm run encrypt-markdown

# Desencriptar markdown (para editar)
$env:PASSWORD_POST="contraseña"
npm run decrypt-markdown

# Probar localmente (requiere desencriptar primero)
npm run decrypt-markdown
bundle exec jekyll serve
```

### Gestión de Múltiples Posts

```powershell
# PowerShell - Configurar todas las contraseñas
$env:PASSWORD_WELCOME="Contraseña1"
$env:PASSWORD_VENENO="Contraseña2"
$env:PASSWORD_TUTORIAL="Contraseña3"

# Encriptar todos
npm run encrypt-markdown

# Commit y push
git add _posts/*.md _data/encrypted_posts.yml
git commit -m "Actualizar posts encriptados"
git push
```

---

## 🔄 Flujo Completo Paso a Paso

### Ejemplo Completo: Nuevo Post Encriptado

```bash
# ────────────────────────────────────────────
# PASO 1: CREAR POST
# ────────────────────────────────────────────

# Crear archivo markdown normalmente
_posts/2025-12-15-tutorial-avanzado.md

# ────────────────────────────────────────────
# PASO 2: CONFIGURAR ENCRIPTACIÓN
# ────────────────────────────────────────────

# Editar _data/encrypted_posts.yml
# encrypted_posts:
#   - post: 2025-12-15-tutorial-avanzado
#     secret: PASSWORD_TUTORIAL

# ────────────────────────────────────────────
# PASO 3: GENERAR Y CONFIGURAR CONTRASEÑA
# ────────────────────────────────────────────

npm run generate-password
# Copiar una contraseña generada

# Crear secret en GitHub:
# Settings → Secrets → Actions → New secret
# Name: PASSWORD_TUTORIAL
# Value: (pegar contraseña)

# ────────────────────────────────────────────
# PASO 4: ACTUALIZAR WORKFLOW
# ────────────────────────────────────────────

# Editar .github/workflows/pages-deploy.yml
# Añadir PASSWORD_TUTORIAL a los env:

# ────────────────────────────────────────────
# PASO 5: ENCRIPTAR Y COMMIT
# ────────────────────────────────────────────

$env:PASSWORD_TUTORIAL="tu-contraseña-generada"
npm run encrypt-markdown

git add _posts/2025-12-15-tutorial-avanzado.md
git add _data/encrypted_posts.yml
git add .github/workflows/pages-deploy.yml
git commit -m "Añadir tutorial avanzado (encriptado)"
git push

# ────────────────────────────────────────────
# PASO 6: GITHUB ACTIONS (AUTOMÁTICO)
# ────────────────────────────────────────────

# GitHub Actions automáticamente:
# 1. Desencripta markdown
# 2. Compila Jekyll
# 3. Encripta HTML  
# 4. Despliega

# ────────────────────────────────────────────
# PASO 7: VERIFICAR
# ────────────────────────────────────────────

# Esperar 2-3 minutos
# Visitar: https://tu-usuario.github.io/posts/tutorial-avanzado/
# Ingresar contraseña
# ✅ Ver contenido procesado correctamente
```

---

## ⚠️ Solución de Problemas

### El post se ve como markdown sin procesar

**Causa**: HTML no se encriptó correctamente

**Solución**: Verificar que el secret esté en ambas secciones del workflow

### Error: "Contraseña incorrecta" en CI/CD

**Causa**: Secret mal configurado en GitHub

**Solución**: Verificar que el secret esté creado y con el nombre correcto

### El post no se desencripta en el navegador

**Causa**: Contraseña diferente entre encriptación local y CI/CD

**Solución**: Usar la misma contraseña en local y en el secret de GitHub

---

## 💡 Consejos y Mejores Prácticas

### ✅ Recomendaciones

1. **Usa el mismo password** para encrypt-markdown localmente y el secret de GitHub
2. **Documenta tus contraseñas** en un gestor de contraseñas
3. **Encripta antes de commit** para nunca subir markdown sin protección
4. **Prueba localmente** antes de hacer push
5. **Verifica el workflow** después de añadir un nuevo post

### 🚫 Evita

1. ❌ Subir markdown sin encriptar
2. ❌ Usar contraseñas débiles
3. ❌ Olvidar añadir el secret al workflow
4. ❌ Compartir contraseñas públicamente

---

## 📚 Resumen

Este sistema te da:

✅ **Seguridad máxima**: Markdown encriptado en GitHub  
✅ **Automatización total**: CI/CD maneja todo  
✅ **HTML correcto**: Jekyll procesa antes de encriptar  
✅ **Control local**: Encriptas antes de commit  
✅ **Sin secretos expuestos**: Todo en GitHub Secrets  

**Flujo completo en 2 comandos:**

```bash
npm run encrypt-markdown    # Local
git push                     # GitHub Actions hace el resto
```

¡Perfecto para contenido sensible con máxima seguridad! 🔒

