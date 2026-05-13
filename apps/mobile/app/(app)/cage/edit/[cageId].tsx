import { useLocalSearchParams } from 'expo-router';
import { View } from 'react-native';

import { CageFormScreen } from '../../../../components/forms/CageFormScreen';

export default function ModifierCageRoute() {
  const { cageId } = useLocalSearchParams<{ cageId: string }>();
  const id = Array.isArray(cageId) ? cageId[0] : cageId;
  if (!id) return <View />;
  return <CageFormScreen mode="edit" cageId={id} />;
}
