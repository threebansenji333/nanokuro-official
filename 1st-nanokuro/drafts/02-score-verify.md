# 草案 02 — Score Verify（失点照合＋景品解禁）

> **状態: 破棄**（`05-verify-decision.md`）  
> リザルト画像を当時の Discord 人手確認と同等に認証できないため、Verify による景品解禁は行わない。D-Birth のアーカイブ配布も行わない。

## コンセプト（当初案・参考用）

アーカイブ HTML 上で「本番に近い条件達成／未達成」を照合できるようにする案。  
各課題曲に Good / Bad / Miss（または失点合計）を入力し、Category ライフと突き合わせて突破判定。Invader 突破で D-Birth の配布導線を出す。

## ページ構成

1. header / hero / crumb（共通）
2. **ルール要約パネル**（折りたたみ可）
   - 失点: Good −1 / Bad −3 / Miss −5
   - 解禁順: Gimmick・Power 初期 → 両方突破で Complex → Complex 突破で Invader → Invader 突破で景品
3. **Category パネル ×4**（アコーディオンまたはタブ）
4. **景品パネル** — D-Birth（初期はロック。突破後に DL または Vault 誘導）
5. footer

### Category パネル内

各課題曲行:

| 曲名 | Good | Bad | Miss | 曲ごとの失点（自動） |
|------|------|-----|------|----------------------|

フッター行: **合計失点 / ライフ** と突破バッジ（CLEAR / FAIL / LOCKED）

#### 課題曲とライフ

- **Gimmick**（ライフ 50）: 覚醒 / Glacial brilliance / Crystal brilliance_AT  
- **Power**（ライフ 50）: Relative brilliance / Memories Sacrifice / (execute.)  
- **Complex**（ライフ 100）: Unraveling Stasis / Xaleid◆scopiX  
- **Invader**（ライフ 75）: Meteoric Impact  

## 技術メモ（実装時）

- 入力は `localStorage` に保存（端末ローカル。サーバ照合なし）
- 改ざん耐性は求めない（アーカイブの自己申告）。必要なら「リセット」ボタンのみ
- soft-nav 後も動くようロジックは `site.js` 拡張か専用 `js/1st-cup.js` を reboot から呼ぶ
- Complex は Gimmick・Power 両方 CLEAR になるまで入力 UI を `disabled`
- 景品は CLEAR 後のみリンクを有効化（ファイル未接続時は「準備中」でも可）

## ビジュアル方針

- スコア表はモノスペース／板パネル。ライフ残は細いバーで可視化
- 成功時だけ短いフェード（既存 cushion の sine フェード流用可）

## 向いている場合

- 配信なしでも「自分の記録で景品を解く」体験を残したい
- 条件ロジックが Cup の本体なので、ここを正本にしたい

## 向いていない場合

- 入力 UI を持たず静的な回顧だけでよい場合（→ 草案 03）
