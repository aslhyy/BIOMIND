# Servicios cliente

Estos modulos se ejecutan dentro de la aplicacion Expo y por eso pertenecen al
frontend. Las pantallas y hooks los importan directamente durante la ejecucion.

- `firebase.js`: inicializa el SDK cliente de Firebase.
- `auth.js`: operaciones cliente de Firebase Authentication y perfiles.
- `academic.js`, `adminUsers.js`, `messages.ts`: lecturas y escrituras cliente
  de Firestore, autorizadas por las reglas ubicadas en `backend/firestore.rules`.
- `gemini.ts`: solicitud HTTP realizada actualmente desde el cliente.
- `speechRecognition.ts`: API de reconocimiento de voz del navegador.

No mover estos archivos a `backend/` sin reemplazarlos primero por endpoints de
un servidor, porque Metro/Expo necesita empaquetarlos con la aplicacion.

Las operaciones privilegiadas, secretos privados y futuros endpoints deben
implementarse dentro de `backend/`.
