(function() {
  "use strict";
  try {
    if (typeof document != "undefined") {
      var elementStyle = document.createElement("style");
      elementStyle.appendChild(document.createTextNode("/* CSS is auto scoped, but using named classes is still recommended */\n.ui-gauge-cl-wrapper[data-v-585800ff] {\n    padding: 10px;\n    margin: 10px;\n    border: 1px solid black;\n}\n.ui-gauge-cl-class[data-v-585800ff] {\n    color: green;\n    font-weight: bold;\n}\n.cl-gauge[data-v-585800ff]{\n    position:relative;\n}\n.cl-gauge .label[data-v-585800ff] {\n    fill:currentColor;\n    font-size:0.5rem;\n    alignment-baseline:hanging;\n}\n.cl-gauge .value[data-v-585800ff] {\n    fill:currentColor;\n}\n.cl-gauge .units[data-v-585800ff] {\n    fill:currentColor;\n    font-size:0.4rem;\n}\n.cl-gauge .measurement[data-v-585800ff] {\n    fill:currentColor;\n    font-size:0.5rem;\n}\n.cl-gauge .num[data-v-585800ff]{\n    fill:currentColor;\n    fill-opacity:0.6;\n    font-size:.35rem;\n}\n.cl-gauge .tick-minor[data-v-585800ff]{\n    fill:none;\n    stroke:currentColor;\n    stroke-opacity:0.6;\n}\n.cl-gauge .tick-major[data-v-585800ff]{\n    fill:none;\n    stroke:currentColor;\n}\n.cl-gauge .sector[data-v-585800ff]{\n    fill:none;\n    stroke:transparent;\n}\n.cl-gauge .o-needle[data-v-585800ff]{\n    transition:.5s;\n}"));
      document.head.appendChild(elementStyle);
    }
  } catch (e) {
    console.error("vite-plugin-css-injected-by-js", e);
  }
})();
(function(global, factory) {
  typeof exports === "object" && typeof module !== "undefined" ? factory(exports, require("vue"), require("vuex")) : typeof define === "function" && define.amd ? define(["exports", "vue", "vuex"], factory) : (global = typeof globalThis !== "undefined" ? globalThis : global || self, factory(global["ui-gauge-classic"] = {}, global.Vue, global.vuex));
})(this, function(exports2, vue, vuex) {
  "use strict";
  const _export_sfc = (sfc, props) => {
    const target = sfc.__vccOpts || sfc;
    for (const [key, val] of props) {
      target[key] = val;
    }
    return target;
  };
  const _sfc_main = {
    name: "UIGaugeClassic",
    inject: ["$socket"],
    props: {
      /* do not remove entries from this - Dashboard's Layout Manager's will pass this data to your component */
      id: { type: String, required: true },
      props: { type: Object, default: () => ({}) },
      state: { type: Object, default: () => ({ enabled: false, visible: false }) }
    },
    setup(props) {
      console.info("UIGaugeClassic setup with:", props);
      console.debug("Vue function loaded correctly", vue.markRaw);
    },
    data() {
      return {
        // Min and max scale values.  Max may be less that min.
        min: 0,
        max: 1,
        majorDivision: 10,
        // number of input units for each (numbered) major division
        minorDivision: 5,
        // number of input units for each minor division
        units: "",
        label: "",
        measurement: "",
        valueDecimalPlaces: 2,
        // number of decimal places to show in the value display
        scaleDecimalPlaces: 1,
        // number of decimal places to show on the scale
        width: 4,
        // widget width and height in dashboard units
        height: 4,
        // Coloured sectors around the scale.  Sectors can be in any order and it makes no difference if 
        // start and end are reversed.
        //  Any gaps are left at background colour
        sectors: [{ start: 0, end: 0.4, color: "skyblue" }, { start: 0.4, end: 0.75, color: "green" }, { start: 0.75, end: 1.4, color: "red" }],
        // The position and alignment of the gauge inside the 100x100 svg box for the widget can be changed by modifying the settings below
        // The origin of the svg box is the top left hand corner. The bottom right hand corner is 100,100
        // Obviously, if you move the gauge you may have to move the text fields also.
        // Take care with these settings, if you put silly values in the browser showing the dashboard may lock up. If this happens,
        // close the dashboard browser tab (which may take some time as it is locked up).
        arc: {
          cx: 50,
          // the x and y coordinates of the centre of the gauge arc
          cy: 64,
          radius: 47.5,
          // the radius of the arc
          startDegrees: -123,
          // the angle of the start and end points of the arc.  Zero is vertically up from the centre
          endDegrees: 123,
          // +ve values are clockwise
          // derived values, values here are just to stop errors before first message received
          startx: 10,
          starty: 90,
          endx: 90,
          endy: 90,
          arclength: 100
        },
        sweepAngle: 246,
        // this is not inside arc as it comes from the message
        class: "",
        //don't change these
        value: null,
        needles: [],
        // derived values
        widgetSizeRatio: 1,
        unitsTextY: 0,
        valueTextY: 0
      };
    },
    computed: {
      ...vuex.mapState("data", ["messages"]),
      arcspec: function() {
        const delta = this.arc.endDegrees - this.arc.startDegrees;
        const largeArcFlag = delta > 180 ? 1 : 0;
        return `M ${this.arc.startx} ${this.arc.starty} A ${this.arc.radius} ${this.arc.radius} 0 ${largeArcFlag} 1 ${this.arc.endx} ${this.arc.endy}`;
      },
      formattedValue: function() {
        return this.value !== null ? this.value.toFixed(this.valueDecimalPlaces) : "---";
      },
      numbers: function() {
        return this.generateNumbers(this.min, this.max, this.majorDivision);
      },
      theViewBox() {
        let y = 100 * this.props.height / this.props.width;
        if (isNaN(y) || !y) {
          y = 100;
        }
        const answer = `0 0 100 ${y}`;
        return answer;
      }
    },
    mounted() {
      this.$socket.on("widget-load:" + this.id, (msg) => {
        console.log(`On widget-load ${JSON.stringify(msg)}`);
        this.processMsg(msg);
        this.$store.commit("data/bind", {
          widgetId: this.id,
          msg
        });
      });
      this.$socket.on("msg-input:" + this.id, (msg) => {
        console.log(`Message received: ${JSON.stringify(msg)}`);
        this.processMsg(msg);
        this.$store.commit("data/bind", {
          widgetId: this.id,
          msg
        });
      });
      console.log(`props: ${JSON.stringify(this.props)}`);
      this.pickupProperties();
      this.needles.forEach((needle) => {
        needle.rotation = this.rotation(null);
      });
      this.$socket.emit("widget-load", this.id);
    },
    unmounted() {
      var _a, _b;
      (_a = this.$socket) == null ? void 0 : _a.off("widget-load" + this.id);
      (_b = this.$socket) == null ? void 0 : _b.off("msg-input:" + this.id);
    },
    methods: {
      pickupProperties: function() {
        const props = this.props;
        this.min = Number(props.min);
        this.max = Number(props.max);
        this.width = Number(props.width);
        this.height = Number(props.height);
        this.sectors = JSON.parse(props.sectors);
        this.majorDivision = Number(props.major_division);
        this.minorDivision = Number(props.minor_division);
        this.valueDecimalPlaces = Number(props.value_decimal_places);
        this.scaleDecimalPlaces = Number(props.scale_decimal_places);
        this.label = props.label;
        this.units = props.units;
        this.measurement = props.measurement;
        this.needles = JSON.parse(props.needles);
        this.sweepAngle = props.sweep_angle || 246;
        this.class = props.myclass;
        this.calculateDerivedValues();
        const arcLength = 2 * Math.PI * this.arc.radius * this.sweepAngle / 360;
        const sec = this.sectorData(arcLength);
        const gauge = this.getElement("cl-gauge", true);
        gauge.style.setProperty("--dash", arcLength);
        sec.forEach((s) => {
          const sector = this.getElement(s.name, false);
          sector.style.setProperty("stroke-dasharray", s.css);
          sector.style.setProperty("stroke", s.color);
        });
      },
      calculateDerivedValues: function() {
        const cyLow = 64;
        const cyHigh = 50;
        const radius = 47.5;
        this.majorDivision = this.majorDivision <= 0 ? 1 : this.majorDivision;
        this.minorDivision = this.minorDivision <= 0 ? 1 : this.minorDivision;
        this.arc.radius = radius;
        if (this.label && this.label.length > 0) {
          this.arc.cy = cyLow;
        } else {
          this.arc.cy = cyHigh;
          if (this.height / this.width == 0.5) {
            this.arc.radius -= 2;
            this.arc.cy -= 2.5;
          }
        }
        if (this.measurement && this.measurement.length > 0) {
          this.unitsTextY = this.arc.cy + 11;
          this.valueTextY = this.arc.cy + 26;
        } else {
          this.unitsTextY = this.arc.cy - 23;
          this.valueTextY = this.arc.cy - 8;
        }
        if (this.sweepAngle) {
          this.sweepAngle = Math.min(360, this.sweepAngle);
          this.arc.startDegrees = -this.sweepAngle / 2;
          this.arc.endDegrees = this.sweepAngle / 2;
        }
        const startRadians = this.arc.startDegrees * Math.PI / 180;
        const endRadians = this.arc.endDegrees * Math.PI / 180;
        this.arc.startx = this.arc.cx - this.arc.radius * Math.sin(startRadians - Math.PI);
        this.arc.starty = this.arc.cy + this.arc.radius * Math.cos(startRadians - Math.PI);
        this.arc.endx = this.arc.cx + this.arc.radius * Math.sin(Math.PI - endRadians);
        this.arc.endy = this.arc.cy + this.arc.radius * Math.cos(Math.PI - endRadians);
        this.arc.arcLength = 2 * Math.PI * this.arc.radius * (this.arc.endDegrees - this.arc.startDegrees) / 360;
        this.widgetSizeRatio = this.height / this.width;
        if (isNaN(this.widgetSizeRatio) || !this.widgetSizeRatio) {
          this.widgetSizeRatio = 1;
        }
      },
      processMsg: function(msg) {
        if (msg.needles) {
          this.needles.forEach((needle, index) => {
            const v = this.validate(msg.needles[index].value);
            if (index === 0) {
              this.value = v;
            }
            needle.rotation = this.rotation(v);
          });
        }
      },
      getElement: function(name, base) {
        if (base) {
          return this.$refs[name];
        }
        return this.$refs[name][0];
      },
      validate: function(data) {
        let ret;
        if (typeof data !== "number") {
          ret = parseFloat(data);
          if (isNaN(ret)) {
            ret = null;
          }
        } else {
          ret = data;
        }
        return ret;
      },
      range: function(n, p, r) {
        if (p.maxIn > p.minIn) {
          n = Math.min(n, p.maxIn);
          n = Math.max(n, p.minIn);
        } else {
          n = Math.min(n, p.minIn);
          n = Math.max(n, p.maxIn);
        }
        if (r) {
          return Math.round((n - p.minIn) / (p.maxIn - p.minIn) * (p.maxOut - p.minOut) + p.minOut);
        }
        return (n - p.minIn) / (p.maxIn - p.minIn) * (p.maxOut - p.minOut) + p.minOut;
      },
      generateNumbers: function(min, max, majorDivision) {
        let minDegrees, maxDegrees, startValue;
        if (max > min) {
          minDegrees = this.arc.startDegrees;
          maxDegrees = this.arc.endDegrees;
          startValue = min;
        } else {
          minDegrees = this.arc.endDegrees;
          maxDegrees = this.arc.startDegrees;
          startValue = max;
        }
        const numDivs = Math.floor(Math.abs(max - min) / majorDivision + 0.1);
        const degRange = maxDegrees - minDegrees;
        const degPerDiv = degRange * majorDivision / Math.abs(max - min);
        let nums = [];
        for (let div = 0; div <= numDivs; div++) {
          let degrees = div * degPerDiv + minDegrees;
          const n = (startValue + div * majorDivision).toFixed(this.scaleDecimalPlaces);
          nums.push({ r: degrees, n });
        }
        return nums;
      },
      sectorData: function(full) {
        let ret = [];
        this.sectors.forEach((sector, idx) => {
          let sec = { name: "sector-" + idx, color: sector.color };
          const params = { minIn: this.min, maxIn: this.max, minOut: 0, maxOut: full };
          const start = this.range(sector.start, params, false);
          const end = this.range(sector.end, params, false);
          const pos = Math.min(start, end);
          const span = Math.max(start, end) - pos;
          sec.css = `0 ${pos} ${span} var(--dash)`;
          ret.push(sec);
        });
        return ret;
      },
      rotation: function(v) {
        const factor = this.height / this.width == 0.5 ? 0.02 : 0.1;
        const deltaDeg = this.arc.endDegrees - this.arc.startDegrees;
        const gapDeg = 360 - deltaDeg;
        const overflowFactor = Math.min(factor, gapDeg / 2 / deltaDeg);
        const overflow = (this.max - this.min) * overflowFactor;
        const angleOverflow = deltaDeg * overflowFactor;
        const min = this.min - overflow;
        const max = this.max + overflow;
        const minAngle = this.arc.startDegrees - angleOverflow;
        const maxAngle = this.arc.endDegrees + angleOverflow;
        const params = { minIn: min, maxIn: max, minOut: minAngle, maxOut: maxAngle };
        if (v === null) {
          v = Math.min(min, max);
        }
        return `${this.range(v, params, false)}deg`;
      },
      tickStyle: function(division, width) {
        const arcLength = this.arc.arcLength;
        const range = Math.abs(this.max - this.min);
        const tickPeriod = division / range * arcLength;
        return `stroke-dasharray: ${width} ${tickPeriod - width}; stroke-dashoffset: ${width / 2};`;
      },
      needle: function(lengthPercent, colour) {
        const cx = this.arc.cx;
        const cy = this.arc.cy;
        const length = (this.arc.radius - 4.5) * lengthPercent / 100;
        return `<path d="M ${cx},${cy} ${cx - 1.5},${cy} ${cx - 0.15},${cy - length} ${cx + 0.15},${cy - length} ${cx + 1.5},${cy} z"
                fill="${colour}"></path>`;
      }
    }
  };
  const _hoisted_1 = ["viewBox"];
  const _hoisted_2 = ["d"];
  const _hoisted_3 = ["d"];
  const _hoisted_4 = ["d"];
  const _hoisted_5 = ["y"];
  const _hoisted_6 = {
    class: "label",
    y: "0",
    x: "50%",
    "text-anchor": "middle"
  };
  const _hoisted_7 = ["y"];
  const _hoisted_8 = ["y"];
  const _hoisted_9 = ["y"];
  const _hoisted_10 = ["innerHTML"];
  const _hoisted_11 = ["cx", "cy"];
  function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
    return vue.openBlock(), vue.createElementBlock(
      vue.Fragment,
      null,
      [
        vue.createCommentVNode(" Component must be wrapped in a block so props such as className and style can be passed in from parent "),
        vue.createElementVNode(
          "div",
          {
            className: "ui-gauge-cl-wrapper",
            class: vue.normalizeClass($data.class)
          },
          [
            (vue.openBlock(), vue.createElementBlock("svg", {
              class: "cl-gauge",
              ref: "cl-gauge",
              width: "100%",
              height: "100%",
              viewBox: $options.theViewBox
            }, [
              vue.createElementVNode("g", null, [
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($data.sectors, (item, index) => {
                    return vue.openBlock(), vue.createElementBlock("path", {
                      key: index,
                      ref_for: true,
                      ref: "sector-" + index,
                      class: "sector",
                      "stroke-width": "5",
                      d: $options.arcspec
                    }, null, 8, _hoisted_2);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                )),
                vue.createElementVNode("path", {
                  class: "tick-minor",
                  "stroke-width": "5",
                  d: $options.arcspec,
                  style: vue.normalizeStyle($options.tickStyle(this.minorDivision, 0.5))
                }, null, 12, _hoisted_3),
                vue.createElementVNode("path", {
                  ref: "arc",
                  class: "tick-major",
                  "stroke-width": "5",
                  d: $options.arcspec,
                  style: vue.normalizeStyle($options.tickStyle(this.majorDivision, 1))
                }, null, 12, _hoisted_4),
                (vue.openBlock(true), vue.createElementBlock(
                  vue.Fragment,
                  null,
                  vue.renderList($options.numbers, (item, index) => {
                    return vue.openBlock(), vue.createElementBlock("text", {
                      key: index,
                      class: "num",
                      "text-anchor": "middle",
                      y: `${10.5 - this.arc.radius}`,
                      style: vue.normalizeStyle(`rotate: ${item.r}deg; transform-origin: ${this.arc.cx}% ${this.arc.cy / this.widgetSizeRatio}%; transform: translate(${this.arc.cx}%, ${this.arc.cy / $data.widgetSizeRatio}%)`)
                    }, vue.toDisplayString(item.n), 13, _hoisted_5);
                  }),
                  128
                  /* KEYED_FRAGMENT */
                )),
                vue.createElementVNode(
                  "text",
                  _hoisted_6,
                  vue.toDisplayString($data.label),
                  1
                  /* TEXT */
                ),
                vue.createElementVNode("text", {
                  class: "measurement",
                  y: `${this.arc.cy - 16}`,
                  x: "50%",
                  "text-anchor": "middle"
                }, vue.toDisplayString($data.measurement), 9, _hoisted_7),
                vue.createElementVNode("text", {
                  class: "units",
                  y: `${this.unitsTextY}`,
                  x: "50%",
                  "text-anchor": "middle"
                }, vue.toDisplayString($data.units), 9, _hoisted_8),
                vue.createElementVNode("text", {
                  class: "value",
                  y: `${this.valueTextY}`,
                  x: "50%",
                  "text-anchor": "middle"
                }, vue.toDisplayString($options.formattedValue), 9, _hoisted_9)
              ]),
              (vue.openBlock(true), vue.createElementBlock(
                vue.Fragment,
                null,
                vue.renderList($data.needles, (item, index) => {
                  return vue.openBlock(), vue.createElementBlock("g", {
                    ref_for: true,
                    ref: "o-needle-" + index,
                    class: "o-needle",
                    style: vue.normalizeStyle(`transform-box: fill-box; transform-origin: 50% 100%; rotate: ${item.rotation}`),
                    innerHTML: $options.needle($data.needles[index].lengthPercent, $data.needles[index].colour)
                  }, null, 12, _hoisted_10);
                }),
                256
                /* UNKEYED_FRAGMENT */
              )),
              vue.createElementVNode("g", null, [
                vue.createElementVNode("circle", {
                  class: "hub",
                  cx: `${this.arc.cx}`,
                  cy: `${this.arc.cy}`,
                  r: "3"
                }, null, 8, _hoisted_11)
              ])
            ], 8, _hoisted_1))
          ],
          2
          /* CLASS */
        )
      ],
      2112
      /* STABLE_FRAGMENT, DEV_ROOT_FRAGMENT */
    );
  }
  const UIGaugeClassic = /* @__PURE__ */ _export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-585800ff"], ["__file", "/home/colinl/nodes/node-red-dashboard-2-ui-gauge-classic/ui/components/UIGaugeClassic.vue"]]);
  exports2.UIGaugeClassic = UIGaugeClassic;
  Object.defineProperty(exports2, Symbol.toStringTag, { value: "Module" });
});
