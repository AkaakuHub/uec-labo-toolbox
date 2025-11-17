import './style.css';

const app = document.querySelector<HTMLDivElement>('#app');

if (app) {
  app.innerHTML = `
    <main class="popup-shell">
      <h1>Lab Compass</h1>
      <p>研究室別の仮配属情報をページ上で強化表示します。対象ページを開くと自動で解析が始まります。</p>
      <ul>
        <li>ローカルのHTMLのみを解析し、外部リクエストは一切発生しません。</li>
        <li>WXTベースで開発されているため再読み込みなしに反映されます。</li>
        <li>データはブラウザ内に保存されません。</li>
      </ul>
    </main>
  `;
}
