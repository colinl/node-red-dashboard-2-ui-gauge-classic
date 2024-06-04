module.exports = function (RED) {
    function UIGaugeClassicNode (config) {
        RED.nodes.createNode(this, config)
        //console.log(`In UIGaugeClassicNode, config: ${JSON.stringify(config)}`)

        const node = this

        // which group are we rendering this widget
        const group = RED.nodes.getNode(config.group)

        const base = group.getBase()

        // clear the server side data store, this ensures it is cleared if the node is deployed
        //console.log(`clearing server data store`)
        base.stores.data.clear(node.id)

        let needles = config.needles
        //console.log(`needles: ${JSON.stringify(needles)}`)

        let ui_update = null
        let formattedValue = null

        // server-side event handlers
        const evts = {
            onAction: true,
            onInput: function (msg, send, done) {
                // does msg.payload exist?
                if (typeof msg.payload != "undefined") {
                    // yes so update value from payload
                    // join the needle values from successive messages and add into the message
                    //console.log(`onInput, needles: ${JSON.stringify(needles)}`)
                    if (needles.length === 1) {
                        // only one needle so ignore topic
                        needles[0].value = msg.payload
                    } else {
                        // find the needle with the matching topic
                        const needle = needles.find((element) => element.topic === msg.topic);
                        if (needle) {
                            needle.value = msg.payload
                        } else {
                            console.log(`Classic gauge - msg with no matching needle topic ${msg.topic}`)
                        }
                    }
                }
                // add the needles into the message
                msg.needles = needles

                // does msg.ui_update exist and is an object?
                if (typeof msg.ui_update === 'object' && !Array.isArray(msg.ui_update) && msg.ui_update !== null) {
                    // yes it does
                    ui_update ??= {}    // initialise if necessary
                    // merge in data from this message
                    ui_update = {...ui_update, ...msg.ui_update}
                }
                // pick up msg.formattedValue if present and is a string
                if (typeof msg.formattedValue === "string") {
                    formattedValue = msg.formattedValue
                }

                // include joined ui_update in the message if it exists
                if (ui_update) {
                    msg.ui_update = ui_update
                }
                // include joined formattedValue if present
                if (formattedValue) {
                    msg.formattedValue = formattedValue
                }

                // store the latest value in our Node-RED datastore
                base.stores.data.save(base, node, msg)
                // send it to any connected nodes in Node-RED
                send(msg)
            },
            onSocket: {
                /*
                'my-custom-event': function (conn, id, msg) {
                    console.info('"my-custom-event" received:', conn.id, id, msg)
                    console.info('conn.id:', conn.id)
                    console.info('id:', id)
                    console.info('msg:', msg)
                    console.info('node.id:', node.id)
                    // emit a msg in Node-RED from this node
                    node.send(msg)
                }
                */
            }
        }

        // inform the dashboard UI that we are adding this node
        if (group) {
            group.register(node, config, evts)
        } else {
            node.error('No group configured')
        }
    }

    RED.nodes.registerType('ui-gauge-classic', UIGaugeClassicNode)
}
