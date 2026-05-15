import { useMemo } from 'react';
import { StyleSheet, TextInput, View } from 'react-native';
import { Search } from 'lucide-react-native';

import type { ThemeColors } from '../../constants/palettes';
import { useAppTheme } from '../../context/AppThemeContext';

type SearchFieldProps = {
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
};

function createSearchFieldStyles(theme: ThemeColors) {
  return StyleSheet.create({
    wrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderWidth: 1,
      borderColor: theme.border,
      borderRadius: theme.radiusMd,
      paddingHorizontal: 12,
      paddingVertical: 10,
      backgroundColor: theme.surfaceElevated,
    },
    input: {
      flex: 1,
      fontSize: 16,
      color: theme.slate900,
      paddingVertical: 0,
    },
  });
}

export function SearchField({ value, onChangeText, placeholder }: SearchFieldProps) {
  const { colors: theme } = useAppTheme();
  const styles = useMemo(() => createSearchFieldStyles(theme), [theme]);
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
