import type { SourceDocument } from '../src/index.js';

const doc = (
  id: string,
  title: string,
  breadcrumbs: string[],
  body: string,
  source = 'nodejs',
): SourceDocument => ({ id, url: `https://example.com/${id}`, source, title, breadcrumbs, body });

export const documents: SourceDocument[] = [
  doc(
    'fs-readfile',
    'fs.readFile(path[, options], callback)',
    ['File system', 'Callback API'],
    'Asynchronously reads the entire contents of a file. The callback is passed two arguments (err, data), where data is the contents of the file.',
  ),
  doc(
    'fs-readdir',
    'fs.readdir(path[, options], callback)',
    ['File system', 'Callback API'],
    'Reads the contents of a directory. The callback gets two arguments (err, files) where files is an array of the names of the files in the directory.',
  ),
  doc(
    'fs-writefile',
    'fs.writeFile(file, data[, options], callback)',
    ['File system', 'Callback API'],
    'When file is a filename, asynchronously writes data to the file, replacing the file if it already exists.',
  ),
  doc(
    'events-on',
    'emitter.on(eventName, listener)',
    ['Events', 'Class: EventEmitter'],
    'Adds the listener function to the end of the listeners array for the event named eventName.',
  ),
  doc(
    'http-createserver',
    'http.createServer([options][, requestListener])',
    ['HTTP'],
    'Returns a new instance of http.Server. The requestListener is a function which is automatically added to the request event.',
  ),
  doc(
    'process-env',
    'process.env',
    ['Process'],
    'The process.env property returns an object containing the user environment. For example NODE_ENV is commonly used to select the configuration.',
  ),
  doc(
    'path-basename',
    'path.basename(path[, suffix])',
    ['Path'],
    'Returns the last portion of a path, similar to the Unix basename command.',
  ),
  doc(
    'mdn-fetch',
    'fetch()',
    ['Web APIs', 'Window'],
    'The global fetch() method starts the process of fetching a resource from the network, returning a promise.',
    'mdn',
  ),
];
