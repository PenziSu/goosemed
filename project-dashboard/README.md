# GooseMed 開發看板

這是 GooseMed 的地端開發進度看板。看板只記錄程式修改、風險與驗證結果，不得填入病患資料。

## macOS 手動啟動

在 Finder 雙擊專案根目錄的 `start-dashboard.command`。終端機會保持開啟並自動開啟看板；要關閉伺服器，在該終端機按 `Control+C`。

首次啟動若尚未安裝相依套件，啟動檔會自動執行 `pnpm install`。電腦必須先具備 Node.js 與 pnpm。

## 終端機啟動

```bash
./start-dashboard.command
```

開啟 `http://127.0.0.1:3000/`。伺服器只綁定本機介面，不接受區域網路連線。拖曳或新增卡片後，內容會立即寫回 `data/board.json`，可由 Git 留下變更紀錄。

看板不會主動喚醒 Codex。Codex 會在每次開始 GooseMed 工作時重新讀取 `data/board.json`；若需要在沒有對話的情況下自動偵測變更，必須另外建立監看機制。
