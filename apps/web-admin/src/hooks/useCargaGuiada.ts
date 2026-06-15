import { useMutation } from "@tanstack/react-query";

import { subirDocumentoGuiado } from "@/services/carga-guiada";
import type { CargaGuiadaPayloadPreview } from "@/types/carga-guiada";

export function useSubirDocumentoGuiado() {
  return useMutation({
    mutationFn: ({
      payload,
      file,
    }: {
      payload: CargaGuiadaPayloadPreview;
      file: File;
    }) => subirDocumentoGuiado(payload, file),
  });
}
