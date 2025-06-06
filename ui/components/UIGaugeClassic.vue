<!-- A classic style Gauge by @colinl
  Based on original work by @HotNipi
-->
<template>
    <!-- Component must be wrapped in a block so props such as className and style can be passed in from parent -->
    <div class="ui-gauge-cl-wrapper" :class="class" :style="wrapperStyle"  ref="wrapper">
        <svg class="cl-gauge" ref="cl-gauge" width="100%" height="100%" :view-box.camel="theViewBox" :style="`--dash: ${this.arc.arcLength};`">
            <g>
                <path v-for="(item, index) in sectors" :key="index" :ref="'sector-' + index" class="sector" stroke-width="5" 
                  :d="arcspec" :style="this.sectorStrokeStyles[index]" ></path>

                <path class="tick-minor" stroke-width="5" :d="arcspec" :style="this.minorTickStyle"></path>
                <path ref="arc" class="tick-major" stroke-width="5" :d="arcspec" :style="this.majorTickStyle"></path>


                  <g class="num-wrap" v-for="(item, index) in numbers" :key="index"  
                  :style="`--to-x: ${this.arc.cx}; --to-y:${this.arc.cy/this.widgetSizeRatio}; --t-r:${item.r}; --tt-x:${this.arc.cx}; --tt-y:${this.arc.cy/widgetSizeRatio};`">
                  <text class="num" text-anchor="middle" :y="`${10.5-this.arc.radius}`">{{item.n}}</text></g>

                <text class="label" y="0" x="50%" text-anchor="middle">{{label}}</text>
                <text class="measurement" :y="`${this.arc.cy-16}`" x="50%" text-anchor="middle">{{measurement}}</text>
                <text class="units" :y="`${this.unitsTextY}`" x="50%" text-anchor="middle">{{units}}</text>
                <text class="value" :y="`${this.valueTextY}`" x="50%" text-anchor="middle">{{displayValue}}</text>
            </g>
            <g v-for="(needle, index) in needles" :class="`o-needle o-needle-${index+1}`"
              :style="`transform-box: fill-box; transform-origin: 50% 100%; rotate: ${needle.rotation};`"
              v-html="needle.path">
            </g>
            <g>
                <circle class="hub" :cx="`${this.arc.cx}`" :cy="`${this.arc.cy}`" r="3" :style="`fill: ${this.hubcolor}`"></circle>
            </g>
        </svg>
    </div>
</template>

<script>
//import { markRaw } from 'vue'
import { mapState } from 'vuex'

const logEvents = false  // whether to log incoming messages and events

export default {
    name: 'UIGaugeClassic',
    inject: ['$socket'],
    props: {
        /* do not remove entries from this - Dashboard's Layout Manager's will pass this data to your component */
        id: { type: String, required: true },
        props: { type: Object, default: () => ({}) },
        state: { type: Object, default: () => ({ enabled: false, visible: false }) }
    },
    setup (props) {
        //console.info('UIGaugeClassic setup with:', props)
        //console.debug('Vue function loaded correctly', markRaw)
    },
    data () {
        return {
            // Min and max scale values.  Max may be less that min.
            min:0,
            max:1,
            majorDivision: 10,       // number of input units for each (numbered) major division
            minorDivision: 5,       // number of input units for each minor division
            units:"",
            label:"",
            measurement:"",
            valueDecimalPlaces: 2,    // number of decimal places to show in the value display
            scaleDecimalPlaces: 1,    // number of decimal places to show on the scale
            width: 4,                   // widget width and height in dashboard units
            height: 4,
            // Coloured sectors around the scale.  Sectors can be in any order and it makes no difference if 
            // start and end are reversed.
            //  Any gaps are left at background colour
            sectors:[],


            // The position and alignment of the gauge inside the 100x100 svg box for the widget can be changed by modifying the settings below
            // The origin of the svg box is the top left hand corner. The bottom right hand corner is 100,100
            // Obviously, if you move the gauge you may have to move the text fields also.
            // Take care with these settings, if you put silly values in the browser showing the dashboard may lock up. If this happens,
            // close the dashboard browser tab (which may take some time as it is locked up).
            arc: {
                cx:50,              // the x and y coordinates of the centre of the gauge arc
                cy: 64, 
                radius: 47.5,       // the radius of the arc
                startDegrees: -123, // the angle of the start and end points of the arc.  Zero is vertically up from the centre
                endDegrees: 123,    // +ve values are clockwise
                sweepAngle: 246,
                // derived values, values here are just to stop errors before first message received
                startx: 10,
                starty: 90,
                endx: 90,
                endy: 90,
                arcLength: 100,
            },
            keepwidth: true,
            hubcolor: "black",
            class: "",

            //don't change these
            value: null,
            needles: [],

            // derived values
            widgetSizeRatio: 1,
            unitsTextY: 0,
            valueTextY: 0,
            sectorStrokeStyles: [],     // pre-calculated stroke styles for the sectors
            majorTickStyle: "",
            minorTickStyle: "",
            formattedValue: null,       // formatted value from msg if provided
        }
    },
    computed: {
        ...mapState('data', ['messages']),
        wrapperStyle: function() {
            return ""
        },
        arcspec: function() {
            const delta = this.arc.endDegrees - this.arc.startDegrees
            // if more than 180 deg sweep then large-arg-flag should be 1
            const largeArcFlag = delta > 180  ?  1  :  0

            return `M ${this.arc.startx} ${this.arc.starty} A ${this.arc.radius} ${this.arc.radius} 0 ${largeArcFlag} 1 ${this.arc.endx} ${this.arc.endy}`
        },
        displayValue: function() {
            // Shows --- for the value until a valid value is received, then shows msg.formattedValue if provided, 
            // or the value from first needle
            let value = this.formattedValue        // value from msg if provided
            if (typeof value != "string") {
                // no formattedValue provided so show the number
                value = this.value !== null  ?  this.value.toFixed(this.valueDecimalPlaces)  :  "---"
            }
            return value
        },
        numbers: function() {
            return this.generateNumbers(this.min,this.max,this.majorDivision)
        },
        theViewBox() {
            let y = 100*this.props.height/this.props.width
            if (isNaN(y) || !y) {
                y = 100
            }
            const answer = `0 0 100 ${y}`
            //console.log(`theViewBox: ${answer}, height: ${this.props.height}, width: ${this.props.width}`)
            return answer
        },
    },
    mounted () {
        this.$socket.on('widget-load:' + this.id, (msg) => {
            //console.log(`$refs: ${JSON.stringify(this.$refs)}`)
            // load the latest message from the Node-RED datastore when this widget is loaded
            // storing it in our vuex store so that we have it saved as we navigate around
            if (logEvents) console.log(`On widget-load ${JSON.stringify(msg)}`)
            // Since dashboard v1.21 the way the data store is used has changed and so I have had to 
            // store the ui_updates in a structure called my_ui_updates.  Setup msg.ui_update to this
            msg.ui_update = msg.my_ui_update
            this.processMsg(msg)     // pick up message values
            /*
                this.$store.commit('data/bind', {
                    widgetId: this.id,
                    msg
                })
            */
            if (this.keepwidth) {
                // Hack to change the properties of the outermost widget element so that it can expand vertically if necessary
                // this means that if, for example, it is sized at 3x3 then it can use more than three dashboard rows if necessary
                this.$refs.wrapper.parentNode.style["grid-template-rows"] = "repeat(0, var(--widget-row-height))"
                this.$refs.wrapper.parentNode.style["grid-row-end"] = "span null"
            }
        })
        this.$socket.on('msg-input:' + this.id, (msg) => {
            if (logEvents) console.log(`Message received: ${JSON.stringify(msg)}`)
            // new message received
            this.processMsg(msg)

            // store the latest message in our client-side vuex store when we receive a new message
            this.$store.commit('data/bind', {
                widgetId: this.id,
                msg
            })
        })

        if (logEvents) console.log(`mounted, props: ${JSON.stringify(this.props)}`)
        // pickup node properties to local data
        this.pickupProperties()
        // initialise needle positions
        this.needles.forEach((needle) => {
            needle.rotation = this.rotation(null)
        })
        // tell Node-RED that we're loading a new instance of this widget
        this.$socket.emit('widget-load', this.id)
    },
    unmounted () {
        /* Make sure, any events you subscribe to on SocketIO are unsubscribed to here */
        this.$socket?.off('widget-load:' + this.id)
        this.$socket?.off('msg-input:' + this.id)
    },
    methods: {
        pickupProperties: function() {
            // pickup node properties from this.props and merge with base properties
            const props = this.props
            
            this.min = Number(props.min)
            this.max = Number(props.max)
            this.width = Number(props.width)      // width and height in dashboard 2 units, 0,0 (auto) is coped with below
            this.height = Number(props.height)
            this.sectors = props.sectors
            this.majorDivision = Number(props.major_division)
            this.minorDivision = Number(props.minor_division)
            this.valueDecimalPlaces = Number(props.value_decimal_places)
            this.scaleDecimalPlaces = Number(props.scale_decimal_places)
            this.label = props.label
            this.units = props.units
            this.measurement = props.measurement
            this.needles = props.needles
            this.arc.sweepAngle = props.sweep_angle || 246
            this.keepwidth = props.keepwidth ?? true
            this.hubcolor = props.hubcolor ?? "black"
            this.class = props.myclass

            this.calculateDerivedValues()
        },
        calcStrokeStyle: function(i) {
            // returns the css style for sector[i]
            const sector = this.sectors[i]
            const params = {minIn: this.min, maxIn: this.max, minOut:0, maxOut: this.arc.arcLength}
            const start = this.range(sector.start,params,false)
            // determine end for this sector
            let sectorEnd
            if (i >= this.sectors.length-1) {
                // this is the last sector so use scale end as the end, allowing for reversed end points
                sectorEnd = Math.max(this.max, this.min)
            } else {
                sectorEnd = this.sectors[i+1].start
            }
            const end = this.range(sectorEnd,params,false)
            const pos = Math.min(start, end)
            const span = Math.max(start, end) - pos
            return `stroke-dasharray: 0 ${pos} ${span} var(--dash); stroke: ${sector.color};`
        },
        calculateDerivedValues: function() {
            // validates values and calculates derived values

            const cyLow = 64            // y coord of centre when gauge positioned at bottom of widget
            const cyHigh = 50           // y coord when chart at top of widget
            const radius = 47.5         // the usual radius
            // sanity checks - probably there should be more of these
            this.majorDivision = this.majorDivision <= 0  ?  1  : this.majorDivision
            this.minorDivision = this.minorDivision <= 0  ?  1  : this.minorDivision
            // position chart at top of widget if label is empty
            this.arc.radius = radius
            if (this.label && this.label.length > 0) {
                this.arc.cy = cyLow
            } else {
                this.arc.cy = cyHigh
                // for the special case of the widget height being exactly 50 svg units (half the height), reduce the radius a bit
                // so that the needle hub will be fully visible
                if (this.height/this.width == 0.5) {
                    this.arc.radius -= 2.0  // not quite sure why this is ok with -2 with cy at -2.5
                    this.arc.cy -= 2.5
                }
            }
            // position units and value text above or below centre dependent on whether measurement text is provided
            this.calcTextPositions()

            // calculate start and end degrees from sweepAngle
            // check for undefined or 0, both are innapropriate
            if (this.arc.sweepAngle) {
                this.arc.sweepAngle = Math.min(360, this.arc.sweepAngle)
                this.arc.startDegrees = -this.arc.sweepAngle/2
                this.arc.endDegrees = this.arc.sweepAngle/2
            }

            const startRadians = this.arc.startDegrees * Math.PI/180
            const endRadians = this.arc.endDegrees * Math.PI/180
            this.arc.startx = this.arc.cx - this.arc.radius * Math.sin(startRadians-Math.PI)
            this.arc.starty = this.arc.cy + this.arc.radius * Math.cos(startRadians-Math.PI)
            this.arc.endx = this.arc.cx + this.arc.radius * Math.sin(Math.PI-endRadians)
            this.arc.endy = this.arc.cy + this.arc.radius * Math.cos(Math.PI-endRadians)
            this.arc.arcLength = 2 * Math.PI * this.arc.radius * (this.arc.endDegrees - this.arc.startDegrees)/360

            this.widgetSizeRatio = this.height/this.width
            // cope with size 0,0 or 0,x
            if (isNaN(this.widgetSizeRatio) || !this.widgetSizeRatio) {
                this.widgetSizeRatio = 1
            }
            //console.log(`widgetSizeRatio: ${this.widgetSizeRatio}`)

            // pre-calculate the styles for the sectors
            this.calcSectorStyles()

            // precalculate tick styles
            this.minorTickStyle = this.calcTickStyle(this.minorDivision, 0.5)
            this.majorTickStyle = this.calcTickStyle(this.majorDivision, 1)
            // precalculate needle paths
            this.needles.forEach(needle => {
                needle.path = this.calcNeedlePath(needle.lengthPercent,needle.color)
            })
        },
        processMsg: function(msg) {
            // The message fed in is processed in ui-gauge-classic.js and needle values are joined into msg.needles
            if (msg.ui_update) {
                if (Array.isArray(msg.ui_update?.sectors)) {
                    // a sectors array is included
                    this.sectors = msg.ui_update.sectors
                }
                // check for dynamic settings for measurement and units, and pick them up
                if (typeof msg.ui_update?.measurement === 'string') {
                    this.measurement = msg.ui_update.measurement
                }
                if (typeof msg.ui_update?.units === 'string') {
                    this.units = msg.ui_update.units
                }
                if ("sweepAngle" in msg.ui_update) {
                    const newAngle = Number(msg.ui_update.sweepAngle)
                    if (newAngle > 0 && newAngle <= 360)
                        this.arc.sweepAngle = newAngle
                }
                ["min", "max", "minorDivision", "majorDivision", "valueDecimalPlaces", "scaleDecimalPlaces"].forEach(attr => {
                    if (attr in msg.ui_update) {
                        this[attr] = Number(msg.ui_update[attr])
                        //console.log(`this[${attr}]: ${this[attr]}`)
                    }
                })

                if ("label" in msg.ui_update && typeof msg.ui_update.label === 'string') {
                    this.label = msg.ui_update.label
                }

                if ("hubcolor" in msg.ui_update && typeof msg.ui_update.hubcolor === 'string') {
                    this.hubcolor = msg.ui_update.hubcolor
                }
            }
            // if the needles array has changed need to throw away our copy
            if (msg._needlesChanged) {
                this.needles = msg.needles
            }
            // precalculate stuff if any ui_updates present or needles have been changed
            if ("ui_update" in msg || msg._needlesChanged) {
                this.calculateDerivedValues()
                // pre-calculate the styles for the sectors
                this.calcSectorStyles()
                // precalculate tick styles
                this.minorTickStyle = this.calcTickStyle(this.minorDivision, 0.5)
                this.majorTickStyle = this.calcTickStyle(this.majorDivision, 1)
                // needle positions may have changed due to scale changes
                this.recalcNeedlePositions()
            }
            // pick up formattedValue if present (checked to be string in js file)
            if (typeof msg.formattedValue === "string") {
                this.formattedValue = msg.formattedValue
            } else {
                this.formattedValue = null
            }
            // do this last as the config may have been changed by other stuff in the message
            if (msg.needles) {
                this.needles.forEach((needle, index) => {
                    const v = this.validate(msg.needles[index]?.value)       // this copes with undefined value
                    needle.value = v
                    // the value displayed is from the first needle
                    if (index === 0) {
                        // value displayed is for the first needle
                        this.value = v
                    }
                    needle.rotation = this.rotation(v)
                })
            }
            // if msg.class or msg.ui_update.class is provided then remove any previous dynamic class and replace with this one
            if (typeof msg.ui_update?.class == "string") {
                this.updateDynamicClass(msg.ui_update.class)
            }
            if ("class" in msg) {
                this.updateDynamicClass(msg.class)
            }
        },
        updateDynamicClass: function (newClass) {
            // Concatenate added classes with that from node properties
            this.class = `${this.props.myclass} ${newClass}`
        },
        recalcNeedlePositions: function() {
            this.needles.forEach((needle, index) => {
                needle.rotation = this.rotation(needle.value)
            })
        },
        validate: function(data){
            let ret                
            if(typeof data !== "number"){
                ret = parseFloat(data)
                if(isNaN(ret)){
                    //console.log("INVALID DATA! gauge id:",this.id,"data:",data)
                    ret = null
                }
            }                    
            else{
                ret = data
            }                
            return ret
        },
        range:function (n, p, r) {
            // clamp n to be within input range
            if (p.maxIn > p.minIn) {
                n = Math.min(n, p.maxIn)
                n = Math.max(n, p.minIn)
            } else {
                n = Math.min(n, p.minIn)
                n = Math.max(n, p.maxIn)
            }
            if(r){
                return Math.round(((n - p.minIn) / (p.maxIn - p.minIn) * (p.maxOut - p.minOut)) + p.minOut);
            }
            return ((n - p.minIn) / (p.maxIn - p.minIn) * (p.maxOut - p.minOut)) + p.minOut;
        },
        generateNumbers:function(min,max,majorDivision){    
            let minDegrees, maxDegrees, startValue
            if (max > min) {
                minDegrees = this.arc.startDegrees
                maxDegrees = this.arc.endDegrees
                startValue = min    
            } else {
                minDegrees = this.arc.endDegrees
                maxDegrees = this.arc.startDegrees
                startValue = max              
            }
            // Calculate number of major divisions, adding on a bit and rounding down in case last one is just off the end
            const numDivs = Math.floor(Math.abs(max-min) / majorDivision + 0.1)
            const degRange = maxDegrees-minDegrees
            const degPerDiv = degRange * majorDivision/Math.abs(max-min)
            let nums = []
            for (let div=0; div<=numDivs; div++) {
                let degrees = div*degPerDiv + minDegrees
                const n = (startValue + div * majorDivision).toFixed(this.scaleDecimalPlaces)
                nums.push({r: degrees, n: n})
            }
            return nums 
        },
        rotation:function(v){
            const deltaDeg = this.arc.endDegrees - this.arc.startDegrees
            // allow the needle to go a bit off the end when conditions allow
            let rotationLimitDeg = this.calcRotationLimitDegrees()
            // stop it limiting to less than the full range
            if (rotationLimitDeg < this.arc.sweepAngle/2) rotationLimitDeg = this.arc.sweepAngle/2
            const minAngle = - rotationLimitDeg
            const maxAngle = rotationLimitDeg
            // calc limit in user units
            const overflow = (rotationLimitDeg - this.arc.sweepAngle/2) * (this.max - this.min)/this.arc.sweepAngle
            const min = this.min - overflow
            const max = this.max + overflow
            const params = {minIn:min, maxIn:max, minOut:minAngle, maxOut:maxAngle};
            if (v === null) {
                v = Math.min(min, max)
            }
            return `${this.range(v,params,false)}deg`
        },
        calcTickStyle: function(division, width) {
            // division is the number of input units per tick
            // width is the width (length?) of the tick in svg units

            // total arc length in svg units
            const arcLength = this.arc.arcLength
            // length in user units
            const range = Math.abs(this.max - this.min)
            const tickPeriod = division/range * arcLength
            // marker is width wide, so gap is tickPeriod-width
            // stroke-dashoffset sets the first tick to half width
            return `stroke-dasharray: ${width} ${tickPeriod-width}; stroke-dashoffset: ${width/2};`
        },

        // Calculate the style css for all sectors
        calcSectorStyles: function() {
            this.sectors.forEach((sector, i) => {
                this.sectorStrokeStyles[i] = this.calcStrokeStyle(i)
            })
        },

        calcTextPositions: function() {
            // position units and value text above or below centre dependent on whether measurement text is provided
            if (this.measurement && this.measurement.length > 0) {
                this.unitsTextY = this.arc.cy + 11
                this.valueTextY = this.arc.cy + 26
            } else {
                this.unitsTextY = this.arc.cy - 23
                this.valueTextY = this.arc.cy - 8
            }
        },

        calcNeedlePath: function(lengthPercent, color) {
            const cx = this.arc.cx
            const cy = this.arc.cy
            const length = (this.arc.radius - 4.5) * lengthPercent/100
            return `<path d="M ${cx},${cy} ${cx-1.5},${cy} ${cx-0.15},${cy-length} ${cx+0.15},${cy-length} ${cx+1.5},${cy} z"
                fill="${color}"></path>`
        },
        calcRotationLimitDegrees: function() {
            /** Determines the needle rotation limit which prevents the needle
             * from being clipped by the lower limit of the view box.
             * The answer is in degrees measured from the vertical. So the range is
             * plus and minus this value.
             */
            // default to 15 deg off each end, but not allowing wrap around
            let answer = Math.min(this.arc.sweepAngle/2 + 15, 180)
            if (this.height) {
                // not auto height
                const aspectRatio = this.height/this.width
                // calc distance between centre and bottom
                const h = 100*aspectRatio - this.arc.cy
                // if this is greater than the length of the needle then no need to limit
                // assume 100% needle length, it isn't worth worrying about greater lengths
                const l = this.arc.radius - 4.5
                if (h < l) {
                    // if h is -ve, so hub is off the bottom, then limit to scale range
                    if (h > 0) {
                        // calc angle (degrees) between vertical and needle just touching the bottom edge
                        const alpha = Math.acos(h/l) * 57.2958
                        // we need the angle from the vertical, and limit to 20 deg off end of scale
                        answer = Math.min(180 - alpha, this.arc.sweepAngle/2 + 15)
                    } else {
                        // h is -ve
                        answer = this.arc.sweepAngle/2
                    }
                }
            }
            return answer
        },
    },
}
</script>

<style scoped>
    /* CSS is auto scoped, but using named classes is still recommended */
    @import "../stylesheets/ui-gauge-classic.css";
</style>
