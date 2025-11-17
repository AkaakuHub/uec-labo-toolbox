import { initLabCompass } from '../src/content/content';

export default defineContentScript({
  matches: ['https://www.edu.cc.uec.ac.jp/~na131006/cgi-bin/SWG/system/phase1/phase1show_labo.php*'],
  runAt: 'document_end',
  main() {
    initLabCompass();
  },
});
