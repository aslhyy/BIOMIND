import { MaterialCommunityIcons } from '@expo/vector-icons';
import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';

type Props = {
  onClose: () => void;
  uri: string;
};

export function ImagePreviewModal({ onClose, uri }: Props) {
  return (
    <Modal animationType="fade" onRequestClose={onClose} transparent visible={Boolean(uri)}>
      <View style={styles.backdrop}>
        <Pressable
          accessibilityLabel="Cerrar imagen"
          hitSlop={14}
          onPress={onClose}
          style={styles.closeButton}>
          <MaterialCommunityIcons name="close" size={26} color="#FFFFFF" />
        </Pressable>
        {uri ? <Image resizeMode="contain" source={{ uri }} style={styles.image} /> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(5, 20, 18, 0.94)',
    flex: 1,
    justifyContent: 'center',
    padding: 18,
    paddingTop: 58,
  },
  closeButton: {
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 999,
    height: 44,
    justifyContent: 'center',
    marginBottom: 12,
    width: 44,
  },
  image: {
    flex: 1,
    width: '100%',
  },
});
