window.Covid_Map = window.classes.Covid_Map =
class Covid_Map extends Scene_Component
  { constructor( context, control_box )     // The scene begins by requesting the camera, shapes, and materials it will need.
      { super(   context, control_box );    // First, include a secondary Scene that provides movement controls:
        
        // show on-screen controls if needed 
        if( !context.globals.has_controls   ) 
          context.register_scene_component( new Movement_Controls( context, control_box.parentElement.insertCell() ) ); 

        // initialize camera orientation
        context.globals.graphics_state.camera_transform = Mat4.look_at( Vec.of( 0,10,20 ), Vec.of( 0,0,0 ), Vec.of( 0,1,0 ) );
        this.initial_camera_location = Mat4.inverse( context.globals.graphics_state.camera_transform );

        // define aspect ratio
        const r = context.width/context.height;
        context.globals.graphics_state.projection_transform = Mat4.perspective( Math.PI/4, r, .1, 1000 );

        // define shapes that will be used in this scene
        const shapes = { torus:  new Torus( 15, 15 ),
                         sphere1: new ( Subdivision_Sphere.prototype.make_flat_shaded_version() )(1),
                       }
        this.submit_shapes( context, shapes );
                                     
        // Make some Material objects available to you:
        this.materials =
          { planet:   context.get_instance( Phong_Shader ).material( Color.of( 1,1,0,1 ), { ambient:1.0 } ),
            sun:      context.get_instance( Phong_Shader ).material( Color.of( 1,0,0,1 ), { ambient: 1.0} ),
            ring:     context.get_instance( Ring_Shader  ).material()
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
        
        let a_planet = (t);

        // planet 1
        let planet_transform = Mat4.identity();
        
        planet_transform = planet_transform.times(Mat4.rotation(a_planet/1.5, Vec.of(0, 1, 0)))
                                            .times(Mat4.translation([5, 0, 0]))
                                            .times(Mat4.rotation(a_planet/0.5, Vec.of(0, 1, 0)));  // rotate the planet around its axis
        this.planet_1 = planet_transform; // record planet location 
        
        let icy_gray = Color.of(0.45, 0.53, 0.53,1 );
        this.shapes.sphere1.draw( graphics_state, 
                                  planet_transform, 
                                  this.materials.planet.override({color: icy_gray, diffusivity: 1}));
      }
  }


// Extra credit begins here (See TODO comments below):

window.Ring_Shader = window.classes.Ring_Shader =
class Ring_Shader extends Shader              // Subclasses of Shader each store and manage a complete GPU program.
{ material() { return { shader: this } }      // Materials here are minimal, without any settings.
  map_attribute_name_to_buffer_name( name )       // The shader will pull single entries out of the vertex arrays, by their data fields'
    {                                             // names.  Map those names onto the arrays we'll pull them from.  This determines
                                                  // which kinds of Shapes this Shader is compatible with.  Thanks to this function, 
                                                  // Vertex buffers in the GPU can get their pointers matched up with pointers to 
                                                  // attribute names in the GPU.  Shapes and Shaders can still be compatible even
                                                  // if some vertex data feilds are unused. 
      return { object_space_pos: "positions" }[ name ];      // Use a simple lookup table.
    }
    // Define how to synchronize our JavaScript's variables to the GPU's:
  update_GPU( g_state, model_transform, material, gpu = this.g_addrs, gl = this.gl )
      { const proj_camera = g_state.projection_transform.times( g_state.camera_transform );
                                                                                        // Send our matrices to the shader programs:
        gl.uniformMatrix4fv( gpu.model_transform_loc,             false, Mat.flatten_2D_to_1D( model_transform.transposed() ) );
        gl.uniformMatrix4fv( gpu.projection_camera_transform_loc, false, Mat.flatten_2D_to_1D(     proj_camera.transposed() ) );
      }
  shared_glsl_code()            // ********* SHARED CODE, INCLUDED IN BOTH SHADERS *********
    { return `precision mediump float;
              varying vec4 position;
              varying vec4 center;
      `;
    }
  vertex_glsl_code()           // ********* VERTEX SHADER *********
    { return `
        attribute vec3 object_space_pos;
        uniform mat4 model_transform;
        uniform mat4 projection_camera_transform;

        void main()
        { gl_Position = projection_camera_transform * model_transform * vec4(object_space_pos, 1.0); 
          position = vec4(object_space_pos, 1.0);// * vec4(0.0, 0.0, 0.0, 1.0);
          center = vec4(0.0, 0.0, 0.0, 1.0);
        }`;           // TODO:  Complete the main function of the vertex shader (Extra Credit Part II).
    }
  fragment_glsl_code()           // ********* FRAGMENT SHADER *********
    { return `
        void main()
        { 
          gl_FragColor = vec4(0.5, 0.4, 0.0, 0.5 * (1.0 + sin( 20.0 * distance( position.xyz, center.xyz ))));
        }`;           // TODO:  Complete the main function of the fragment shader (Extra Credit Part II).
    }
}
