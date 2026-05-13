import { StyleSheet, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';

import { theme } from '../../constants/theme';

type SearchFieldProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
};

export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  return (
    <View style={styles.wrap}>
      <Search size={18} color={theme.slate500} strokeWidth={2} />
      <TextInput
        style={styles.input}
        placeholder={placeholder}
        placeholderTextColor={theme.slate500}
        value={value}
        onChangeText={onChangeText}
        clearButtonMode="while-editing"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: theme.radiusMd,
    paddingHorizontal: 12,
    paddingVertical: 10,
    backgroundColor: theme.white,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: theme.slate900,
    paddingVertical: 0,
  },
});
