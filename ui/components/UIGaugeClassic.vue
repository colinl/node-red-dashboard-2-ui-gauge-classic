<!-- A classic style Gauge by @colinl
  Based on original work by @HotNipi
-->
<template>
    <!-- Component must be wrapped in a block so props such as className and style can be passed in from parent -->
    <div className="ui-gauge-cl-wrapper" :class="class" :style="wrapperStyle">
        <svg class="cl-gauge" ref="cl-gauge" width="100%" height="100%" :view-box.camel="theViewBox" :style="`--dash: ${this.arc.arcLength};`">
            <g>
                <path v-for="(item, index) in sectors" :key="index" :ref="'sector-' + index" class="sector" stroke-width="5" 
                  :d="arcspec" :style="strokeStyle(index)" ></path>

                <path class="tick-minor" stroke-width="5" :d="arcspec" :style="tickStyle(this.minorDivision, 0.5)"></path>
                <path ref="arc" class="tick-major" stroke-width="5" :d="arcspec" :style="tickStyle(this.majorDivision, 1)"></path>

                <text v-for="(item, index) in numbers" :key="index" class="num" text-anchor="middle" :y="`${10.5-this.arc.radius}`" 
                  :style="`rotate: ${item.r}deg; transform-origin: ${this.arc.cx}% ${this.arc.cy/this.widgetSizeRatio}%; transform: translate(${this.arc.cx}%, ${this.arc.cy/widgetSizeRatio}%)`">
                  {{item.n}}</text>

                <text class="label" y="0" x="50%" text-anchor="middle">{{label}}</text>
                <text class="measurement" :y="`${this.arc.cy-16}`" x="50%" text-anchor="middle">{{measurement}}</text>
                <text class="units" :y="`${this.unitsTextY}`" x="50%" text-anchor="middle">{{units}}</text>
                <text class="value" :y="`${this.valueTextY}`" x="50%" text-anchor="middle">{{formattedValue}}</text>
            </g>
            <g v-for="(item, index) in needles" :ref="'o-needle-'+index" class="o-needle" 
              :style="`transform-box: fill-box; transform-origin: 50% 100%; rotate: ${item.rotation};`"
              v-html="needle(needles[index].lengthPercent,needles[index].color)">
            </g>
            <g>
                <circle class="hub" :cx="`${this.arc.cx}`" :cy="`${this.arc.cy}`" r="3"></circle>
            </g>
        </svg>
    </div>
</template>

<script>
import { markRaw } from 'vue'
import { mapState } from 'vuex'

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
            class: "",

            //don't change these
            value: null,
            needles: [],

            // derived values
            widgetSizeRatio: 1,
            unitsTextY: 0,
            valueTextY: 0,
        }
    },
    computed: {
        ...mapState('data', ['messages']),
        wrapperStyle: function() {
            // should not need this, it should be done by the dashboard
            // See https://discourse.nodered.org/t/custom-ui-node-containing-svg-image-not-sizing-correctly-on-dashboard/88152
            let rowSpan = this.props.height
            if (!rowSpan) {
                rowSpan = "null"    // size is auto
            }
            return `grid-row-end: span ${rowSpan};`
        },
        arcspec: function() {
            const delta = this.arc.endDegrees - this.arc.startDegrees
            // if more than 180 deg sweep then large-arg-flag should be 1
            const largeArcFlag = delta > 180  ?  1  :  0

            return `M ${this.arc.startx} ${this.arc.starty} A ${this.arc.radius} ${this.arc.radius} 0 ${largeArcFlag} 1 ${this.arc.endx} ${this.arc.endy}`
        },
        formattedValue: function() {
            // Show --- for the value until a valid value is recevied
            return this.value !== null  ?  this.value.toFixed(this.valueDecimalPlaces)  :  "---"
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
            // load the latest message from the Node-RED datastore when this widget is loaded
            // storing it in our vuex store so that we have it saved as we navigate around
            //console.log(`On widget-load ${JSON.stringify(msg)}`)
            //console.log(`sectors: ${JSON.stringify(this.sectors)}`)
            this.processMsg(msg)     // pick up message values
            this.$store.commit('data/bind', {
                widgetId: this.id,
                msg
            })
        })
        this.$socket.on('msg-input:' + this.id, (msg) => {
            //console.log(`Message received: ${JSON.stringify(msg)}`)
            // new message received
            this.processMsg(msg)

            // store the latest message in our client-side vuex store when we receive a new message
            this.$store.commit('data/bind', {
                widgetId: this.id,
                msg
            })
        })

        //console.log(`props: ${JSON.stringify(this.props)}`)
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
        this.$socket?.off('widget-load' + this.id)
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
            this.class = props.myclass

            this.calculateDerivedValues()
        },
        strokeStyle: function(i) {
            // returns the css style for sector[i]
            //console.log(`strokeStyle i: ${i}`)
            const sector = this.sectors[i]
            const params = {minIn: this.min, maxIn: this.max, minOut:0, maxOut: this.arc.arcLength}
            const start = this.range(sector.start,params,false)
            const end = this.range(sector.end,params,false)
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
            if (this.measurement && this.measurement.length > 0) {
                this.unitsTextY = this.arc.cy + 11
                this.valueTextY = this.arc.cy + 26
            } else {
                this.unitsTextY = this.arc.cy - 23
                this.valueTextY = this.arc.cy - 8
            }
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

        },
        processMsg: function(msg) {
            // The message fed in is processed in ui-gauge-classic.js and needle values are joined into msg.needles
            //console.log(`processMessage, $refs: ${JSON.stringify(this.$refs)}`)
            if (msg.needles) {
                this.needles.forEach((needle, index) => {
                    const v = this.validate(msg.needles[index].value)       // this copes with undefined value
                    // the value displayed is from the first needle
                    if (index === 0) {
                        // value displayed is for the first needle
                        this.value = v
                    }
                    needle.rotation = this.rotation(v)
                })
            }
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
            // allow pointer to go 10% off ends of scale, but not more than half way to the other end of the scale
            // except in the special case of widget height is half the width, in which case only 2% so that needle does not go
            // off the bottom
            const factor = (this.height/this.width == 0.5) ? 0.02 : 0.1
            const deltaDeg = this.arc.endDegrees - this.arc.startDegrees
            const gapDeg = 360 - deltaDeg
            const overflowFactor = Math.min(factor, gapDeg/2/deltaDeg)
            const overflow = (this.max-this.min)*overflowFactor
            const angleOverflow = (deltaDeg)*overflowFactor 
            const min = this.min - overflow
            const max = this.max + overflow
            const minAngle = this.arc.startDegrees - angleOverflow
            const maxAngle = this.arc.endDegrees + angleOverflow
            const params = {minIn:min, maxIn:max, minOut:minAngle, maxOut:maxAngle};
            if (v === null) {
                v = Math.min(min, max)
            }
            return `${this.range(v,params,false)}deg`
        },
        tickStyle: function(division, width) {
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
        needle: function(lengthPercent, color) {
            const cx = this.arc.cx
            const cy = this.arc.cy
            const length = (this.arc.radius - 4.5) * lengthPercent/100
            return `<path d="M ${cx},${cy} ${cx-1.5},${cy} ${cx-0.15},${cy-length} ${cx+0.15},${cy-length} ${cx+1.5},${cy} z"
                fill="${color}"></path>`
        },
    },
}
</script>

<style scoped>
    /* CSS is auto scoped, but using named classes is still recommended */
    @import "../stylesheets/ui-gauge-classic.css";
</style>
