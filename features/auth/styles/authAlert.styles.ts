import { StyleSheet } from 'react-native';

export const authAlertStyles = StyleSheet.create({
  stack: {
    position: 'absolute',
    top: 54,
    left: 16,
    right: 16,
    zIndex: 50,
    gap: 12,
  },
  card: {
    position: 'relative',
    overflow: 'hidden',
    borderRadius: 28,
    paddingHorizontal: 18,
    paddingVertical: 17,
    borderWidth: 1.25,
    shadowOpacity: 0.18,
    shadowRadius: 18,
    elevation: 8,
  },
  glow: {
    position: 'absolute',
    top: -20,
    right: -10,
    width: 110,
    height: 70,
    borderRadius: 999,
    opacity: 0.42,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  iconWrap: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  content: {
    flex: 1,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 4,
  },
  message: {
    fontSize: 14,
    lineHeight: 20,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
});
