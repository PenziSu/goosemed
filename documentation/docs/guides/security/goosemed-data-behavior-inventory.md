# goosemed 資料保存與傳送行為盤點

本文件只記錄資料行為與控制狀態，不得放入病患資料、密碼、Token、IRB 查詢條件或可識別個人的測試內容。狀態分為「已阻擋」、「限縮中」、「待移除」與「保留」。

## 行為清單

| ID | 行為 | 可能接觸的資料 | 保存位置或傳送目的地 | 狀態 |
| --- | --- | --- | --- | --- |
| D01 | 將對話送往語言模型 | 提示詞、工具結果、資料摘要 | 編譯時指定的院內模型 Endpoint | 已鎖定 `openai` 相容介面與 `gpt-oss-120b`，執行期設定無法覆寫 |
| D02 | 透過 MCP 查詢並接收資料 | 查詢參數、IRB 範圍、病患資料 | 編譯時指定的 MCP Server 與目前專案目錄 | 已鎖定唯一 Streamable HTTP MCP，忽略工作階段與設定檔傳入的其他 MCP |
| D03 | 執行 Shell 與 Python | 命令、檔案內容、stdout、stderr | 子程序、檔案系統、網路 | macOS 已限制專案目錄並拒絕網路，Windows 待完成 |
| D04 | 使用結構化檔案工具 | 專案內 Excel、圖片與衍生資料 | 目前專案目錄 | 已阻擋絕對路徑、上一層與符號連結跳脫 |
| D05 | 保存對話工作階段 | 完整對話、工作目錄、模型與工具狀態 | 本機 SQLite | 保留，需納入磁碟加密、權限與清除政策 |
| D06 | 保存 LLM request log | 完整請求、模型設定、回應、錯誤與用量 | 原本的本機 JSONL | 已移除應用程式 logger 安裝與 JSONL 寫入 |
| D07 | 保存 Rust trace log | 執行事件、錯誤、路徑，視 log level 可能含內容 | 原本的本機檔案與 Langfuse | 已移除檔案 subscriber 與 Langfuse layer，CLI 僅安裝丟棄事件的 subscriber |
| D08 | 保存 Electron 主程序 log | 桌面事件、錯誤、路徑與程序輸出 | 原本的 Electron userData 目錄與程序 console | 已移除 `electron-log`，共用 logger 與三個 Electron 入口改為不輸出 |
| D09 | 保存啟動診斷 | 執行檔路徑、工作目錄、內部 URL、stderr 尾端 | 原本的 Electron userData startup logs | 已移除啟動診斷檔案與寫入流程 |
| D10 | 保存輸入歷史 | 完整提示詞與拖放檔案路徑 | 程序記憶體 | 已移除 localStorage，只保留目前程序的記憶體歷史 |
| D11 | 檢查與下載軟體更新 | 版本、平台與網路中繼資料 | 發行站與 GitHub | 已移除桌面更新器及 Rust 預設 update 功能 |
| D12 | 傳送 Telemetry、OTEL 或追蹤資料 | 使用事件、錯誤、模型與工具欄位 | 原本的 PostHog、OTLP、Langfuse | 預設建置已排除 Telemetry、OTEL 與相關 Code Mode，Langfuse 實作已移除 |
| D13 | 分享或匯入 Nostr 工作階段 | 加密後的完整對話工作階段 | Nostr relay | Rust 預設建置已排除，桌面入口待移除 |
| D14 | 設定其他 Provider 與 OAuth | Endpoint、模型名稱、憑證與登入狀態 | 任意 Provider 與外部瀏覽器 | 已阻擋 UI、CLI、ACP 與設定檔覆寫，只建立固定 Provider |
| D15 | 安裝或執行 extension、plugin、hook 與任意 MCP | 提示詞、工具輸入輸出與程序環境 | 子程序、stdio、HTTP 或外部服務 | 已阻擋新增、刪除與啟停介面，只載入受限 developer 工具與固定 MCP；plugin 與 hook 不載入 |
| D16 | 使用 dictation、gateway 或模型下載 | 語音、訊息或模型請求 | 語音 Provider、Telegram、Hugging Face 等服務 | 待移除或在醫療版停用 |
| D17 | 開啟外部連結 | 連結內可能夾帶資料或追蹤參數 | 系統瀏覽器與 URL handler | 待限制為核准院內網址 |
| D18 | 匯出、備份或複製資料 | 對話與研究資料集 | 使用者選定檔案、剪貼簿或備份系統 | 保留人工操作，但需限制匯出路徑與部署政策 |
| D19 | 作業系統殘留資料 | 記憶體分頁、休眠、當機傾印、備份與防毒樣本 | 作業系統管理位置 | 保留，由端點加密、備份排除與 DLP 政策控制 |

## 程式位置

| ID | 主要實作位置 |
| --- | --- |
| D01、D14 | `crates/goose/src/providers/`、`crates/goose/src/acp/server/providers.rs`、`ui/desktop/src/components/settings/providers/` |
| D02、D15 | `crates/goose/src/agents/extension_manager.rs`、`crates/goose/src/agents/platform_extensions/ext_manager.rs`、`crates/goose/src/hooks/` |
| D03、D04 | `crates/goose/src/agents/platform_extensions/developer/`、`crates/goose/src/agents/platform_extensions/workspace.rs`、`crates/goose/src/agents/platform_extensions/analyze/` |
| D05 | `crates/goose/src/session/session_manager.rs`，實際根目錄由 `crates/goose/src/config/paths.rs` 決定 |
| D06 | `crates/goose-cli/src/logging.rs`、`crates/goose/src/providers/utils.rs`；底層 request log 介面仍在 `crates/goose-provider-types/src/request_log.rs`，應用程式未安裝 logger |
| D07、D12 | `crates/goose-cli/src/logging.rs`、`crates/goose/Cargo.toml`、`crates/goose/src/posthog.rs`、`crates/goose/src/otel/` |
| D08 | `ui/desktop/src/utils/logger.ts`、`ui/desktop/src/utils/disableConsoleOutput.ts`、`ui/desktop/src/main.ts`、`ui/desktop/src/preload.ts`、`ui/desktop/src/renderer.tsx` |
| D09 | `ui/desktop/src/gooseServe.ts`、`ui/desktop/src/main.ts` |
| D10 | `ui/desktop/src/utils/localMessageStorage.ts` |
| D11 | `crates/goose-cli/Cargo.toml`、`crates/goose/Cargo.toml`、`ui/desktop/src/main.ts` |
| D13 | `crates/goose/src/session/nostr.rs`、`ui/desktop/src/components/sessions/SessionListView.tsx`、`ui/desktop/src/App.tsx` |
| D16 | `crates/goose/src/dictation/`、`crates/goose/src/gateway/`、`crates/goose-local-inference/` |
| D17 | `ui/desktop/src/utils/openExternalUrl.ts`、`ui/desktop/src/components/MarkdownContent.tsx` |
| D18 | `crates/goose/src/session/export_markdown.rs`、桌面匯出與剪貼簿呼叫位置 |

每次完成一項控制，必須同步更新狀態並留下可重複的負向測試。只有「請求確實失敗」還不夠，外連測試必須同時證明接收端沒有收到封包。

## GooseMed 編譯設定

`GOOSEMED_LLM_ENDPOINT` 與 `GOOSEMED_MCP_ENDPOINT` 只在編譯時讀取。若未指定，開發建置分別使用 `http://127.0.0.1:8080/v1` 與 `http://127.0.0.1:3001/mcp`。正式建置必須由受控建置流程注入院內位址，執行期環境變數、設定檔與啟動參數都不能更換目的地。
