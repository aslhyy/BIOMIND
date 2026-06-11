declare module '@/services/auth' {
    export interface RegistroForm {
        correo: string;
        contrasena: string;
        nombre: string;
        identificacion: string;
        programaId?: string | null;
        programa?: string | null;
        fotoPerfilBase64?: string | null;
        fotoPerfilMimeType?: string;
    }
}

export interface RegistroResponse {
    correo: string;
    nombre: string;
    fotoUrl: string | null;
    rol: string | null;
}

export interface IniciarSesionResponse {
    user: any;
    profile: any;
}

export interface ReenviarCorreoResponse {
    correo: string;
}

export interface ActualizarPerfilChanges {
    nombre?: string;
    programa?: string | null;
    ficha?: string | null;
    fotoPerfilBase64?: string | null;
    fotoPerfilMimeType?: string;
}

export function registrar(form: RegistroForm): Promise<RegistroResponse>;
export function iniciarSesion(correo: string, contrasena: string): Promise<IniciarSesionResponse>;
export function reenviarCorreoVerificacion(correo: string, contrasena: string): Promise<ReenviarCorreoResponse>;
export function enviarRecuperacionContrasena(correo: string): Promise<void>;
export function cerrarSesion(): Promise<void>;
export function actualizarPerfilUsuario(changes: ActualizarPerfilChanges): Promise<any>;
