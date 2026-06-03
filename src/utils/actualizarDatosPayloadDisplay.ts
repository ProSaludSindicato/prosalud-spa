import { afpList } from '@/utils/afpNormalization';
import {
  bancos,
  estadosCiviles,
  municipios,
  nivelesEducativos,
  relacionesContactoEmergencia,
  tallasUniforme,
  tiposCuenta,
} from '@/components/actualizar-datos-personales/formOptions';
import { epsList } from '@/utils/epsNormalization';

type Option = { value: string; label: string };

function lookupOptionLabel(options: Option[], value: string): string {
  const trimmed = value.trim();
  const byValue = options.find((o) => o.value === trimmed);
  if (byValue) {
    return byValue.label;
  }

  const lower = trimmed.toLowerCase();
  const byValueInsensitive = options.find((o) => o.value.toLowerCase() === lower);
  if (byValueInsensitive) {
    return byValueInsensitive.label;
  }

  const byLabel = options.find((o) => o.label.toLowerCase() === lower);
  if (byLabel) {
    return byLabel.label;
  }

  return trimmed;
}

const FIELD_OPTION_MAP: Record<string, Option[]> = {
  eps: epsList,
  afp: afpList,
  banco: bancos,
  tipoCuenta: tiposCuenta,
  nivelEducativo: nivelesEducativos,
  municipio: municipios,
  estadoCivil: estadosCiviles,
  relacionContactoEmergencia: relacionesContactoEmergencia,
  tallaUniforme: tallasUniforme,
};

/**
 * Convierte slugs del formulario de actualización de datos al texto legible del catálogo.
 */
export function formatActualizarDatosFieldValue(fieldKey: string, value: unknown): string | null {
  if (typeof value !== 'string' || value.trim() === '') {
    return null;
  }

  const options = FIELD_OPTION_MAP[fieldKey];
  if (!options) {
    return null;
  }

  return lookupOptionLabel(options, value);
}
