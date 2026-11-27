import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Ionicons from 'react-native-vector-icons/Ionicons';

// One look for every toast in the app: a rounded pill with an icon and white
// text, aligned to the right under the header. The color and icon follow the
// toast type; success uses the Valens purple.
const VARIANTS = {
  success: { backgroundColor: '#5A2D82', icon: 'checkmark-circle' },
  danger: { backgroundColor: '#C62828', icon: 'close-circle' },
  error: { backgroundColor: '#C62828', icon: 'close-circle' },
  warning: { backgroundColor: '#B26A00', icon: 'warning' },
  info: { backgroundColor: '#3B2A5C', icon: 'information-circle' },
  normal: { backgroundColor: '#3B2A5C', icon: 'information-circle' },
};

const AppToast = ({ toast }) => {
  const variant = VARIANTS[toast?.type] || VARIANTS.normal;
  const { message } = toast || {};

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => {
        // Run the caller's onPress if given, and always dismiss on tap.
        toast?.onPress?.(toast?.id);
        toast?.onHide?.();
      }}
      style={[styles.pill, { backgroundColor: variant.backgroundColor }]}
      accessibilityRole="alert"
    >
      <View style={styles.iconWrap}>
        <Ionicons name={variant.icon} size={18} color="#FFFFFF" />
      </View>
      {typeof message === 'string' || typeof message === 'number' ? (
        <Text style={styles.text} numberOfLines={3}>
          {String(message)}
        </Text>
      ) : (
        message
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  pill: {
    alignSelf: 'flex-end',
    marginRight: 16,
    marginLeft: 48,
    marginTop: 4,
    maxWidth: '85%',
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingLeft: 10,
    paddingRight: 14,
    borderRadius: 12,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.18,
    shadowRadius: 10,
    elevation: 6,
  },
  iconWrap: {
    marginRight: 8,
  },
  text: {
    flexShrink: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
});

export default AppToast;
