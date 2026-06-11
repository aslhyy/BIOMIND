import { Text, StyleSheet } from "react-native";
import { colors } from "../theme/colors";

export function AppText({ children, style }: any) {
  return <Text style={[styles.text, style]}>{children}</Text>;
}

const styles = StyleSheet.create({
  text: {
    color: colors.text,
  },
});
