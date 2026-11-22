# 草案 04 — Four Chambers（四室ハブ）

> **状態: 採用・実装済み／ビジュアル主導ブラッシュアップ済み（2026-11-20: 文字削減、シジル・ライフリング・解禁ルート図・トラックプレート・施錠クレート）**（`1st-nanokuro/hub.html`）  
> Score Verify 景品解禁は組み合わせない（`05-verify-decision.md`）。  
> 構成は **下向きスクロール**（2nd 的な縦旅程）。テーマはサイバー（グリッチ／回路／ターミナル）。

## コンセプト

ハブを縦スクロールのステージ列として実装。BOOT → PROTOCOL → 四 Category → 景品枠。  
各室は課題曲・ライフ・解禁条件の説明を見せる。**スコア画像認証や景品ダウンロードは行わない。**

## ページ構成（実装）

単一 HTML `1st-nanokuro/hub.html` + `css/1st-cup.css` + `js/1st-cup.js`

1. BOOT — ターミナル起動演出
2. PROTOCOL — 失点・解禁順・当時の確認観点
3. Gimmick / Power / Complex / Invader — 各 Chamber
4. PRIZE — D-Birth 展示のみ（配布なし）
5. 右レールでセクションジャンプ

#### 室と中身

| 室 | ライフ | 課題曲 |
|----|--------|--------|
| Gimmick | 50 | 覚醒 / Glacial brilliance / Crystal brilliance_AT |
| Power | 50 | Relative brilliance / Memories Sacrifice / (execute.) |
| Complex | 100 | Unraveling Stasis / Xaleid◆scopiX |
| Invader | 75 | Meteoric Impact |

失点: Good −1 / Bad −3 / Miss −5（室 UI に小さく常設）

## インタラクション

- ハブから四室を行き来（Complex / Invader は「要: 前段突破」の説明付きで、閲覧自体は開放してよい）
- 進捗の「プレイ再現クリア」は作らない（Verify 破棄のため）
- D-Birth 展示台は常に「当時の景品／配布なし」と明示

## ビジュアル方針

- ハブは暗めの競技ロビー（Official の既存トークン内で、扉に Category カラーの細いアクセント）
- 室に入ると背景のトーンだけ変える（全面テーマ差は TRPG ほど大きくしない）
- モーションは扉の短いフェード程度（reduced-motion 配慮）

## 向いている場合

- 「Cup を空間として思い出したい」
- ラダーの一本道より、ハブ往復のプレイ感が欲しい
- あとから草案 02 の本格照合を各室に差し込みたい

## 向いていない場合

- 単一スクロールの文書で十分なとき（→ 草案 03）
- 実装を一ファイル・低複雑度に収めたいとき（扉切替の状態管理が増える）
