---
title: DockerLabs - Fileception
summary: "Write-up del laboratorio Fileception de DockerLabs"
author: elcybercurioso
date: 2026-02-03 12:52:54
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_fileception"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ nmap -sCV -p22,80 172.17.0.2
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 61:8f:91:89:a7:0b:8e:17:b7:dd:38:e0:00:04:59:47 (ECDSA)
|_  256 8a:15:29:13:ec:aa:f6:20:ca:c8:80:14:56:05:ec:3b (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: Apache2 Debian Default Page: It works
|_http-server-header: Apache/2.4.58 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## análisis

Comenzamos revisando la página web alojada en el servidor:

![Desktop View](/20260119221049.webp){: width="972" height="589" .shadow}

Dejaremos **gobuster** corriendo en segundo plano buscando recursos existentes en el servidor mientras analizamos la página web:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
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
[+] Extensions:              html,txt,php
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/index.html           (Status: 200) [Size: 11137]
```

En el código fuente de la página web encontramos el siguiente mensaje:

![Desktop View](/20260119220957.webp){: width="972" height="589" .shadow}

Probamos a decodificar el código que nos mencionan con diferentes codificaciones, y finalmente encontramos que con **Base85** nos devuelve un texto que parece ser el correcto:

![Desktop View](/20260119221552.webp){: width="972" height="589" .shadow}

>En mi caso, al desplegar el contenedor, el puerto 21 de la máquina no estaba disponible porque el servicio de `vsftpd` no se estaba arrancando, por lo que he tenido que arrancarlo manualmente.
{: .prompt-info }

Lo primero que hice fue acceder al contenedor mediante consola y comprobando que no tengo manera de ver los puertos abiertos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ sudo docker exec -it fileception_container bash
root@8a2ce64fcc25:/# ps -aux
USER         PID %CPU %MEM    VSZ   RSS TTY      STAT START   TIME COMMAND
root           1  0.0  0.0   4324  3096 ?        Ss   XX:XX   0:00 /bin/bash -c service apache2 start ; service vsftpd start ; service ssh start  ; while true; do echo 'Alive'; sleep 60; done
root          24  0.0  0.0   6804  4816 ?        Ss   XX:XX   0:01 /usr/sbin/apache2 -k start
www-data      28  0.0  0.0 1933780 5132 ?        Sl   XX:XX   0:00 /usr/sbin/apache2 -k start
www-data      29  0.0  0.0 1999316 5132 ?        Sl   XX:XX   0:00 /usr/sbin/apache2 -k start
root          94 98.5  0.0   2712   404 ?        R    XX:XX  80:29 start-stop-daemon --start --background -m --oknodo --pidfile /var/run/vsftpd/vsftpd.pid --exec /usr/sbin/vsftpd
root         129  0.0  0.0  12020  2820 ?        Ss   XX:XX   0:00 sshd: /usr/sbin/sshd [listener] 0 of 10-100 startups
root         211  0.0  0.0   2696  1496 ?        S    XX:XX   0:00 sleep 60
root         212  0.4  0.0   4588  3820 pts/0    Ss   XX:XX   0:00 bash
root         221  100  0.0   9188  4796 pts/0    R+   XX:XX   0:00 ps -aux
```

Así que actualicé el contenedor, e instalé el paquete `net-tools` para poder usar la herramienta `netstat`:

```bash
root@8a2ce64fcc25:/# sudo apt update
Get:1 http://security.ubuntu.com/ubuntu noble-security InRelease [126 kB]
Hit:2 http://archive.ubuntu.com/ubuntu noble InRelease   
Get:3 http://archive.ubuntu.com/ubuntu noble-updates InRelease [126 kB]
...

root@8a2ce64fcc25:/# sudo apt install net-tools
Reading package lists... Done
Building dependency tree... Done
....
Setting up net-tools (2.10-0.1ubuntu4.4) ...

root@8a2ce64fcc25:/# ifconfig
eth0: flags=4163<UP,BROADCAST,RUNNING,MULTICAST>  mtu 1500
        inet 172.17.0.2  netmask 255.255.0.0  broadcast 172.17.255.255
        ether XX:XX:XX:XX:XX:XX  txqueuelen 0  (Ethernet)
        RX packets 132777  bytes 21529864 (21.5 MB)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 132206  bytes 7156619 (7.1 MB)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

lo: flags=73<UP,LOOPBACK,RUNNING>  mtu 65536
        inet 127.0.0.1  netmask 255.0.0.0
        inet6 ::1  prefixlen 128  scopeid 0x10<host>
        loop  txqueuelen 1000  (Local Loopback)
        RX packets 0  bytes 0 (0.0 B)
        RX errors 0  dropped 0  overruns 0  frame 0
        TX packets 0  bytes 0 (0.0 B)
        TX errors 0  dropped 0 overruns 0  carrier 0  collisions 0

root@8a2ce64fcc25:/# netstat -an 
Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State      
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN     
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN     
tcp        0      0 172.17.0.2:48052        XXX.XXX.XXX.XXX:XX      TIME_WAIT  
tcp        0      0 172.17.0.2:55138        XXX.XXX.XXX.XXX:XX      TIME_WAIT  
tcp        0      0 172.17.0.2:60580        XXX.XXX.XXX.XXX:XX      TIME_WAIT  
tcp6       0      0 :::22                   :::*                    LISTEN     
Active UNIX domain sockets (servers and established)
Proto RefCnt Flags       Type       State         I-Node   Path

root@8a2ce64fcc25:/# service vsftpd status
 * FTP server is not running
root@8a2ce64fcc25:/# sudo service vsftpd start 
 * Starting FTP server vsftpd                                                                                                                                                                              [ OK ] 
root@8a2ce64fcc25:/# service vsftpd status
 * FTP server is running
```

Si ahora vuelvo a comprobar los puertos abiertos desde dentro de la máquina, vemos que el puerto 21 ya está abierto:

```bash
root@8a2ce64fcc25:/# netstat -an
Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State      
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN     
tcp        0      0 0.0.0.0:21              0.0.0.0:*               LISTEN     
tcp        0      0 0.0.0.0:22              0.0.0.0:*               LISTEN     
tcp        0      0 172.17.0.2:21           172.17.0.1:54978        ESTABLISHED
tcp6       0      0 :::22                   :::*                    LISTEN     
Active UNIX domain sockets (servers and established)
Proto RefCnt Flags       Type       State         I-Node   Path
unix  3      [ ]         STREAM     CONNECTED     39911417 
unix  3      [ ]         STREAM     CONNECTED     39911416
```

Al volver a lanzar `nmap` desde nuestra máquina, vemos que ahora ya se encuentra abierto:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2                                                                                                      
PORT   STATE SERVICE
21/tcp open  ftp
22/tcp open  ssh
80/tcp open  http
```

## acceso inicial (peter)

Si nos conectamos por FTP a la máquina, veremos que podemos acceder con credenciales por defecto (`anonymous:<vacío>`), y encontramos una imagen, la cual nos bajaremos para analizarla:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ ftp 172.17.0.2                                
Connected to 172.17.0.2.
220 (vsFTPd 3.0.5)
Name (172.17.0.2:elcybercurioso): anonymous
230 Login successful.
Remote system type is UNIX.
Using binary mode to transfer files.
ftp> ls
229 Entering Extended Passive Mode (|||52799|)
150 Here comes the directory listing.
-rwxrw-rw-    1 ftp      ftp         75372 Apr 27  2024 hello_peter.jpg
226 Directory send OK.
ftp> get hello_peter.jpg
local: hello_peter.jpg remote: hello_peter.jpg
229 Entering Extended Passive Mode (|||16482|)
150 Opening BINARY mode data connection for hello_peter.jpg (75372 bytes).
100% |*********************************************************************************************************************************************************************| 75372      227.46 MiB/s    00:00 ETA
226 Transfer complete.
75372 bytes received in 00:00 (34.97 MiB/s)
```

Vemos que los primeros bytes nos confirman que se trata de una foto:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ file hello_peter.jpg 
hello_peter.jpg: JPEG image data, JFIF standard 1.01, resolution (DPI), density 96x96, segment length 16, baseline, precision 8, 799x798, components 3
```

La abrimos para verla, y es la siguiente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ xdg-open hello_peter.jpg
```

![Desktop View](/20260120170948.webp){: width="550" height="390" .shadow}

Revisamos los metadatos de la imagen, pero no vemos nada sospechoso:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ exiftool hello_peter.jpg 
ExifTool Version Number         : 13.25
File Name                       : hello_peter.jpg
Directory                       : .
File Size                       : 75 kB
File Modification Date/Time     : 2024:04:27 03:17:32+01:00
File Access Date/Time           : XXXX:XX:XX XX:XX:XX+XX:XX
File Inode Change Date/Time     : XXXX:XX:XX XX:XX:XX+XX:XX
File Permissions                : -rw-rw-r--
File Type                       : JPEG
File Type Extension             : jpg
MIME Type                       : image/jpeg
JFIF Version                    : 1.01
Resolution Unit                 : inches
X Resolution                    : 96
Y Resolution                    : 96
Image Width                     : 799
Image Height                    : 798
Encoding Process                : Baseline DCT, Huffman coding
Bits Per Sample                 : 8
Color Components                : 3
Y Cb Cr Sub Sampling            : YCbCr4:2:0 (2 2)
Image Size                      : 799x798
Megapixels                      : 0.638
```

Tratamos de ver si dentro de la imagen hay algún fichero oculto, y vemos que nos pide una contraseña:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ steghide info hello_peter.jpg 
"hello_peter.jpg":
  format: jpeg
  capacity: 4.0 KB
Try to get information about embedded data ? (y/n) y
Enter passphrase: 
steghide: could not extract any data with that passphrase!
```

Usaremos la herramienta [**stegseek**](https://github.com/RickdeJager/stegseek) para tratar de encontrar la contraseña empleando fuerza bruta, pero vemos que la contraseña no está dentro del diccionario `rockyou.txt`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ stegseek --crack hello_peter.jpg -wl /usr/share/seclists/Passwords/rockyou.txt 
StegSeek 0.6 - https://github.com/RickdeJager/StegSeek

[i] Progress: 99.92% (133.3 MB)           
[!] error: Could not find a valid passphrase.
```

Dado que anteriormente encontramos una cadena que todavía no la hemos usado, probamos a introducirla en un fichero y ver si se trata de la contraseña que estamos buscando:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ echo "************************" > wordlist
```

Volvemos a ejecutar **stegseek**, vemos que efectivamente con esta cadena obtenemos el fichero que estaba oculto dentro de la imagen:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ stegseek --crack hello_peter.jpg -wl wordlist
StegSeek 0.6 - https://github.com/RickdeJager/StegSeek

[i] Found passphrase: "************************"
[i] Original filename: "you_find_me.txt".
[i] Extracting to "hello_peter.jpg.out".
```

Al fichero de texto oculto le dan el nombre `hello_peter.jpg.out`, y al abrirlo vemos el siguiente contenido:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ cat hello_peter.jpg.out 
Hola, Peter!

Ook. Ook.  Ook. ...  Ook. Ook.  Ook! Ook.
```

Encontramos varias páginas como [esta](https://www.splitbrain.org/services/ook) o [esta otra](https://www.dcode.fr/ook-language) que nos permite decodificar el lenguaje de programación `Ook!`, las cuales nos devuelven la misma cadena de texto:

![Desktop View](/20260120173827.webp){: width="972" height="589" .shadow}

Sin embargo, si tratamos de acceder por SSH, veremos que no nos permite acceder.

Hay ocasiones en las que dos herramientas pueden devolver diferentes resultados, por lo que buscaremos otras herramientas, y encontramos [CacheSleuth](https://www.cachesleuth.com/bfook.html), la cual devuelve un resultado distinto.

Al trata de acceder con la cadena que nos devuelve esta página, veremos que ahora sí que podemos acceder a la máquina por SSH como el usuario `peter`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ ssh peter@172.17.0.2                      
peter@172.17.0.2`s password: 
peter@8a2ce64fcc25:~$ whoami
peter
peter@8a2ce64fcc25:~$ hostname -I
172.17.0.2
```

Revisaremos los usuarios que existan en el sistema y tengan una consola asignada en el fichero `/etc/passwd`:

```bash
peter@8a2ce64fcc25:/tmp$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
peter:x:1001:1001:,,,:/home/peter:/bin/bash
octopus:x:1002:1002:,,,:/home/octopus:/bin/bash
```

## movimiento lateral (octopus)

Continuaremos comprobando si el usuario tiene permisos SUDO, el cual vemos que no es así:

```bash
peter@8a2ce64fcc25:~$ sudo -l
[sudo] password for peter: 
Sorry, user peter may not run sudo on 8a2ce64fcc25.
```

Revisamos también los ficheros que tiene en su directorio personal en el sistema, donde vemos una nota que nos indica que hay algo importante en la carpeta `/tmp`:

```bash
peter@8a2ce64fcc25:~$ ls -la
total 16
drwxr-xr-x 1 root root 4096 Apr 27  2024 .
drwxr-xr-x 1 root root 4096 Apr 27  2024 ..
dr-xr-xr-x 1 ftp  ftp  4096 Apr 27  2024 files
-rw-r--r-- 1 root root   60 Apr 27  2024 nota_importante.txt
peter@8a2ce64fcc25:~$ cat nota_importante.txt 
NO REINICIES EL SISTEMA!!

HAY UN ARCHIVO IMPORTANTE EN TMP
```

En la carpeta `/tmp` encontramos varios ficheros:

```bash
peter@8a2ce64fcc25:~$ ls -la /tmp
total 28
drwxrwxrwt 1 root   root    4096 XXX XX XX:XX .
drwxr-xr-x 1 root   root    4096 XXX XX XX:XX ..
-rw-r--r-- 1 ubuntu ubuntu 14558 Apr 27  2024 importante_octopus.odt
-rw-r--r-- 1 root   root     114 Apr 27  2024 recuerdos_del_sysadmin.txt
```

La nota `recuerdos_del_sysadmin.txt` nos indica el siguiente mensaje, el cual hace referencia a la extensión de los ficheros:

```bash
peter@8a2ce64fcc25:~$ cat /tmp/recuerdos_del_sysadmin.txt
Cuando era niño recuerdo que, a los videos, para pasarlos de flv a mp4, solo cambiaba la extensión. Que iluso.
```

Para poder analizar más a fondo el fichero `importante_octopus.odt` que también vimos en la carpeta `/tmp`, lo enviaremos a nuestra máquina, abriendo un servidor web con Python:

```bash
peter@8a2ce64fcc25:/tmp$ python3 -m http.server 8080
Serving HTTP on 0.0.0.0 port 8080 (http://0.0.0.0:8080/) ...
172.17.0.1 - - [XX/XXX/XXXX XX:XX:XX] "GET /importante_octopus.odt HTTP/1.1" 200 -
```

Y desde nuestra máquina lo descargaremos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ wget http://172.17.0.2:8080/importante_octopus.odt 
--XXXX-XX-XX XX:XX:XX--  http://172.17.0.2:8080/importante_octopus.odt
Connecting to 172.17.0.2:8080... connected.
HTTP request sent, awaiting response... 200 OK
Length: 14558 (14K) [application/vnd.oasis.opendocument.text]
Saving to: ‘importante_octopus.odt’

importante_octopus.odt                               100%[====================================================================================================================>]  14.22K  --.-KB/s    in 0s      

XXXX-XX-XX XX:XX:XX (128 MB/s) - ‘importante_octopus.odt’ saved [14558/14558]
```

Si comprobamos el tipo de ficheros con la herramienta `file` (indica de que tipo de fichero se trata según los primeros bytes del mismo), veremos que nos indica que es un comprimido ZIP:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ file importante_octopus.odt 
importante_octopus.odt: Zip archive data, made by v2.0, extract using at least v2.0, last modified Apr 27 2024 00:41:30, uncompressed size 0, method=store
```

Por ello, lo que haremos será cambiarle la extensión y listar su contenido con la herramienta `7z`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ mv importante_octopus.odt importante_octopus.zip                

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ 7z l importante_octopus.zip 

7-Zip 25.01 (x64) : Copyright (c) 1999-2025 Igor Pavlov : 2025-08-03
 64-bit locale=en_GB.UTF-8 Threads:128 OPEN_MAX:1024, ASM

Scanning the drive for archives:
1 file, 14558 bytes (15 KiB)

Listing archive: importante_octopus.zip

--
Path = importante_octopus.zip
Type = zip
Physical Size = 14558

   Date      Time    Attr         Size   Compressed  Name
------------------- ----- ------------ ------------  ------------------------
2024-04-27 00:41:30 D....            0            0  Configurations2/accelerator
2024-04-27 00:41:30 D....            0            0  Configurations2/floater
2024-04-27 00:41:30 D....            0            0  Configurations2/images/Bitmaps
2024-04-27 00:41:30 D....            0            0  Configurations2/menubar
2024-04-27 00:41:30 D....            0            0  Configurations2/popupmenu
2024-04-27 00:41:30 D....            0            0  Configurations2/progressbar
2024-04-27 00:41:30 D....            0            0  Configurations2/statusbar
2024-04-27 00:41:30 D....            0            0  Configurations2/toolbar
2024-04-27 00:41:30 D....            0            0  Configurations2/toolpanel
2024-04-27 00:41:30 .....         1061          301  META-INF/manifest.xml
2024-04-27 00:41:30 .....         5271         5271  Thumbnails/thumbnail.png
2024-04-27 00:41:30 .....         4252         1097  content.xml
2024-04-27 01:38:00 .....          241          193  leerme.xml
2024-04-27 00:41:30 .....          260          187  manifest.rdf
2024-04-27 00:41:30 .....         1006          470  meta.xml
2024-04-27 00:41:30 .....           39           39  mimetype
2024-04-27 00:41:30 .....        14568         2297  settings.xml
2024-04-27 00:41:30 .....        13979         2571  styles.xml
------------------- ----- ------------ ------------  ------------------------
2024-04-27 01:38:00              40677        12426  9 files, 9 folders
```

Ahora descomprimiremos el contenido del fichero `importante_octopus.zip`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ 7z x importante_octopus.zip -oimportante_octopus 

7-Zip 25.01 (x64) : Copyright (c) 1999-2025 Igor Pavlov : 2025-08-03
 64-bit locale=en_GB.UTF-8 Threads:128 OPEN_MAX:1024, ASM

Scanning the drive for archives:
1 file, 14558 bytes (15 KiB)

Extracting archive: importante_octopus.zip
--
Path = importante_octopus.zip
Type = zip
Physical Size = 14558

Everything is Ok

Folders: 9
Files: 9
Size:       40677
Compressed: 14558

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ ls
hello_peter.jpg  hello_peter.jpg.out  importante_octopus  importante_octopus.zip

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception]
└─$ ls -la importante_octopus
total 76
drwxrwxr-x  5 elcybercurioso elcybercurioso  4096 XXX XX XX:XX .
drwxrwxr-x  3 elcybercurioso elcybercurioso  4096 XXX XX XX:XX ..
drwxrwxr-x 11 elcybercurioso elcybercurioso  4096 XXX XX XX:XX Configurations2
-rw-rw-r--  1 elcybercurioso elcybercurioso  4252 Apr 27  2024 content.xml
-rw-r--r--  1 elcybercurioso elcybercurioso   241 Apr 27  2024 leerme.xml
-rw-rw-r--  1 elcybercurioso elcybercurioso   260 Apr 27  2024 manifest.rdf
drwxrwxr-x  2 elcybercurioso elcybercurioso  4096 XXX XX XX:XX META-INF
-rw-rw-r--  1 elcybercurioso elcybercurioso  1006 Apr 27  2024 meta.xml
-rw-rw-r--  1 elcybercurioso elcybercurioso    39 Apr 27  2024 mimetype
-rw-rw-r--  1 elcybercurioso elcybercurioso 14568 Apr 27  2024 settings.xml
-rw-rw-r--  1 elcybercurioso elcybercurioso 13979 Apr 27  2024 styles.xml
drwxrwxr-x  2 elcybercurioso elcybercurioso  4096 XXX XX XX:XX Thumbnails
```

Vamos revisando cada fichero hasta que damos con el fichero `leerme.xml`, donde vemos que nos indican unas credenciales:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception/importante_octopus]
└─$ cat leerme.xml                                               
Decirle a Peter que me pase el odt de mis anécdotas, en caso de que se me olviden mis credenciales de administrador... Él no sabe de Esteganografía, nunca sé lo imaginaria esto.

usuario: octopus
password: ************************
```

Dado que están codificadas en Base64, las decodificamos usando la herramienta `base64`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Fileception/importante_octopus]
└─$ echo -ne "************************" | base64 -d                               
*****************
```

Comprobamos si con correctas, y vemos que es así:

```bash
peter@8a2ce64fcc25:/tmp$ su octopus
Password: 
octopus@8a2ce64fcc25:/tmp$ whoami
octopus
```

## escalada de privilegios (root)

Revisamos cuales son los grupos a los que pertenece el usuario `octopus`, y vemos que uno de los grupos es `sudo`:

```bash
octopus@8a2ce64fcc25:/tmp$ id
uid=1002(octopus) gid=1002(octopus) groups=1002(octopus),27(sudo),100(users)
```

Pertenecer al grupo **SUDO** permite al usuario ejecutar comandos como `root` en el sistema.

Listando los permisos **SUDO** del usuario `octopus` también podemos confirmarlo:

```bash
octopus@8a2ce64fcc25:/tmp$ sudo -l
Matching Defaults entries for octopus on 8a2ce64fcc25:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User octopus may run the following commands on 8a2ce64fcc25:
    (ALL) NOPASSWD: ALL
    (ALL : ALL) ALL
```

Por ello, invocamos una consola como el usuario `root`, que tras aportar la contraseña del usuario `octopus` vemos que la obtenemos sin problema:

```bash
octopus@8a2ce64fcc25:/tmp$ sudo su
[sudo] password for octopus: 
root@8a2ce64fcc25:/tmp# whoami
root
```

De esta manera, nos habremos convertido en `root` en la máquina **Fileception**!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>