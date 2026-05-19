import { Image } from 'expo-image';
import { StyleSheet, Text, View } from 'react-native';
import { instructorPalette } from '@/features/instructor/theme';

type UserAvatarProps = {
  name: string;
  photoUrl?: string | null;
  size?: number;
};

export function UserAvatar({ name, photoUrl, size = 68 }: UserAvatarProps) {
  const initials =
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase())
      .join('') || 'BM';

  if (photoUrl) {
    return (
      <Image
        source={{ uri: photoUrl }}
        style={{ width: size, height: size, borderRadius: size / 2 }}
        contentFit="cover"
      />
    );
  }

  return (
    <View style={[styles.fallback, { width: size, height: size, borderRadius: size / 2 }]}>
      <Text style={[styles.initials, { fontSize: size * 0.34 }]}>{initials}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  fallback: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: instructorPalette.primary,
    borderWidth: 3,
    borderColor: instructorPalette.surface,
  },
  initials: {
    color: instructorPalette.surface,
    fontFamily: 'PoppinsSemiBold',
  },
});
