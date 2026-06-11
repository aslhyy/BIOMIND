# Backend

Esta carpeta contiene todo el backend real que existe actualmente en Biomind.
Por ahora, el backend es administrado por Firebase y esta compuesto por:

- `.firebaserc`: proyecto Firebase seleccionado.
- `firebase.json`: configuracion de Firebase CLI.
- `firestore.rules`: reglas de seguridad de Firestore.

Ejecuta los comandos de Firebase desde esta carpeta:

```bash
firebase deploy --only firestore:rules
```

Todavia no existe un servidor propio dentro de esta carpeta.

Cuando se agreguen Cloud Functions, Firebase Admin, FastAPI u otro servidor,
su codigo debe vivir aqui. El codigo servidor nunca debe importarse desde
`frontend/`.

Los archivos de `frontend/services/` no son backend: se ejecutan dentro de la
aplicacion Expo y usan el SDK cliente de Firebase. Su acceso a datos esta
protegido por `firestore.rules`.
