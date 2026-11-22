# 草案 01 — Cup Ladder（段階解禁ラダー）

## コンセプト

Nanokuro Cup を「上から下へ進む競技ラダー」として見せる保管 HTML。  
初期は Gimmick / Power の二段のみ開いており、条件達成で Complex → Invader と段が落ちていく。景品譜面 D-Birth は最下段の報酬枠。

## ページ構成（UI 配置は Official 共通を踏襲）

1. **site-header / nav**（既存と同じ）
2. **page-hero** — 題名「1st Nanokuro Collections」、短いリード（Cup 方式の説明は一行程度）
3. **crumb** — Home へ戻る
4. **本体: 縦ラダー**
   - 段 1: Gimmick-Category（解禁済）
   - 段 2: Power-Category（解禁済）
   - 段 3: Complex-Category（鍵アイコン／未解禁表示）
   - 段 4: Invader-Category（鍵）
   - 段 5: 景品枠 D-Birth（Invader 突破後に強調）
5. **footer**（既存）

各 Category カード内:

- Category 名とライフ上限（50 / 50 / 100 / 75）
- 課題曲リスト（曲名のみ。リンクは譜面保管庫の該当行 or 詳細ページへ任意）
- 小さな「合計失点 / ライフ」表示欄（この草案では見た目のスロットまで。入力 UI は草案 02 と分担してもよい）

## 解禁ロジック（表示ルール）

| 状態 | 表示 |
|------|------|
| 初期 | Gimmick・Power のみ操作可能。Complex・Invader は暗転＋「要: 前段突破」 |
| Gimmick かつ Power の失点合計が各ライフ以内 | Complex 解禁 |
| Complex 突破 | Invader 解禁 |
| Invader 突破 | D-Birth 枠を「受取可」に変更 |

失点換算（表示・照合用）:

- Good −1 / Bad −3 / Miss −5  
- Category 内全課題曲の失点合計 ≤ ライフ で突破

## ビジュアル方針

- Official の plate / cyan 基調を維持しつつ、Cup らしい縦の「段差・番号（I–IV）」を強調
- 未解禁は opacity と鍵、解禁済は枠線を強くする程度（派手なギミックは避ける）

## 向いている場合

- 「順番に攻略する」体験をアーカイブでも再現したい
- 2nd のマップ型とは違い、一本道の競技感を出したい

## 向いていない場合

- スコア入力まで本格実装するなら、ラダー単体より草案 02 の方が主戦場になる
