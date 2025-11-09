---
title: DockerLabs - BaluFood
summary: "Write-up del laboratorio BaluFood de DockerLabs"
author: elcybercurioso
date: 2025-11-09
categories: [Post, DockerLabs]
tags: [fácil, weak credentials, credentials leaking]
media_subpath: "/assets/img/posts/dockerlabs_balufood"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/BaluFood]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT     STATE SERVICE
22/tcp   open  ssh
5000/tcp open  upnp
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/BaluFood]
└─$ nmap -sCV -p22,5000 172.17.0.2
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.2p1 Debian 2+deb12u5 (protocol 2.0)
| ssh-hostkey: 
|   256 69:15:7d:34:74:1c:21:8a:cb:2c:a2:8c:42:a4:21:7f (ECDSA)
|_  256 a7:3a:c9:b2:ac:cf:44:77:a7:9c:ab:89:98:c7:88:3f (ED25519)
5000/tcp open  http    Werkzeug httpd 2.2.2 (Python 3.11.2)
|_http-title: Restaurante Balulero - Inicio
|_http-server-header: Werkzeug/2.2.2 Python/3.11.2
```

## análisis

Comenzamos revisando la página principal del servidor web:

![Desktop View](/20251108213250.webp){: width="972" height="589" .shadow}

Dispone de una carta que nos permite realizar pedidos:

![Desktop View](/20251108213415.webp){: width="972" height="589" .shadow}

Y también tiene la funcionalidad de autenticación, donde nos damos cuenta que podemos acceder con las credenciales `admin:admin`:

![Desktop View](/20251108213442.webp){: width="730" height="590" .shadow}

## acceso inicial por SSH (sysadmin)

Tras acceder, podemos ver los pedidos que hemos realizado antes de loguearnos:

![Desktop View](/20251108213457.webp){: width="972" height="589" .shadow}

Si seguimos investigando, en el código fuente de la página encontramos unas credenciales:

![Desktop View](/20251108214928.webp){: width="972" height="589" .shadow}

Dado que la máquina tiene habilitado el puerto 22, podemos suponer que son para loguearnos por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/BaluFood]
└─$ ssh sysadmin@172.17.0.2                                              
sysadmin@172.17.0.2`s password: 
sysadmin@078c4d4d6cb0:~$ whoami
sysadmin
sysadmin@078c4d4d6cb0:~$ hostname -I
172.17.0.2
```

Viendo que hemos podido acceder correctamente, comprobamos que usuarios tienen una shell asignada en `/etc/passwd`:

```bash
sysadmin@078c4d4d6cb0:~$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
sysadmin:x:1000:1000:sysadmin,sysadmin,,:/home/sysadmin:/bin/bash
balulero:x:1001:1001:balulero,,,:/home/balulero:/bin/bash
```

## movimiento lateral (balulero)

En la carpeta del usuario `sysadmin` encontramos varios ficheros:

```bash
sysadmin@078c4d4d6cb0:~$ ls
app.py  restaurant.db  static  templates
```

Revisando el script `app.py`, encontramos una clave secreta:

```bash
sysadmin@078c4d4d6cb0:~$ cat app.py 
from flask import Flask, render_template, redirect, url_for, request, session, flash
import sqlite3
from functools import wraps

app = Flask(__name__)
app.secret_key = 'c****************'
DATABASE = 'restaurant.db'
```

Probamos a ver si con la misma clave podemos acceder como otro usuario, como por ejemplo, el usuario `balulero`:

```bash
sysadmin@078c4d4d6cb0:~$ su balulero
Password: 
balulero@078c4d4d6cb0:/home/sysadmin$ whoami
balulero
```

## escalada de privilegios (root)

Revisamos el historial de comandos ejecutados el usuario `balulero`, donde vemos que ha ejecutado el comando `alias`:

```bash
balulero@078c4d4d6cb0:~$ cat .bash_history 
nano ~/.bashrc
apt install nano -y
exit
nano ~/.bashrc
source nano ~/.bashrc
source ~/.bashrc
alias
su root
exit
whoami
exit
```

Ejecutamos el comando `alias`, y vemos que nos lista los alias que hay definidos, destacando `ser-root`, el cual nos devuelve una consola como el usuario `root` al ejecutarse:

```bash
balulero@078c4d4d6cb0:~$ alias
alias ls='ls --color=auto'
alias ser-root='echo c********* | su - root'
```

Dado que la contraseña se ve reflejada, la podemos copiar y obtener una consola como `root`, o simplemente ejecutar el comando `ser-root`, aunque yo he optado la primera opción:

```bash
balulero@078c4d4d6cb0:~$ su root
Password: 
root@078c4d4d6cb0:/home/balulero# whoami
root
```

Con esto, habremos completado el laboratorio!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>