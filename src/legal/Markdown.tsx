import React, { type ReactNode } from 'react';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { COLORS } from '../components/ui';

const WEBSITE_URL = 'https://sdpmplus.com';

/**
 * The website's small Markdown renderer (frontend/src/legal/Markdown.tsx)
 * for React Native: headings (#, ##, ###), paragraphs, bullet and numbered
 * lists, simple pipe tables (shown as one card per row), "> " callouts,
 * **bold**, *italic* and [links](url). Links to another policy
 * ("/legal/<slug>") call `onOpenDocument`; other links open in the browser.
 */
export function Markdown({ source, onOpenDocument }: { source: string; onOpenDocument?: (slug: string) => void }) {
  const blocks: ReactNode[] = [];
  const lines = source.replace(/\r\n/g, '\n').split('\n');
  const inline = (text: string) => renderInline(text, onOpenDocument);
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    if (!line.trim()) { i++; continue; }
    const key = blocks.length;

    const heading = /^(#{1,3})\s+(.*)$/.exec(line);
    if (heading) {
      const level = heading[1].length;
      blocks.push(<Text key={key} style={level === 1 ? styles.h1 : level === 2 ? styles.h2 : styles.h3} accessibilityRole="header">{inline(heading[2])}</Text>);
      i++;
      continue;
    }

    if (line.startsWith('>')) {
      const quoted: string[] = [];
      while (i < lines.length && lines[i].startsWith('>')) quoted.push(lines[i++].replace(/^>\s?/, ''));
      blocks.push(<View key={key} style={styles.callout}><Text style={styles.p}>{inline(quoted.join(' '))}</Text></View>);
      continue;
    }

    if (line.trim().startsWith('|')) {
      const rows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        const cells = lines[i].trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim());
        if (!cells.every(cell => /^:?-{3,}:?$/.test(cell))) rows.push(cells);
        i++;
      }
      const [header, ...body] = rows;
      // A phone is too narrow for a table: each row becomes a small card, "Header: value".
      blocks.push(
        <View key={key} style={styles.table}>
          {body.map((row, r) => (
            <View key={r} style={styles.tableRow}>
              {row.map((cell, c) => (
                <Text key={c} style={c === 0 ? styles.tableFirst : styles.p}>
                  {c === 0 ? inline(cell) : <>{<Text style={styles.bold}>{header[c]}: </Text>}{inline(cell)}</>}
                </Text>
              ))}
            </View>
          ))}
        </View>,
      );
      continue;
    }

    const bullet = /^\s*[-*]\s+/;
    const numbered = /^\s*\d+\.\s+/;
    if (bullet.test(line) || numbered.test(line)) {
      const ordered = numbered.test(line);
      const pattern = ordered ? numbered : bullet;
      let number = ordered ? Number(/\d+/.exec(line)![0]) : 0;
      const nested = /^\s{2,}/.test(line);
      const items: string[] = [];
      while (i < lines.length && pattern.test(lines[i])) {
        let item = lines[i++].replace(pattern, '');
        while (i < lines.length && /^\s{2,}\S/.test(lines[i]) && !bullet.test(lines[i]) && !numbered.test(lines[i])) item += ` ${lines[i++].trim()}`;
        items.push(item);
      }
      blocks.push(
        <View key={key} style={[styles.list, nested && styles.nested]}>
          {items.map((item, n) => (
            <View key={n} style={styles.listItem}>
              <Text style={styles.marker}>{ordered ? `${number++}.` : '•'}</Text>
              <Text style={[styles.p, styles.itemText]}>{inline(item)}</Text>
            </View>
          ))}
        </View>,
      );
      continue;
    }

    const paragraph: string[] = [];
    while (i < lines.length && lines[i].trim() && !/^(#{1,3}\s|>|\s*[-*]\s|\s*\d+\.\s|\s*\|)/.test(lines[i])) paragraph.push(lines[i++].trim());
    blocks.push(<Text key={key} style={styles.p}>{inline(paragraph.join(' '))}</Text>);
  }

  return <View style={styles.doc}>{blocks}</View>;
}

// **bold**, *italic*, [text](url)
function renderInline(text: string, onOpenDocument?: (slug: string) => void): ReactNode[] {
  const parts: ReactNode[] = [];
  const pattern = /\*\*([^*]+)\*\*|\*([^*]+)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
  let last = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(text))) {
    if (match.index > last) parts.push(text.slice(last, match.index));
    const n = parts.length;
    if (match[1] !== undefined) parts.push(<Text key={n} style={styles.bold}>{match[1]}</Text>);
    else if (match[2] !== undefined) parts.push(<Text key={n} style={styles.italic}>{match[2]}</Text>);
    else {
      const [label, href] = [match[3], match[4]];
      const policy = /^\/legal\/([\w-]+)$/.exec(href);
      const open = () => {
        if (policy && onOpenDocument) onOpenDocument(policy[1]);
        else if (href.startsWith('/')) Linking.openURL(`${WEBSITE_URL}${href}`).catch(() => {});
        else if (/^(https?:|mailto:)/.test(href)) Linking.openURL(href).catch(() => {});
      };
      parts.push(<Text key={n} style={styles.link} onPress={open} accessibilityRole="link">{label}</Text>);
    }
    last = pattern.lastIndex;
  }
  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

const styles = StyleSheet.create({
  doc: { gap: 10 },
  h1: { fontSize: 24, fontWeight: '700', color: COLORS.slate, marginBottom: 4 },
  h2: { fontSize: 18, fontWeight: '700', color: COLORS.slate, marginTop: 14 },
  h3: { fontSize: 16, fontWeight: '700', color: COLORS.slate, marginTop: 8 },
  p: { fontSize: 15, lineHeight: 22, color: COLORS.slate },
  bold: { fontWeight: '700' },
  italic: { fontStyle: 'italic' },
  link: { color: COLORS.blue, textDecorationLine: 'underline' },
  callout: { borderLeftWidth: 4, borderLeftColor: COLORS.blue, backgroundColor: '#F4F8FC', borderRadius: 8, padding: 12 },
  list: { gap: 6 },
  nested: { paddingLeft: 20 },
  listItem: { flexDirection: 'row', gap: 8 },
  marker: { fontSize: 15, lineHeight: 22, color: COLORS.slate, minWidth: 16 },
  itemText: { flex: 1 },
  table: { gap: 8 },
  tableRow: { borderWidth: 1, borderColor: COLORS.border, borderRadius: 10, padding: 12, gap: 4, backgroundColor: '#fff' },
  tableFirst: { fontSize: 15, lineHeight: 22, fontWeight: '700', color: COLORS.slate },
});
