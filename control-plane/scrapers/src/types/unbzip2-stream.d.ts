declare module 'unbzip2-stream' {
  import type { Duplex } from 'node:stream';

  function unbzip2Stream(): Duplex;

  export = unbzip2Stream;
}
