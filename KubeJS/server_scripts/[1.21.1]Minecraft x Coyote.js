/**
 * 测试版本4 - Minecraft 1.21.1
 *
 * 使用方法：
 * * /coyote - 显示所有命令
 * * 在开始游戏前需要绑定客户端，绑定客户端后玩法方可生效。
 *
 * 玩法说明：
 * * 当玩家受到伤害时输出四舍五入后伤害值强度的波形；
 * * 此后，每 1s 强度衰减 1，直至归零；
 * * 若存在基础强度则衰减至基础强度。
 * *
 * * 当玩家死亡时输出客户端最大强度的波形；
 * * 此后，每 1s 强度衰减 1，直至归零。
 *
 * 开源信息：
 * * 主页：https://github.com/klxf
 * * 本脚本使用 MIT License 开源许可协议授权
 */

const HttpGet = Java.loadClass('org.apache.http.client.methods.HttpGet')
const HttpPut = Java.loadClass('org.apache.http.client.methods.HttpPut')
const HttpPost = Java.loadClass('org.apache.http.client.methods.HttpPost')
const HttpClients = Java.loadClass('org.apache.http.impl.client.HttpClients')
const EntityUtils = Java.loadClass('org.apache.http.util.EntityUtils')
const StringEntity = Java.loadClass('org.apache.http.entity.StringEntity')

let pData = null

function kubeRequest(url, options) {
    let httpmethod = null
    switch (options.method) {
        case 'GET':
            httpmethod = new HttpGet(url)
            break
        case 'POST':
            httpmethod = new HttpPost(url)
            break
        default:
            httpmethod = new HttpGet(url)
    }

    if (httpmethod) {
        if (options.headers) {
            var key = Object.keys(options.headers)
            for (let i = 0; i < key.length; i++) {
                httpmethod.setHeader(key[i], options.headers[key[i]])
            }
        } else {
            httpmethod.setHeader('User-Agent', `MinecraftClient/${Platform.getMinecraftVersion()}`)
        }

        if (options.json) {
            if(httpmethod.setEntity){
                var entity = new StringEntity(JSON.stringify(options.json || {}), "UTF-8")
                entity.setContentType("application/json")
                httpmethod.setEntity(entity)
            } else {
                throw Error('GET can not set body!')
            }
        }

        var httpclient = HttpClients.createDefault()
        var response = httpclient.execute(httpmethod)
        var entity = response.getEntity()

        var content = EntityUtils.toString(entity, 'UTF-8')
        var json = () => {
            try {
                return JSON.parse(content)
            } catch (e) {
                throw Error(`Response is not a json`)
            }
        }
        return {body:content,headers:response.getAllHeaders(),json:json}
    }
}

ServerEvents.loaded(event => {
    let { server, server: { persistentData } } = event
    pData = persistentData
    persistentData.playerTimers = {}
    persistentData.coyoteConfigs = {}
})

PlayerEvents.loggedIn(event => {
    const { server, player, player: { username, uuid } } = event
    pData = event.server.persistentData
    console.log(`${username} login!`)
    pData.playerTimers[uuid] = 0
    pData.coyoteConfigs[uuid] = {
        apiHost: null,
        clientID: null,
        fireConfig: {
            strength: 0,
            firePulse: null
        }
    }
    console.log(pData.coyoteConfigs[uuid])
})

PlayerEvents.tick(event => {
    const { server, player, player: { username, uuid } } = event
    pData.playerTimers[uuid] = (parseInt(pData.playerTimers[uuid]) + 1) % 20
    if (parseInt(pData.playerTimers[uuid]) % 20 != 0) return
    if (pData.coyoteConfigs[uuid].fireConfig.strength && parseInt(pData.coyoteConfigs[player.uuid].fireConfig.strength) > 0) {
        pData.coyoteConfigs[uuid].fireConfig.strength = parseInt(pData.coyoteConfigs[player.uuid].fireConfig.strength) - 1

        const clientID = String(pData.coyoteConfigs[uuid].clientID).replace(/"/g, "")
        const apiHost = String(pData.coyoteConfigs[uuid].apiHost).replace(/"/g, "")
        const config = {
            "strength": {
                "sub": 1
            }
        }

        const fireRequest = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID + '/strength', {method: 'POST', json: config}).body)

        if (fireRequest.status == 1) {
            const gameInfo = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID, {method: 'GET'}).body)
            pData.coyoteConfigs[event.player.uuid].gameInfo = gameInfo
            console.log("§6§l⚡§r §a" + gameInfo.clientStrength.strength + '§r/§c' + gameInfo.clientStrength.limit + " §7↓")
            player.setStatusMessage("§6§l⚡§r §a" + gameInfo.clientStrength.strength + '§r/§c' + gameInfo.clientStrength.limit + " §7↓")
        } else {
            player.tell(fireRequest.message)
        }
    }
})

EntityEvents.afterHurt('player', event => {
    const clientID = String(pData.coyoteConfigs[event.player.uuid].clientID).replace(/"/g, "")
    const apiHost = String(pData.coyoteConfigs[event.player.uuid].apiHost).replace(/"/g, "")

    if (clientID != 'undefined') {
        // event.player.tell('受到伤害 ' + event.getDamage())
        let damage = event.getDamage()  // 防止强度超过 40
        if (damage > 40) {
            damage = 40
        }

        pData.coyoteConfigs[event.player.uuid].fireConfig.strength = parseInt(pData.coyoteConfigs[event.player.uuid].fireConfig.strength) + Math.ceil(damage)

        const config = {
            "strength": {
                "add": Math.ceil(damage)
            }
        }

        const fireRequest = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID + '/strength', {method: 'POST', json: config}).body)

        if (fireRequest.status == 1) {
            const gameInfo = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID, {method: 'GET'}).body)
            pData.coyoteConfigs[event.player.uuid].gameInfo = gameInfo
            event.player.setStatusMessage("§6§l⚡§r §a" + gameInfo.clientStrength.strength + '§r/§c' + gameInfo.clientStrength.limit + " §7↑")
        } else {
            event.player.tell(fireRequest.message)
        }
    }
})

EntityEvents.death('player', event => {
    const clientID = String(pData.coyoteConfigs[event.player.uuid].clientID).replace(/"/g, "")
    const apiHost = String(pData.coyoteConfigs[event.player.uuid].apiHost).replace(/"/g, "")

    if (clientID != 'undefined') {
        const gameInfo = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID, {method: 'GET'}).body)

        pData.coyoteConfigs[event.player.uuid].fireConfig.strength = gameInfo.clientStrength.limit

        const config = {
            "strength": {
                "set": gameInfo.clientStrength.limit
            }
        }

        const fireRequest = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID + '/strength', {method: 'POST', json: config}).body)

        if (fireRequest.status == 1) {
            // const gameInfo = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID, {method: 'GET'}).body)
            // pData.coyoteConfigs[event.player.uuid].gameInfo = gameInfo
            // event.player.setStatusMessage("§6§l⚡§r §a" + gameInfo.clientStrength.strength + '§r/§c' + gameInfo.clientStrength.limit + " §7↑")
        } else {
            event.player.tell(fireRequest.message)
        }
    }
})

ServerEvents.commandRegistry(event => {
    let { dispatcher, commands, arguments } = event
    dispatcher.register(commands.literal('coyote')
        .then(commands.literal('getPulse')
            .executes(ctx => {
                const { source: { player } } = ctx
                const clientID = String(pData.coyoteConfigs[player.uuid].clientID).replace(/"/g, "")
                const apiHost =  String(pData.coyoteConfigs[player.uuid].apiHost).replace(/"/g, "")

                if (apiHost == 'undefined') {
                    player.tell('§7[§6Coyote§7] §r§4⚠ §r出现异常：\n§c还未绑定客户端！')
                    return 0
                }

                const pulseList = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID + '/pulse_list', {method: 'GET'}).body).pulseList
                player.tell('§7§m=============§r§6§l 波形列表 §7§m=============')
                for (const pulseListKey in pulseList) {
                    player.tell(`§a${pulseList[pulseListKey].id} §7- ${pulseList[pulseListKey].name}`)
                }
                return 1
            })
        )
        .then(commands.literal('info')
            .executes(ctx => {
                const { source: { player } } = ctx
                const clientID = String(pData.coyoteConfigs[player.uuid].clientID).replace(/"/g, "")
                const apiHost =  String(pData.coyoteConfigs[player.uuid].apiHost).replace(/"/g, "")
                let gameInfo = null

                if (clientID != 'undefined') {
                    try {
                        gameInfo = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID, {method: 'GET'}).body)
                    } catch (e) {
                        player.tell('§7[§6Coyote§7] §r§4⚠ §r出现异常：\n§c' + e)
                    }

                    pData.coyoteConfigs[player.uuid].gameInfo = gameInfo
                    console.log(gameInfo)
                    if (gameInfo.strengthConfig != null) {
                        player.tell('§7§m=============§r§6§l 游戏信息 §7§m=============')
                        player.tell('>>> §l强度信息')
                        player.tell('  游戏强度范围：§a' + gameInfo.strengthConfig.strength + '~' + (gameInfo.strengthConfig.strength + gameInfo.strengthConfig.randomStrength))
                        player.tell('  客户端强度数据：§a' + gameInfo.clientStrength.strength + '§r/§c' + gameInfo.clientStrength.limit)
                        player.tell('>>> §l游戏设定')
                        player.tell('  开火强度限制：§a' + gameInfo.gameConfig.fireStrengthLimit)
                        player.tell('  强度变化频率：§a' + gameInfo.gameConfig.strengthChangeInterval[0] + '~' + gameInfo.gameConfig.strengthChangeInterval[1] + '秒')
                        player.tell('  当前波形列表：§a' + gameInfo.gameConfig.pulseId)
                        player.tell(
                            '  波形播放模式：§a' +
                            (gameInfo.gameConfig.pulseMode == 'single' ?
                                '单个' : gameInfo.gameConfig.pulseMode == 'sequence' ?
                                    '顺序 §b[' + gameInfo.gameConfig.pulseChangeInterval + '秒]' : '随机 §b[' + gameInfo.gameConfig.pulseChangeInterval + '秒]')
                        )
                        player.tell('  B通道强度倍数：§a' + gameInfo.gameConfig.bChannelStrengthMultiplier + (gameInfo.gameConfig.enableBChannel ? ' [开]' : ' §c[关]'))
                    } else {
                        player.tell('§7[§6Coyote§7] §r§4⚠ §r出现异常：\n§c客户端ID无效或未开始游戏！')
                    }
                } else {
                    player.tell('§7[§6Coyote§7] §r§4⚠ §r出现异常：\n§c还未绑定客户端！')
                }

                console.log(pData.coyoteConfigs)

                return 1
            })
        )
        .then(commands.literal('setPulse')
            .then(commands.argument('pulseID', arguments.GREEDY_STRING.create(event))
                .executes(ctx => {
                    const { source: { player } } = ctx
                    const clientID = String(pData.coyoteConfigs[player.uuid].clientID).replace(/"/g, "")
                    const apiHost =  String(pData.coyoteConfigs[player.uuid].apiHost).replace(/"/g, "")
                    pData.coyoteConfigs[player.uuid].fireConfig.firePulse = String(arguments.GREEDY_STRING.getResult(ctx, 'pulseID'))

                    if (apiHost == 'undefined') {
                        player.tell('§7[§6Coyote§7] §r§4⚠ §r出现异常：\n§c还未绑定客户端！')
                        return 0
                    }

                    const config = {
                        "pulseId": String(pData.coyoteConfigs[player.uuid].fireConfig.firePulse).replace(/"/g, "")
                    }

                    const pulseRequest = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID + '/pulse', {method: 'POST', json: config}).body)

                    if (pulseRequest.status == 1) {
                        player.tell(`§7[§6Coyote§7] §r成功设置波形 ID 为 ${pData.coyoteConfigs[player.uuid].fireConfig.firePulse}`)
                    } else {
                        event.player.tell(fireRequest.message)
                    }

                    return 1
                })
            )
        )
        .then(commands.literal('bind')
            .then(commands.argument('bindCode', arguments.GREEDY_STRING.create(event))
                .executes(ctx => {
                    const { source: { player } } = ctx
                    const bindCode = String(arguments.GREEDY_STRING.getResult(ctx, 'bindCode'))
                    const clientID = bindCode.split("@")[0]
                    const apiHost = bindCode.split("@")[1]
                    let gameInfo = null

                    if (!clientID || !apiHost) {
                        player.tell('§7[§6Coyote§7] §4⚠ §r客户端绑定失败：\n§c连接码格式错误')
                        return 0
                    }

                    try {
                        gameInfo = JSON.parse(kubeRequest(apiHost + '/api/v2/game/' + clientID, {method: 'GET'}).body)
                    } catch (e) {
                        player.tell('§7[§6Coyote§7] §4⚠ §r客户端绑定失败：\n§c' + e)
                        return 0
                    }

                    pData.coyoteConfigs[player.uuid].gameInfo = gameInfo

                    console.log(pData.coyoteConfigs[player.uuid].fireConfig.strength)

                    if (!gameInfo.strengthConfig) {
                        player.tell('§7[§6Coyote§7] §4⚠ §r客户端绑定失败：\n§c连接码无效无效或未开始游戏！')
                        return 0
                    }

                    player.tell('§7[§6Coyote§7] §r已绑定客户端！')
                    player.tell('§7[§6Coyote§7] §rHi, ' + clientID)

                    pData.coyoteConfigs[player.uuid].clientID = clientID
                    pData.coyoteConfigs[player.uuid].apiHost = apiHost

                    return 1
                })
            )
        )
        .executes(ctx => {
            const { source: { player } } = ctx

            player.tell('§7§m=============§r§6§l 游戏帮助 §7§m=============')
            player.tell('§a/coyote bind <bindCode> §7- 绑定客户端')
            player.tell('§a/coyote setPulse <pulseID> §7- 设定波形')
            player.tell('§a/coyote info §7- 显示游戏信息')
            player.tell('§a/coyote getPulse §7- 显示可用波形')
            player.tell('§c绑定§n客户端§r§c后玩法才可生效')

            return 1
        })
    )
})
