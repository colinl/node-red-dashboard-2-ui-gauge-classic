# A classic style gauge for Node-RED Dashboard 2.0

A classic style multi-needle gauge for the flowfuse [Node-RED](https://nodered.org) Dashboard 2.0

## Install

The usual method of installing is to use Manage Palette in the node red editor and search for @colinl/node-red-dashboard-2-ui-gauge-classic and install it.

Using `npm` directly, `cd` into your node red user directory (usually .node-red in your home folder) and from there run
```
npm install @colinl/node-red-dashboard-2-ui-gauge-classic
```

## Inputs

For a gauge configured to have a single needle, pass in the value in `msg.payload`.  This may be a Number or a string that represents a number.

For a gauge with multiple needles, each will be configured with an associated topic value.  To pass in a value set `msg.topic` to select the needle, and put the value in msg.payload.

By default, the value of the first needle is automatically displayed as text in the Gauge.  However, if a string is provided in `msg.formattedValue` then this will be shown instead.  This allows the user to format the value as desired.

Certain configuration values can be overridden dynamically be passing in an object in `msg.ui_update`.  See Dynamic Properties below.  If both `msg.ui_update` and `msg.payload` are present then the message will both override the properties and provide a needle value.  To avoid this make sure that there is no `msg.payload` property in the message.  Once a property has been overridden it will stay at the new value unless a new value is provided via msg.ui_update.

## Configuration

* **Name** - The name of the node.
* **Group** - The display group in which to show the gauge.
* **Size** - The size of the gauge on the dashboard.  See also the notes about Sweep Angle below.
* **Range Min and Max** - These specify the range of the gauge in user units (temperature for example).  The anticlockwise end of the scale is the Min value and the clockwise end is the Max value.  Min may be configured with a value greater than the Max value, in which case the lower numeric value will be at the clockwise end of the scale, and the needle will rotate anti-clockwise as the value increases.
* **Sweep Angle (deg)** - This is the length of the scale in degrees.  The centre of the scale is always at the top.  This setting should be set with consideration of the **Size** setting.  If the size is a square (eg 4x4) or Auto then the default angle of 250° gives a good fit.  If the size is set with the height half the width (eg 4x2) then a sweep angle of 180 gives a semi-circular gauge (but see also notes about **label** and **Measurement** below).
* **Sectors** - This defines a set of coloured sectors around the gauge.  Each row defines the start value of the sector and the colour to be used.  The sectors must be defined in increasing start value order, so the colour defined in one row applies up to the value defined in the next row, or the end of the scale if it is the last one.  The colours may be recognised names such as "red" or "skyblue" or may be numerically specified, eg `#AEEA00`.  The set of named colours can be found [here](https://vuetifyjs.com/en/styles/colors/#material-colors).
* **Needles** - Each row defines a needle to be shown on the gauge.  The colour is the colour of the needle.  The Length is a percentage figure where 100 represents a needle that goes almost out to the scale.  A larger value may be given, but the needle will be truncated at the outer edge of the scale.  If only one needle is configured then it is not necessary to specify a topic, any `msg.payload` passed in will be used.  If more than one needle is configured then a topic string must be provided for each one.  The topic is used in the input messages to define which needle to address, as described earlier.
* **Hub color** - The required colour for the needle hub.
* **Divisions, Major and Minor** - Marker lines are drawn on the scale, and these define the distance between the markers in scale units.  The major markers are annotated with the value.
* **Decimal Places, Value and Scale** - These define the number of decimal places to show in Value display in the gauge and in the scale annotation respectively.
* **Units** - The units string to show in the gauge.  Normally this (along with the value) is shown below the needles hub, but if no text is provided for **Measurement** then they are shown above the hub.  This allows a 180° sweep angle to be used in, for example, a 4x2 or 2x1 size, keeping the text inside the gauge.  Also, as described below, the **label** should be left empty in this case to make more room.
* **Label** - A text label that is shown above the gauge.  If this is left empty then the gauge is moved up to the top, allowing more room for the scale.  If it is desired that no text is displayed but the scale is not moved up then enter a space character in this field.
* **Measurement** - A string that is displayed inside the scale above the hub.  As described above, if this is left empty then the units and value will be moved up to take its place.  This is desirable if a 180° gauge is required, fitting into a 2:1 aspect ratio size on the dashboard (eg 2x1), where there is no room for the units and value fields below the hub.  If it is desired that no text is displayed but the units and value are not moved up then enter a space character in this field.
* **Maintain widget width** If this is checked then the gauge will use the full width specified for it, even if this means using more rows on the dashboard than it is configured for.  If it is not checked then the node follows the convention for other nodes on the dashboard, meaning that the width is reduced if necessary to prevent it using more space vertically than it is configured for.
* **Class** - A CSS Class that will be applied to the gauge to allow override of display element style.

## Dynamic Properties

Certain properties can be overridden by passing an object in `msg.ui_update`.  The name of the item in `msg.ui_update` is generally the name of the propety being overridden.  For example, the Sectors definitions may be changed by passing in array in `msg.ui_update.sectors`.  If `msg.payload` is also present then the payload will be interpreted as a needle value, as normal.  Once a property has been overridden it will stay at the new value unless a new value is provided via msg.ui_update.
Details of the dynamic properties available are as follows:

* **Sectors** - If `msg.ui_update.sectors` is present contains an array then that will be used to override the current sector data.  The array must contain properties containing the sector start value and the colour.  It must be in order of increasing start value.  For example, the array might consist of
`[{ "start": 0, "color": "green"}, { "start": 5, "color": "skyblue"}]`
* **Measurement** - If `msg.ui_update.measurement` is present and contains a string then that string will be displayed in the measurement field in the gauge.
* **Units** - If `msg.ui_update.units` is present and contains a string then that string will be displayed in the units field in the gauge.
* **Range min and max** - If `msg.ui_update.min` and/or `msg.ui_update.max` are present then range min and max will be updated accordingly.
* **Sweep Angle** - If `msg.ui_update.sweepAngle` is present the the sweep angle is updated accordingly.
* **Needle Definitions** - If `msg.ui_update.needles` is present and contains an array of needle definitions then these will be used. It must be an array of objects where each object contains attirbutes `color`, `lengthPercent` and `topic`.  An example is `[{"color":"blue","lengthPercent":50,"topic":"pv"},{"color":"orange","lengthPercent":100,"topic":"setpoint"}]`. Note that even if only one needle is required then this must still be an array.
* **Hub colour** - If `msg.ui_update.hubcolor` is present and contains a string then that colour will be used for the needle hub.
* **Major and Minor Division values** - If `msg.ui_update.majorDivision` and/or `msg.ui_update.minorDivision` are present (note: singular, it is the size of the division not the number of them) then the division values will be updated accordingly.
* **Decimal Places** - If `msg.ui_update.valueDecimalPlaces` and/or `msg.ui_update.scaleDecimalPlaces` are present then those values will be updated
* **Label** - If `msg.ui_update.label` is present and is a string the the label will be updated

* **Dynamic Class** - If `msg.class` or `msg.ui_update.class` are present then the specified class or classes will be applied to the outermost widget element.  This is in addition to any class or classes specified in the configuration.  Passing an empty string will clear the dynamic class.

## CSS overrides

Display elements my be overriden in the normal way using a ui-template node.  In particular:

**Needle Rotation transition time** - The default transition for needle rotation is 0.5 seconds, which gives a realistic impression of needle movement.  If, however, the gauge is being updated rapidly, for example at 10 times a second, then it is desirable to reduce this.  This can be achieved by setting a class on the gauge, such as `myclass` then in a ui-template node in CSS mode specify something like
```
.myclass .cl-gauge .o-needle{
    transition: 0.1s;
}
```
Which will cause the needles to transition in 0.1 seconds allowing them to track the input accurately.

**Needle Hub Colour** - The hub colour can be changed by specifying, for example
```
.myclass .cl-gauge .hub{
    fill:red;
}
```
Or leave off the `.myclass` to affect all gauges.

**Hide individual needles** - Individual needles on a gauge can be hidden by adding a `ui-template` node of type CSS containing, for example
```
/** this allows hiding of individual needles by sending needle identifier in msg.class to a gauge, for example
 * msg.class = "hide_needle-1"                // hide needle 1 and show others
 * msg.class = "hide-needle-2 hide-needle-3"  // hide needles 2 and 3 and show others
 * msg.class = ""                             // shows all needles
*/
.hide-needle-1 .o-needle-1,
.hide-needle-2 .o-needle-2,
.hide-needle-3 .o-needle-3 {
    visibility: hidden;
}
```
Then sending `msg.class` or `msg.ui_update.class` to the node containing values as shown above will selectively hide or show needles.  If more than three needles are required then add those needles to the class list in the template.

The Multi Needle example included with the node shows this in action.

## Example gauge images

Below are images from the included example flows, which can be downloaded by going to Import, selecting Examples, then this node.

![image](https://github.com/colinl/node-red-dashboard-2-ui-gauge-classic/assets/38307/1793553c-0e1e-46fd-a847-06c955243be9) 
![image](https://github.com/colinl/node-red-dashboard-2-ui-gauge-classic/assets/38307/e1874da1-6cfe-47f0-9752-427b9a048ae3)
![image](https://github.com/colinl/node-red-dashboard-2-ui-gauge-classic/assets/38307/cd0bfeb9-dc2e-4e22-9279-7c5d0dac1c8c)

## Acknowledements

Thanks go to @HotNipi who provided the original code on which this node is based.
