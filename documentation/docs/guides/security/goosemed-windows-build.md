# GooseMED Windows 編譯說明

本說明用來在 64 位元 Windows 10 或 Windows 11 原生編譯 GooseMED。請不要用 macOS 交叉編譯正式 Windows 安裝檔，Electron、MSVC、Windows SDK 與簽章流程在 Windows 原生環境處理比較可靠。

## 準備環境

安裝 Git、Node.js 24、Rustup，以及 Visual Studio 2022 Build Tools。Visual Studio Installer 必須勾選「Desktop development with C++」，並包含 MSVC v143 與 Windows 10 或 Windows 11 SDK。pnpm 使用專案目前驗證的 `10.30.3`。

完成安裝後，從開始功能表開啟「Developer PowerShell for VS 2022」，執行下列命令確認工具存在：

```powershell
git --version
node --version
rustup --version
cargo --version
cl.exe
npm install -g pnpm@10.30.3
pnpm --version
```

如果 PowerShell 拒絕目前工作階段執行本機腳本，可只對目前程序開放：

```powershell
Set-ExecutionPolicy -Scope Process Bypass
```

## 下載指定分支

```powershell
git clone https://github.com/PenziSu/goosemed.git
cd goosemed
git checkout security/medical-data-hardening-v1
git pull --ff-only
rustup default stable-x86_64-pc-windows-msvc
rustup target add x86_64-pc-windows-msvc
```

正式測試前請記錄目前提交，避免日後不知道執行檔來自哪一版：

```powershell
git status --short --branch
git rev-parse HEAD
```

## 編譯 GooseMED

先關閉正在執行的 GooseMED，再於專案根目錄執行：

```powershell
.\scripts\build-windows.ps1
```

腳本會編譯 Rust 後端、安裝鎖定的前端相依套件、編譯桌面資源，最後建立可攜式程式與安裝檔。第一次建置通常最久，實際時間取決於 CPU、磁碟與套件快取。

完成後，可直接執行的程式位於：

```text
ui\desktop\out\GooseMED-win32-x64\GooseMED.exe
```

安裝檔位於：

```text
ui\desktop\out\make\
```

## 本機建置的限制

本機建立的安裝檔沒有醫院的程式碼簽章憑證，Windows SmartScreen 可能顯示未知發行者。這不是編譯失敗。內部測試可以核對 Git commit 與雜湊後執行；正式散布前必須接上醫院管理的程式碼簽章流程，私鑰不可放進原始碼或開發看板。

MCP 設定只接受 Streamable HTTP。直接填 IP 時必須位於 `172.22.0.0/16`；填網域名稱時，所有 DNS 解析結果都必須落在同一網段。若設定失敗，GooseMED 會顯示後端的拒絕原因，使用者仍可停用或刪除原有的異常 MCP 設定。

若建置失敗，先確認命令是在 Developer PowerShell for VS 2022 執行，並確認 `cl.exe` 可用。若 Electron 打包階段被防毒軟體鎖住，先關閉 GooseMED，刪除本次未完成的 `ui\desktop\out` 建置輸出後再重跑；不要刪除 Git 追蹤中的原始碼或設定檔。
