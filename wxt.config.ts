import { defineConfig } from 'wxt';

export default defineConfig({
  manifestVersion: 3,
  srcDir: '.',
  manifest: {
    name: 'Lab Compass for I類配属システム',
    description: 'I類学生の研究室配属状況を視覚化し、個々の希望とのギャップを示す支援ツール',
    version: '0.1.0',
    permissions: ['storage'],
    host_permissions: [
      'https://www.edu.cc.uec.ac.jp/~na131006/cgi-bin/SWG/system/phase1/phase1show_labo.php*'
    ],
    action: {
      default_title: 'Lab Compass',
      default_popup: 'popup/index.html'
    }
  }
});
