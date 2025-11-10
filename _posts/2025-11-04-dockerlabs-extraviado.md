---
title: DockerLabs - Extraviado
summary: "Write-up del laboratorio Extraviado de DockerLabs"
author: elcybercurioso
date: 2025-11-04
categories: [Post, DockerLabs]
tags: [fácil, credentials leaking, privesc]
media_subpath: "/assets/img/posts/dockerlabs_extraviado"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Extraviado]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Extraviado]
└─$ nmap -sCV -p22,80 172.17.0.2                                  
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 cc:d2:9b:60:14:16:27:b3:b9:f8:79:10:df:a1:f3:24 (ECDSA)
|_  256 37:a2:b2:b2:26:f2:07:d1:83:7a:ff:98:8d:91:77:37 (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: Apache2 Ubuntu Default Page: It works
```

## análisis

Comenzamos revisando la página principal del servidor web, la cual, al final, hay una serie de cadenas que parecen codificadas en base64:

![Desktop View](/20251103171828.webp){: width="972" height="589" .shadow}

## acceso inicial (daniela)

Tras decodificarlos, vemos que se trata de lo que parecen ser unas credenciales:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Extraviado]
└─$ echo "ZGFuaWVsYQ==" | base64 -d; echo
daniela
                                                                                                                                                                        
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Extraviado]
└─$ echo "Zm9jYXJvamE=" | base64 -d; echo 
f*******
```

Tratamos de acceder por SSH, y vemos que son correctas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Extraviado]
└─$ ssh daniela@172.17.0.2
daniela@172.17.0.2`s password: 
Welcome to Ubuntu 24.04.1 LTS (GNU/Linux 6.12.38+kali-amd64 x86_64)
daniela@52a31b3d730e:~$ whoami
daniela
daniela@52a31b3d730e:~$ hostname -I
172.17.0.2
```

## movimiento lateral (diego)

En el directorio principal de la usuaria `daniela` encontramos una carpeta, que a su vez contiene un fichero:

```bash
daniela@52a31b3d730e:~$ ls -la
total 40
drwxr-x--- 1 daniela daniela 4096 Nov  3 09:19 .
drwxr-xr-x 1 root    root    4096 Jan  9  2025 ..
drwxrwxr-x 2 daniela daniela 4096 Jan  9  2025 .secreto
daniela@52a31b3d730e:~$ ls -la .secreto/
total 12
drwxrwxr-x 2 daniela daniela 4096 Jan  9  2025 .
drwxr-x--- 1 daniela daniela 4096 Nov  3 09:19 ..
-rw-rw-r-- 1 daniela daniela   17 Jan  9  2025 passdiego
```

Leemos dicho fichero, y podemos intuir que su contenido es la contraseña del usuario codificada en base64:

```bash
daniela@52a31b3d730e:~$ cat .secreto/passdiego 
Ym**************
daniela@52a31b3d730e:~$ echo "Ym**************" | base64 -d; echo
b***********
daniela@52a31b3d730e:~$ su diego
Password: 
diego@52a31b3d730e:/home/daniela$ whoami
diego
```

## escalada de privilegios (root)

Tras acceder como el usuario `diego`, vemos que en su carpeta de usuario hay un fichero llamado `pass`, pero no contiene la contraseña del usuario `root`:

```bash
diego@52a31b3d730e:/home$ cd diego/
diego@52a31b3d730e:~$ ls
pass
diego@52a31b3d730e:~$ cat pass 
donde estara?
```

Seguimos investigando, y vemos una carpeta llamada `.passroot`, la cual contiene a su vez el fichero `pass`:

```bash
diego@52a31b3d730e:~$ ls -la
total 36
drwxr-x--- 1 diego diego 4096 Jan  9  2025 .
drwxr-xr-x 1 root  root  4096 Jan  9  2025 ..
-rw-r--r-- 1 diego diego  233 Jan  9  2025 .bash_logout
-rw-r--r-- 1 diego diego 3771 Jan  9  2025 .bashrc
drwxrwxr-x 1 diego diego 4096 Jan  9  2025 .local
drwxrwxr-x 1 diego diego 4096 Jan 11  2025 .passroot
-rw-r--r-- 1 diego diego  807 Jan  9  2025 .profile
-rw-rw-r-- 1 diego diego   15 Jan  9  2025 pass
diego@52a31b3d730e:~$ ls -la .passroot/
total 12
drwxrwxr-x 1 diego diego 4096 Jan 11  2025 .
drwxr-x--- 1 diego diego 4096 Jan  9  2025 ..
-rw-rw-r-- 1 diego diego   21 Jan 11  2025 .pass
```

Parecería que dicho fichero contendría la contraseña del usuario `root`, pero de nuevo no es así:

```bash
diego@52a31b3d730e:~$ cat .passroot/.pass
YWNhdGFtcG9jb2VzdGE=
diego@52a31b3d730e:~$ echo "YWNhdGFtcG9jb2VzdGE=" | base64 -d; echo
acatampocoesta
diego@52a31b3d730e:~$ su root
Password: 
su: Authentication failure
```

Revisando los ficheros que pertenezcan al usuario `root`, y que podamos leer, encontramos uno que no hemos llegado a ver al revisar la carpeta del usuario `diego`:

```bash
diego@52a31b3d730e:~$ find / -readable -user root 2>/dev/null | grep -vE "/proc|/sys|/var/lib|/usr|/dev|/etc/ssl|/run|/etc/apache2|/etc/apt|/var|/etc"
/
/home
/home/diego/.local/share/.-
/opt
/boot
/media
/tmp
/mnt
/srv
/bin
/lib64
/lib
/sbin
/.dockerenv
/lib.usr-is-merged
```

El contenido de dicho fichero es un acertijo que, de resolverlo, podremos acceder como el usuario `root`, ya que la contraseña es la respuesta al acertijo:

```bash
diego@52a31b3d730e:~$ cat /home/diego/.local/share/.-

password de root

En un mundo de hielo, me muevo sin prisa,
con un pelaje que brilla, como la brisa.
No soy un rey, pero en cuentos soy fiel,
de un color inusual, como el cielo y el mar
tambien.
Soy amigo de los ni~nos, en historias de
ensue~no.
Quien soy, que en el frio encuentro mi due~no?
```

*Pista*: La contraseña sigue el mismo patrón que las anteriores que hemos encontrado.

```bash
diego@52a31b3d730e:/home$ su root
Password: 
root@52a31b3d730e:/home# whoami
root
```

Con esto, habremos completado el laboratorio!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>