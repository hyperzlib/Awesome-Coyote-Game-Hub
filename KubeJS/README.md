# 适用于 Minecraft KubeJS Mod 的脚本
本目录下收集适用于 Minecraft KubeJS Mod 的脚本

## `server_scripts`
此目录下的脚本应放置在游戏的 `.minecraft\kubejs\server_scripts` 目录下

### `[1.21.1]Minecraft x Coyote.js`
适用于 Minecraft 1.21.1 的战败惩罚脚本

在开始游戏前需要绑定客户端，绑定客户端后玩法方可生效，使用命令 `/coyote` 可查看帮助信息

当玩家受到伤害时输出四舍五入后伤害值强度的波形；此后，每 `1s` 强度衰减 `1`，直至归零；若存在基础强度则衰减至基础强度

#### 命令列表
- `/coyote bind <bindCode>` - 绑定客户端，`<bindCode>` 为“连接码”
- `/coyote setPulse <pulseID>` - 设定波形，`<pulseID>` 为“波形ID”
- `/coyote info` - 获取游戏信息
- `/coyote getPulse` - 获取可用波形

#### 开始游戏
使用 `/coyote bind <bindCode>` 绑定客户端后玩法即可生效，可以使用 `/coyote setPulse <pulseID>` 更改输出波形

#### 开源信息

作者主页：https://github.com/klxf

本脚本使用 MIT License 开源许可协议授权
