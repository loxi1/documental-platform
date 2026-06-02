export const NatsSubjects = {
  AuthLogin: 'auth.login',
  AuthSelectContext: 'auth.select-context',
  AuthValidateToken: 'auth.validate-token',

  DocumentoSubido: 'documento.subido',
  DocumentoClasificado: 'documento.clasificado',
  DocumentoValidado: 'documento.validado',

  OcrProcesarArchivo: 'ocr.procesar-archivo',
} as const;

export type NatsSubject =
  (typeof NatsSubjects)[keyof typeof NatsSubjects];
