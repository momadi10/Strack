import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { Category, CATEGORY_CONFIG } from '../types';
import { useData } from '../context/DataContext';

interface CategoryIconProps {
  category: Category;
  size?: number;
  showLabel?: boolean;
  color?: string;
  icon?: string;
}

export const CategoryIcon: React.FC<CategoryIconProps> = ({
  category,
  size = 24,
  showLabel = false,
  color,
  icon,
}) => {
  const { getCategoryById } = useData();
  const dbCategory = getCategoryById(category as string);
  const config = CATEGORY_CONFIG[category as keyof typeof CATEGORY_CONFIG];

  // Priority: 1. Manual props, 2. Database config, 3. Hardcoded defaults, 4. Fallback
  const displayIcon = icon || dbCategory?.icon || config?.icon || 'ellipse';
  const displayColor = color || dbCategory?.color || config?.color || '#6B7280';
  const displayBg = config?.bgColor || `${displayColor}20`; // 20% opacity
  const displayName = dbCategory?.name || config?.name || category;

  const isEmoji = (str: string | undefined | null) => {
    if (!str || typeof str !== 'string') return true;
    // Simple heuristic: if it contains alphanumeric but isn't a known ionicon name
    if (/^[a-z\-]+$/.test(str) && str.length > 2 && !['food', 'gift', 'other'].includes(str)) {
      return false;
    }
    return true;
  };

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.iconContainer,
          {
            backgroundColor: displayBg,
            width: size * 1.8,
            height: size * 1.8,
            borderRadius: size * 0.5,
          },
        ]}
      >
        {isEmoji(displayIcon) ? (
          <Text style={{ fontSize: size }}>{displayIcon}</Text>
        ) : (
          <Ionicons
            name={displayIcon as any}
            size={size}
            color={displayColor}
          />
        )}
      </View>
      {showLabel && (
        <Text style={styles.label} numberOfLines={1}>
          {displayName}
        </Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
  },
  iconContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    marginTop: 4,
    fontSize: 10,
    color: '#6B7280',
    textAlign: 'center',
  },
});
