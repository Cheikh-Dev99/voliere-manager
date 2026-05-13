import { useLocalSearchParams } from 'expo-router';

import { CageFormScreen } from '../../../components/forms/CageFormScreen';

export default function NouvelleCageRoute() {
  const { voliere } = useLocalSearchParams<{ voliere?: string }>();
  const raw = Array.isArray(voliere) ? voliere[0] : voliere;
  return <CageFormScreen mode="create" defaultVoliere={raw?.trim() || 'A'} />;
}
