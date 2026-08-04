import { useMemo } from 'react';
import {
  StyleSheet,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';

type Props = {
  color?: string;
  containerStyle?: StyleProp<ViewStyle>;
  headingStyle?: StyleProp<TextStyle>;
  strongStyle?: StyleProp<TextStyle>;
  text: string;
  textStyle?: StyleProp<TextStyle>;
};

type MarkdownLine =
  | { kind: 'blank'; id: string }
  | { kind: 'heading'; id: string; text: string }
  | { kind: 'bullet'; id: string; text: string }
  | { kind: 'numbered'; id: string; marker: string; text: string }
  | { kind: 'paragraph'; id: string; text: string };

const BULLET_MARK = String.fromCharCode(8226);

function normalizeMarkdown(value: string) {
  return String(value || '')
    .replace(/\r\n/g, '\n')
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '$1 ($2)')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/```[\s\S]*?```/g, (match) => match.replace(/```[a-z]*|```/gi, '').trim())
    .trim();
}

function cleanInlineText(value: string, trim = true) {
  const cleaned = value
    .replace(/\\([*_#`])/g, '$1')
    .replace(/(^|\s)#{1,6}\s*/g, '$1')
    .replace(/[*_`]+/g, '')
    .replace(/\s+/g, ' ');

  return trim ? cleaned.trim() : cleaned;
}

function parseMarkdownLines(value: string): MarkdownLine[] {
  const text = normalizeMarkdown(value);

  if (!text) {
    return [];
  }

  return text.split('\n').map((rawLine, index) => {
    const id = `${index}-${rawLine.slice(0, 16)}`;
    const trimmed = rawLine.trim();

    if (!trimmed) {
      return { id, kind: 'blank' };
    }

    const heading = trimmed.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      return {
        id,
        kind: 'heading',
        text: cleanInlineText(heading[1]),
      };
    }

    const bullet = rawLine.match(/^\s*[-*\u2022]\s+(.+)$/);
    if (bullet) {
      return {
        id,
        kind: 'bullet',
        text: bullet[1].trim(),
      };
    }

    const numbered = rawLine.match(/^\s*(\d+)[.)]\s+(.+)$/);
    if (numbered) {
      return {
        id,
        kind: 'numbered',
        marker: `${numbered[1]}.`,
        text: numbered[2].trim(),
      };
    }

    return {
      id,
      kind: 'paragraph',
      text: trimmed,
    };
  });
}

function renderInlineText(
  value: string,
  textStyle: StyleProp<TextStyle>,
  strongStyle: StyleProp<TextStyle>
) {
  const pieces = String(value || '').split(/(\*\*[^*]+\*\*|__[^_]+__)/g).filter(Boolean);

  return pieces.map((piece, index) => {
    const isStrong = /^(\*\*[^*]+\*\*|__[^_]+__)$/.test(piece);
    const cleanPiece = isStrong
      ? piece.replace(/^(\*\*|__)|(\*\*|__)$/g, '')
      : cleanInlineText(piece, false);

    if (!cleanPiece.trim()) {
      return null;
    }

    return (
      <Text key={`${index}-${cleanPiece.slice(0, 8)}`} style={[textStyle, isStrong && strongStyle]}>
        {cleanPiece}
      </Text>
    );
  });
}

export function FormattedMarkdownText({
  color,
  containerStyle,
  headingStyle,
  strongStyle,
  text,
  textStyle,
}: Props) {
  const lines = useMemo(() => parseMarkdownLines(text), [text]);
  const baseTextStyle = [styles.text, color ? { color } : null, textStyle];
  const baseStrongStyle = [styles.strong, strongStyle];

  return (
    <View style={[styles.container, containerStyle]}>
      {lines.map((line) => {
        if (line.kind === 'blank') {
          return <View key={line.id} style={styles.blankLine} />;
        }

        if (line.kind === 'heading') {
          return (
            <Text key={line.id} style={[baseTextStyle, styles.heading, headingStyle]}>
              {line.text}
            </Text>
          );
        }

        if (line.kind === 'bullet') {
          return (
            <View key={line.id} style={styles.listRow}>
              <Text style={[baseTextStyle, styles.marker]}>{BULLET_MARK}</Text>
              <Text style={[baseTextStyle, styles.listText]}>
                {renderInlineText(line.text, baseTextStyle, baseStrongStyle)}
              </Text>
            </View>
          );
        }

        if (line.kind === 'numbered') {
          return (
            <View key={line.id} style={styles.listRow}>
              <Text style={[baseTextStyle, styles.numberMarker]}>{line.marker}</Text>
              <Text style={[baseTextStyle, styles.listText]}>
                {renderInlineText(line.text, baseTextStyle, baseStrongStyle)}
              </Text>
            </View>
          );
        }

        return (
          <Text key={line.id} style={baseTextStyle}>
            {renderInlineText(line.text, baseTextStyle, baseStrongStyle)}
          </Text>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  blankLine: {
    height: 8,
  },
  container: {
    gap: 7,
  },
  heading: {
    fontFamily: 'PoppinsSemiBold',
    fontSize: 15,
    lineHeight: 22,
    marginTop: 5,
  },
  listRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 8,
  },
  listText: {
    flex: 1,
  },
  marker: {
    fontFamily: 'PoppinsSemiBold',
    lineHeight: 21,
    minWidth: 10,
  },
  numberMarker: {
    fontFamily: 'PoppinsSemiBold',
    lineHeight: 21,
    minWidth: 24,
  },
  strong: {
    fontFamily: 'PoppinsSemiBold',
  },
  text: {
    fontFamily: 'PoppinsRegular',
  },
});
