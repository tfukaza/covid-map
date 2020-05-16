var canvas = undefined;
var is_pressed = false;

var mouse_x = 0;
var mouse_y = 0;

var T = (x, y, x1, y1, x2, y2) => (x - x1) * (y2 - y1) - (y - y1) * (x2 - x1);

window.Covid_Map = window.classes.Covid_Map =
class Covid_Map extends Scene_Component
  { constructor( context, control_box )     // The scene begins by requesting the camera, shapes, and materials it will need.
      { super(   context, control_box );    // First, include a secondary Scene that provides movement controls:
        
        // show on-screen controls if needed 
        if( !context.globals.has_controls   ) 
          context.register_scene_component( new Movement_Controls( context, control_box.parentElement.insertCell() ) ); 

        // initialize camera orientation
        context.globals.graphics_state.camera_transform = Mat4.look_at( Vec.of( 0,10,20 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) );
        this.cam_matrix =  context.globals.graphics_state.camera_transform;
        this.initial_camera_location = Mat4.inverse( context.globals.graphics_state.camera_transform );

        // define aspect ratio
        const r = context.width/context.height;
        this.w = context.width;
        this.h = context.height;
        context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, r, .1, 1000 );
        this.proj_matrix =  context.globals.graphics_state.projection_transform;

        // define shapes that will be used in this scene
        const shapes = { torus:  new Torus( 15, 15 ),
                         sphere1: new ( Subdivision_Sphere.prototype.make_flat_shaded_version() )(1),
                         bar: new Cube()
                       }
        this.submit_shapes( context, shapes );
      
        this.collision_box = {
          box:  [
                  [[-1,-1,-1, 1], [1, -1, 1, 1], [1, 1, 1, 1], [-1, 1, -1, 1] ],
                  [[-1,-1,1, 1], [-1, 1, 1, 1], [1, 1, -1, 1], [1, -1, -1, 1] ]
                ]
        }

        // Make some Material objects available to you:
        this.materials =
          { planet:   context.get_instance( Phong_Shader ).material( Color.of( 1,1,0,1 ), { ambient:1.0 } ),
            sun:      context.get_instance( Phong_Shader ).material( Color.of( 1,0,0,1 ), { ambient: 1.0} ),
            bar:     context.get_instance( Bar_Shader).material(Color.of( 1,0,0,1 ), Color.of( 1,0,0,1 ))
          }

        this.lights = [ new Light( Vec.of( 5,-10,5,1 ), Color.of( 0, 1, 1, 1 ), 1000 ), ];
       
      }
    make_control_panel()            // Draw the scene's buttons, setup their actions and keyboard shortcuts, and monitor live measurements.
      { this.key_triggered_button( "View solar system",  [ "0" ], () => this.attached = () => this.initial_camera_location );
      }
    display( graphics_state )
      { 
        //graphics_state.lights = this.lights;        // Use the lights stored in this.lights.
        const t = graphics_state.animation_time / 1000, dt = graphics_state.animation_delta_time / 1000;
        let a = Math.sin(t) + 1;
        //let a_planet = (t);

        // get the matrix to transform world coordinates into projection coordinate
        let world_to_perspective = this.proj_matrix.times(this.cam_matrix);


        for (let i = 0; i < 50; i++){
          
          a = Math.sin(t + i / 5) + 1;
          // transform the bar
          let bar_transform =   Mat4.identity()
                                .times(Mat4.translation([i * 1, 1, 0]))
                                .times(Mat4.scale([0.2,a*0.8,0.2]))
                                .times(Mat4.translation([0, 1, 0]));   

          // check if any of the boxes collide with the mouse
          let mouse_over = this.collision_box.box.some(v => {
            
            let result = 0;
            let points=[0,0,0,0];
            // transform the points, and convert them into projection space 
            for (var i = 0; i < 4; i++){
              let v_tmp = v[i]
              let p = bar_transform.times(Vec.of(v_tmp[0], v_tmp[1], v_tmp[2], 1));
               p = world_to_perspective.times(p);
              points[i] = [p[0]/p[3], -1 * p[1]/p[3], p[2][3], p[3]];
            }
            // if (t - Math.floor(t) < 0.001)
            //   console.log(points);

            let p1_x = (mouse_x/this.w - 0.5) * 2, p1_y = (mouse_y/this.h - 0.5) * 2;
            //let p1_x = mouse_x, p1_y = mouse_y;
            let p2_x = p1_x + 100000, p2_y = p1_y;

            //console.log([points[0][0]/points[0][3], -1 * points[0][1]/points[0][3]]);
            // console.log(points[0]);
            // console.log([p1_x, p1_y]);
            
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

          let color = undefined;
          if (!mouse_over){
            color = Color.of(0.2, 0.53, 0.53,1 );
            //bar_transform = Mat4.scale([0.7,0.7,0.7]).times(bar_transform);
          }
          else
            color = Color.of(0.7, 0.53, 0.53,1 );

          this.shapes.bar.draw(     graphics_state, 
                                    bar_transform, 
                                    this.materials.bar.override({color_base: color}));
        }


          
        // if(!event_added){
        //   canvas = document.getElementById('main-canvas').childNodes[0];

        //   if (canvas != undefined){
        
        //     canvas = document.getElementById('main-canvas').childNodes[0];
        //     canvas.addEventListener('mousemove', e => {console.log(e)});
        //     event_added = true;
        //     // let rect = canvas.getBoundingClientRect();
        //   } 
        // }

      }
  }

// var points = [[1,1], [3,3], [4,6], [0,5]];
// var test = [5,4];
// var test2 = [test[0] + 100000, test[1]];	

// let p1_x = test[0], p1_y = test[1];
// let p2_x = test2[0], p2_y = test2[1];

// var result = 0;


  
document.addEventListener('DOMContentLoaded', e=>{
  // get canvas
  canvas = document.getElementById("main-canvas").childNodes[0];
  console.log(canvas);
});

document.addEventListener('mousemove', update_mouse);

function update_mouse(e){
  mouse_x = e.clientX;
  mouse_y = e.clientY;
}
  // document.addEventListener("onload", e => {
  //   canvas = document.getElementById('main-canvas').childNodes[0];
  // })


// Special shader used for the bars. This will show a different color depending on the world space height

window.Bar_Shader = window.classes.Bar_Shader =
    class Bar_Shader extends Shader             // Subclasses of Shader each store and manage a complete GPU program.  This Shader is
    {                                             // the simplest example of one.  It samples pixels from colors that are directly assigned
        material(color_base, color_top, properties) {
            //return {shader: this}
            { return new class Material       // Possible properties: color_base, color_top
              { constructor( shader, color_base = Color.of( 0,1,0,1 ),  color_top = Color.of( 1,0,0,1 ))
                  { 
                    //console.log(color_top);
                    Object.assign( this, { shader, color_base, color_top } );  // Assign defaults.
                    Object.assign( this, properties );                         // Optionally override defaults.
                  }
                override( properties )                      // Easily make temporary overridden versions of a base material, such as
                  { 
                    const copied = new this.constructor();  // of a different color or diffusivity.  Use "opacity" to override only that.
                    Object.assign( copied, this );
                    Object.assign( copied, properties );
                    copied.color_base = copied.color_base.copy();     // non-primitives will need to be copied explicitly, since Js only does shallow copy
                    copied.color_top = copied.color_top.copy();     

                    // if( properties[ "opacity" ] != undefined ) 
                    //   copied.color[3] = properties[ "opacity" ];
                    return copied;
                  }
              }( this, color_base, color_top );
          }
        }      // to the vertices.  Materials here are minimal, without any settings.
        map_attribute_name_to_buffer_name(name)        // The shader will pull single entries out of the vertex arrays, by their data fields'
        {                                              // names.  Map those names onto the arrays we'll pull them from.  This determines
            // which kinds of Shapes this Shader is compatible with.  Thanks to this function,
            // Vertex buffers in the GPU can get their pointers matched up with pointers to
            // attribute names in the GPU.  Shapes and Shaders can still be compatible even
            // if some vertex data feilds are unused.
            return {object_space_pos: "positions", color: "colors"}[name];      // Use a simple lookup table.
        }

        // Define how to synchronize our JavaScript's variables to the GPU's:
        update_GPU(g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl) {

            const   [P, C, M] = [g_state.projection_transform, g_state.camera_transform, model_transform],
                    PCM =       P.times(C).times(M);
            
            gl.uniformMatrix4fv(gpu.projection_camera_model_transform_loc, false, Mat.flatten_2D_to_1D(PCM.transposed()));
            gl.uniformMatrix4fv(gpu.model_transform_loc, false, Mat.flatten_2D_to_1D(M.transposed()));
            //console.log( material.color_base);
            gl.uniform4fv( gpu.colorBase_loc,   material.color_base       );    // Send the desired shape-wide material qualities 
            gl.uniform4fv( gpu.colorTop_loc,    material.color_top       );    // Send the desired shape-wide material qualities 
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
            return `
              // attribute vec4 color;
              attribute vec3 object_space_pos;
              varying vec4 pos;
              uniform mat4 projection_camera_model_transform;
              uniform mat4 model_transform;

              void main()
              { gl_Position = projection_camera_model_transform * vec4(object_space_pos, 1.0);      // The vertex's final resting place (in NDCS).
                pos = model_transform * vec4(object_space_pos, 1.0);      // The vertex's final resting place (in NDCS).
                VERTEX_COLOR = vec4( 
                  colorBase[0] * (10.0 - pos[1]) / 10.0 +  colorTop[0] * (pos[1]) / 10.0,
                  colorBase[1] * (10.0 - pos[1]) / 10.0 +  colorTop[1] * (pos[1]) / 10.0,
                  colorBase[2] * (10.0 - pos[1]) / 10.0 +  colorTop[2] * (pos[1]) / 10.0,
                  1
                );                                                               // Use the hard-coded color of the vertex.
              }
            `;
        }

        fragment_glsl_code()           // ********* FRAGMENT SHADER *********
        {
            return `
        void main()
        { gl_FragColor = VERTEX_COLOR;                                    // The interpolation gets done directly on the per-vertex colors.
        }`;
        }
    };


// // class to store information about each bar    
// class Bar_Body
// {                                   // **Body** can store and update the properties of a 3D body that incrementally
//                                     // moves from its previous place due to velocities.  It conforms to the
//                                     // approach outlined in the "Fix Your Timestep!" blog post by Glenn Fiedler.
//   constructor( shape, material, size )
//     { Object.assign( this, 
//              { shape, material, size } )
//     }
//   emplace( location_matrix, linear_velocity, angular_velocity, spin_axis = vec3( 0,0,0 ).randomized(1).normalized() )
//     {                               // emplace(): assign the body's initial values, or overwrite them.
//       this.center   = location_matrix.times( vec4( 0,0,0,1 ) ).to3();
//       this.rotation = Mat4.translation( ...this.center.times( -1 ) ).times( location_matrix );
//       this.previous = { center: this.center.copy(), rotation: this.rotation.copy() };
//                                               // drawn_location gets replaced with an interpolated quantity:
//       this.drawn_location = location_matrix;
//       this.temp_matrix = Mat4.identity();
//       return Object.assign( this, { linear_velocity, angular_velocity, spin_axis } )
//     }
//   advance( time_amount ) 
//     {                           // advance(): Perform an integration (the simplistic Forward Euler method) to
//                                 // advance all the linear and angular velocities one time-step forward.
//       this.previous = { center: this.center.copy(), rotation: this.rotation.copy() };
//                                                  // Apply the velocities scaled proportionally to real time (time_amount):
//                                                  // Linear velocity first, then angular:
//       this.center = this.center.plus( this.linear_velocity.times( time_amount ) );
//       this.rotation.pre_multiply( Mat4.rotation( time_amount * this.angular_velocity, ...this.spin_axis ) );
//     }
//   blend_rotation( alpha )         
//     {                        // blend_rotation(): Just naively do a linear blend of the rotations, which looks
//                              // ok sometimes but otherwise produces shear matrices, a wrong result.

//                                   // TODO:  Replace this function with proper quaternion blending, and perhaps 
//                                   // store this.rotation in quaternion form instead for compactness.
//        return this.rotation.map( (x,i) => vec4( ...this.previous.rotation[i] ).mix( x, alpha ) );
//     }
//   blend_state( alpha )            
//     {                             // blend_state(): Compute the final matrix we'll draw using the previous two physical
//                                   // locations the object occupied.  We'll interpolate between these two states as 
//                                   // described at the end of the "Fix Your Timestep!" blog post.
//       this.drawn_location = Mat4.translation( ...this.previous.center.mix( this.center, alpha ) )
//                                       .times( this.blend_rotation( alpha ) )
//                                       .times( Mat4.scale( ...this.size ) );
//     }
//                                               // The following are our various functions for testing a single point,
//                                               // p, against some analytically-known geometric volume formula 
//                                               // (within some margin of distance).
//   static intersect_cube( p, margin = 0 )
//     { return p.every( value => value >= -1 - margin && value <=  1 + margin )
//     }
//   static intersect_sphere( p, margin = 0 )
//     { return p.dot( p ) < 1 + margin;
//     }
//   check_if_colliding( b, collider )
//     {                                     // check_if_colliding(): Collision detection function.
//                                           // DISCLAIMER:  The collision method shown below is not used by anyone; it's just very quick 
//                                           // to code.  Making every collision body an ellipsoid is kind of a hack, and looping 
//                                           // through a list of discrete sphere points to see if the ellipsoids intersect is *really* a 
//                                           // hack (there are perfectly good analytic expressions that can test if two ellipsoids 
//                                           // intersect without discretizing them into points).
//       if ( this == b ) 
//         return false;                     // Nothing collides with itself.
//                                           // Convert sphere b to the frame where a is a unit sphere:
//       const T = this.inverse.times( b.drawn_location, this.temp_matrix );

//       const { intersect_test, points, leeway } = collider;
//                                           // For each vertex in that b, shift to the coordinate frame of
//                                           // a_inv*b.  Check if in that coordinate frame it penetrates 
//                                           // the unit sphere at the origin.  Leave some leeway.
//       return points.arrays.position.some( p => 
//         intersect_test( T.times( p.to4(1) ).to3(), leeway ) );
//     }
// }
