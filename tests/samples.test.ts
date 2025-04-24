import path from 'node:path';
import { test } from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs/promises';

import { parse } from '../src/parser.ts';

const samplesDir = path.join(process.cwd(), 'samples');
const sampleFiles = ['ava.html', 'chicago.html', 'none.html'];

test('parse extracts metadata from sample files', async (t) => {
  for (const file of sampleFiles) {
    await t.test(`${file} metadata is correctly parsed`, async () => {
      const filePath = path.join(samplesDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      const result = parse(content);

      const { metadata } = result;
      assert.ok(metadata, 'Metadata should be present');
      assert.ok(typeof metadata.title === 'string', 'Title should be a string');
      assert.ok(metadata.title.length > 0, 'Title should not be empty');
      assert.ok(typeof metadata.authors === 'string', 'Authors should be a string');
      assert.ok(metadata.authors.length > 0, 'Authors should not be empty');
      if (metadata.citation) {
        assert.ok(typeof metadata.citation === 'string', 'Citation should be a string');
        assert.ok(metadata.citation.length > 0, 'Citation should not be empty');
      }
    });
  }
});

test('parse extracts markers from sample files', async (t) => {
  for (const file of sampleFiles) {
    await t.test(`${file} markers are correctly parsed`, async () => {
      const filePath = path.join(samplesDir, file);
      const content = await fs.readFile(filePath, 'utf-8');

      const result = parse(content);

      // Verify markers array exists
      assert.ok(Array.isArray(result.markers), 'Markers should be an array');
      assert.ok(result.markers.length > 0, 'Markers should not be empty');

      // Verify each marker has required properties
      for (const marker of result.markers) {
        assert.ok(['Highlight', 'Note'].includes(marker.type), 'Marker should have valid type');
        assert.ok(typeof marker.section === 'string', 'Marker should have section');
        assert.ok(marker.location, 'Marker should have location');
        assert.ok(
          typeof marker.location.page === 'number' || marker.location.page === null,
          'Location page should be number or null'
        );
        assert.ok(
          typeof marker.location.location === 'number' || marker.location.location === null,
          'Location number should be number or null'
        );

        if (marker.type === 'Highlight') {
          assert.ok(typeof marker.color === 'string', 'Highlight should have color');
          assert.ok(typeof marker.quote === 'string', 'Highlight should have quote');
        } else if (marker.type === 'Note') {
          assert.ok(typeof marker.text === 'string', 'Note should have text');
        }
      }
    });
  }
}); 