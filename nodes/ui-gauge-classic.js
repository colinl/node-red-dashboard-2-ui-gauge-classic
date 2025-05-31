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
        
        // Default new properties if not present
        node.keepwidth = config.keepwidth ?? true;

        // server-side event handlers
        const evts = {
            onAction: true,
            onInput: function (msg, send, done) {
                // pick up existing stored data
                let storedData = base.stores.data.get(node.id)
                //console.log(`onInput storedData: ${JSON.stringify(storedData)}\n\n`)

                // msg.ui_update.needles must be handled first
                if (typeof msg.ui_update === 'object' && !Array.isArray(msg.ui_update) && msg.ui_update !== null) {
                    // msg.ui_update.needles must be handled here rather than in the vue file
                    if ("needles" in msg.ui_update) {
                        // validate the content
                        if (validateNeedles(msg.ui_update.needles)) {
                            // keep the current values for copying across to the new ones for matching topics
                            const oldNeedles = storedData.needles
                            storedData.needles = msg.ui_update.needles
                            storedData.needles.forEach((needle, index) => {
                                // find the old needle with matching topic
                                const oldNeedle = oldNeedles.find((element) => element.topic == needle.topic);
                                if (oldNeedle) {
                                    // there is a matching one
                                    needle.value = oldNeedle.value
                                }
                            })
                            msg.needles = storedData.needles
                            // tell the clients that the needles have changed
                            msg._needlesChanged = true
                        } else {
                            console.log(`Gauge Classic, invalid msg.ui_update.needles: ${JSON.stringify(msg.ui_update.needles)}`)
                        }
                        delete msg.ui_update.needles
                    } else {
                        delete msg._needlesChanged
                    }
                }

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
                // NOTE since dashboard v1.21 I cannot store ui_update in data store as the core code will remove it
                // since the new way is to use the state store for that, so call it my_ui_update instead
                if (typeof msg.ui_update === 'object' && !Array.isArray(msg.ui_update) && msg.ui_update !== null) {
                    // yes it does
                    storedData.my_ui_update ??= {}    // initialise if necessary
                    // merge in data from this message
                    storedData.my_ui_update = {...storedData.my_ui_update, ...msg.ui_update}
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
                base.stores.data.save(base, node, storedData)
                // console.log(`leaving onInput, data store: ${JSON.stringify(base.stores.data.get(node.id))}\n\n`)
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

    /** Check the validy of a msg.ui_update.needles passed in
     * Returns true if ok, else false
     */
    function validateNeedles(needles) {
        let answer = false
        // perform basic validity checks, it should be an array where each element has color, length and topic
        if (Array.isArray(needles)) {
            const initialValue = true;
            answer = needles.reduce(
                (accumulator, currentValue) => accumulator && "color" in currentValue && "lengthPercent" in currentValue && "topic" in currentValue,
                initialValue,
            );
        }
        return answer
    }

    RED.nodes.registerType('ui-gauge-classic', UIGaugeClassicNode)
}
