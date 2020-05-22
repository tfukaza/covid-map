import {tiny, defs} from './common.js';
import {data} from './data/data.js';
                                                  // Pull these names into this module's scope for convenience:
const { Vector, vec3, vec4, color, Mat4, Light, Shape, Material, Shader, Texture, Scene } = tiny;

var mouse_x, mouse_y;
var offset_x, offset_y;
var added_event = false;

console.log(data);

var T = (x, y, x1, y1, x2, y2) => (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);

export class Text_Line extends Shape                
{                           // **Text_Line** embeds text in the 3D world, using a crude texture 
                            // method.  This Shape is made of a horizontal arrangement of quads.
                            // Each is textured over with images of ASCII characters, spelling 
                            // out a string.  Usage:  Instantiate the Shape with the desired
                            // character line width.  Then assign it a single-line string by calling
                            // set_string("your string") on it. Draw the shape on a material
                            // with full ambient weight, and text.png assigned as its texture 
                            // file.  For multi-line strings, repeat this process and draw with
                            // a different matrix.
  constructor( max_size )
    { super( "position", "normal", "texture_coord" );
      this.max_size = max_size;
      var object_transform = Mat4.identity();
      for( var i = 0; i < max_size; i++ )
      {                                       // Each quad is a separate Square instance:
        defs.Square.insert_transformed_copy_into( this, [], object_transform );
        object_transform.post_multiply( Mat4.translation( 1.5,0,0 ) );
      }
    }
  set_string( line, context )
    {           // set_string():  Call this to overwrite the texture coordinates buffer with new 
                // values per quad, which enclose each of the string's characters.
      this.arrays.texture_coord = [];
      for( var i = 0; i < this.max_size; i++ )
        {
          var row = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) / 16 ),
              col = Math.floor( ( i < line.length ? line.charCodeAt( i ) : ' '.charCodeAt() ) % 16 );

          var skip = 3, size = 32, sizefloor = size - skip;
          var dim = size * 16,  
              left  = (col * size + skip) / dim,      top    = (row * size + skip) / dim,
              right = (col * size + sizefloor) / dim, bottom = (row * size + sizefloor + 5) / dim;

          this.arrays.texture_coord.push( ...Vector.cast( [ left,  1-bottom], [ right, 1-bottom ],
                                                          [ left,  1-top   ], [ right, 1-top    ] ) );
        }
      if( !this.existing )
        { this.copy_onto_graphics_card( context );
          this.existing = true;
        }
      else
        this.copy_onto_graphics_card( context, ["texture_coord"], false );
    }
}


export class Covid_Map extends Scene
{             // **Text_Demo** is a scene with a cube, for demonstrating the Text_Line utility Shape.
  constructor()
    { super()
      this.shapes = {   bar: new defs.Cube(), 
                        text: new Text_Line( 35 ) };
                                      // Don't create any DOM elements to control this scene:
      this.widget_options = { make_controls: false };
        
      const phong   = new defs.Phong_Shader();
      //const gradient = 
      const texture = new defs.Textured_Phong( 1 );

      this.materials = {  grey:       new Material( phong, { color: color( .5,.5,.5,1 ), ambient: 0, 
                                      diffusivity: .3, specularity: .5, smoothness: 10 }),
                          text_image: new Material( texture, { ambient: 1, diffusivity: 0, specularity: 0,
                                      texture: new Texture( "assets/text.png" ) })
                          // gradient:   new Material( gradient, {})
      };

      this.collision_box = {
        box:  [
                [[-1,-1,-1, 1], [1, -1, 1, 1], [1, 1, 1, 1], [-1, 1, -1, 1] ],
                [[-1,-1,1, 1], [-1, 1, 1, 1], [1, 1, -1, 1], [1, -1, -1, 1] ]
              ]
      }


     
                              // To show text you need a Material like this one:
      
    }
  display( context, program_state )
    { 

      let data_text = "N/A";
      program_state.set_camera( Mat4.rotation(0.3, 1, 0, 0).times(Mat4.translation( -2,-3,-10 )));


      program_state.lights = [ new Light( vec4( 3,2,1,0 ),   color( 1,1,1,1 ),  1000000 ),
                               new Light( vec4( 3,10,10,1 ), color( 1,.7,.7,1 ), 100000 ) ];


      //program_state.set_camera( Mat4.look_at( ...Vector.cast( [ 0,0,4 ], [0,0,0], [0,1,0] ) ) );
      program_state.projection_transform = Mat4.perspective( Math.PI/4, context.width/context.height, 1, 500 );
      //console.log(program_state);
      //const t = program_state.animation_time/1000;

      if(!added_event){
        let rec = context.canvas.getBoundingClientRect();
        offset_x = rec.left - 8;
        offset_y = rec.top;
        context.canvas.addEventListener('mousemove', e => {
          mouse_x = e.clientX - offset_x;
          mouse_y = e.clientY - offset_y;
          //console.log(mouse_x + ',' + mouse_y);
        });
        added_event = true;
        console.log(context.canvas);
        this.w = context.canvas.width;
        this.h = context.canvas.height;
      }
      //const funny_orbit = Mat4.rotation( Math.PI/4*t,   Math.cos(t), Math.sin(t), .7*Math.cos(t) );
      //this.shapes.cube.draw( context, program_state, funny_orbit, this.grey );
      
      
      // let strings = [ "This is some text", "More text", "1234567890", "This is a line.\n\n\n"+"This is another line.", 
      //                 Text_Line.toString(), Text_Line.toString() ];
      
                        // Sample the "strings" array and draw them onto a cube.
      // for( let i = 0; i < 3; i++ )                    
      //   for( let j = 0; j < 2; j++ )
      //   {             // Find the matrix for a basis located along one of the cube's sides:
      //     let cube_side = Mat4.rotation( i == 0 ? Math.PI/2 : 0,   1, 0, 0 )
      //             .times( Mat4.rotation( Math.PI * j - ( i == 1 ? Math.PI/2 : 0 ),   0, 1, 0 ) )
      //             .times( Mat4.translation( -.9, .9, 1.01 ) );

      //     const multi_line_string = strings[ 2*i + j ].split('\n');
      //                   // Draw a Text_String for every line in our string, up to 30 lines:
      //     for( let line of multi_line_string.slice( 0,30 ) )
      //     {             // Assign the string to Text_String, and then draw it.
      //       this.shapes.text.set_string( line, context.context );
      //       this.shapes.text.draw( context, program_state, funny_orbit.times( cube_side )
      //                                            .times( Mat4.scale( .03,.03,.03 ) ), this.text_image );
      //                   // Move our basis down a line.
      //       cube_side.post_multiply( Mat4.translation( 0,-.06,0 ) );
      //     }
      //   }
      

        // get the matrix to transform world coordinates into projection coordinate
        let cam = Mat4.rotation(0.3, 1, 0, 0).times(Mat4.translation( -2,-3,-10 ));//program_state.camera_transform;
        let world_to_perspective = program_state.projection_transform.times(cam);
        var state; 
        var county;
console.log(program_state);
        //console.log(mouse_x + ',' + mouse_y);
        //console.log(this.h + ',' + this.w);


        // display a bar for every county
        for (state in data){
          state = data[state];
          for (county of state){
            //console.log(county);
            let lng = county.long;
            let lat = county.lat;
            let cases = county.cases;
            if (cases  < 100)
              continue;
          //a = Math.sin(t + i / 5) + 1;
          // transform the bar
          let bar_transform =   Mat4.translation((lng+95)/5 + 23, 0, -1 * (lat-37)/3)
                                .times(Mat4.scale(0.1,cases/10000,0.1))
                                .times(Mat4.translation(0, 1, 0));   
           
          // check if any of the boxes collide with the mouse
          let mouse_over = this.collision_box.box.some(v => {
            
            let result = 0;
            let points=[0,0,0,0];
            // transform the points, and convert them into projection space 
            for (var i = 0; i < 4; i++){
              let v_tmp = v[i]
              let p = bar_transform.times(vec4(v_tmp[0], v_tmp[1], v_tmp[2], 1));
              p = world_to_perspective.times(p);
             
              points[i] = [p[0]/p[3], -1 * p[1]/p[3], p[2]/ p[3], p[3]]; 
            }
            let p1_x = (mouse_x/this.w - 0.5) * 2, p1_y = (mouse_y/this.h - 0.5) * 2;
            //let p1_x = mouse_x, p1_y = mouse_y;
            let p2_x = p1_x + 100000, p2_y = p1_y;
            
            for (var i = 0; i < 4; i++){

              let x1 = points[i][0], y1 = points[i][1];
              let x2 = points[(i+1)%4][0], y2 = points[(i+1)%4][1];
              
              let R = T(p1_x, p1_y, x1, y1, x2, y2) * T(p2_x, p2_y, x1, y1, x2, y2);
              let S = T(x1, y1, p1_x, p1_y, p2_x, p2_y) * T(x2, y2, p1_x, p1_y, p2_x, p2_y);
        
              if(R < 0 && S < 0) result+=1;
          
            }

            return result%2 == 1;

          });

          //console.log(mouse_over);

          let c = undefined;
          if (!mouse_over){
            c = color(0.2, 0.53, 0.53,1 );
          }
          else{
            c = color(0.7, 0.53, 0.53,1 );
            data_text = JSON.stringify(county);
          }
          
          //console.log(bar_transform);
          this.shapes.bar.draw(     context, program_state,
                                    bar_transform, 
                                    this.materials.grey.override({color: c}));
        }
      }

      this.shapes.text.set_string( data_text, context.context );
      this.shapes.text.draw( context, program_state, Mat4.translation( -2,-3,-10), this.materials.text_image );
    }
  }



   
    // class Bar_Shader extends Shader             // Subclasses of Shader each store and manage a complete GPU program.  This Shader is
    // {                                             // the simplest example of one.  It samples pixels from colors that are directly assigned
    //     material(color_base, color_top, properties) {
    //         //return {shader: this}
    //         { return new class Material       // Possible properties: color_base, color_top
    //           { constructor( shader, color_base = Color.of( 0,1,0,1 ),  color_top = Color.of( 1,0,0,1 ))
    //               { 
    //                 //console.log(color_top);
    //                 Object.assign( this, { shader, color_base, color_top } );  // Assign defaults.
    //                 Object.assign( this, properties );                         // Optionally override defaults.
    //               }
    //             override( properties )                      // Easily make temporary overridden versions of a base material, such as
    //               { 
    //                 const copied = new this.constructor();  // of a different color or diffusivity.  Use "opacity" to override only that.
    //                 Object.assign( copied, this );
    //                 Object.assign( copied, properties );
    //                 copied.color_base = copied.color_base.copy();     // non-primitives will need to be copied explicitly, since Js only does shallow copy
    //                 copied.color_top = copied.color_top.copy();     

    //                 // if( properties[ "opacity" ] != undefined ) 
    //                 //   copied.color[3] = properties[ "opacity" ];
    //                 return copied;
    //               }
    //           }( this, color_base, color_top );
    //       }
    //     }      // to the vertices.  Materials here are minimal, without any settings.
    //     map_attribute_name_to_buffer_name(name)        // The shader will pull single entries out of the vertex arrays, by their data fields'
    //     {                                              // names.  Map those names onto the arrays we'll pull them from.  This determines
    //         // which kinds of Shapes this Shader is compatible with.  Thanks to this function,
    //         // Vertex buffers in the GPU can get their pointers matched up with pointers to
    //         // attribute names in the GPU.  Shapes and Shaders can still be compatible even
    //         // if some vertex data feilds are unused.
    //         return {object_space_pos: "positions", color: "colors"}[name];      // Use a simple lookup table.
    //     }

    //     // Define how to synchronize our JavaScript's variables to the GPU's:
    //     update_GPU(g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl) {

    //         const   [P, C, M] = [g_state.projection_transform, g_state.camera_transform, model_transform],
    //                 PCM =       P.times(C).times(M);
            
    //         gl.uniformMatrix4fv(gpu.projection_camera_model_transform_loc, false, Mat.flatten_2D_to_1D(PCM.transposed()));
    //         gl.uniformMatrix4fv(gpu.model_transform_loc, false, Mat.flatten_2D_to_1D(M.transposed()));
    //         //console.log( material.color_base);
    //         gl.uniform4fv( gpu.colorBase_loc,   material.color_base       );    // Send the desired shape-wide material qualities 
    //         gl.uniform4fv( gpu.colorTop_loc,    material.color_top       );    // Send the desired shape-wide material qualities 
    //     }

    //     shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    //     {
    //         return `
    //           precision mediump float;
    //           varying vec4 VERTEX_COLOR;
    //           uniform vec4 colorBase, colorTop;
    //           `;
    //     }

    //     vertex_glsl_code()           // ********* VERTEX SHADER *********
    //     {
    //         return `
    //           // attribute vec4 color;
    //           attribute vec3 object_space_pos;
    //           varying vec4 pos;
    //           uniform mat4 projection_camera_model_transform;
    //           uniform mat4 model_transform;

    //           void main()
    //           { gl_Position = projection_camera_model_transform * vec4(object_space_pos, 1.0);      // The vertex's final resting place (in NDCS).
    //             pos = model_transform * vec4(object_space_pos, 1.0);      // The vertex's final resting place (in NDCS).
    //             VERTEX_COLOR = vec4( 
    //               colorBase[0] * (10.0 - pos[1]) / 10.0 +  colorTop[0] * (pos[1]) / 10.0,
    //               colorBase[1] * (10.0 - pos[1]) / 10.0 +  colorTop[1] * (pos[1]) / 10.0,
    //               colorBase[2] * (10.0 - pos[1]) / 10.0 +  colorTop[2] * (pos[1]) / 10.0,
    //               1
    //             );                                                               // Use the hard-coded color of the vertex.
    //           }
    //         `;
    //     }

    //     fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    //     {
    //         return `
    //     void main()
    //     { gl_FragColor = VERTEX_COLOR;                                    // The interpolation gets done directly on the per-vertex colors.
    //     }`;
    //     }
    // }