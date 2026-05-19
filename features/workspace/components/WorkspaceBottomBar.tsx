import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import type { ComponentProps } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';

export type BottomBarIconName = ComponentProps<typeof MaterialCommunityIcons>['name'];

export type BottomBarTab = {
  id: string;
  icon: BottomBarIconName;
};

type BottomBarTone = {
  activeIcon: string;
  activePill: string;
  centerGradient: [string, string, string, string];
  centerShadow: string;
  inactiveIcon: string;
};

type WorkspaceBottomBarProps = {
  activeTab: string;
  bottomInset: number;
  centerIcon?: BottomBarIconName;
  centerTabId?: string;
  tabs: BottomBarTab[];
  tone?: BottomBarTone;
  onCenterPress: () => void;
  onTabPress: (id: string) => void;
};

const BAR_HEIGHT = 70;
const CENTER_BTN = 70;
const CENTER_RING = 16; // grosor del "gap" entre botón y curva
const BAR_RADIUS = (CENTER_BTN / 4) + CENTER_RING; // radio de las esquinas de la barra
const CURVE_DEPTH = 40; // qué tan profunda es la curva
const CURVE_WIDTH = CENTER_BTN + CENTER_RING * 5; // ancho total de la curva (botón + gap + margen extra para suavizar)
const defaultTone: BottomBarTone = {
  activeIcon: '#2FC4B1',
  activePill: '#2FC4B1',
  centerGradient: ['#B4EFE9', '#2FC4B1', '#2FC4B1', '#117C72'],
  centerShadow: '#2FC4B1',
  inactiveIcon: '#8AA69C',
};

export function WorkspaceBottomBar({
  activeTab,
  bottomInset,
  centerIcon = 'star-outline',
  centerTabId = 'asistente',
  tabs,
  tone = defaultTone,
  onCenterPress,
  onTabPress,
}: WorkspaceBottomBarProps) {
  const leftTabs = tabs.slice(0, 2);
  const rightTabs = tabs.slice(2, 4);
  const isCenterActive = activeTab === centerTabId;

  return (
    <View style={[styles.wrapper, { bottom: Math.max(bottomInset, 12) - 40 }]}>
      {/* Sombra verde suave debajo de la barra */}
      <View style={styles.shadow} />

      {/* Barra con hueco SVG */}
      <BarWithCutout />

      {/* Iconos sobre la barra */}
      <View style={styles.tabRow}>
        {leftTabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            icon={tab.icon}
            tone={tone}
            onPress={() => onTabPress(tab.id)}
          />
        ))}

        {/* Espacio para el botón central */}
        <View style={styles.centerSpace} />

        {rightTabs.map((tab) => (
          <TabButton
            key={tab.id}
            active={activeTab === tab.id}
            icon={tab.icon}
            tone={tone}
            onPress={() => onTabPress(tab.id)}
          />
        ))}
      </View>

      {/* Botón central flotante con brillo */}
      <Pressable
        onPress={onCenterPress}
        style={styles.centerButtonWrap}
      >
        <LinearGradient
          colors={tone.centerGradient}
          locations={[0, 0.25, 0.55, 1]}
          start={{ x: 0.45, y: 0 }}
          end={{ x: 0.7, y: 1 }}
          style={[
            styles.centerButton,
            { shadowColor: tone.centerShadow },
            isCenterActive && styles.centerButtonActive,
          ]}
        >
          {/* Reflejo interno superior */}
          <MaterialCommunityIcons name={centerIcon} size={26} color="#FFF" />
        </LinearGradient>
      </Pressable>
    </View>
  );
}

/**
 * Barra con hueco circular SVG.
 * Usamos un Path con curvas cúbicas Bezier para el mordisco suave.
 * El ancho se toma del estilo del wrapper (left/right 18px).
 */
function BarWithCutout() {
  // Ancho aproximado de la barra en pantalla
  // (se escala con width: '100%' en el SVG)
  const W = 400; // viewBox width — no importa el valor real, SVG escala
  const H = BAR_HEIGHT;
  const R = BAR_RADIUS;
  const cx = W / 2;
  const holeR = CURVE_WIDTH / 2; // radio del hueco = ancho total de la curva / 2

  // Puntos donde la curva toca la parte superior de la barra
  const leftEdge = cx - holeR;
  const rightEdge = cx + holeR;

  const path = [
    // esquina superior izquierda
    `M ${R} 0`,

    // top line hasta antes de la curva
    `L ${leftEdge} 0`,

    // curva izquierda del notch
    `C ${leftEdge + 40} 0, ${cx - 40} ${CURVE_DEPTH}, ${cx} ${CURVE_DEPTH}`,

    // curva derecha del notch
    `C ${cx + 40} ${CURVE_DEPTH}, ${rightEdge - 40} 0, ${rightEdge} 0`,

    // top line hasta esquina derecha
    `L ${W - R} 0`,

    // esquina superior derecha
    `Q ${W} 0 ${W} ${R}`,

    // lado derecho
    `L ${W} ${H - R}`,

    // esquina inferior derecha
    `Q ${W} ${H} ${W - R} ${H}`,

    // bottom
    `L ${R} ${H}`,

    // esquina inferior izquierda
    `Q 0 ${H} 0 ${H - R}`,

    // lado izquierdo
    `L 0 ${R}`,

    // esquina superior izquierda
    `Q 0 0 ${R} 0`,

    `Z`,
  ].join(' ');

  return (
    <Svg
      width="100%"
      height={BAR_HEIGHT}
      viewBox={`0 0 ${W} ${H}`}
      preserveAspectRatio="none"
      style={styles.barSvg}
    >
      <Path d={path} fill="#ffffff" />
    </Svg>
  );
}

function TabButton({
  active,
  icon,
  tone,
  onPress,
}: {
  active: boolean;
  icon: BottomBarIconName;
  tone: BottomBarTone;
  onPress: () => void;
}) {
  return (
    <Pressable onPress={onPress} style={styles.tabButton}>
      <MaterialCommunityIcons
        name={icon}
        size={24}
        color={active ? tone.activeIcon : tone.inactiveIcon}
      />
      {active && <View style={[styles.activePill, { backgroundColor: tone.activePill }]} />}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: 'absolute',
    left: 18,
    right: 18,
  },

  shadow: {
    position: 'absolute',
    left: 12,
    right: 12,
    top: 22,
    height: 65,
    borderRadius: 34,
    backgroundColor: 'Transparent',
    opacity: 0.45,
  },

  barSvg: {
    // La barra SVG ocupa su espacio natural
  },
  centerGlow: {
    position: 'absolute',
    width: CENTER_BTN + 20,
    height: CENTER_BTN + 20,
    borderRadius: (CENTER_BTN + 20) / 2,
    backgroundColor: '#2FC4B1',
    opacity: 0.25,
  },

  // Fila de tabs encima del SVG, alineada con la barra
  tabRow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: BAR_HEIGHT,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
  },

  tabButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
  },

  centerSpace: {
    width: CENTER_BTN + 20,
  },

  activePill: {
    marginTop: 4,
    width: 16,
    height: 4,
    borderRadius: 999,
    backgroundColor: '#2FC4B1',
  },

  centerButtonWrap: {
    position: 'absolute',
    top: -(CENTER_BTN / 3) - CENTER_RING,
    alignSelf: 'center',
    borderRadius: (CENTER_BTN / 2) + CENTER_RING,
  },

  centerButton: {
    width: CENTER_BTN,
    height: CENTER_BTN,
    borderRadius: CENTER_BTN / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',

    shadowColor: '#2FC4B1',
    shadowOpacity: 0.5,
    shadowRadius: 24,
    shadowOffset: { width: 0, height: 10 },
    elevation: 18,
  },

  centerButtonActive: {
    transform: [{ scale: 1.06 }],
  },
});
