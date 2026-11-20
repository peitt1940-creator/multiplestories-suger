# 糖的多重宇宙・故事創作室

GitHub Pages 提供教師、學生的故事編輯器及玩家介面。GAS 處理登入、權限與資料儲存；角色、故事、修改紀錄與帳號保留在 Google 試算表，圖片儲存在 Google 雲端硬碟。

## 網站

https://peitt1940-creator.github.io/multiplestories-suger/

## 後台連線

config.js 的 gasUrl 為 GAS 公開 /exec 連線位置。後台必須部署 v1.1 程式並新增 Bridge.html，指令碼屬性 STUDIO_FRONTEND_URL 設為：

https://peitt1940-creator.github.io/multiplestories-suger/

請保留既有試算表及指令碼屬性，更新 GAS 部署的新版本。程式支援姓名與固定密碼登入、分工編輯、版本檢查、草稿、教師發布與玩家分支故事。

## 隱私

儲存庫只存網站原始碼。不要提交學生名單、姓名、密碼、試算表匯出檔、API 金鑰或真實測試資料。學生儲存作品時不會寫入 GitHub。

本遊戲由 Peiching 製作。
