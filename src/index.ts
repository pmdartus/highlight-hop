import fs from 'node:fs';
import { parseHighlightsAndNotes } from './parser.ts';

const htmlContent = fs.readFileSync('./samples/none.html', 'utf8');

const highlightsAndNotes = parseHighlightsAndNotes(htmlContent);
console.log(highlightsAndNotes);

