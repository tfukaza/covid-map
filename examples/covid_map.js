import {tiny, defs} from './common.js';
import {data} from './data/data.js';
                                                  // Pull these names into this module's scope for convenience:
const { Vector, vec3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;

var mouse_x, mouse_y;     // x and y coordinates of mouse
var offset_x, offset_y;   // offset of the canvas on screen
var added_event = false;  // if the mouse event was initialized or not
var mouse_move = false;   // if the mouse is currently being dragged
var mouse_pre = [0,0];    // mouse coordinates in the previous frame 

var current_pos = vec3(-3,-8, -16); // current position of camera
const cases_scale = 10000;          // scaling factor between the number of corona cases and height of bars

var w = 0, h = 0;                   // width and height of canvas

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


// object to display text, taken from the example scenes
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
      text: new Text_Line(35),
      map: new defs.Square(),
      cube: new defs.Cube(),
      date: new Text_Line(30),
    };

    // Don't create any DOM elements to control this scene:
    this.widget_options = { make_controls: false };
    
    const gradient = new Gradient_Shader();     // shader for the bars
    const texture = new Fake_Bump_Map(1);  // shader for the US map
    const txt = new defs.Textured_Phong();      // shader for the text

    this.materials = {  
      text_image: new Material(
        txt, 
        {
          ambient: 1,
          diffusivity: 0,
          specularity: 0,
          texture: new Texture("assets/text.png") 
        }
      ),
      gradient: new Material(gradient, {}),
      usa_map: new Material(
        texture, 
        { 
          color: color(1, 1, 1, 1), 
          ambient: 0.5,  
          diffusivity: 0.5, 
          specularity: 0.0, 
          smoothness: 10,
          texture: new Texture("assets/map-t.png")
        }
      )
    };

    // a collision box for the bars
    this.collision_box = {
      box: [
        [[-1,-1,-1, 1], [1, -1, 1, 1], [1, 1, 1, 1], [-1, 1, -1, 1]],
        [[-1,-1,1, 1], [-1, 1, 1, 1], [1, 1, -1, 1], [1, -1, -1, 1]]
      ]
    }
  }

  display(context, program_state) { 
   

    program_state.projection_transform = Mat4.perspective(Math.PI/4, context.width/context.height, 1, 500);

    const t = program_state.animation_time/1000;

    // initialize mouse events if that has not been done yet
    if (!added_event) {
      init_events(context);
    }

    // rotation of camera
    let cam_rot = Mat4.rotation(0.3, 1, 0, 0);

    // generate parametric equation for mouse ray
    let mouse_vec = cam_rot.times(
                        vec4( 
                          2 * (mouse_x/w - 0.5) * Math.tan(Math.PI / 4 / 2),
                          2 * (mouse_y/h - 0.5) * Math.tan(Math.PI / 4 / 2) * (h/w),
                          -1,
                          1
                        )
                    );
                   
    // see where it intersects with the ground
    let pos_cur = intersect(current_pos, mouse_vec.to3(), vec3(0,0,0), vec3(0,1,0));
    let mouse_vec_pre = cam_rot.times(
                        vec4( 
                          2 * (mouse_pre[0]/w - 0.5) * Math.tan(Math.PI / 4 / 2),
                          2 * (mouse_pre[1]/h - 0.5) * Math.tan(Math.PI / 4 / 2) * (h/w),
                          -1,
                          1
                        )
                      );
    let pos_pre = intersect(current_pos, mouse_vec_pre.to3(), vec3(0,0,0), vec3(0,1,0));

    // if camera is being moved
    if (mouse_move){
      // get the difference of current and previous mouse position
      current_pos = vec3( clamp(current_pos[0] + (pos_cur[0] - pos_pre[0])/0.3, -21, 10),
                          current_pos[1], 
                          clamp(current_pos[2] + (pos_cur[2] - pos_pre[2])/0.3, -16, 1,0)
                        );
     
    }
    // record current position of mouse
    mouse_pre = [mouse_x, mouse_y];
    let mouse_pos = [
      pos_cur[0] - current_pos[0] * 2,
      5,
      pos_cur[2] - current_pos[2] * 2,
    ]
   

    // update camera location
    let cam_move = cam_rot.times(Mat4.translation(current_pos[0], current_pos[1], current_pos[2]));
    program_state.set_camera(cam_move);

    
    program_state.lights = [
      new Light(Mat4.scale(1,1,1).times(vec4(...mouse_pos, 1)), color(1, 1, 1, 1), 100),
    ];

    // location of the map
    const map_transform = Mat4.translation(3.8, 0, -0.2)
      .times(Mat4.scale(6.0, 1, 7.0))
      .times(Mat4.rotation(-Math.PI / 2, 1, 0, 0));
    this.shapes.map.draw(context, program_state, map_transform, this.materials.usa_map);

    // Get the matrix to transform world coordinates into projection coordinate
    let world_to_perspective = program_state.projection_transform.times(cam_move);

    let z_max = 1000000000;
    let z_buffer = [];
    let bundle = [context, program_state, 0, this.materials.gradient];

    // Display a bar for every county
    for (let state in data) {
      let state_name = state;
      state = data[state];
      for (let county in state) {
        let name = county;
        county = state[county];
        let lng = county.long;
        let lat = county.lat;
        let cases = 0, death = 0;
        let cases_next = 0, death_next = 0;
        // determine today's date and tomorrow's date
        let [today, tmrw] = lerp_date((t / 20) % 1);
        //convert to string
        [today, tmrw] = [date_to_string(today), date_to_string(tmrw)];
        // if there is no record, treat it as 0
     
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

        if (cases < 10)
         continue;
    
        // transform the bar
        let bar_transform = Mat4
          .translation((lng+95)/5 + 23, 0, -1 * (lat-37)/3)
          .times(Mat4.scale(0.04, cases/cases_scale, 0.04))
          .times(Mat4.translation(0, 1, 0));   
          
        // check if any of the boxes collide with the mouse
        let mouse_over = this.collision_box.box.some(v => {
          return point_in_collider(v, mouse_x, mouse_y, w, h, bar_transform, world_to_perspective);
        });

       
        // if mouse is not on it, render as usual
        if (!mouse_over) {
      
          render_bar(this.shapes.bar, bundle, bar_transform, cases, death, false);

        // if mouse is on it, calculate the world space coordinate in which the mouse ray intersects,
        // and "defer" the rendering 
        } else {
         
          // recall mouse_vec has the mouse ray shooting out from the camera
          // calculate the world space coordinate where the ray intersects the bar
          let pos_bar = intersect(  current_pos, 
                                    mouse_vec.to3(), 
                                    bar_transform.times(tiny.Vector4.create(...this.collision_box.box[0][0])).to3(),  // get a vertex of the collision box 
                                                                                                                      // and transform it into the current position
                                    bar_transform.times(vec3(1,0,1)));  // transform the normal vector (N is hard coded)
          let z = (world_to_perspective.times(pos_bar))[2];             // get the z buffer value
          // if z is the smallest value we have observed so far, this may be the 
          // one we have to render with a highlight.
          // Save it in a buffer in case it is
          if (z < z_max){
            // if there already is a data in the buffer, render it as usual since it
            // cannot be the one we want to highlight
            if (z_buffer.length > 0){
              render_bar(this.shapes.bar, bundle, z_buffer[0].t, z_buffer[0].cases, z_buffer[0].death, false);
              z_buffer.pop();
            }
            // buffer the current data
            z_buffer.push({
              "t": bar_transform.copy(),
              "name": name,
              "state_name": state_name,
              "date": today,
              "cases": Math.floor(cases),
              "death":  Math.floor(death)
            });
            z_max = z;
          }else{
          // if z is not closer than z_max, render as usual 
            render_bar(this.shapes.bar, bundle, bar_transform, cases, death, false);
          }
        }
      }
    }

    // if there is something in the buffer, render it
    if (z_buffer.length > 0) {
      context.canvas.style.cursor = "crosshair";
      let b = z_buffer[0];
      render_bar(this.shapes.bar, bundle, b.t, b.cases, b.death, true);
      let strings = [
        b.name + "," + b.state_name,
        "Cases: " + b.cases,
        "Deaths: " + b.death,
      ]

      let i = 0;

      for (let s of strings){
        this.shapes.text.set_string(s, context.context);

        let tt = 
        world_to_perspective
        .times(
            new tiny.Matrix( [1, 0, 0, b.t[0][3]],
                    [0, 1, 0, 0],
                    [0, 0, 1, b.t[2][3]],
                    [0, 0, 0, 1]
              )
          )

          tt = new tiny.Matrix( [0.02 * (h/w), 0, 0, (tt[0][3] + 1)/tt[3][3]],
                              [0, 0.02, 0, (tt[1][3] -1 + 2 * b.cases / cases_scale - i * 0.8 )/tt[3][3]],
                              [0, 0, 0.02, -0.1],
                              [0, 0, 0, 1]
          );
        
          tt = Mat4.inverse(world_to_perspective).times(tt);

        this.shapes.text.draw(  context, 
                                program_state, 
                                tt,
                                this.materials.text_image);
        i++;
      }

    }  
    else{
      if(mouse_move)
        context.canvas.style.cursor = "all-scroll";
      else
        context.canvas.style.cursor = "default";
    }

     // draw date on background 
     let ran = lerp_date((t / 20) % 1);
     this.shapes.date.set_string(date_to_string(ran[0]) + " ~ " + date_to_string(ran[1]), context.context); 
  
     let tt2 = new tiny.Matrix( 
          [0.02 * (h/w), 0, 0, -0.9],
          [0, 0.02, 0, -0.9],
          [0, 0, 0.02, -0.1],
          [0, 0, 0, 1]
      );
      tt2 = Mat4.inverse(world_to_perspective).times(tt2);
     this.shapes.date.draw(context, program_state, tt2, this.materials.text_image);

  }
}

var T = (x, y, x1, y1, x2, y2) => (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);

function render_bar(bar, bundle, t, cases, death, is_hover){

  let base = color(1,1,1,1), top = color(1,0,0,1);
  if (is_hover){
    base = color(1,1,1,1);
    top = color(1,1,1,1);
  }
  else{ 
    if (cases > 10000){ 
      base = color(0.4,0,0.6,1);
    }
    else if (cases > 5000){
      base = color(0.2,0.3,1,1);
    }
    else if (cases > 1000){
      base = color(0.2,0.5,0.8,1);
    }
    else{
      base = color(0,0.3,0.5,1);
    }
  }
  bar.draw(
    bundle[0],
    bundle[1],
    t,
    bundle[3].override({"base_color": base, "top_color": top})
  );
}


function point_in_collider(v, m_x, m_y, w, h, bar_transform, world_to_perspective ){
  let result = 0;
  const points= [0, 0, 0, 0];
  // transform the points, and convert them into projection space 
  for (let i = 0; i < 4; i++) {
    let v_tmp = v[i]
    let p = bar_transform.times(vec4(v_tmp[0], v_tmp[1], v_tmp[2], 1));
    p = world_to_perspective.times(p);
    points[i] = [p[0]/p[3], -1 * p[1]/p[3], p[2]/ p[3], p[3]]; 
  }

  let p1_x = (m_x/w - 0.5) * 2;
  let p1_y = (m_y/h - 0.5) * 2;
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
}
 
// given a vector and a normal for a plane, computes the location where the vector intersects the plane
function intersect(p_pos, p_vec, n_pos, n_vec){
  // https://en.wikipedia.org/wiki/Line%E2%80%93plane_intersection
  let t = ((n_pos.minus(p_pos)).dot(n_vec)) / (p_vec.dot(n_vec));
  return p_pos.plus(p_vec.times(t));

}

function init_events(context){
  const rec = context.canvas.getBoundingClientRect();
    offset_x = rec.left;
    offset_y = rec.top;
    // add event listeners for mouse input
    context.canvas.addEventListener('mousemove', e => {
      mouse_x = e.clientX - offset_x;
      mouse_y = e.clientY - offset_y;
    });

    context.canvas.addEventListener('mousedown', e => {
      if(e.button == 0)
        mouse_move = true;
    });

    context.canvas.addEventListener('mouseup', e => {
      if(e.button == 0)
        mouse_move = false;
    });

    added_event = true;
    console.log(context.canvas);
    console.log(offset_x);
    w = context.canvas.width;
    h = context.canvas.height;
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
   
function clamp(n, min, max){
  return Math.max(Math.min(n, max), min);
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

// shader for the us map, based off of the example bump map shader,
// but modified to make it compatible with how we imported normal maps
const Fake_Bump_Map = 
class Fake_Bump_Map extends defs.Textured_Phong
{                                          
  fragment_glsl_code()
    {                           
      return this.shared_glsl_code() + `
        varying vec2 f_tex_coord;
        uniform sampler2D texture;

        void main()
          {                                                          // Sample the texture image in the correct place:
            vec4 tex_color = texture2D( texture, f_tex_coord );
            if( tex_color.w < .01 ) discard;
            vec3 bumped_N  =    normalize(
              vec3(
                N[0] + (tex_color.x - 0.5) * 2.0,
                N[1],
                N[2] + (tex_color.y - 0.5) * 2.0
              ));                        
            
            gl_FragColor = vec4( 0,0,0, shape_color.w * tex_color.w ); 
            gl_FragColor.xyz = phong_model_lights( normalize( bumped_N ), vertex_worldspace );
          } ` ;
    }
}
