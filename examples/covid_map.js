import {tiny, defs} from './common.js';
import {data} from './data/data.js';
                                                  // Pull these names into this module's scope for convenience:
const { Vector, vec3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;

var mouse_x, mouse_y;
var offset_x, offset_y;
var added_event = false;

console.log(data);

var T = (x, y, x1, y1, x2, y2) => (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);

const states = {
  "AL": "Alabama",
  "AK": "Alaska",
  "AS": "American Samoa",
  "AZ": "Arizona",
  "AR": "Arkansas",
  "CA": "California",
  "CO": "Colorado",
  "CT": "Connecticut",
  "DE": "Delaware",
  "DC": "District Of Columbia",
  "FM": "Federated States Of Micronesia",
  "FL": "Florida",
  "GA": "Georgia",
  "GU": "Guam",
  "HI": "Hawaii",
  "ID": "Idaho",
  "IL": "Illinois",
  "IN": "Indiana",
  "IA": "Iowa",
  "KS": "Kansas",
  "KY": "Kentucky",
  "LA": "Louisiana",
  "ME": "Maine",
  "MH": "Marshall Islands",
  "MD": "Maryland",
  "MA": "Massachusetts",
  "MI": "Michigan",
  "MN": "Minnesota",
  "MS": "Mississippi",
  "MO": "Missouri",
  "MT": "Montana",
  "NE": "Nebraska",
  "NV": "Nevada",
  "NH": "New Hampshire",
  "NJ": "New Jersey",
  "NM": "New Mexico",
  "NY": "New York",
  "NC": "North Carolina",
  "ND": "North Dakota",
  "MP": "Northern Mariana Islands",
  "OH": "Ohio",
  "OK": "Oklahoma",
  "OR": "Oregon",
  "PW": "Palau",
  "PA": "Pennsylvania",
  "PR": "Puerto Rico",
  "RI": "Rhode Island",
  "SC": "South Carolina",
  "SD": "South Dakota",
  "TN": "Tennessee",
  "TX": "Texas",
  "UT": "Utah",
  "VT": "Vermont",
  "VI": "Virgin Islands",
  "VA": "Virginia",
  "WA": "Washington",
  "WV": "West Virginia",
  "WI": "Wisconsin",
  "WY": "Wyoming"
}

/** **Text_Line** embeds text in the 3D world, using a crude texture 
 *  method.  This Shape is made of a horizontal arrangement of quads.
 *  Each is textured over with images of ASCII characters, spelling 
 *  out a string.  Usage:  Instantiate the Shape with the desired
 *  character line width.  Then assign it a single-line string by calling
 *  set_string("your string") on it. Draw the shape on a material
 *  with full ambient weight, and text.png assigned as its texture 
 * file.  For multi-line strings, repeat this process and draw with
 * a different matrix. 
 **/
export class Text_Line extends Shape {                    
  constructor(max_size) { 
    super("position", "normal", "texture_coord");
    this.max_size = max_size;
    var object_transform = Mat4.identity();
    for (var i = 0; i < max_size; i++) {
      // Each quad is a separate Square instance:
      defs.Square.insert_transformed_copy_into(this, [], object_transform);
      object_transform.post_multiply(Mat4.translation(1.5, 0, 0));
    }
  }

  set_string(line, context) {
    // set_string():  Call this to overwrite the texture coordinates buffer with new 
    // values per quad, which enclose each of the string's characters.
    this.arrays.texture_coord = [];
    for (let i = 0; i < this.max_size; i++) {
      const charCode = i < line.length ? line.charCodeAt(i) : ' '.charCodeAt();
      const row = Math.floor(charCode / 16 );
      const col = Math.floor(charCode % 16 );

      const skip = 3, size = 32, sizefloor = size - skip;
      const dim = size * 16;
      const left = (col * size + skip) / dim;
      const top = (row * size + skip) / dim;
      const right = (col * size + sizefloor) / dim;
      const bottom = (row * size + sizefloor + 5) / dim;

      this.arrays.texture_coord.push(...Vector.cast([left, 1-bottom], [right, 1-bottom],
                                                    [left, 1-top], [right, 1-top]));
      }
    if (!this.existing) { 
      this.copy_onto_graphics_card(context);
      this.existing = true;
    } else {
      this.copy_onto_graphics_card(context, ["texture_coord"], false);
    }
  }
}

/**
 * Main Project Scene
 */
export class Covid_Map extends Scene {
  constructor() { 
    super()
    this.shapes = {
      bar: new defs.Cube(), 
      text: new Text_Line(35)
    };

    // Don't create any DOM elements to control this scene:
    this.widget_options = { make_controls: false };
    
    const phong = new defs.Phong_Shader();
    const gradient = new Gradient_Shader();
    const texture = new defs.Textured_Phong(1);

    this.materials = {  
      grey: new Material(
        phong, 
        { 
          color: color(0.5, 0.5, 0.5, 1), 
          ambient: 0, 
          diffusivity: 0.3, 
          specularity: 0.5, 
          smoothness: 10
        }
      ),
      text_image: new Material(
        texture, 
        {
          ambient: 1,
          diffusivity: 0,
          specularity: 0,
          texture: new Texture("assets/text.png") 
        }
      ),
      gradient: new Material(gradient, {}),
    };

    this.collision_box = {
      box: [
        [[-1,-1,-1, 1], [1, -1, 1, 1], [1, 1, 1, 1], [-1, 1, -1, 1]],
        [[-1,-1,1, 1], [-1, 1, 1, 1], [1, 1, -1, 1], [1, -1, -1, 1]]
      ]
    }
    // To show text you need a Material like this one:
  }

  display(context, program_state) { 
    let data_text = {};
    program_state.lights = [
      new Light(vec4(3, 2, 1, 0), color(1, 1, 1, 1), 1000000),
      new Light(vec4(3, 10, 10, 1), color(1, 0.7, 0.7, 1), 100000)
    ];

    //program_state.set_camera( Mat4.look_at( ...Vector.cast( [ 0,0,4 ], [0,0,0], [0,1,0] ) ) );
    program_state.projection_transform = Mat4.perspective(Math.PI/4, context.width/context.height, 1, 500);
    //console.log(program_state);
    const t = program_state.animation_time/1000;

    if (!added_event) {
      const rec = context.canvas.getBoundingClientRect();
      offset_x = rec.left - 8;
      offset_y = rec.top;
      context.canvas.addEventListener('mousemove', e => {
        mouse_x = e.clientX - offset_x;
        mouse_y = e.clientY - offset_y;
      });
      added_event = true;
      console.log(context.canvas);
      console.log(offset_x);
      this.w = context.canvas.width;
      this.h = context.canvas.height;
    }

    // Get the matrix to transform world coordinates into projection coordinate
    let cam = Mat4.rotation(0.3, 1, 0, 0).times(Mat4.translation(-7, -8, -20));//program_state.camera_transform;
    program_state.set_camera(cam);
    let world_to_perspective = program_state.projection_transform.times(cam);

    // Display a bar for every county
    for (let state in data) {
      let state_name = state;
      state = data[state];
      for (let county in state) {
        let name = county;
     
        county = state[county];
        //console.log(county);
        let lng = county.long;
        let lat = county.lat;
        let cases = 0, death = 0;
        let cases_next = 0, death_next = 0;
        // determine today's date and tomorrow's date
        let [today, tmrw] = lerp_date((t / 20) % 1);
        //convert to string
        [today, tmrw] = [date_to_string(today), date_to_string(tmrw)];
        // if there is no record, treat it as 0
        //console.log((county.data)['2020-05-14']);
        if ((county.data)[today] !== undefined) {
          cases = (county.data)[today].cases;
          death = (county.data)[today].death;
        }
        if ((county.data)[tmrw] !== undefined) {
          cases_next = (county.data)[tmrw].cases;
          death_next = (county.data)[tmrw].death;
        }

        // interpolate cases between today and tomorrow for animation effect
        let a = lerp_date_float((t / 20) % 1);
        cases = cases * (1 - a) + cases_next * a;

        if (cases < 50)
         continue;
        
        //console.log(lng);
          
  
        // transform the bar
        let bar_transform = Mat4
          .translation((lng+95)/5 + 23, 0, -1 * (lat-37)/3)
          .times(Mat4.scale(0.1, cases/10000, 0.1))
          .times(Mat4.translation(0, 1, 0));   
          
        // check if any of the boxes collide with the mouse
        let mouse_over = this.collision_box.box.some(v => {
          let result = 0;
          const points= [0, 0, 0, 0];
          // transform the points, and convert them into projection space 
          for (let i = 0; i < 4; i++) {
            let v_tmp = v[i]
            let p = bar_transform.times(vec4(v_tmp[0], v_tmp[1], v_tmp[2], 1));
            p = world_to_perspective.times(p);
            points[i] = [p[0]/p[3], -1 * p[1]/p[3], p[2]/ p[3], p[3]]; 
          }

          let p1_x = (mouse_x/this.w - 0.5) * 2;
          let p1_y = (mouse_y/this.h - 0.5) * 2;
          //let p1_x = mouse_x, p1_y = mouse_y;
          let p2_x = p1_x + 100000;
          let p2_y = p1_y;
          
          for (let i = 0; i < 4; i++) {
            let x1 = points[i][0];
            let y1 = points[i][1];
            let x2 = points[(i + 1) % 4][0];
            let y2 = points[(i + 1) % 4][1];
            
            let R = T(p1_x, p1_y, x1, y1, x2, y2) * T(p2_x, p2_y, x1, y1, x2, y2);
            let S = T(x1, y1, p1_x, p1_y, p2_x, p2_y) * T(x2, y2, p1_x, p1_y, p2_x, p2_y);
      
            if (R < 0 && S < 0)
              result += 1;
          }
          return result % 2 == 1;
        });

        let c;
        if (!mouse_over) {
          c = color(0.2, 0.53, 0.53, 1);
        } else {
          c = color(0.7, 0.53, 0.53, 1);
          data_text = {
            "name": name,
            "state_name": state_name,
            "date": today,
            "cases": Math.floor(cases),
            "death":  Math.floor(death)
          };
        }
        
        //console.log(bar_transform);
        this.shapes.bar.draw(
          context, 
          program_state,
          bar_transform, 
          this.materials.gradient.override({ base_color: c })
        );
      }
    }

    if (data_text.name !== undefined) {
      //const city_data = JSON.parse(data_text);
      let strings = [
        data_text.name + "," + data_text.state_name,
        "Date: " + data_text.date,
        "Cases: " + data_text.cases,
        "Deaths: " + data_text.death,
      ]

      let i = 0;

      for (let s of strings){
        this.shapes.text.set_string(s, context.context);
        this.shapes.text.draw(context, program_state, Mat4.translation(10, 6 - 2 * i, -10), this.materials.text_image);
        i+=2;
      }

    }  
  }
}

// function that takes a float 0~1 and interpolates between the date 2020-1-21 and 2020-5-18
// returns the date and the next date
function lerp_date(a){
  var start = new Date('2020-1-21');
  var end = start.setDate(start.getDate() + Math.floor(a * 117));
  var current = new Date(end);
  var current_2 = new Date(end);
  current_2.setDate(current_2.getDate() + 1);
  return [current, current_2];
}

function lerp_date_float(a){
  let divider = Math.floor(a * 117);
  let index = a * 117 - divider;
  return index;
}

function date_to_string(date){
  let c = date.getDate();
  if (c <= 9)
    c = '0' + c; 
  return date.getFullYear() + '-0' + (date.getMonth() + 1) + '-' + c;
}
   
class Gradient_Shader extends tiny.Shader             
{                                             
  
    update_GPU( context, gpu_addresses, graphics_state, model_transform, material )
    {            

        const defaults = { color: color( 0,0,0,1 ), ambient: 0, diffusivity: 1, specularity: 1, smoothness: 40, base_color: color(0,1,1,1), top_color: color(1,0,0,1)};
        material = Object.assign( {}, defaults, material );

        context.uniform4fv( gpu_addresses.colorBase,   material.base_color       );    // Send the desired shape-wide material qualities 
        context.uniform4fv( gpu_addresses.colorTop,    material.top_color       );    // Send the desired shape-wide material qualities 

        const [ P, C, M ] = [ graphics_state.projection_transform, graphics_state.camera_inverse, model_transform ],
        PCM = P.times( C ).times( M );

        context.uniformMatrix4fv( gpu_addresses.model_transform, false, Mat4.flatten_2D_to_1D( M.transposed() ) );
        context.uniformMatrix4fv( gpu_addresses.projection_camera_model_transform, false, Mat4.flatten_2D_to_1D( PCM.transposed() ) );

    }

    shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    {
        return `
          precision mediump float;
          varying vec4 VERTEX_COLOR;
          uniform vec4 colorBase, colorTop;
          `;
    }

    vertex_glsl_code()           // ********* VERTEX SHADER *********
    {
        return this.shared_glsl_code() + `
          
          attribute vec3 position;

          varying vec4 pos;
          varying float t;
          uniform mat4 projection_camera_model_transform;
          uniform mat4 model_transform;
          const float A = 10.0;
          
          void main()
          { gl_Position = projection_camera_model_transform * vec4(position, 1.0);      // The vertex's final resting place (in NDCS).
            
            pos = model_transform * vec4(position, 1.0);      // The vertex's final resting place (in NDCS).
            t = pos[1];
  
            VERTEX_COLOR = vec4( 
                              colorBase[0] * (A - t) / A +  colorTop[0] * (t) / A,
                              colorBase[1] * (A - t) / A +  colorTop[1] * (t) / A,
                              colorBase[2] * (A - t) / A +  colorTop[2] * (t) / A,
                              1
                            );     
          
          }
        `;
    }

    fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    {
        return this.shared_glsl_code() + `
          void main()
          { gl_FragColor = VERTEX_COLOR;                                    // The interpolation gets done directly on the per-vertex colors.
          }`;
    }
}