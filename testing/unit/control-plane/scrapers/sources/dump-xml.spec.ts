import { Readable } from 'node:stream';
import { collectDumpPages } from '../../../../../control-plane/scrapers/src/sources/dump-xml';

const SAMPLE_DUMP_XML = `<mediawiki>
  <page>
    <title>Wp/aeb/3asslema</title>
    <ns>0</ns>
    <id>136737</id>
    <revision>
      <text bytes="10" xml:space="preserve">'''3asslema''' ya essid.</text>
    </revision>
  </page>
  <page>
    <title>Wp/fra/Bonjour</title>
    <ns>0</ns>
    <id>1</id>
    <revision>
      <text bytes="10">Bonjour le monde.</text>
    </revision>
  </page>
  <page>
    <title>Talk:Wp/aeb/3asslema</title>
    <ns>1</ns>
    <id>2</id>
    <revision>
      <text bytes="5">discussion</text>
    </revision>
  </page>
  <page>
    <title>Wp/aeb/Empty</title>
    <ns>0</ns>
    <id>3</id>
    <revision>
      <text bytes="0"></text>
    </revision>
  </page>
</mediawiki>`;

describe('collectDumpPages', () => {
  it('keeps only pages whose title starts with the given prefix and has non-empty text', async () => {
    const pages = await collectDumpPages(Readable.from([SAMPLE_DUMP_XML]), 'Wp/aeb/');

    expect(pages).toEqual([{ title: 'Wp/aeb/3asslema', text: "'''3asslema''' ya essid." }]);
  });

  it('returns an empty array when no page matches the prefix', async () => {
    const pages = await collectDumpPages(Readable.from([SAMPLE_DUMP_XML]), 'Wp/kab/');
    expect(pages).toEqual([]);
  });
});
