# Biomind

El repositorio esta separado en dos areas:

- `frontend/`: aplicacion Expo/React Native, componentes, servicios cliente y assets.
- `backend/`: configuracion de Firebase CLI y reglas de seguridad de Firestore.

Los comandos de Expo y npm se ejecutan desde `frontend/`. Los comandos de
Firebase se ejecutan desde `backend/`.

Importante: `frontend/services/` contiene adaptadores cliente usados
directamente por Expo; no es codigo servidor. El backend real existente esta
en `backend/` y actualmente consiste en la configuracion y reglas de Firebase.

Biomind es una aplicación móvil y web hecha con Expo, React Native, Firebase Authentication y Firestore. Su objetivo es acompañar procesos de biotecnología vegetal del SENA para tres tipos de usuario:

- Aprendiz: registra avances, revisa proyectos, bitácoras, evidencias y recibe apoyo de IA.
- Instructor: administra fichas, aprendices, proyectos, evidencias, seguimiento académico y apoyo de IA.
- Pasante: apoya fichas específicas asignadas por un instructor y solo debe acceder a información de esas fichas.

Aslhy ya construyó la interfaz completa y el flujo de autenticación base: bienvenida, registro, inicio de sesión, verificación de correo, recuperación de contraseña, perfiles por rol, navegación principal y vistas visuales para instructor, aprendiz y pasante. El siguiente trabajo grande es convertir los datos simulados en backend real, conectar Firebase correctamente y preparar los servicios de IA.

## Cómo Clonar Y Empezar A Trabajar

### 1. Clonar el proyecto

```bash
git clone URL_DEL_REPOSITORIO Biomind
cd Biomind
```

Si el repositorio ya está clonado:

```bash
cd Biomind
git pull
```

### 2. Instalar dependencias

```bash
npm install
```

### 3. Crear variables de entorno

Crear un archivo `.env` en la raíz tomando como guía `.env.example`.

```env
EXPO_PUBLIC_GEMINI_API_KEY=tu_api_key
EXPO_PUBLIC_GEMINI_MODEL=gemini-...
```

Nota: el chat con Gemini existe en código, pero actualmente no debe contarse como funcional hasta que se revise, se configure bien la API key, se validen permisos y se pruebe el flujo completo.

### 4. Ejecutar la app

```bash
npm start
```

Desde Expo se puede abrir en Android, iOS o navegador.

Comandos útiles:

```bash
npm run android
npm run ios
npm run web
npm run lint
node .\node_modules\typescript\bin\tsc --noEmit
```

### 5. Trabajar en ramas

Cada persona debe trabajar en una rama propia:

```bash
git checkout -b feature-nombrePersona
```

Ejemplos:

```bash
git checkout -b feature-mafe
git checkout -b feature-sarah
git checkout -b feature-aslhy
```

Antes de empezar cada día:

```bash
git pull
npm install
```

Antes de entregar cambios:

```bash
npm run lint
node .\node_modules\typescript\bin\tsc --noEmit
```

## Estado Actual

La app ya tiene:

- Registro con Firebase Auth.
- Verificación de correo obligatoria antes de iniciar sesión.
- Recuperación de contraseña con enlace oficial de Firebase.
- Documento de perfil en Firestore dentro de `usuarios`.
- Vistas separadas por rol.
- Actualización de perfil y foto guardada como `data:` URL en Firestore.
- Interfaz funcional de instructor, aprendiz y pasante.
- Estructura inicial para chat IA, mensajes y dictado de voz.

Importante: el chat con Gemini NO se considera funcional todavía. Existe código en `services/gemini.ts`, `services/messages.ts` y `features/workspace/components/GeminiAssistantModule.tsx`, pero falta revisarlo, configurarlo, probarlo y decidir si se mantiene Gemini o si se conecta a un backend Python de IA.

Todavía falta desarrollar:

- Backend real de fichas.
- Backend real de aprendices.
- Backend real de proyectos.
- Backend real de bitácoras/evidencias.
- Asignación de fichas a instructores y pasantes.
- Permisos de lectura/escritura por rol y ficha.
- Reemplazar mocks por consultas Firestore.
- Paneles CRUD reales.
- Métricas reales de progreso académico.
- Aplicación web usable para aprendiz e instructor.
- Servicio de IA para transcripción y conversación.

## IA, Transcripción Y Conversación

El proyecto necesita IA para dos usos principales:

1. Transcripción: convertir audio de aprendices e instructores en texto para bitácoras, observaciones, retroalimentaciones y dudas.
2. Conversación: asistente que ayude a aprendices e instructores según proyecto, ficha, rol e historial.

Recomendación técnica: usar un backend Python separado para IA, porque Python tiene mejores librerías, SDKs y herramientas para procesamiento de audio, transcripción, embeddings y agentes conversacionales.

### Backend Python Recomendado

Crear una carpeta nueva llamada:

`ai_backend/`

Estructura sugerida:

```text
ai_backend/
  main.py
  requirements.txt
  .env
  app/
    transcripcion.py
    conversacion.py
    prompts.py
    firebase_admin.py
    schemas.py
```

Librerías recomendadas:

```bash
fastapi
uvicorn
python-dotenv
pydantic
firebase-admin
openai
google-generativeai
faster-whisper
soundfile
pydub
python-multipart
```

Uso sugerido:

- `FastAPI`: crear endpoints HTTP para la app Expo.
- `uvicorn`: ejecutar el servidor local.
- `python-dotenv`: cargar API keys desde `.env`.
- `pydantic`: validar entradas y salidas.
- `firebase-admin`: leer contexto de Firestore si el asistente necesita ficha, proyecto o usuario.
- `faster-whisper`: transcripción local o semilocal de audio.
- `openai` o `google-generativeai`: conversación con modelos de IA.
- `python-multipart`: recibir archivos de audio desde la app.

Endpoints sugeridos:

```text
POST /transcribir
POST /chat/aprendiz
POST /chat/instructor
POST /resumir-bitacora
POST /generar-retroalimentacion
```

Secuencia recomendada:

1. Primero hacer que la app envíe audio al backend Python.
2. Luego transcribir audio a texto.
3. Luego guardar el texto en Firestore como borrador de bitácora u observación.
4. Luego conectar conversación IA con contexto real de Firestore.
5. Finalmente integrar respuestas del asistente en aprendiz e instructor.

Responsable recomendado: Aslhy debe montar la arquitectura base del backend Python y la conexión segura. Sarah conecta transcripción para aprendiz. Mafe conecta transcripción y retroalimentación para instructor.

## Reglas Del Producto

1. El aprendiz pertenece a una ficha y a un programa.
2. El instructor no registra programa ni ficha propia.
3. El pasante no registra programa ni ficha propia.
4. El instructor puede tener varias fichas asignadas.
5. El instructor puede asignar una o varias fichas a cada pasante.
6. El pasante solo debe ver información de las fichas que le fueron asignadas.
7. Cada ficha tiene aprendices, proyectos, bitácoras, competencias y evidencias.
8. El login exige correo verificado.
9. Si el correo no está verificado, no entra a la app y muestra aviso de verificación.
10. Si se borra un usuario solo en Firestore, la cuenta puede seguir existiendo en Firebase Auth. Para borrarla totalmente se debe borrar también en Authentication.
11. Aprendiz e instructor deben tener experiencia móvil y web.
12. La IA no debe responder sin contexto de rol, ficha y proyecto cuando aplique.

## Variables De Entorno

La app usa variables públicas de Expo para Gemini:

```env
EXPO_PUBLIC_GEMINI_API_KEY=tu_api_key
EXPO_PUBLIC_GEMINI_MODEL=gemini-...
```

Firebase está configurado en `services/firebase.js`.

Cuando se cree el backend Python, debe tener su propio `.env`:

```env
OPENAI_API_KEY=tu_api_key
GOOGLE_API_KEY=tu_api_key
FIREBASE_SERVICE_ACCOUNT_PATH=./serviceAccountKey.json
```

No subir llaves privadas al repositorio.

## Estructura General

### Raíz Del Proyecto

`app.json`

Configura Expo: nombre de la app, esquema `biomind`, iconos, splash screen, permisos de galería/cámara, web output y plugins. También declara `expo-router`, `expo-font`, `expo-image-picker` y `expo-web-browser`.

`package.json`

Define dependencias y scripts. Aquí están Expo, React Native, Firebase, navegación, iconos, AsyncStorage, Gemini indirectamente por servicios propios y herramientas de lint.

`package-lock.json`

Bloquea versiones exactas instaladas por npm. No se edita manualmente.

`tsconfig.json`

Configura TypeScript. Permite imports con alias como `@/features/...`.

`eslint.config.js`

Configura lint con Expo/ESLint.

`babel.config.js`

Configura Babel con `babel-preset-expo`.

`firestore.rules`

Reglas actuales de Firestore. De momento solo protege `usuarios`. En backend se deben ampliar reglas para fichas, proyectos, bitácoras, competencias, dudas, mensajes y evidencias.

`App.js`

Archivo vacío/heredado. La entrada real la maneja Expo Router con `expo-router/entry`.

`README.md`

Este documento. Explica arquitectura, archivos, estado actual y plan de backend.

### Carpeta `app`

`app/_layout.tsx`

Layout raíz de Expo Router. Declara las rutas `index` y `dashboard/dashboard`, oculta headers y envuelve la app con `SafeAreaProvider`.

`app/index.tsx`

Pantalla inicial. Usa `useAuth()`. Si no hay sesión, muestra `AuthScreen`. Si hay sesión, redirige al dashboard.

`app/dashboard/dashboard.tsx`

Pantalla principal autenticada. Crea el objeto `session` con datos de Firebase Auth y Firestore. Según el rol monta:

- `InstructorWorkspace`
- `PasanteWorkspace`
- `LearnerWorkspace`

También normaliza `fichasAsignadas` y protege la vista de pasante con un guard de errores.

### Carpeta `services`

`services/firebase.js`

Inicializa Firebase App, Firebase Auth con persistencia en AsyncStorage y Firestore. Exporta `auth` y `db`.

`services/auth.js`

Contiene toda la lógica de autenticación:

- `registrar`
- `iniciarSesion`
- `reenviarCorreoVerificacion`
- `enviarRecuperacionContrasena`
- `cerrarSesion`
- `actualizarPerfilUsuario`

También prepara fotos de perfil, crea documentos `usuarios`, restaura perfiles cuando Auth existe pero Firestore fue borrado y actualiza datos básicos.

`services/gemini.ts`

Servicio preparado para enviar mensajes al modelo Gemini. Actualmente debe revisarse antes de declararlo funcional: validar API key, modelo, permisos, manejo de errores y guardado del historial.

`services/messages.ts`

Servicio de mensajes del chat. Construye IDs por usuario/rol/proyecto, se suscribe a mensajes en Firestore y guarda el hilo del asistente.

`services/speechRecognition.ts`

Servicio para dictado de voz. Encapsula soporte de reconocimiento, inicio, parada, errores y resultados.

### Carpeta `hooks`

`hooks/useAuth.js`

Hook global de autenticación. Escucha `onAuthStateChanged`, carga el perfil desde Firestore con `onSnapshot` y expone `user`, `profile`, `loading` e `isAuthenticated`.

`hooks/use-color-scheme.ts`

Hook para detectar tema claro/oscuro.

`hooks/use-color-scheme.web.ts`

Versión web del hook de color scheme.

`hooks/use-theme-color.ts`

Hook para seleccionar colores de tema según modo.

### Carpeta `features/auth`

`features/auth/constants.ts`

Lista los roles disponibles: `Aprendiz`, `Instructor`, `Pasante`.

`features/auth/types.ts`

Define tipos usados por las pantallas de auth: alertas, vistas, datos pendientes de verificación y props.

`features/auth/utils/authFeedback.ts`

Valida correo y contraseña. Traduce errores de Firebase a mensajes entendibles para el usuario.

`features/auth/components/AuthScreen.tsx`

Contenedor principal de autenticación. Maneja estados de vista: bienvenida, login, registro y verificación. También muestra alertas.

`features/auth/components/WelcomeView.tsx`

Pantalla de bienvenida con botones para iniciar sesión o registrarse.

`features/auth/components/RegisterForm.tsx`

Formulario de registro. Permite elegir rol, foto, nombre, identificación, programa/ficha si aplica, correo y contraseña. Para instructor y pasante no exige programa ni ficha.

`features/auth/components/LoginForm.tsx`

Formulario de inicio de sesión. Valida credenciales, llama a `iniciarSesion`, muestra recuperación de contraseña y maneja cuenta no verificada.

`features/auth/components/VerifyEmailForm.tsx`

Pantalla para usuarios que deben confirmar correo. Permite reenviar verificación.

`features/auth/components/AuthAlertStack.tsx`

Renderiza alertas flotantes dentro del flujo de auth.

`features/auth/styles/*.ts`

Estilos separados para cada pantalla o componente de auth.

### Carpeta `features/instructor`

`features/instructor/data.ts`

Mocks actuales del instructor: métricas, fichas, aprendices, proyectos, preguntas, alertas y datos de perfil. En backend se reemplaza por consultas a Firestore.

`features/instructor/theme.ts`

Paleta visual del módulo instructor.

`features/instructor/components/InstructorWorkspace.tsx`

Shell principal del instructor. Controla pestañas, fuentes, filtros, bottom bar y monta las vistas internas.

`features/instructor/components/InstructorHomeTab.tsx`

Inicio del instructor con resumen de fichas, acciones, alertas y proyectos.

`features/instructor/components/InstructorLearnersTab.tsx`

Vista de aprendices. Muestra avance por ficha, filtro de aprendices, detalle individual y bitácoras.

`features/instructor/components/InstructorProjectsTab.tsx`

Vista visual de proyectos. Muestra CRUD simulado, detalle, guías, fotos, dudas y asignaciones.

`features/instructor/components/InstructorProfileTab.tsx`

Perfil del instructor. Permite editar nombre/foto y muestra fichas asignadas, progreso y preferencias.

`features/instructor/components/InstructorAssistantTab.tsx`

Vista antigua del asistente del instructor. Actualmente el asistente principal está montado desde `GeminiAssistantModule`.

`features/instructor/components/InstructorUI.tsx`

Componentes UI reutilizables: secciones, barras de progreso, badges, icon labels.

### Carpeta `features/learner`

`features/learner/data.ts`

Mocks actuales para aprendiz: proyectos, historial, preguntas, progreso y datos de ejemplo.

`features/learner/theme.ts`

Paleta visual del aprendiz.

`features/learner/components/LearnerWorkspace.tsx`

Shell principal del aprendiz. Controla pestañas, asistente, preferencias de voz y navegación inferior.

`features/learner/components/LearnerHomeTab.tsx`

Inicio del aprendiz con progreso, proyectos activos y acciones rápidas.

`features/learner/components/LearnerProjectsTab.tsx`

Vista de proyectos del aprendiz. Muestra estado de cultivos, guía, progreso y acceso al asistente.

`features/learner/components/LearnerHistoryTab.tsx`

Vista de historial/bitácora. Permite crear entradas locales simuladas y visualizar registros.

`features/learner/components/LearnerProfileTab.tsx`

Perfil del aprendiz. Edita nombre, trimestre y foto. Muestra programa, ficha y progreso.

`features/learner/components/LearnerSectionIntro.tsx`

Componente introductorio usado en secciones del aprendiz.

`features/learner/components/LearnerTrendChart.tsx`

Componente visual para tendencias/progreso.

`features/learner/components/LearnerUI.tsx`

Componentes UI compartidos del aprendiz.

### Carpeta `features/pasante`

`features/pasante/data.ts`

Mocks actuales para pasante: métricas, proyectos, tareas y fichas asociadas a proyectos simulados.

`features/pasante/theme.ts`

Paleta visual del pasante.

`features/pasante/components/PasanteWorkspace.tsx`

Shell principal del pasante. Controla pestañas, filtra proyectos/tareas por `fichasAsignadas`, muestra estado sin fichas, perfil y asistente solo cuando hay proyectos asignados.

### Carpeta `features/workspace`

`features/workspace/types.ts`

Tipos compartidos entre roles: sesión autenticada, prompts del asistente, proyectos y mensajes.

`features/workspace/components/UserAvatar.tsx`

Avatar reutilizable. Muestra foto si existe o iniciales si no hay foto.

`features/workspace/components/WorkspaceBottomBar.tsx`

Barra inferior compartida con cuatro tabs y botón central flotante para asistente.

`features/workspace/components/GeminiAssistantModule.tsx`

Módulo visual de chat con Gemini. Maneja selección de proyecto, prompts, historial, guardado en Firestore, dictado de voz y envío de mensajes, pero depende de que Aslhy revise y deje funcional el servicio IA.

`features/workspace/components/ObservationAssistantSheet.tsx`

Hoja/modal de apoyo para observaciones. Está disponible como componente compartido.

### Carpeta `components`

`components/AppButton.tsx`

Botón base de la app.

`components/AppText.tsx`

Texto base reutilizable.

`components/Card.tsx`

Tarjeta genérica.

`components/PrimaryButton.tsx`

Botón primario reutilizable.

`components/external-link.tsx`

Componente para abrir enlaces externos.

`components/haptic-tab.tsx`

Tab con feedback háptico.

`components/hello-wave.tsx`

Componente heredado de plantilla Expo.

`components/parallax-scroll-view.tsx`

ScrollView con efecto parallax, heredado de plantilla.

`components/themed-text.tsx`

Texto con soporte de tema.

`components/themed-view.tsx`

View con soporte de tema.

`components/ui/collapsible.tsx`

Componente colapsable.

`components/ui/icon-symbol.tsx`

Iconos simbólicos reutilizables.

`components/ui/icon-symbol.ios.tsx`

Versión iOS de iconos simbólicos.

### Carpeta `theme`

`theme/colors.ts`

Colores globales.

`theme/spacing.ts`

Espaciados globales.

`theme/typography.ts`

Tipografía global.

### Carpeta `constants`

`constants/theme.ts`

Constantes de tema heredadas o compartidas.

### Carpeta `assets`

`assets/images/*`

Imágenes de inicio, ingreso, iconos, splash, favicon y recursos heredados de Expo.

`assets/icons/key.png`

Icono de llave.

`assets/fonts/*`

Fuentes usadas por la app: Poppins y SulphurPoint.

### Carpeta `scripts`

`scripts/reset-project.js`

Script heredado de Expo para reiniciar el proyecto. No debe ejecutarse sin intención, porque mueve o limpia estructura de plantilla.

## Modelo De Datos Propuesto Para Backend

### `usuarios/{uid}`

```ts
{
  uid: string;
  nombre: string;
  identificacion: string;
  correo: string;
  rol: 'Aprendiz' | 'Instructor' | 'Pasante';
  programa: string | null;
  ficha: string | null;
  fichasAsignadas: string[];
  fotoUrl: string | null;
  trimestreActual: string | null;
  correoVerificado: boolean;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}
```

### `fichas/{fichaId}`

```ts
{
  codigo: string;
  programa: string;
  trimestreActual: string;
  instructorUid: string;
  pasantesUids: string[];
  aprendicesUids: string[];
  estado: 'activa' | 'inactiva';
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}
```

### `proyectos/{proyectoId}`

```ts
{
  titulo: string;
  especie: string;
  descripcion: string;
  fichaIds: string[];
  aprendizIds: string[];
  instructorUid: string;
  estado: 'activo' | 'pausado' | 'finalizado';
  progreso: number;
  guiaUrl: string | null;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}
```

### `bitacoras/{bitacoraId}`

```ts
{
  proyectoId: string;
  fichaId: string;
  aprendizUid: string;
  titulo: string;
  observacion: string;
  transcripcion: string | null;
  estado: 'borrador' | 'enviada' | 'revisada' | 'aprobada';
  imagenes: string[];
  retroalimentacion: string | null;
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}
```

### `competencias/{competenciaId}`

```ts
{
  fichaId: string;
  titulo: string;
  descripcion: string;
  trimestre: string;
  porcentaje: number;
  activa: boolean;
}
```

### `dudas/{dudaId}`

```ts
{
  proyectoId: string;
  fichaId: string;
  aprendizUid: string;
  instructorUid: string;
  pregunta: string;
  respuesta: string | null;
  estado: 'pendiente' | 'respondida';
  creadoEn: Timestamp;
  actualizadoEn: Timestamp;
}
```

### `mensajes/{chatId}`

Ya existe servicio para esta colección. Debe protegerse por `ownerUid` y permisos de rol.

## Reglas De Seguridad Requeridas

Se deben ampliar `firestore.rules` para:

1. Cada usuario puede leer y actualizar su propio perfil.
2. Instructor puede leer fichas donde `instructorUid == request.auth.uid`.
3. Instructor puede crear/editar proyectos de sus fichas.
4. Instructor puede leer aprendices de sus fichas.
5. Pasante puede leer solo fichas donde su uid esté en `pasantesUids`.
6. Pasante puede leer proyectos, bitácoras y aprendices solo de sus fichas asignadas.
7. Aprendiz puede leer solo su propia ficha, proyectos asignados y bitácoras propias.
8. Aprendiz puede crear bitácoras propias.
9. Instructor puede revisar bitácoras de sus fichas.
10. Nadie debe leer datos de fichas ajenas.
11. El backend Python de IA no debe usar llaves públicas desde la app; debe validar usuario y permisos antes de consultar Firestore.

## División Del Trabajo Por Sprints

### Roles Principales

Aslhy:

- Arquitectura Firebase.
- Reglas de seguridad.
- Servicios compartidos.
- Integración general.
- Backend Python de IA base.
- Revisión final y documentación.

Mafe:

- Módulo instructor.
- Fichas.
- Aprendices.
- Proyectos desde instructor.
- Asignación de pasantes.
- Retroalimentación y métricas académicas.
- Web del instructor.

Sarah:

- Módulo aprendiz.
- Módulo pasante.
- Bitácoras.
- Evidencias.
- Acceso por fichas asignadas.
- Transcripción para aprendiz.
- Web del aprendiz.

## Sprint 0: Preparación

Objetivo: dejar el proyecto corriendo y saber qué datos son mock.

Aslhy:

1. Crear rama `feature-aslhy`.
2. Ejecutar `npm install`.
3. Ejecutar `npm start`.
4. Confirmar registro, verificación, login, recuperación y logout.
5. Crear usuarios de prueba en Firebase Authentication:
   - `instructor@test.com`
   - `aprendiz@test.com`
   - `pasante@test.com`
6. Confirmar que cada usuario tenga documento en `usuarios`.
7. Revisar que `npm run web` abra la app en navegador.

Mafe:

1. Crear rama `feature-mafe`.
2. Revisar `features/instructor/data.ts`.
3. Revisar `InstructorWorkspace.tsx`, `InstructorHomeTab.tsx`, `InstructorLearnersTab.tsx`, `InstructorProjectsTab.tsx` e `InstructorProfileTab.tsx`.
4. Anotar qué datos necesita cada pantalla de instructor.
5. Entregar lista de campos reales para fichas, aprendices, proyectos y métricas.

Sarah:

1. Crear rama `feature-sarah`.
2. Revisar `features/learner/data.ts` y `features/pasante/data.ts`.
3. Revisar `LearnerWorkspace.tsx`, `LearnerHistoryTab.tsx`, `LearnerProjectsTab.tsx` y `PasanteWorkspace.tsx`.
4. Entregar lista de campos reales para proyectos, bitácoras, evidencias, tareas y fichas asignadas.

Entrega:

- App corre en móvil y web.
- Usuarios de prueba existen.
- Lista de mocks por rol queda clara.

## Sprint 1: Modelo Firestore Y Reglas Base

Objetivo: crear datos reales mínimos y reglas iniciales.

Aslhy:

2. Editar `firestore.rules`.
3. Crear helpers `isSignedIn()`, `isOwner(uid)`, `getUserRole()`, `isInstructor()`, `isAprendiz()` e `isPasante()`.
4. Agregar reglas para `usuarios`, `fichas`, `proyectos`, `bitacoras`, `competencias`, `dudas` y `mensajes`.
5. Crear datos manuales de prueba en Firestore.
6. Avisar a Mafe y Sarah cuando las colecciones base existan.

Mafe después de Aslhy:

1. Crear 2 documentos reales en `fichas`.
2. Asignar esas fichas al instructor de prueba con `instructorUid`.
3. Crear 3 aprendices por ficha en `usuarios`.
4. Confirmar que cada aprendiz tenga `programa`, `ficha` y `rol: 'Aprendiz'`.
5. Avisar a Sarah que ya hay fichas y aprendices para crear bitácoras.

Sarah después de Mafe:

1. Crear un usuario pasante de prueba.
2. Llenar `usuarios/{pasanteUid}.fichasAsignadas`.
3. Crear proyectos de prueba asociados a las fichas de Mafe.
4. Crear bitácoras de prueba para aprendices.
5. Confirmar que pasante no vea fichas no asignadas.

Entrega:

- Firestore tiene datos reales mínimos.
- Las reglas no permiten leer información ajena.
- Mafe y Sarah ya pueden conectar pantallas.

## Sprint 2: Servicios Compartidos

Objetivo: crear servicios antes de tocar pantallas.

Aslhy crea `services/users.ts`:

- `getUserProfile(uid)`
- `subscribeUserProfile(uid, callback)`
- `updateUserProfile(uid, changes)`
- `updateUserPhoto(uid, photoData)`

Aslhy crea `services/fichas.ts`:

- `subscribeInstructorFichas(instructorUid)`
- `subscribePasanteFichas(pasanteUid, fichasAsignadas)`
- `subscribeAprendizFicha(fichaCodigo)`
- `assignPasanteToFicha(pasanteUid, fichaId)`
- `removePasanteFromFicha(pasanteUid, fichaId)`

Aslhy crea `services/projects.ts`:

- `subscribeProjectsByFichaIds(fichaIds)`
- `createProject(projectData)`
- `updateProject(projectId, changes)`
- `assignProjectToFicha(projectId, fichaId)`
- `assignProjectToLearner(projectId, learnerUid)`

Mafe después de `services/fichas.ts` y `services/projects.ts` crea `features/instructor/services/instructorData.ts`:

- `subscribeInstructorDashboard(session)`
- `subscribeInstructorLearners(session)`
- `subscribeInstructorProjects(session)`
- `createInstructorProject(session, data)`
- `updateLearnerFeedback(bitacoraId, feedback)`
- `assignPasanteToInstructorFicha(session, pasanteUid, fichaId)`

Sarah después de `services/projects.ts` crea `features/learner/services/learnerData.ts`:

- `subscribeLearnerProjects(session)`
- `subscribeLearnerBitacoras(session)`
- `createLearnerBitacora(session, data)`
- `updateLearnerBitacora(bitacoraId, data)`

Sarah también crea `features/pasante/services/pasanteData.ts`:

- `subscribePasanteAssignedFichas(session)`
- `subscribePasanteProjects(session)`
- `subscribePasanteLearners(session)`
- `subscribePasanteTasks(session)`

Entrega:

- Servicios creados.
- Pantallas todavía pueden seguir usando mocks.
- Cada servicio se prueba con logs temporales.

## Sprint 3: Instructor Con Datos Reales

Objetivo: reemplazar mocks del instructor por Firestore.

Mafe:

1. Modificar `InstructorWorkspace.tsx` para cargar datos desde `instructorData.ts`.
2. Reemplazar fichas mock por `subscribeInstructorFichas`.
3. Reemplazar aprendices mock por aprendices reales de las fichas del instructor.
4. Reemplazar proyectos mock por `subscribeInstructorProjects`.
5. En `InstructorProjectsTab`, conectar crear proyecto, editar proyecto, asignar ficha y ver detalle real.
6. En `InstructorLearnersTab`, conectar listar aprendices por ficha, ver bitácoras por aprendiz y enviar retroalimentación.
7. En `InstructorProfileTab`, mostrar fichas reales asignadas.
8. Entregar a Sarah un flujo probado donde el instructor pueda ver bitácoras de aprendiz.

Aslhy:

1. Ajustar reglas si alguna consulta de Mafe falla.
2. Crear índices de Firestore si Firebase los pide.
3. Revisar que no se rompa auth ni navegación.

Sarah:

1. Crear bitácoras de prueba para que Mafe las vea.
2. Confirmar que los cambios de instructor no rompan aprendiz/pasante.

Entrega:

- Instructor trabaja con datos reales.
- Instructor ve solo sus fichas.
- Instructor puede crear proyectos reales.

## Sprint 4: Aprendiz Con Datos Reales

Objetivo: aprendiz usa proyectos, bitácoras y progreso reales.

Sarah:

1. Modificar `LearnerWorkspace.tsx` para cargar datos desde `learnerData.ts`.
2. Reemplazar proyectos mock por proyectos de su ficha.
3. Reemplazar historial local por `bitacoras` reales.
4. En `LearnerHistoryTab`, guardar bitácoras reales.
5. Agregar campo `transcripcion` a la bitácora cuando venga desde IA.
6. En `LearnerProjectsTab`, mostrar progreso real del proyecto.
7. En `LearnerProfileTab`, mostrar ficha/programa reales.
8. Conectar mensajes IA por proyecto real, pero solo después de que Aslhy confirme el backend IA o Gemini funcional.
9. Entregar a Mafe una bitácora creada por aprendiz para probar retroalimentación.

Aslhy:

1. Ajustar reglas para que aprendiz solo escriba sus bitácoras.
2. Crear validaciones de campos obligatorios.
3. Revisar errores de permisos.
4. Preparar endpoint Python `/transcribir` si ya se empieza IA.

Mafe después de Sarah:

1. Confirmar que la bitácora creada por aprendiz aparece en instructor.
2. Probar retroalimentación desde instructor.
3. Avisar a Sarah si falta algún campo para revisión académica.

Entrega:

- Aprendiz ve proyectos reales.
- Aprendiz crea bitácoras reales.
- Instructor ve y revisa esas bitácoras.

## Sprint 5: Pasante Con Datos Reales

Objetivo: pasante accede solo a fichas asignadas por instructor.

Sarah:

1. Modificar `PasanteWorkspace.tsx` para usar `fichasAsignadas` reales.
2. Reemplazar proyectos mock por proyectos de sus fichas.
3. Reemplazar tareas mock por tareas/evidencias reales.
4. Mostrar aprendices de las fichas asignadas.
5. Crear sección de seguimiento por ficha.
6. Bloquear visualmente cualquier pantalla si no hay fichas asignadas.

Mafe antes de la prueba final de Sarah:

1. Crear UI o acción para asignar fichas a pasantes desde instructor.
2. Actualizar `usuarios/{pasanteUid}.fichasAsignadas`.
3. Actualizar `fichas/{fichaId}.pasantesUids`.
4. Probar que al asignar ficha el pasante ve datos.
5. Probar que al quitar ficha el pasante deja de verlos.

Aslhy:

1. Reforzar reglas de seguridad para pasante.
2. Probar pasante sin fichas.
3. Probar pasante con una ficha.
4. Probar pasante con varias fichas.

Entrega:

- Pasante funciona con datos reales.
- Pasante solo ve sus fichas asignadas.
- Instructor controla asignaciones.

## Sprint 6: Evidencias, Fotos Y Archivos

Objetivo: guardar evidencias reales.

Aslhy:

1. Decidir si se usará Firebase Storage o base64 temporal en Firestore.
2. Recomendación: usar Firebase Storage.
3. Crear `services/storage.ts`.
4. Crear `uploadProfilePhoto`, `uploadEvidenceImage` y `deleteEvidenceImage`.
5. Ajustar reglas de Storage.

Sarah:

1. En aprendiz, permitir adjuntar imagen real a bitácora.
2. Guardar URL de imagen en `bitacoras.imagenes`.
3. Mostrar evidencias en historial.
4. Permitir adjuntar audio si se usará transcripción.

Mafe:

1. En instructor, mostrar evidencias de aprendices.
2. Permitir revisar evidencia.
3. Agregar retroalimentación.

Entrega:

- Fotos reales subidas.
- Evidencias visibles según permisos.
- Audio listo para transcripción si aplica.

## Sprint 7: IA De Transcripción Y Conversación

Objetivo: conectar IA de forma real, no solo visual.

Aslhy:

1. Crear carpeta `ai_backend/`.
2. Crear `requirements.txt`.
3. Crear `main.py` con FastAPI.
4. Crear endpoint `POST /transcribir`.
5. Crear endpoint `POST /chat/aprendiz`.
6. Crear endpoint `POST /chat/instructor`.
7. Conectar Firebase Admin para validar contexto.
8. Definir prompts base en `ai_backend/app/prompts.py`.
9. Documentar cómo ejecutar:

```bash
cd ai_backend
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
```

Sarah después de `/transcribir`:

1. Desde aprendiz, grabar o seleccionar audio.
2. Enviar audio al endpoint `/transcribir`.
3. Recibir texto.
4. Insertar texto en el formulario de bitácora.
5. Guardar la transcripción en `bitacoras.transcripcion`.

Mafe después de `/chat/instructor`:

1. En instructor, enviar contexto de ficha/proyecto/bitácora al asistente.
2. Pedir sugerencias de retroalimentación.
3. Insertar respuesta IA como borrador editable, no como respuesta final automática.
4. Guardar retroalimentación solo cuando el instructor confirme.

Entrega:

- Transcripción funcional para aprendiz.
- Conversación IA funcional para aprendiz e instructor.
- Gemini se elimina, se corrige o queda documentado como servicio alternativo.

## Sprint 8: Aplicación Web Para Aprendiz E Instructor

Objetivo: que aprendiz e instructor puedan usar la app también desde navegador.

Aslhy:

1. Ejecutar `npm run web`.
2. Revisar errores específicos de Expo Web.
3. Crear ajustes compartidos si algún componente no funciona en web.
4. Revisar rutas, auth y persistencia de sesión en navegador.

Mafe:

1. Probar todas las pantallas de instructor en web.
2. Ajustar layouts del instructor para escritorio: tablas más legibles, filtros visibles, panel de detalle más amplio y botones fáciles de ubicar.
3. Confirmar que crear proyecto y revisar bitácoras funcione en web.

Sarah:

1. Probar todas las pantallas de aprendiz en web.
2. Ajustar layouts del aprendiz para escritorio: proyectos en grilla, historial más legible, formulario de bitácora cómodo y carga de evidencias usable.
3. Confirmar que transcripción y chat funcionen en web si el navegador lo permite.

Entrega:

- Instructor puede trabajar desde web.
- Aprendiz puede trabajar desde web.
- Pasante puede seguir funcionando desde móvil y se revisa web si hay tiempo.

## Sprint 9: Métricas Y Progreso

Objetivo: calcular avance académico real.

Mafe:

1. Definir fórmula de progreso por ficha.
2. Calcular porcentaje de bitácoras entregadas, competencias completadas, evidencias revisadas y alertas pendientes.
3. Crear funciones de resumen para instructor.

Sarah:

1. Mostrar progreso real en aprendiz.
2. Mostrar progreso real en pasante por ficha.
3. Conectar gráficos.

Aslhy:

1. Crear helpers compartidos en `features/workspace/utils/progress.ts`.
2. Evitar duplicar cálculos.
3. Revisar rendimiento de consultas.

Entrega:

- Métricas reales.
- Avance coherente entre roles.

## Sprint 10: Calidad, Pruebas Y Cierre

Objetivo: estabilizar antes de entrega.

Todos:

1. Probar registro por rol.
2. Probar correo no verificado.
3. Probar recuperación de contraseña.
4. Probar instructor con varias fichas.
5. Probar aprendiz con ficha.
6. Probar pasante sin fichas.
7. Probar pasante con una ficha.
8. Probar pasante con varias fichas.
9. Probar permisos cruzados.
10. Probar creación de proyectos.
11. Probar bitácoras.
12. Probar evidencias.
13. Probar transcripción IA.
14. Probar chat IA.
15. Probar `npm run web`.

Aslhy:

1. Revisión final de auth, rules, servicios, IA y README.
2. Limpieza de mocks que ya no se usen.
3. Confirmar lint y TypeScript.

Mafe:

1. Revisión completa de instructor móvil.
2. Revisión completa de instructor web.
3. Confirmar que instructor cumple gestión académica.

Sarah:

1. Revisión completa de aprendiz móvil.
2. Revisión completa de aprendiz web.
3. Revisión completa de pasante.
4. Confirmar restricciones por ficha.

Entrega final:

- App conectada a backend.
- Roles funcionales.
- Permisos por ficha.
- IA de transcripción y conversación funcional.
- Web para aprendiz e instructor.
- Documentación actualizada.

## Orden Recomendado Para No Enredarse

1. No borren mocks hasta que el servicio real funcione.
2. Primero creen servicios compartidos.
3. Luego conecten una pantalla pequeña.
4. Luego conecten la vista completa.
5. Después borren mocks.
6. Siempre prueben reglas con usuarios reales.
7. Cada sprint debe terminar con `npm run lint` y `tsc --noEmit`.
8. La IA debe conectarse después de tener datos reales de proyecto/ficha.
9. La web debe probarse antes del cierre, no al final de la noche.

## Siguiente Archivo A Crear

El primer archivo recomendado es:

`services/fichas.ts`

Después:

`services/projects.ts`

Después:

`features/instructor/services/instructorData.ts`

Después:

`features/learner/services/learnerData.ts`

Después:

`features/pasante/services/pasanteData.ts`

Después, para IA:

`ai_backend/main.py`

Ese orden permite construir el backend de manera estable sin romper lo que ya hizo Aslhy en interfaz y autenticación.
