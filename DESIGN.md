---
name: SchedMate 清新便签风
description: 课表驱动的清新简约周排班工具——低眩光柔和云白、温润石墨灰、克制微圆角与马卡龙平涂色，以网格秩序呈现无压力值班排班
colors:
  paper: "#F8F9FB"
  sheet: "#FFFFFF"
  ink: "#24292F"
  muted: "#6E7781"
  line: "#E3E6EB"
  line-strong: "#CFD4DC"
  wash: "#F0F3F6"
  gap-red: "#E53E3E"
  gap-bg: "#FFF5F5"
  gap-border: "#FED7D7"
  person-mint: "#2E9E6B"
  person-sky: "#2F80ED"
  person-orange: "#E67E22"
  person-purple: "#8E44AD"
  person-rose: "#D83A6F"
  person-teal: "#028090"
  fallback-slate: "#94A3B8"
typography:
  body:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  label:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "12px"
    fontWeight: 500
    lineHeight: 1.45
  title:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "-0.01em"
  brick:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "13px"
    fontWeight: 600
    lineHeight: 1.45
    letterSpacing: "0.01em"
  micro:
    fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Hiragino Sans GB', 'Microsoft YaHei', sans-serif"
    fontSize: "11px"
    fontWeight: 500
    lineHeight: 1.5
rounded:
  sm: "4px"
  base: "6px"
  lg: "10px"
  pill: "9999px"
spacing:
  unit: "8px"
  page-margin: "20px"
components:
  button-primary:
    backgroundColor: "{colors.person-sky}"
    textColor: "#FFFFFF"
    rounded: "{rounded.base}"
    padding: "6px 14px"
    height: "28px"
  button-secondary:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.sm}"
    border: "1px solid {colors.line}"
    padding: "4px 10px"
    height: "28px"
  brick-duty:
    rounded: "{rounded.sm}"
    inset: "2px"
    typography: "{typography.brick}"
    shadow: "0 1px 2px rgba(0, 0, 0, 0.08)"
  dialog-surface:
    backgroundColor: "{colors.sheet}"
    textColor: "{colors.ink}"
    rounded: "{rounded.lg}"
    border: "1px solid {colors.line}"
    shadow: "0 10px 25px -5px rgba(0, 0, 0, 0.08)"
    padding: "24px"
---

# SchedMate 设计规范：清新便签 / 日系简约文具风

## 1. 核心理念与风格定位
- **定位**：日系简约文具 / 便签风格。告别冷峻生硬的黑白纯硬直角，用低眩光的柔和纸感底色、温润石墨灰字体、克制微圆角（4px ~ 6px）和清新马卡龙调色板呈现。
- **秩序优先**：排班工具的核心依然是 7×7 网格，保持严格的几何对齐与高信息密度，绝不在单元格中滥用大药丸或弥散光晕。
- **文案克制**：功能性短语，利落明确，不堆砌冗余词藻。

## 2. 颜色语义
- **画布**：`#F8F9FB`（柔和纸感云白）
- **卡片/网格底**：`#FFFFFF`（纯净白）
- **文字主色**：`#24292F`（深石墨灰，高对比度且不刺眼）
- **分割线**：`#E3E6EB`（1px 平整柔和细线）
- **缺口/冲突**：`#E53E3E` 柔和草莓红 + `#FFF5F5` 淡粉背景。
- **人员马卡龙配色**：薄荷绿 `#2E9E6B`、晴空蓝 `#2F80ED`、暖杏橙 `#E67E22`、香芋紫 `#8E44AD`、浆果粉 `#D83A6F`、海青色 `#028090`。
