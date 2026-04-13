# Protocolo de Gestión y Estándares de Repositorio Lakitu

## 1\. Configuración de Seguridad y Entorno

### 1.1 Gestión de Variables Sensibles (.env)

Se implementó una política de exclusión de archivos de configuración local para proteger credenciales críticas.

* Archivo .env.example: Plantilla que cada uno debe copiar localmente, renombrar  como .env y completar los valores correspondientes.

* Archivo .gitignore: Configurado para excluir el archivo .env para evitar que las credenciales sean subidas al repositorio. Nunca se debe forzar la subida de este archivo al repositorio.

### 1.2 Dependencias de Software (requirements.txt)

Para asegurar paridad de entornos de ejecución, se utiliza un archivo de requerimientos estandar.

* Instalación: Antes de empezar el desarrollo, ejecutar el comando pip install \-r requirements.txt.   
* Actualización: Si se agrega una nueva dependencia, actualizar el archivo ejecutando pip freeze \> requirements.txt y subir el cambio continuando el flujo de Pull Request.  
* Sincronización: Si un compañeroactualizó el archivo, los demás deben volver a ejecutar el comando de instalación enseguida después de hacer el pull. 

## 2\. Flujo de Trabajo y Gestión de Ramas

### 2.1 Ramas

Se utilizarán ramas por funcionalidad para mantener la estabilidad de la rama main siguiendo el siguiente estándar:

* feat/nombre-funcionalidad: Nuevas características.  
* fix/descripcion-error: Corrección de errores.  
* docs/descripcion-documento: Actualizaciones en /docs.

### 2.2 Commits

Los mensajes de commit deben ser descriptivos y seguir el estándar de Conventional Commits:

* feat: descripción: Nueva funcionalidad.  
* fix: descripción: Corrección de errores.  
* chore: descripción: Tareas de mantenimiento (Ej. actualizar el .gitignore).

### 2.3 Protocolo de Integración 

Dado que trabajamos en un repositorio privado sin cuenta paga, las reglas de protección de ramas se basan en un acuerdo del equipo. Se sigue el siguiente protocolo:

1. Sincronización Local: Antes de empezar cualquier tarea, asegurarse de tener la última versión del proyecto:

   git checkout main

   git pull origin main

2. Creación de una rama de trabajo: Crear una rama específica para la funcionalidad o corrección a realizar utilizando el estándar mencionado. 

   git checkout \-b nombre-de-la-rama

3. Commit y push: Luego de realizados los cambios, commitear con mensajes descriptivos y publicar la rama al repositorio.

   git add \<archivos a subir\>

   git commit \-m "tipo: descripcion"

   git push origin nombre-de-la-rama

4. Pull Request (PR): Ningún cambio se integra directamente a main. Todo debe pasar por un PR.  
   1. Ir a GitHub  
   2. Seleccionar “Compare & Pull Request”  
   3. Describir el trabajo realizado  
   4. Asignar a (al menos) un compañero como reviewer  
5. Approvals: Se requiere la revisión y aprobación de al menos un integrante del equipo antes de realizar el merge.   
   1. El reviewer revisa el código y deja comentarios si hay correcciones para hacer  
   2. Una vez que de el “Approve”, el que abrió el PR realiza el “Merge pull request”  
   3. Luego de la integración, se recomienda eliminar la rama de trabajo temporal.

