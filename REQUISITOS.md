# ESPECIFICACIÓN DE REQUISITOS DE SOFTWARE (Estándar IEEE 830)
## Proyecto: "Babel Dúo" — Plataforma de Chat Multilingüe en Tiempo Real con Inteligencia Artificial

---

## 1. Formulación del Proyecto

### 1.1 Planteamiento del Problema
En el contexto de un mundo hiperconectado y globalizado, la comunicación digital se ha convertido en el pilar fundamental para el comercio internacional, la colaboración académica y el desarrollo de equipos multiculturales y distribuidos. A pesar de contar con herramientas de mensajería instantánea masivas (como WhatsApp, Slack o Microsoft Teams), todas ellas comparten un obstáculo crónico: **la barrera del lenguaje**.

Actualmente, cuando personas con distintos idiomas nativos interactúan, la conversación se torna asíncrona, ineficiente y propensa a malas interpretaciones. Los usuarios se ven obligados a copiar textos, abrir traductores externos de terceros, pegar el material obtenido de vuelta en la ventana de chat, y repetir el proceso de manera iterativa. Esto degrada drásticamente la fluidez conversacional, interrumpe el ritmo de las reuniones creativas y desmotiva a los participantes. Además, los estudiantes de idiomas carecen de espacios prácticos de inmersión conversacional directa donde la traducción sea inmediata, bidireccional y contextualizada.

**Descripción del Problema**: Se evidencia la ausencia de una solución interactiva de mensajería unificada que admita comunicación remota y traduzca en tiempo real cada mensaje enviado al idioma nativo predilecto de cada destinatario de forma invisible, fluida y con adaptabilidad a notas de audio y texto escrito.

---

### 1.2 Justificación
La conceptualización y realización de **Babel Dúo** se fundamenta en la erradicación inmediata de las fronteras lingüísticas dentro de entornos interactivos digitales. Al integrar la potencia de **React 19**, **Firebase (Authentication y Firestore en tiempo real)**, junto con el SDK oficial `@google/genai` conectado a los modelos de lenguaje a gran escala **Google Gemini**, el sistema redefine las comunicaciones globales. 

**Babel Dúo** mitiga el aislamiento idiomático permitiendo que, por ejemplo, un usuario en Tokio escriba en japonés, otro en Madrid lea e interactúe en español, y un tercero en Nueva York reciba los mensajes en inglés instantáneamente, y cada uno continúe redactando en su respectiva lengua nativa. No se trata simplemente de un traductor estático; se trata de una plataforma interactiva, responsiva, con simulación de llamadas, exportación de historiales y transcripción automática de voz a texto contextualizada. Esto incrementa de manera sustancial la eficiencia y la integración sociocultural en el ámbito corporativo y brinda un ecosistema de inmersión seguro para propósitos educativos.

---

### 1.3 Objetivo General
Desarrollar y desplegar una aplicación web de mensajería y salas de chat multilingües que integre traducción y transcripción automática en tiempo real mediante los modelos de Inteligencia Artificial de Google Gemini, empleando persistencia reactiva en la nube para ofrecer una experiencia conversacional fluida, intuitiva, inclusiva y libre de barreras idiomáticas.

#### Características del Objetivo General:
*   **Medible y Verificable**: El éxito se medirá bajo parámetros de latencia en la entrega de textos traducidos (inferor a 1.5s), efectividad de la transcripción, y accesibilidad del portal desde dispositivos inteligentes.
*   **Satisfacción de Necesidad**: Resuelve el problema de la traducción intrusiva proporcionando una interfaz limpia "uno a muchos" donde la traducción se almacena y se presenta en las preferencias del lector.
*   **Beneficiarios**: Equipos globales, estudiantes de pedagogía/idioma, y creadores digitales.

---

### 1.4 Objetivos Específicos
*   **Analizar e Investigar** las necesidades de los usuarios de equipos multiculturales para definir el mapa de interacciones ideales de mensajería instantánea.
*   **Diseñar y Modular** una base de datos distribuida en la nube con Firebase Firestore que permita estructurar de manera óptima las colecciones de usuarios, salas y mensajes multilingües con campos dinámicos para almacenar múltiples buffers de traducción.
*   **Desarrollar una Suite de Autenticación Tripartita**: Con soporte para registro por correo/contraseña, federación de identidad rápida con cuentas de Google, y un sistema alternativo de "Usuario Invitado" para pruebas dinámicas.
*   **Integrar los microservicios de IA de Gemini** para llevar a cabo de manera paralela la traducción del texto y el procesamiento de grabaciones de audio mediante transcripciones lógicas.
*   **Fortalecer e Implementar Políticas de Seguridad** perimetral basadas en reglas de acceso (`firestore.rules`) para proteger el aislamiento de los chats de cada usuario o grupo.
*   **Desplegar la Solución en Internet** mediante el orquestador de contenedores Cloud Run y probar su compatibilidad multiplataforma.

---

### 1.5 Alcance del Proyecto
La aplicación consta de las siguientes capacidades operativas listas para producción:
*   **Módulo de Registro y Autenticación**: Soporta registro local, inicio de sesión seguro, autenticación vía Google OAuth y creación inmediata de perfiles de clientes de tipo invitado de duración limitada.
*   **Gestión Dinámica de Perfiles**: Ajuste de nombres en pantalla, fotografía o avatar, catálogo de intereses temáticos e idioma de destino predeterminado del sistema (soporte para 9 lenguas internacionales clave).
*   **Control y Creación de Salas de Chat**: Generación de salas públicas para exploración libre y salas privadas protegidas que exigen un código alfanumérico único para unirse de forma exclusiva. Soportan funciones avanzadas como indicación de usuario escribiendo en tiempo real y panel informativo de miembros.
*   **Mensajería Reactiva Multilingüe**: Envío y recepción inmediata de mensajes traducidos dinámicamente mediante Gemini al idioma del lector según su perfil. Envío y transcripción integrada de notas de audio mediante la Web Audio API.
*   **Simulaciones Multimedia**: Acciones rápidas de prueba dentro del chat para disparar llamadas de audio grupales y videollamadas representativas.
*   **Exportación del Historial**: Herramienta integrada para renderizar y descargar todo el registro de conversaciones de la sala activa a formatos portables JPEG (Imagen) y PDF.

#### Limitaciones (Fuera de Alcance Inicial):
*   No implementa enrutamiento de llamadas VoIP basadas en estándares SIP/P2P reales sobre WebRTC, operando únicamente en modo simulación de interfaz.
*   La suite está orientada y optimizada para su ejecución adaptada en navegadores web (mobile first web app), por lo cual quedan excluidas distribuciones nativas dirigidas a tiendas externas `.apk` o `.ipa`.
*   La personalización estética detallada de temas por parte del usuario final queda fuera del alcance inicial.

---

### 1.6 Beneficiarios
*   **Colaboradores y Equipos Distribuidos (PYMEs y Corporaciones)**: Profesionales remotos que requieren conectarse fluidamente con socios de otros países sin incurrir en costes masivos de traductores humanos oficiales.
*   **Estudiantes y Centros Educativos de Idiomas**: Usuarios en dinámicas de intercambio lingüístico directo que interactúan con hablantes reales, disponiendo del chat interactivo como lienzo de soporte y autoevaluación.
*   **Desarrolladores y Tech Leads**: Profesionales que busquen un patrón arquitectónico real en la nube que articule de manera sincronizada Firebase y las bondades generativas de Gemini en node.js.
*   **Usuarios de Uso Casual**: Personas interesadas en interactuar en círculos con temas en común de forma segura y sin necesidad de instalaciones complejas.

---

### 1.7 Impacto
*   **Impacto Social**: Derriba la brecha del lenguaje que fractura comunidades digitales, abriendo espacio para la inclusión cultural activa y la democratización del conocimiento compartido.
*   **Impacto Económico**: Reduce de manera categórica los presupuestos que las organizaciones destinan a software puente de traducción, incrementando las tasas de rendimiento y disminuyendo contratiempos por malentendidos de trabajo.
*   **Impacto Ambiental**: Sustituye la necesidad de imprimir historiales de foros de discusión y agendas de trabajo internacionales al digitalizar, archivar y exportar documentos directamente mediante PDF y visualizadores livianos directamente desde la nube de Cloud Run.
*   **Impacto Tecnológico**: Establece un precedente de integración arquitectónica en tiempo real de modelos fundacionales de Inteligencia Artificial (Gemini) aplicados directamente a workflows colaborativos síncronos, promoviendo la adopción de stacks reactivos modernos de alto rendimiento.

---

### 1.8 Restricciones del Proyecto
*   **Tiempo de Desarrollo**: El software y su documentación de requisitos deben culminar en un lapso planificado de semanas predefinido por el Bootcamp de Talento Tech.
*   **Dependencia Tecnológica**: La aplicación móvil/web tiene alta dependencia de la estabilidad de la API de Firebase Firestore y la cuota operativa asignada para la API de Google Gemini en la región especificada.
*   **Presupuesto cero**: Proyecto financiado en su totalidad con tecnologías y plataformas de capa abierta (Free Tier) proporcionados para fines académicos por el equipo desarrollador.

---

### 1.9 Riesgos
*   **Agotamiento de cuotas de API**: Al usar Gemini en tiempo real para traducción paralela constante, se corre el riesgo de suspender la mensajería si el volumen de solicitudes excede la cuota gratuita asignada (Rate Limits).
*   **Problemas de Conectividad Intermitente**: Dado que es una aplicación basada en tiempo real en la nube, el sistema experimentará retrasos o inconsistencias si la red local del usuario final experimenta pérdidas de paquetes.

---

### 1.10 Resultado
La entrega comprende la aplicación web integrada interactiva **"Babel Dúo"**, construida sobre React + Vite en el Frontend, NodeJS + Express en el Servidor Intermedio de IA, Firebase Firestore / Auth para gestión reactiva de persistencia, totalmente desplegada en contenedores Cloud Run accesibles desde Internet.

---
---

## 2. Requisitos Funcionales (RF) de Acuerdo al Sistema Babel Dúo

A continuación se enlistan los Requisitos Funcionales ordenados sistemáticamente por secciones técnicas, redactados formalmente:

### Sección 2.1: Gestión de Usuarios (RF-USU)

#### RF-USU-01: Creación de Cuenta y Registro Local con Credenciales
- **Descripción**: El sistema debe permitir a cualquier usuario nuevo crear una cuenta ingresando su nombre, dirección de correo electrónico válido y una contraseña que cumpla con los estándares de seguridad mínimos (al menos 6 caracteres alfanuméricos).
- **Entrada**: Nombre, correo electrónico y contraseña.
- **Salida**: Cuenta creada exitosamente en Firebase Authentication, inicialización de perfil en base de datos y envío al panel principal del chat de salas.

#### RF-USU-02: Inicio de Sesión Tradicional (Login)
- **Descripción**: El sistema debe autenticar a los usuarios permitiendo el ingreso seguro mediante la introducción del correo electrónico registrado y su contraseña correspondiente.
- **Entrada**: Correo electrónico y contraseña.
- **Salida**: Generación de token JWT de sesión persistente local, redirección automática a la lista de salas y restauración del estado de su última sesión.

#### RF-USU-03: Inicio de Sesión Federado con Google Accounts
- **Descripción**: El sistema debe habilitar el inicio de sesión automático y seguro utilizando el protocolo de autenticación externa Google OAuth (Google Sign-In), permitiendo el ingreso sin necesidad de contraseñas locales.
- **Entrada**: Acción de clic en botón "Iniciar sesión con Google" y confirmación en ventana emergente o redirección de Google.
- **Salida**: Lectura de datos básicos (correo, nombre, avatar de perfil), creación de perfil automático sincronizado en Firestore y asignación de credenciales activas del sistema.

#### RF-USU-04: Acceso Temporal Bajo Modalidad de Invitado (Guest Account)
- **Descripción**: El sistema debe facultar a los usuarios para explorar la aplicación interactiva rápidamente como "Usuario Invitado", auto-generando para ellos un perfil de prueba temporal sin exigir registro de correo previo.
- **Entrada**: Clic en opción "Entrar como Invitado".
- **Salida**: Generación de un perfil temporal en Firestore (`isGuest: true`) con un nombre aleatorio (e.g. *Aventurero Babel*), permitiéndole unirse a salas durante la validez de la cookie efímera.

#### RF-USU-05: Cierre de Sesión (Logout)
- **Descripción**: El sistema debe proveer al usuario autenticado un mecanismo claro en pantalla para cerrar la sesión actual de manera definitiva, borrando credenciales en caché y revocando la suscripción en tiempo real a las colecciones de la base de datos.
- **Entrada**: Interacción física con botón o icono de "Cerrar sesión" en menú de navegación.
- **Salida**: Regreso inmediato a la pantalla principal de registro/bienvenida (Auth) y destrucción segura de datos sensibles en el storage del navegador.

---

### Sección 2.2: Gestión de Perfiles (RF-PER)

#### RF-PER-01: Configuración del Idioma Primario de Interfaz y Traducción
- **Descripción**: El sistema debe de permitir al usuario definir y editar su idioma de preferencia dentro de una lista de 9 lenguajes globales preestablecidos (Español, Inglés, Francés, Alemán, Italiano, Portugués, Chino, Japonés, Coreano) en cualquier momento.
- **Entrada**: Selección de opción de idioma dentro de un menú desplegable.
- **Salida**: Actualización persistente del idioma del usuario en la colección `/users` de Firestore. Todo mensaje posterior recibido por este usuario en cualquier sala activa se renderizará automáticamente a este idioma.

#### RF-PER-02: Personalización de Metadatos del Perfil (displayName y Avatar)
- **Descripción**: El sistema debe de permitir al usuario modificar su nombre en pantalla y su fotografía de perfil o avatar para efectos de identificación visual en salas de chat grupales.
- **Entrada**: Texto editado con nuevo nombre e interacción para seleccionar imágenes tipo avatar preestablecido.
- **Salida**: Cambio reflejado inmediatamente en todos los componentes de chat activos y almacenamiento concurrente en la colección de perfiles.

#### RF-PER-03: Gestión de Tags de Interés Personalizado
- **Descripción**: El sistema debe permitir al usuario agregar, eliminar o editar etiquetas rápidas que representen sus temas de interés personal o académico en su información pública de perfil.
- **Entrada**: Escritura de interés y acción de añadir.
- **Salida**: Chips de intereses actualizados dinámicamente y presentados en el panel informativo lateral de integrantes dentro del chat de sala activo.

---

### Sección 2.3: Gestión de Salas de Chat y Colaboración (RF-SAL)

#### RF-SAL-01: Creación de Salas Nuevas (Públicas o Privadas)
- **Descripción**: El sistema debe de permitir a cualquier usuario autenticado actuar como administrador de sala a través de la creación y registro de una nueva sala de conversación, otorgando campos descriptivos y definiendo la visibilidad de acceso.
- **Entrada**: Formulario con Nombre de la Sala, descripción breve, temas, selección de visibilidad ("Pública" o "Privada con invitación").
- **Salida**: Inserción de un nuevo registro en la colección `/rooms` de Firestore con el `uid` del creador como propietario, auto-generación de un código exclusivo de invitación de seis caracteres, y redirección a la interfaz del chat activo.

#### RF-SAL-02: Búsqueda y Filtrado de Salas Públicas
- **Descripción**: El sistema debe proporcionar un buscador dinámico en tiempo real que permita a los usuarios listar, buscar y filtrar salas públicas creadas recientemente por palabras clave de su descripción u opciones del nombre.
- **Entrada**: Texto digitado en la barra de búsqueda de salas.
- **Salida**: Listado interactivo en pantalla filtrado con las coincidencias encontradas de forma asíncrona.

#### RF-SAL-03: Ingreso a Salas Privadas Mediante Código de Invitación
- **Descripción**: El sistema debe validar el ingreso de un usuario a una sala de chat con estatus privado única y exclusivamente si el aspirante digita de manera idéntica el código exclusivo de invitación generado por el creador.
- **Entrada**: Cadena de texto de 6 caracteres introducida en el formulario de "Unirse a Sala".
- **Salida**: Redirección inmediata a la sala en caso de coincidencia exitosa con la base de datos e inclusión automática del `uid` en el arreglo de miembros (`members`) de la sala.

#### RF-SAL-04: Eliminación y Abandono de Salas (Gestión de Roles)
- **Descripción**: El sistema debe permitir al propietario de una sala cerrarla o eliminarla definitivamente, y al resto de miembros invitados, salirse o abandonar el grupo de manera independiente.
- **Entrada**: Clic en botón "Eliminar Sala" (disponible solo si `userID == room.createdBy`) o botón "Salir de la Sala".
- **Salida**: Notificación en cascada y re-enrutamiento automático de los usuarios que estaban dentro de la sala destruida de vuelta al panel principal de listado de salas.

---

### Sección 2.4: Mensajería, Audio y Traducción en Tiempo Real (RF-MSJ)

#### RF-MSJ-01: Envío y Recepción de Mensajería en Tiempo Real con Firestore Snapshots
- **Descripción**: El sistema debe distribuir los mensajes que se cursen dentro de una sala en tiempo real de forma instantánea a todos los suscriptores activos de la misma, actualizando los elementos de la interfaz automáticamente del lado del cliente.
- **Entrada**: Introducción de texto en la caja de mensajería y acción de clic en enviar o pulsación del botón Enter.
- **Salida**: Registro del mensaje creado bajo un modelo de datos estructurado en la colección `/messages` y renderizado instantáneo en los chats activos.

#### RF-MSJ-02: Traducción Simultánea Asistida por Inteligencia Artificial (Gemini Pro)
- **Descripción**: El sistema debe interceptar cada texto enviado y activar un agente traductor mediante el SDK de Gemini para procesar conversiones semánticas a los diferentes idiomas correspondientes a los integrantes activos dentro de la sala de chat, persistiendo las traducciones optimizadas en el cuerpo del mensaje original.
- **Entrada**: Contenido del mensaje original y lista de idiomas nativos de los miembros destinatarios de la sala.
- **Salida**: Mapa de propiedades mapeado como `translations: { "es": "hola", "en": "hello", "ja": "こんにちは" }`. El frontend visualiza el texto correspondiente al idioma guardado en el perfil del cliente lector.

#### RF-MSJ-03: Grabación y Transcripción de Audio Avanzado (Speech-to-Text integrado con Gemini)
- **Descripción**: El sistema debe permitir al usuario grabar clips de su voz directamente desde su dispositivo y enviarlos al chat, en donde la tecnología Gemini en el backend procesará el audio para generar y renderizar de forma concurrente una transcripción textual exacta y su respectiva traducción.
- **Entrada**: Grabación de flujo de voz utilizando la Web Audio API del navegador (en formato base64 codificado).
- **Salida**: Envío del clip al backend, procesamiento en el modelo Gemini multimodal, almacenamiento en Firestore como nota de voz con transcripción integrada y disponibilidad de reproducción en el chat.

#### RF-MSJ-04: Indicadores de Actividad de Escritura de Usuarios (Typing indicator)
- **Descripción**: El sistema debe alertar en tiempo real a los integrantes de una sala cuando uno o varios de sus compañeros se encuentran digitando contenido en el campo de texto.
- **Entrada**: Eventos de interacción de teclado (`onChange`) en el input del chat.
- **Salida**: Nombre del usuario renderizado en el pie del chat con la leyenda *"Nombre está escribiendo..."* que expira automáticamente tras breves segundos de inactividad de teclas.

#### RF-MSJ-05: Visualización de Estado de Lectura de Mensajes (Read Receipts)
- **Descripción**: El sistema debe registrar qué integrantes de una sala ya han leído cada uno de los mensajes enviados en la sala activa de conversación.
- **Entrada**: Visualización de la conversación por parte de un usuario que aún no posee su uid registrado en la colección de lectura del mensaje respectivo.
- **Salida**: Concurrente inserción del ID del usuario en el arreglo `readBy` de cada mensaje leído y visualización de un sutil cheque o contador de vistas.

#### RF-MSJ-06: Exportación de Mensajería y Conversas a PDF e Imagen (JPG)
- **Descripción**: El sistema debe permitir la exportación local completa de todo el historial de conversaciones y fotos visibles en pantalla de la sesión activa a un informe de alta definición estructurado para propósitos de respaldo o estudio.
- **Entrada**: Clic en opciones correspondientes de "Exportar a PDF" o "Exportar a Imagen".
- **Salida**: Procesamiento mediante librerías frontend especializadas (`jspdf` y `html-to-image`) y entrega directa del archivo final autodescargable al ordenador o dispositivo del usuario.

---
---

## 3. Requisitos Comunes de Interfaces Externas (IEEE 830 - Secc 3.1)

Esta sección describe cómo la aplicación interactúa con usuarios, hardware, otros componentes informáticos de software, y sistemas remotos de comunicaciones corporativas.

### 3.1 Interfaces de Usuario (UI)
*   **Paradigma Gráfico Conversacional (Estilo Clean Canva Style)**: La interfaz de usuario debe estar estructurada bajo una barra lateral de exploración adaptable y un lienzo de conversación de cuerpo central. Debe utilizar una paleta de color sofisticada basada en tonos azul marino real para elementos primarios (`#0a3d70`), acentos coral cálidos (`#ff6000`), verdes tipo bosque para opciones alternativas (`#005c53`), junto con grises sofisticados sobre fondos luminosos que impidan la fatiga visual.
*   **Transiciones y Micro-animaciones**: El portal gráfico implementará transiciones de movimiento reactivas en cambios de salas, modales de ingreso y listados staggered mediante la librería de animación declarativa **`motion`** de React, de modo que el software ofrezca experiencias orgánicas.
*   **Ventanas de Diálogo y Modales**: El ingreso de datos (tales como registro de códigos de invitaciones o configuraciones de perfiles rápidos) se presentará a través de capas sobrexpuestas (Modales) con fondos difuminados que enfoquen la concentración del cliente en la acción de interacción vigente.

### 3.2 Interfaces de Hardware
*   **Dispositivos de Pantalla e Interactividad**: Monitor o pantalla de terminal móvil sensible al tacto que renderice la aplicación web a una tasa estable de cuadros de interfaz sin lag de entrada.
*   **Periférico de Audio (Micrófono)**: El sistema requiere el acceso autorizado al hardware del micrófono de entrada física del usuario para capturar y digitalizar las secuencias de notas de audio cuando se use el envío de voz por chat.
*   **Dispositivos de Salida de audio**: Conectores o altavoces integrados para reproducir los archivos de audio de notas de voz enviadas de vuelta en el feed de mensajería.
*   **Cámara de Video (Para Simulaciones)**: Se requiere autorización para simular la visualización de llamadas interactivas, desplegando ventanas reactivas en pantalla para imitar enlaces remotos.

### 3.3 Interfaces de Software
*   **Firebase SDK (Auth Client & Firestore Realtime Sync)**: Módulo cliente que interactúa en tiempo real directamente con las bases globales en la nube de Google, administrando sesiones, guardado asincrónico y canales asíncronos WebSocket persistentes integrados de subida y bajada.
*   **Google Gemini Generative AI SDK (`@google/genai`)**: Consola servidora montada en NodeJS/Express que sirve de puente e interfaz API para pasar comandos semánticos multimodales al backend de los modelos de inteligencia de Google.
*   **Librerías de Renderizado y Exportación de Documentos**:
    *   **`jspdf`**: Para instanciar y estructurar el formateador que emite el reporte de chat a un archivo físico PDF en el dispositivo final.
    *   **`html-to-image`**: Para escanear el sub-árbol del DOM reactivo y transformarlo en una matriz de pixeles codificada en Base64 apta para guardarse en archivo de tipo imagen JPG.
*   **Lara Web Server Runtime**: Entorno Node v20/v22 operando en Cloud Run encargada de procesar las API asíncronas y el control de Vite.

### 3.4 Interfaces de Comunicación
*   **Protocolos HTTPS y TLS 1.3**: Es mandatorio el protocolo web cifrado sobre certificados SSL en todos los llamados internos o api endpoints para garantizar el resguardo estricto contra ataques de intercepción ("Man In The Middle").
*   **WebSockets (Canales de Firestore)**: Comunicación bidireccional continua de baja latencia entre el cliente web y Firestore para mantener la consistencia sincrónica absoluta de los mensajes en tiempo real.
*   **Web Audio API**: Interfaz nativa de los navegadores web utilizada para gestionar y extraer buffers de frecuencias de audio grabadas, codificándolas y facilitando el traspaso del flujo de datos en formato binario ligero.
*   **Estructura de Datos JSON**: Todas las cargas útiles que circulan entre cliente, base de datos de Firestore y el API servidor de Gemini deben de empaquetarse estrictamente bajo formato estructurado JSON con codificación UTF-8.

---
---

## 4. Requisitos No Funcionales (RNF) por Sección

Los atributos de calidad y limitaciones operacionales se estructuran formalmente en base a las siguientes directrices mensurables y verificables:

### Sección 4.1: Requisitos de Rendimiento (Performance)

*   **RNF-REND-01: Tiempo Máximo de Conclusión en Traducciones de Gemini**: La inteligencia artificial de Gemini debe procesar, catalogar y retornar la traducción del mensaje en todos los idiomas de la sala en un intervalo de tiempo inferior a **2.0 segundos** una vez ingresado el texto original, operando de fondo de forma imperceptible para el remitente.
    - *Criterio de Verificación*: Mediciones en el backend de Node analizando los tiempos transcurridos en los microservicios de la API mediante `performance.now()`.
*   **RNF-REND-02: Distribución en Tiempo Real de Mensajes**: El sistema de subscripción (Snapshot Listeners) debe sincronizar y pintar un mensaje nuevo en los clientes válidos suscritos a la sala en menos de **1.0 segundo** en condiciones estándares de red.
    - *Criterio de Verificación*: Auditoría instrumental a través de los tiempos de tráfico de WebSockets en el panel "Network" del navegador Chrome.
*   **RNF-REND-03: Ligereza y Eficiencia en Tiempos de Carga (Optimization)**: La interfaz Web React debe cumplir con parámetros de desempeño destacados por la Suite Lighthouse, manteniendo un tiempo máximo acumulado para primera renderización interactiva (FCP / FID) inferior a **1.8 segundos**.
    - *Criterio de Verificación*: Auditoría integrada Lighthouse en modo incógnito sobre un navegador móvil de referencia con red simulada 4G.

### Sección 4.2: Requisitos de Confiabilidad y Disponibilidad (Reliability)

*   **RNF-CONF-01: Disponibilidad Continua de Despliegue (Uptime)**: La plataforma Babel Dúo y su sistema de traducción deben sostener una disponibilidad operativa continua de nivel corporativo equivalente a un **99.9%** histórico acumulado mensualmente.
    - *Criterio de Verificación*: Análisis estadístico automático de ping a través de sondas de monitoreo continuas (como UptimeRobot o Google Cloud Monitoring) hacia el endpoint central `/api/health`.
*   **RNF-CONF-02: Tolerancia Activa a Fallos de Red y Reconexión Offline**: El sistema debe soportar bajas e interrupciones breves de conectividad del cliente actualizando el estatus de pantalla informativamente, y reconectarse reestableciendo los canales en un tiempo no mayor a **3.0 segundos** una vez restablecida la red física.
    - *Criterio de Verificación*: Desconexión manual simulada a través de software apagando interfaces inalámbricas durante flujos constantes de chat.

### Sección 4.3: Requisitos de Seguridad y Privacidad (Security)

*   **RNF-SEG-01: Reglas Perimetrales de Acceso a Base de Datos**: El sistema debe bloquear las solicitudes que violen la segregación de salas y la propiedad de los perfiles, de acuerdo con las configuraciones descritas en `firestore.rules`. Ningún usuario malintencionado debe poder ver ni manipular un mensaje de una sala privada externa.
    - *Criterio de Verificación*: Pruebas automated de aserciones de seguridad simuladas dentro de las herramientas de consola Firebase Simulator lanzando sentencias con tokens ajenos.
*   **RNF-SEG-02: Cifrado en Reposo y Tránsito**: Los datos e historiales de chat guardados deben estar encriptados por defecto de manera sólida en la base de datos distribuida en la nube de Google, complementándose obligatoriamente con el cifrado HTTPS TLS 1.3 en los flujos de tránsito.
    - *Criterio de Verificación*: Análisis del mapa de certificados SSL activos en el portal oficial mediante escaneos detallados de SSL Labs.

### Sección 4.4: Requisitos de Usabilidad y Accesibilidad (Usability)

*   **RNF-USAB-01: Curva Intuitiva de Aprendizado (Ux-Frictionless)**: Cualquier nuevo usuario de la aplicación Babel Dúo debe poder registrarse, unirse a una sala utilizando un código de invitación y despachar con éxito su primer mensaje de chat traducido en un tiempo total inferior a **1.5 minutos** sin necesidad de instructivos de ayuda.
    - *Criterio de Verificación*: Pruebas estadísticas acumuladas del método de recolección de usabilidad con un grupo muestra de usuarios sin conocimientos de la interfaz.
*   **RNF-USAB-02: Diseño Adaptativo Multiplataforma**: La interfaz debe acoplarse con fluidez responsiva en el rango completo de anchos de pantalla que abarca desde **320px** (Móviles de baja resolución) hasta monitores curvos más grandes de **1920px**, manteniendo legibilidad y usabilidad intachable sin desbordamientos de cajas de diálogo.
    - *Criterio de Verificación*: Pruebas exhaustivas simulando múltiples tamaños de viewport responsivos desde la suites gráficas de emuladores del sistema.

### Sección 4.5: Requisitos de Mantenibilidad y Portabilidad (Portability)

*   **RNF-MANT-01: Modularidad Líquida y Coherencia de Linter**: Todo el código fuente de Babel Dúo debe estructurarse mediante buenas prácticas que separen estrictamente lógica del negocio y lógica de visualización, debiendo compilar sin errores de dependencias internas.
    - *Criterio de Verificación*: Ejecución exitosa y limpia del comando de linter estático (`npm run lint`), garantizando un tipado perfecto.
*   **RNF-PORT-01: Compatibilidad Multi-Navegador Estándar (Cross-Browser)**: La aplicación web Babel Dúo debe visualizarse y operarse de manera idéntica en las últimas versiones estables de los navegadores de internet predominantes: Google Chrome, Mozilla Firefox, Apple Safari y Microsoft Edge.
    - *Criterio de Verificación*: Ejecución y testeo de la plataforma usando emuladores de motores Chromium, Gecko y WebKit directamente sobre el pipeline de pruebas de integración continua.
