module.exports = function (RED) {
    function UIGaugeClassicNode (config) {
        RED.nodes.createNode(this, config)
        //console.log(`In UIGaugeClassicNode, config: ${JSON.stringify(config)}`)

        const node = this

        // which group are we rendering this widget
        const group = RED.nodes.getNode(config.group)

        const base = group.getBase()

        // initialise data store on startup or deploy
        base.stores.data.save(base, node, {needles: config.needles})

        // server-side event handlers
        const evts = {
            onAction: true,
            onInput: function (msg, send, done) {
                // pick up existing stored data
                let storedData = base.stores.data.get(node.id)
                //console.log(`onInput storedData: ${JSON.stringify(storedData)}\n\n`)

                // does msg.payload exist?
                if (typeof msg.payload != "undefined") {
                    // yes so update value from payload
                    //console.log(`onInput, needles: ${JSON.stringify(needles)}`)
                    let needle = null
                    if (storedData.needles.length === 1) {
                        // only one needle so ignore topic
                        needle = storedData.needles[0]
                    } else {
                        // find the needle with the matching topic
                        needle = storedData.needles.find((element) => element.topic === msg.topic);
                    }
                    if (needle) {
                        needle.value = msg.payload
                        // pick up the needles array for sending to clients
                        msg.needles = storedData.needles
                    } else {
                        console.log(`Classic gauge - msg with no matching needle topic ${msg.topic}`)
                    }
                }

                // does msg.ui_update exist and is an object?
                if (typeof msg.ui_update === 'object' && !Array.isArray(msg.ui_update) && msg.ui_update !== null) {
                    // yes it does
                    storedData.ui_update ??= {}    // initialise if necessary
                    // merge in data from this message
                    storedData.ui_update = {...storedData.ui_update, ...msg.ui_update}
                } else {
                    // delete any msg.ui_update so don't need to validate in clients
                    delete msg.ui_update
                }
                // pick up msg.formattedValue if present and is a string
                if (typeof msg.formattedValue === "string") {
                    storedData.formattedValue = msg.formattedValue
                } else {
                    delete storedData.formattedValue
                }

                // store the latest full set of values in our Node-RED datastore
                //console.log(`leaving onInput storedData: ${JSON.stringify(storedData)}\n\n`)
                base.stores.data.save(base, node, storedData)
                // send the message with modified properties to the clients
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
