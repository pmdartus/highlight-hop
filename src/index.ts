import fs from 'node:fs';
import { parse } from './parser.ts';

const htmlContent = fs.readFileSync('./samples/none.html', 'utf8');

const highlightsAndNotes = parse(htmlContent);
console.log(highlightsAndNotes);

