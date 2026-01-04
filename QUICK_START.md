# 🚀 Guía Rápida - Encriptación de Posts

Esta guía te muestra cómo crear y desplegar posts encriptados en 5 minutos.

---

## ⚡ Inicio Rápido

### Para un Post Encriptado

```bash
# 1. Crear post
echo "# Mi Post Privado" > _posts/2025-12-15-privado.md

# 2. Generar contraseña
npm run generate-password
# Copia una de las 3 opciones

# 3. Crear secret en GitHub
# Settings → Secrets → Actions → New secret
# Name: PASSWORD_PRIVADO
# Value: (pegar contraseña copiada)

# 4. Configurar post
# Editar _data/encrypted_posts.yml:
# encrypted_posts:
#   - post: 2025-12-15-privado
#     secret: PASSWORD_PRIVADO

# 5. Actualizar workflow
# Editar .github/workflows/pages-deploy.yml
# Añadir PASSWORD_PRIVADO en las secciones env:

# 6. Encriptar y desplegar
$env:PASSWORD_PRIVADO="tu-contraseña"
npm run encrypt-markdown
git add .
git commit -m "Añadir post privado"
git push

# ✅ Espera 2-3 minutos y visita tu sitio
```

---

## 📝 Comandos Esenciales

```bash
# Generar contraseña
npm run generate-password

# Ver posts disponibles
npm run list-posts

# Encriptar markdown (antes de commit)
$env:PASSWORD_POST="contraseña"
npm run encrypt-markdown

# Desencriptar markdown (para editar)
$env:PASSWORD_POST="contraseña"
npm run decrypt-markdown
```

---

## 🔄 Flujo Completo Explicado

### Lo que TÚ haces (Local)

1. Escribes post en markdown
2. Encriptas el markdown
3. Haces commit y push

### Lo que hace GitHub Actions (Automático)

1. Desencripta el markdown
2. Compila Jekyll (markdown → HTML)
3. Encripta el HTML
4. Despliega el sitio

### Lo que ve el Usuario

1. Página del blog con modal de contraseña
2. Ingresa la contraseña
3. Ve el HTML procesado correctamente

---

## 🔐 Configuración de Secrets

Para cada post encriptado necesitas un secret en GitHub:

1. **GitHub** → Tu repo → **Settings**
2. **Secrets and variables** → **Actions**
3. **New repository secret**
4. **Name**: `PASSWORD_NOMBREPOST` (MAYÚSCULAS)
5. **Value**: Tu contraseña fuerte
6. **Add secret**

**Ejemplo**:
- Post: `2025-12-15-tutorial.md`
- Secret: `PASSWORD_TUTORIAL`

---

## 📋 Checklist de Configuración

Antes de tu primer post encriptado, verifica:

- [ ] Node.js instalado (`npm install` ejecutado)
- [ ] Ruby/Jekyll instalado (`bundle install` ejecutado)
- [ ] Secret creado en GitHub Actions
- [ ] Secret añadido al workflow en ambas secciones (decrypt y encrypt)
- [ ] Post configurado en `_data/encrypted_posts.yml`
- [ ] Contraseña generada con `npm run generate-password`

---

## 🎯 Ejemplo Completo

```powershell
# 1. Crear post
@"
---
title: Tutorial Avanzado
---

# Tutorial Avanzado

Este es contenido sensible...
"@ > _posts/2025-12-15-tutorial.md

# 2. Generar contraseña
npm run generate-password
# Output: Sb9-EUM_.pHl%azTbAy|tL6E|)vduGf&

# 3. Crear secret en GitHub
# PASSWORD_TUTORIAL = Sb9-EUM_.pHl%azTbAy|tL6E|)vduGf&

# 4. Configurar
@"
encrypted_posts:
  - post: 2025-12-15-tutorial
    secret: PASSWORD_TUTORIAL
"@ > _data/encrypted_posts.yml

# 5. Actualizar workflow
# Añadir: PASSWORD_TUTORIAL: ${{ secrets.PASSWORD_TUTORIAL }}

# 6. Encriptar y deploy
$env:PASSWORD_TUTORIAL="Sb9-EUM_.pHl%azTbAy|tL6E|)vduGf&"
npm run encrypt-markdown

git add _posts _data .github/workflows
git commit -m "Añadir tutorial encriptado"
git push

# 7. Verificar (esperar 2-3 minutos)
# https://tu-usuario.github.io/posts/tutorial/
```

---

## ❓ Preguntas Frecuentes

### ¿Puedo tener posts normales y encriptados?

Sí. Solo añade a `encrypted_posts.yml` los que quieras encriptar.

### ¿Qué pasa si olvido encriptar antes de commit?

Debes hacer un nuevo commit con el archivo encriptado. Mejor usar `.pre-commit` hooks.

### ¿Puedo cambiar la contraseña de un post?

Sí:
1. Desencripta localmente
2. Cambia el secret en GitHub
3. Vuelve a encriptar con la nueva contraseña
4. Commit y push

### ¿Los posts encriptados son seguros?

Sí, si usas contraseñas fuertes (32+ caracteres aleatorios). El contenido usa AES-256.

---

## 🆘 Ayuda Rápida

### El post no se desencripta

- Verifica que la contraseña sea correcta
- Revisa que el secret esté en GitHub
- Comprueba que el secret esté en el workflow

### El contenido se ve como markdown

- Verifica que el flujo completo se ejecutó
- Revisa los logs de GitHub Actions
- Asegúrate de que ambas secciones (decrypt y encrypt) tienen el secret

### Error en GitHub Actions

- Revisa que todos los secrets existan
- Verifica que los nombres coincidan exactamente
- Comprueba que el post esté en `encrypted_posts.yml`

---

## 📚 Más Información

- **[WORKFLOW_GUIDE.md](WORKFLOW_GUIDE.md)** - Documentación completa del flujo CI/CD
- **[ENCRYPTION_GUIDE.md](ENCRYPTION_GUIDE.md)** - Guía detallada de encriptación

---

## 🎉 ¡Listo!

Con esto ya puedes:

✅ Crear posts encriptados  
✅ Desplegarlos automáticamente  
✅ Proteger contenido sensible  
✅ Mantener markdown seguro en GitHub  

**¡A encriptar posts! 🔒**

